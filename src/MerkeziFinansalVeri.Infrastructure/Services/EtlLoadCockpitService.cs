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
        string Tema,
        string TargetTableName);

    private sealed record PackageStep(
        string PackageName,
        string? ExecutionStatus,
        int? RecordCount,
        string? ErrorMessage);

    private static readonly LayerDefinition[] LayerDefinitions =
    [
        new("STG", "TDSTG · STG — LedgerBalance", "cyan", "TDSTG.STG.LedgerBalance"),
        new("LND", "TDSTG · LND — LedgerBalance", "teal", "TDSTG.LND.LedgerBalance"),
        new("COR", "TDMAIN · COR — LedgerBalance", "blue", "TDMAIN.COR.LedgerBalance")
    ];

    public EtlLoadCockpitAyarlar GetAyarlar() => new()
    {
        KatmanKodu = configuration["GunlukAkis:KatmanKodu"] ?? "TDUTIL",
        SorguDosyasi = configuration["GunlukAkis:SorguDosyasi"] ?? "config/queries/td-etl-load-ledger-balance.sql",
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

        var stepsByLayer = BuildStepsByLayer(etlResult.Satirlar);
        var katmanlar = LayerDefinitions
            .Select(layer => BuildLayer(layer, stepsByLayer))
            .ToList();

        return new EtlLoadCockpitResult
        {
            Basarili = true,
            Katmanlar = katmanlar,
            SureMs = etlResult.SureMs
        };
    }

    private static Dictionary<string, List<PackageStep>> BuildStepsByLayer(
        IReadOnlyList<IReadOnlyDictionary<string, object?>> rows)
    {
        var targetToLayer = LayerDefinitions.ToDictionary(
            layer => layer.TargetTableName,
            layer => layer.KatmanKodu,
            StringComparer.OrdinalIgnoreCase);

        var index = LayerDefinitions.ToDictionary(
            layer => layer.KatmanKodu,
            _ => new List<PackageStep>(),
            StringComparer.OrdinalIgnoreCase);

        foreach (var row in rows)
        {
            var targetTable = GetCell(row, "TargetTableName")?.Trim();
            var packageName = GetCell(row, "StepName", "PackageName")?.Trim();
            if (string.IsNullOrWhiteSpace(targetTable)
                || string.IsNullOrWhiteSpace(packageName)
                || !targetToLayer.TryGetValue(targetTable, out var layerCode))
            {
                continue;
            }

            index[layerCode].Add(new PackageStep(
                packageName,
                GetCell(row, "ExecutionStatus"),
                ParseNullableInt(GetCell(row, "ExecutionRecordCount")),
                GetCell(row, "ErrorMessageText")));
        }

        foreach (var layer in LayerDefinitions)
        {
            index[layer.KatmanKodu] = index[layer.KatmanKodu]
                .OrderBy(step => step.PackageName, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        return index;
    }

    private static EtlLoadCockpitLayer BuildLayer(
        LayerDefinition layer,
        Dictionary<string, List<PackageStep>> stepsByLayer)
    {
        stepsByLayer.TryGetValue(layer.KatmanKodu, out var steps);
        steps ??= [];

        var adimlar = steps
            .Select(step =>
            {
                var mapped = MapExecutionStatus(step.ExecutionStatus);
                return new EtlLoadCockpitStep
                {
                    Etiket = step.PackageName,
                    Durum = mapped.Durum,
                    DurumMetni = mapped.DurumMetni,
                    KayitSayisi = step.RecordCount,
                    HataMesaji = string.IsNullOrWhiteSpace(step.ErrorMessage) ? null : step.ErrorMessage.Trim()
                };
            })
            .ToList();

        var paketSayisi = adimlar.Count;
        var basariliAdimSayisi = adimlar.Count(step => step.Durum == "done");
        var tamamlanmaYuzdesi = paketSayisi > 0
            ? (int)Math.Round(basariliAdimSayisi * 100.0 / paketSayisi)
            : 0;

        return new EtlLoadCockpitLayer
        {
            KatmanKodu = layer.KatmanKodu,
            Rol = layer.Rol,
            Tema = layer.Tema,
            PaketSayisi = paketSayisi,
            BasariliAdimSayisi = basariliAdimSayisi,
            TamamlanmaYuzdesi = tamamlanmaYuzdesi,
            Datasets =
            [
                new EtlLoadCockpitDataset
                {
                    Kod = "LedgerBalance",
                    Etiket = layer.TargetTableName,
                    Adimlar = adimlar
                }
            ]
        };
    }

    private static string ApplyDataDateFilter(string sql, DateOnly dataDate)
    {
        var filter = $"CAST(el.DataDate AS DATE) = '{dataDate:yyyy-MM-dd}'";
        var whereIndex = sql.IndexOf("WHERE", StringComparison.OrdinalIgnoreCase);
        if (whereIndex >= 0)
        {
            var orderIndex = sql.IndexOf("ORDER BY", whereIndex, StringComparison.OrdinalIgnoreCase);
            if (orderIndex >= 0)
            {
                return sql.Insert(orderIndex, $"AND {filter}\n");
            }

            return $"{sql}\nAND {filter}";
        }

        var orderOnlyIndex = sql.IndexOf("ORDER BY", StringComparison.OrdinalIgnoreCase);
        if (orderOnlyIndex >= 0)
        {
            return sql.Insert(orderOnlyIndex, $"WHERE {filter}\n");
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

    private static int? ParseNullableInt(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (int.TryParse(value, out var intValue))
        {
            return intValue;
        }

        return long.TryParse(value, out var longValue) && longValue is >= int.MinValue and <= int.MaxValue
            ? (int)longValue
            : null;
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
