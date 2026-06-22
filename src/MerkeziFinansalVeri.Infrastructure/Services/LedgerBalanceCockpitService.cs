using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MerkeziFinansalVeri.Infrastructure.Services;

public sealed class LedgerBalanceCockpitService(
    ITdConnectionService tdConnectionService,
    IConfiguration configuration,
    ILogger<LedgerBalanceCockpitService> logger,
    string repoRoot) : ILedgerBalanceCockpitService
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
        new("TDMAIN", "TDMAIN — LedgerBalance", "blue", "TDMAIN.COR.LedgerBalance")
    ];

    public async Task<EtlLoadCockpitResult> GetCockpitAsync(DateOnly? dataDate = null, CancellationToken cancellationToken = default)
    {
        var katmanKodu = configuration["MizanAkis:KatmanKodu"] ?? "TDUTIL";
        var sorguDosyasi = configuration["MizanAkis:SorguDosyasi"] ?? "config/queries/td-etl-load-ledger-balance.sql";
        var maxSatir = int.TryParse(configuration["MizanAkis:MaxSatir"], out var parsedMax) ? parsedMax : 100000;
        var timeout = int.TryParse(configuration["MizanAkis:SorguTimeoutSaniye"], out var parsedTimeout) ? parsedTimeout : 120;

        var etlSql = await ReadSqlFileAsync(sorguDosyasi, cancellationToken);
        if (etlSql is null)
        {
            return Fail($"Sorgu dosyası bulunamadı: {sorguDosyasi}");
        }

        if (dataDate.HasValue)
        {
            etlSql = ApplyDataDateFilter(etlSql, dataDate.Value);
        }

        var etlResult = await tdConnectionService.ExecuteReadOnlyQueryAsync(
            katmanKodu,
            etlSql,
            timeout,
            maxSatir,
            cancellationToken);

        if (!etlResult.Basarili)
        {
            return Fail(etlResult.Hata ?? "Mizan akış sorgusu çalıştırılamadı.", etlResult.SureMs);
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

        var aggregated = BuildAggregatedStep(layer, steps);
        var adimlar = new List<EtlLoadCockpitStep> { aggregated };

        var paketSayisi = 1;
        var basariliAdimSayisi = aggregated.Durum == "done" ? 1 : 0;
        var tamamlanmaYuzdesi = aggregated.Durum switch
        {
            "done" => 100,
            "running" => 50,
            _ => 0
        };

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
                    Kod = layer.KatmanKodu,
                    Etiket = layer.TargetTableName,
                    Adimlar = adimlar
                }
            ]
        };
    }

    private static EtlLoadCockpitStep BuildAggregatedStep(LayerDefinition layer, List<PackageStep> steps)
    {
        if (steps.Count == 0)
        {
            return new EtlLoadCockpitStep
            {
                Etiket = layer.TargetTableName,
                Durum = "not-started",
                DurumMetni = "Not Started"
            };
        }

        var mapped = steps
            .Select(step => new { Step = step, Status = MapExecutionStatus(step.ExecutionStatus) })
            .ToList();

        string durum;
        string durumMetni;
        string? hataMesaji = null;

        if (mapped.Any(item => item.Status.Durum == "failed"))
        {
            var failed = mapped.First(item => item.Status.Durum == "failed");
            durum = "failed";
            durumMetni = "Failed";
            hataMesaji = string.IsNullOrWhiteSpace(failed.Step.ErrorMessage)
                ? null
                : failed.Step.ErrorMessage.Trim();
        }
        else if (mapped.Any(item => item.Status.Durum == "running"))
        {
            durum = "running";
            durumMetni = "In Progress";
        }
        else if (mapped.All(item => item.Status.Durum == "done"))
        {
            durum = "done";
            durumMetni = "Success";
        }
        else if (mapped.Any(item => item.Status.Durum == "done"))
        {
            durum = "running";
            durumMetni = "In Progress";
        }
        else
        {
            durum = "not-started";
            durumMetni = "Not Started";
        }

        int? kayitSayisi = steps
            .Where(step => step.RecordCount.HasValue)
            .Select(step => step.RecordCount!.Value)
            .DefaultIfEmpty()
            .Max();

        if (!steps.Any(step => step.RecordCount.HasValue))
        {
            kayitSayisi = null;
        }

        return new EtlLoadCockpitStep
        {
            Etiket = layer.TargetTableName,
            Durum = durum,
            DurumMetni = durumMetni,
            KayitSayisi = kayitSayisi,
            HataMesaji = hataMesaji
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

    private static (string Durum, string DurumMetni) MapExecutionStatus(string? statusRaw)
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
