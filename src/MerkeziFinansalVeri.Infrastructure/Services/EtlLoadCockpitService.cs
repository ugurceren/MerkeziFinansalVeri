using System.Globalization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MerkeziFinansalVeri.Infrastructure.Services;

public sealed class EtlLoadCockpitService(
    ITdConnectionService tdConnectionService,
    IConfiguration configuration,
    ILogger<EtlLoadCockpitService> logger,
    string repoRoot) : IEtlLoadCockpitService
{
    private sealed record LayerDefinition(
        string KatmanKodu,
        string Rol,
        string Tema);

    private sealed record EtlLoadRawRow(
        string LayerKey,
        string TargetTableName,
        DateOnly? DataDate,
        string? ExecutionStatus,
        DateTime? ExecutionStartTime,
        DateTime? ExecutionEndTime,
        int? ExecutionRecordCount,
        string? ErrorMessageText);

    private const string TdstgStgKey = "TDSTG.STG";
    private const string TdstgLndKey = "TDSTG.LND";

    private static readonly LayerDefinition[] LayerDefinitions =
    [
        new(TdstgStgKey, "Staging — STG", "cyan"),
        new(TdstgLndKey, "Staging — LND", "teal"),
        new("TDMAIN", "Ana veri — kurumsal çekirdek", "blue"),
        new("TDREPORT", "Raporlama — analitik katman", "purple")
    ];

    public EtlLoadCockpitAyarlar GetAyarlar() => new()
    {
        KatmanKodu = configuration["GunlukAkis:KatmanKodu"] ?? "TDUTIL",
        SorguDosyasi = configuration["GunlukAkis:SorguDosyasi"] ?? "config/queries/td-etl-load.sql",
        ParallelRunSorguDosyasi = configuration["GunlukAkis:ParallelRunSorguDosyasi"] ?? "config/queries/td-parallel-run-packages.sql",
        MaxSatir = int.TryParse(configuration["GunlukAkis:MaxSatir"], out var maxSatir) ? maxSatir : 100000,
        SorguTimeoutSaniye = int.TryParse(configuration["GunlukAkis:SorguTimeoutSaniye"], out var timeout)
            ? timeout
            : 120
    };

    public async Task<EtlLoadCockpitResult> GetCockpitAsync(DateOnly? dataDate = null, CancellationToken cancellationToken = default)
    {
        var ayarlar = GetAyarlar();
        var etlSql = await ReadSqlFileAsync(ayarlar.SorguDosyasi, cancellationToken);
        if (etlSql is null)
        {
            return Fail($"Sorgu dosyası bulunamadı: {ayarlar.SorguDosyasi}");
        }

        if (dataDate.HasValue)
        {
            etlSql = ApplyDataDateFilter(etlSql, dataDate.Value);
        }

        var etlResult = await tdConnectionService.ExecuteReadOnlyQueryAsync(
            ayarlar.KatmanKodu,
            etlSql,
            ayarlar.SorguTimeoutSaniye,
            ayarlar.MaxSatir,
            cancellationToken);

        if (!etlResult.Basarili)
        {
            return Fail(etlResult.Hata ?? "Günlük akış sorgusu çalıştırılamadı.", etlResult.SureMs);
        }

        var paketSayilari = await LoadPaketSayilariAsync(ayarlar, cancellationToken);
        var rawRows = ParseRawRows(etlResult.Satirlar);

        foreach (var layer in LayerDefinitions)
        {
            var layerCount = rawRows.Count(row =>
                row.LayerKey.Equals(layer.KatmanKodu, StringComparison.OrdinalIgnoreCase));
            if (layerCount > 0)
            {
                paketSayilari[layer.KatmanKodu] = Math.Max(
                    paketSayilari.GetValueOrDefault(layer.KatmanKodu),
                    layerCount);
            }
        }

        var katmanlar = LayerDefinitions
            .Select(layer => BuildLayer(layer, rawRows, paketSayilari, dataDate))
            .ToList();

        return new EtlLoadCockpitResult
        {
            Basarili = true,
            Katmanlar = katmanlar,
            SureMs = etlResult.SureMs
        };
    }

    private async Task<Dictionary<string, int>> LoadPaketSayilariAsync(
        EtlLoadCockpitAyarlar ayarlar,
        CancellationToken cancellationToken)
    {
        var counts = LayerDefinitions.ToDictionary(
            layer => layer.KatmanKodu,
            _ => 0,
            StringComparer.OrdinalIgnoreCase);

        var sql = await ReadSqlFileAsync(ayarlar.ParallelRunSorguDosyasi, cancellationToken);
        if (sql is null)
        {
            logger.LogWarning("ParallelRun paket sorgu dosyası bulunamadı: {Path}", ayarlar.ParallelRunSorguDosyasi);
            return counts;
        }

        var result = await tdConnectionService.ExecuteReadOnlyQueryAsync(
            ayarlar.KatmanKodu,
            sql,
            ayarlar.SorguTimeoutSaniye,
            ayarlar.MaxSatir,
            cancellationToken);

        if (!result.Basarili)
        {
            logger.LogWarning("ParallelRun paket sorgusu başarısız: {Hata}", result.Hata);
            return counts;
        }

        foreach (var row in result.Satirlar)
        {
            var target1 = GetCell(row, "Target1", "target1");
            var countText = GetCell(row, "PaketSayisi", "ToplamKayit", "toplam_kayit", "PackageCount", "Count");
            if (!int.TryParse(countText, out var paketSayisi))
            {
                continue;
            }

            var layer = MapTarget1ToLayer(target1);
            if (string.IsNullOrWhiteSpace(layer) || !counts.ContainsKey(layer))
            {
                continue;
            }

            counts[layer] = Math.Max(counts[layer], paketSayisi);
        }

        return counts;
    }

    private static string MapTarget1ToLayer(string? target1)
    {
        if (string.IsNullOrWhiteSpace(target1))
        {
            return string.Empty;
        }

        return target1.Trim().ToUpperInvariant() switch
        {
            "STG" => TdstgStgKey,
            "LND" => TdstgLndKey,
            "TDMAIN" => "TDMAIN",
            "TDREPORT" => "TDREPORT",
            _ => target1.Trim()
        };
    }

    private static string ApplyDataDateFilter(string sql, DateOnly dataDate)
    {
        var filter = $"CAST(el.DataDate AS DATE) = '{dataDate:yyyy-MM-dd}'";
        var orderIndex = sql.IndexOf("ORDER BY", StringComparison.OrdinalIgnoreCase);
        if (orderIndex >= 0)
        {
            return sql.Insert(orderIndex, $"WHERE {filter}\n");
        }

        return $"{sql}\nWHERE {filter}";
    }

    private async Task<string?> ReadSqlFileAsync(string relativePath, CancellationToken cancellationToken)
    {
        var sqlPath = Path.Combine(repoRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(sqlPath))
        {
            return null;
        }

        try
        {
            var sql = (await File.ReadAllTextAsync(sqlPath, cancellationToken)).Trim().TrimEnd(';');
            return string.IsNullOrWhiteSpace(sql) ? null : sql;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Sorgu dosyası okunamadı: {Path}", sqlPath);
            return null;
        }
    }

    private static List<EtlLoadRawRow> ParseRawRows(IReadOnlyList<IReadOnlyDictionary<string, object?>> rows)
    {
        var list = new List<EtlLoadRawRow>(rows.Count);

        foreach (var row in rows)
        {
            var mainPackage = GetCell(row, "DataLayer", "MainPackageName", "TargetLayer", "LayerCode");
            var layerTableName = GetCell(row, "LayerTableName", "ParallelTargetTableName")?.Trim();
            var targetTableName = GetCell(row, "TargetTableName", "DatasetCode", "TableName")?.Trim();
            var layer = ResolveLayerCode(mainPackage, layerTableName ?? targetTableName);

            if (string.IsNullOrWhiteSpace(layer) || string.IsNullOrWhiteSpace(targetTableName))
            {
                continue;
            }

            list.Add(new EtlLoadRawRow(
                layer,
                targetTableName,
                ParseDateOnly(GetCell(row, "DataDate")),
                GetCell(row, "ExecutionStatus"),
                ParseDateTime(GetCell(row, "ExecutionStartTime")),
                ParseDateTime(GetCell(row, "ExecutionEndTime")),
                ParseNullableInt(GetCell(row, "ExecutionRecordCount")),
                GetCell(row, "ErrorMessageText")));
        }

        return list;
    }

    private static EtlLoadCockpitLayer BuildLayer(
        LayerDefinition layer,
        IReadOnlyList<EtlLoadRawRow> rawRows,
        IReadOnlyDictionary<string, int> paketSayilari,
        DateOnly? filterDataDate = null)
    {
        var layerRows = rawRows
            .Where(row => row.LayerKey.Equals(layer.KatmanKodu, StringComparison.OrdinalIgnoreCase))
            .ToList();

        var kayitlar = layerRows
            .Select(row =>
            {
                var status = MapExecutionStatus(row.ExecutionStatus);
                return new EtlLoadCockpitKayit
                {
                    TargetTableName = row.TargetTableName,
                    Durum = status.Durum,
                    DurumMetni = status.DurumMetni,
                    DataDate = row.DataDate ?? filterDataDate,
                    ExecutionStartTime = row.ExecutionStartTime,
                    ExecutionEndTime = row.ExecutionEndTime,
                    SureDakika = ComputeSureDakika(row.ExecutionStartTime, row.ExecutionEndTime),
                    ExecutionRecordCount = row.ExecutionRecordCount,
                    ErrorMessageText = row.ErrorMessageText
                };
            })
            .OrderBy(k => k.TargetTableName, StringComparer.OrdinalIgnoreCase)
            .ThenBy(k => k.ExecutionStartTime)
            .ToList();

        var ozetSatirlar = layerRows
            .GroupBy(row => row.TargetTableName, StringComparer.OrdinalIgnoreCase)
            .Select(group =>
            {
                var aggregate = AggregateMappedStatuses(
                    group.Select(item => MapExecutionStatus(item.ExecutionStatus)));
                return new EtlLoadCockpitOzetSatir
                {
                    HedefTablo = group.Key,
                    Durum = aggregate.Durum,
                    DurumMetni = aggregate.DurumMetni
                };
            })
            .OrderBy(item => item.HedefTablo, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var datasets = ozetSatirlar
            .Select(item => new EtlLoadCockpitDataset
            {
                Kod = item.HedefTablo,
                Etiket = item.HedefTablo,
                Adimlar =
                [
                    new EtlLoadCockpitStep
                    {
                        Etiket = "—",
                        Durum = item.Durum,
                        DurumMetni = item.DurumMetni
                    }
                ]
            })
            .ToList();

        paketSayilari.TryGetValue(layer.KatmanKodu, out var paketSayisi);
        if (paketSayisi <= 0)
        {
            paketSayisi = ozetSatirlar.Count;
        }

        var basariliAdimSayisi = ozetSatirlar.Count(item => item.Durum == "done");
        var tamamlanmaYuzdesi = ComputeTamamlanmaYuzdesi(basariliAdimSayisi, paketSayisi);

        return new EtlLoadCockpitLayer
        {
            KatmanKodu = layer.KatmanKodu,
            Rol = layer.Rol,
            Tema = layer.Tema,
            PaketSayisi = paketSayisi,
            BasariliAdimSayisi = basariliAdimSayisi,
            TamamlanmaYuzdesi = tamamlanmaYuzdesi,
            Datasets = datasets,
            OzetSatirlar = ozetSatirlar,
            Kayitlar = kayitlar
        };
    }

    private static int ComputeTamamlanmaYuzdesi(int basarili, int toplam)
    {
        if (toplam <= 0)
        {
            return 0;
        }

        var raw = (int)Math.Round(basarili * 100.0 / toplam);
        return Math.Clamp(raw, 0, 100);
    }

    private static double? ComputeSureDakika(DateTime? start, DateTime? end)
    {
        if (!start.HasValue || !end.HasValue)
        {
            return null;
        }

        var minutes = (end.Value - start.Value).TotalMinutes;
        return minutes < 0 ? null : Math.Round(minutes, 2);
    }

    private static (string Durum, string DurumMetni) AggregateMappedStatuses(
        IEnumerable<(string Durum, string DurumMetni)> statuses)
    {
        var list = statuses.ToList();
        if (list.Count == 0)
        {
            return ("not-started", "Not Started");
        }

        if (list.Any(status => status.Durum == "failed"))
        {
            return ("failed", "Failed");
        }

        if (list.Any(status => status.Durum == "running"))
        {
            return ("running", "In Progress");
        }

        if (list.All(status => status.Durum == "done"))
        {
            return ("done", "Success");
        }

        if (list.Any(status => status.Durum == "done"))
        {
            return ("running", "In Progress");
        }

        return ("not-started", "Not Started");
    }

    private static string ResolveLayerCode(string? mainPackageName, string? targetTableName)
    {
        if (string.IsNullOrWhiteSpace(mainPackageName))
        {
            return string.Empty;
        }

        var mainPackage = mainPackageName.Trim();
        if (mainPackage.Equals("TDSTG", StringComparison.OrdinalIgnoreCase))
        {
            var schema = ParseTargetTableSchema(targetTableName);
            if (schema.Equals("LND", StringComparison.OrdinalIgnoreCase))
            {
                return TdstgLndKey;
            }

            if (schema.Equals("STG", StringComparison.OrdinalIgnoreCase))
            {
                return TdstgStgKey;
            }

            return string.Empty;
        }

        return mainPackage switch
        {
            "TDSTG.STG" or "TDSTG.LND" or "TDMAIN" or "TDREPORT" => mainPackage,
            _ => mainPackage
        };
    }

    private static string ParseTargetTableSchema(string? targetTableName)
    {
        if (string.IsNullOrWhiteSpace(targetTableName))
        {
            return string.Empty;
        }

        var normalized = targetTableName.Trim().Replace("[", string.Empty).Replace("]", string.Empty);
        var parts = normalized.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length == 0)
        {
            return string.Empty;
        }

        foreach (var part in parts)
        {
            if (part.Equals("LND", StringComparison.OrdinalIgnoreCase))
            {
                return "LND";
            }

            if (part.Equals("STG", StringComparison.OrdinalIgnoreCase))
            {
                return "STG";
            }
        }

        return string.Empty;
    }

    internal static (string Durum, string DurumMetni) MapExecutionStatus(string? statusRaw)
    {
        if (string.IsNullOrWhiteSpace(statusRaw))
        {
            return ("not-started", "Not Started");
        }

        var normalized = statusRaw.Trim();

        return normalized.ToLowerInvariant() switch
        {
            "success" or "successful" or "succeeded" or "done" or "completed" or "complete" => ("done", "Success"),
            "failed" or "failure" or "error" or "fail" => ("failed", "Failed"),
            "in progress" or "inprogress" or "in_progress" or "running" or "active" or "processing" => ("running", "In Progress"),
            "not started" or "notstarted" or "not_started" or "pending" or "waiting" => ("not-started", "Not Started"),
            _ when normalized.Contains("progress", StringComparison.OrdinalIgnoreCase) => ("running", "In Progress"),
            _ when normalized.Contains("fail", StringComparison.OrdinalIgnoreCase)
                || normalized.Contains("error", StringComparison.OrdinalIgnoreCase) => ("failed", "Failed"),
            _ when normalized.Contains("success", StringComparison.OrdinalIgnoreCase)
                || normalized.Contains("complete", StringComparison.OrdinalIgnoreCase) => ("done", "Success"),
            _ when normalized.Contains("not started", StringComparison.OrdinalIgnoreCase)
                || normalized.Contains("pending", StringComparison.OrdinalIgnoreCase)
                || normalized.Contains("waiting", StringComparison.OrdinalIgnoreCase) => ("not-started", "Not Started"),
            _ => ("not-started", "Not Started")
        };
    }

    private static DateOnly? ParseDateOnly(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (DateOnly.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dateOnly))
        {
            return dateOnly;
        }

        if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var dateTime))
        {
            return DateOnly.FromDateTime(dateTime);
        }

        return null;
    }

    private static DateTime? ParseDateTime(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return DateTime.TryParse(value, out var dateTime) ? dateTime : null;
    }

    private static int? ParseNullableInt(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return int.TryParse(value, out var number) ? number : null;
    }

    private static string? GetCell(IReadOnlyDictionary<string, object?> row, params string[] columnNames)
    {
        foreach (var columnName in columnNames)
        {
            if (row.TryGetValue(columnName, out var direct) && direct is not null)
            {
                return Convert.ToString(direct);
            }

            var key = row.Keys.FirstOrDefault(k => string.Equals(k, columnName, StringComparison.OrdinalIgnoreCase));
            if (key is not null && row.TryGetValue(key, out var value) && value is not null)
            {
                return Convert.ToString(value);
            }
        }

        return null;
    }

    private static EtlLoadCockpitResult Fail(string hata, int sureMs = 0) => new()
    {
        Basarili = false,
        Hata = hata,
        SureMs = sureMs
    };
}
