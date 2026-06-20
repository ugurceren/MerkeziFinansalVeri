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
        string[] Adimlar);

    private static readonly LayerDefinition[] LayerDefinitions =
    [
        new("TDSTG.STG", "Staging — ham veri katmanı", "cyan", ["Yükleme", "Validasyon", "Staging Onay"]),
        new("TDSTG.LND", "Landing — ham veri yükleme", "teal", ["Yükleme", "Validasyon", "Staging Onay"]),
        new("TDMAIN", "Ana veri — kurumsal çekirdek", "blue", ["Dönüşüm", "Mutabakat", "Ana Veri Onay"]),
        new("TDREPORT", "Raporlama — analitik katman", "purple", ["Agregasyon", "Rapor Üretim", "Yayınlama"])
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
        var (rowIndex, basariliAdimSayilari) = BuildRowIndex(etlResult.Satirlar);
        var katmanlar = LayerDefinitions
            .Select(layer => BuildLayer(layer, rowIndex, paketSayilari, basariliAdimSayilari))
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
            var layer = NormalizeLayerCode(GetCell(row, "MainPackageName", "DataLayer", "TargetDatabase"));
            if (string.IsNullOrWhiteSpace(layer))
            {
                continue;
            }

            var countText = GetCell(row, "PaketSayisi", "PackageCount", "Count");
            if (!int.TryParse(countText, out var paketSayisi))
            {
                continue;
            }

            if (counts.ContainsKey(layer))
            {
                counts[layer] = paketSayisi;
            }
        }

        return counts;
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

    private sealed record DatasetRowIndex(string Label, Dictionary<string, string?> Steps);

    private static (Dictionary<string, Dictionary<string, DatasetRowIndex>> RowIndex, Dictionary<string, int> SuccessCounts) BuildRowIndex(
        IReadOnlyList<IReadOnlyDictionary<string, object?>> rows)
    {
        var index = new Dictionary<string, Dictionary<string, DatasetRowIndex>>(StringComparer.OrdinalIgnoreCase);
        var successCounts = LayerDefinitions.ToDictionary(
            layer => layer.KatmanKodu,
            _ => 0,
            StringComparer.OrdinalIgnoreCase);

        foreach (var row in rows)
        {
            var layer = NormalizeLayerCode(GetCell(row, "DataLayer", "MainPackageName", "TargetLayer", "LayerCode"));
            var datasetCode = GetCell(row, "DatasetCode", "TargetTableName", "TableName")?.Trim();
            var datasetLabel = GetCell(row, "DatasetName", "Description", "TargetTableName", "TableName")?.Trim();
            var stepName = GetCell(row, "StepName", "PackageName", "LoadStep", "TaskName", "PhaseName", "Step")?.Trim();
            var executionStatus = GetCell(row, "ExecutionStatus");

            if (string.IsNullOrWhiteSpace(layer) || string.IsNullOrWhiteSpace(datasetCode) || string.IsNullOrWhiteSpace(stepName))
            {
                continue;
            }

            if (MapExecutionStatus(executionStatus).Durum == "done" && successCounts.ContainsKey(layer))
            {
                successCounts[layer]++;
            }

            if (!index.TryGetValue(layer, out var datasets))
            {
                datasets = new Dictionary<string, DatasetRowIndex>(StringComparer.OrdinalIgnoreCase);
                index[layer] = datasets;
            }

            if (!datasets.TryGetValue(datasetCode, out var datasetIndex))
            {
                datasetIndex = new DatasetRowIndex(
                    string.IsNullOrWhiteSpace(datasetLabel) ? datasetCode : datasetLabel,
                    new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase));
                datasets[datasetCode] = datasetIndex;
            }
            else if (string.IsNullOrWhiteSpace(datasetIndex.Label)
                && !string.IsNullOrWhiteSpace(datasetLabel)
                && !string.Equals(datasetLabel, datasetCode, StringComparison.OrdinalIgnoreCase))
            {
                datasetIndex = datasetIndex with { Label = datasetLabel };
                datasets[datasetCode] = datasetIndex;
            }

            datasetIndex.Steps[stepName] = executionStatus;
        }

        return (index, successCounts);
    }

    private static EtlLoadCockpitLayer BuildLayer(
        LayerDefinition layer,
        Dictionary<string, Dictionary<string, DatasetRowIndex>> rowIndex,
        Dictionary<string, int> paketSayilari,
        Dictionary<string, int> basariliAdimSayilari)
    {
        rowIndex.TryGetValue(layer.KatmanKodu, out var datasetsForLayer);
        datasetsForLayer ??= new Dictionary<string, DatasetRowIndex>(StringComparer.OrdinalIgnoreCase);

        var datasets = datasetsForLayer
            .OrderBy(entry => entry.Key, StringComparer.OrdinalIgnoreCase)
            .Select(entry =>
            {
                var steps = layer.Adimlar
                    .Select(stepLabel => BuildStep(stepLabel, entry.Value.Steps))
                    .ToList();

                return new EtlLoadCockpitDataset
                {
                    Kod = entry.Key,
                    Etiket = entry.Value.Label,
                    Adimlar = steps
                };
            })
            .ToList();

        paketSayilari.TryGetValue(layer.KatmanKodu, out var paketSayisi);
        basariliAdimSayilari.TryGetValue(layer.KatmanKodu, out var basariliAdimSayisi);
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
            Datasets = datasets
        };
    }

    private static EtlLoadCockpitStep BuildStep(
        string stepLabel,
        Dictionary<string, string?> stepStatuses)
    {
        var statusRaw = ResolveStepStatus(stepLabel, stepStatuses);
        var mapped = MapExecutionStatus(statusRaw);

        return new EtlLoadCockpitStep
        {
            Etiket = stepLabel,
            Durum = mapped.Durum,
            DurumMetni = mapped.DurumMetni
        };
    }

    private static string? ResolveStepStatus(string stepLabel, Dictionary<string, string?> stepStatuses)
    {
        if (stepStatuses.TryGetValue(stepLabel, out var exact))
        {
            return exact;
        }

        var match = stepStatuses.FirstOrDefault(entry => StepNamesMatch(stepLabel, entry.Key));
        return string.IsNullOrEmpty(match.Key) ? null : match.Value;
    }

    private static bool StepNamesMatch(string configuredStep, string rowStep)
    {
        if (string.Equals(configuredStep, rowStep, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var configured = NormalizeStepKey(configuredStep);
        var row = NormalizeStepKey(rowStep);

        return configured.Length > 0 && (row.Contains(configured, StringComparison.OrdinalIgnoreCase)
            || configured.Contains(row, StringComparison.OrdinalIgnoreCase));
    }

    private static string NormalizeStepKey(string value) =>
        new string(value.Where(ch => char.IsLetterOrDigit(ch)).ToArray()).ToLowerInvariant();

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
            _ when normalized.Contains("progress", StringComparison.OrdinalIgnoreCase) => ("running", "In Progress"),
            _ when normalized.Contains("fail", StringComparison.OrdinalIgnoreCase)
                || normalized.Contains("error", StringComparison.OrdinalIgnoreCase) => ("failed", "Failed"),
            _ when normalized.Contains("success", StringComparison.OrdinalIgnoreCase)
                || normalized.Contains("complete", StringComparison.OrdinalIgnoreCase) => ("done", "Success"),
            _ => ("not-started", normalized)
        };
    }

    private static string NormalizeLayerCode(string? layerCode)
    {
        if (string.IsNullOrWhiteSpace(layerCode))
        {
            return string.Empty;
        }

        return layerCode.Trim() switch
        {
            "TDSTG" => "TDSTG.STG",
            _ => layerCode.Trim()
        };
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
