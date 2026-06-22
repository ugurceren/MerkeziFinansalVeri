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

    private static readonly (string Durum, string DurumMetni)[] FlowStatusSlots =
    [
        ("not-started", "Not Started"),
        ("running", "In Progress"),
        ("failed", "Failed"),
        ("done", "Success")
    ];

    private const string TdstgStgKey = "TDSTG.STG";
    private const string TdstgLndKey = "TDSTG.LND";

    private static readonly LayerDefinition[] LayerDefinitions =
    [
        new("TDSTG", "Staging — ham veri katmanı", "cyan", []),
        new("TDMAIN", "Ana veri — kurumsal çekirdek", "blue", []),
        new("TDREPORT", "Raporlama — analitik katman", "purple", [])
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
        var (rowIndex, basariliAdimSayilari, paketSayilariFromEtl) = BuildRowIndex(etlResult.Satirlar);

        foreach (var layer in LayerDefinitions)
        {
            if (string.Equals(layer.KatmanKodu, "TDSTG", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (paketSayilariFromEtl.TryGetValue(layer.KatmanKodu, out var etlCount) && etlCount > 0)
            {
                paketSayilari[layer.KatmanKodu] = etlCount;
            }
        }

        var katmanlar = LayerDefinitions
            .Select(layer => string.Equals(layer.KatmanKodu, "TDSTG", StringComparison.OrdinalIgnoreCase)
                ? BuildTdStgLayer(layer, rowIndex, paketSayilari, basariliAdimSayilari)
                : BuildLayer(layer, rowIndex, paketSayilari, basariliAdimSayilari))
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
            if (string.IsNullOrWhiteSpace(layer))
            {
                continue;
            }

            // TDSTG tamamlanma paydası yalnızca STG paket sayısıdır; LND ayrı akıştır.
            if (string.Equals(layer, "TDSTG", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(target1?.Trim(), "STG", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (counts.ContainsKey(layer))
            {
                counts[layer] = Math.Max(counts[layer], paketSayisi);
            }
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
            "STG" or "LND" => "TDSTG",
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

    private sealed record DatasetRowIndex(string TargetTableName, Dictionary<string, string?> Steps);

    private static (Dictionary<string, Dictionary<string, DatasetRowIndex>> RowIndex, Dictionary<string, int> SuccessCounts, Dictionary<string, int> PaketCounts) BuildRowIndex(
        IReadOnlyList<IReadOnlyDictionary<string, object?>> rows)
    {
        var index = new Dictionary<string, Dictionary<string, DatasetRowIndex>>(StringComparer.OrdinalIgnoreCase);
        var successCounts = LayerDefinitions.ToDictionary(
            layer => layer.KatmanKodu,
            _ => 0,
            StringComparer.OrdinalIgnoreCase);
        var paketCounts = LayerDefinitions.ToDictionary(
            layer => layer.KatmanKodu,
            _ => 0,
            StringComparer.OrdinalIgnoreCase);

        foreach (var row in rows)
        {
            var mainPackage = GetCell(row, "DataLayer", "MainPackageName", "TargetLayer", "LayerCode");
            var layerTableName = GetCell(row, "LayerTableName", "ParallelTargetTableName", "TargetTableName")?.Trim();
            var datasetCode = GetCell(row, "DatasetCode", "TargetTableName", "TableName")?.Trim();
            var layer = ResolveLayerCode(mainPackage, layerTableName ?? datasetCode);
            var stepName = GetCell(row, "StepName", "PackageName", "LoadStep", "TaskName", "PhaseName", "Step")?.Trim();

            if (string.IsNullOrWhiteSpace(layer)
                || string.IsNullOrWhiteSpace(datasetCode)
                || string.IsNullOrWhiteSpace(stepName))
            {
                continue;
            }

            if (!index.TryGetValue(layer, out var datasets))
            {
                datasets = new Dictionary<string, DatasetRowIndex>(StringComparer.OrdinalIgnoreCase);
                index[layer] = datasets;
            }

            var targetTableName = string.IsNullOrWhiteSpace(layerTableName) ? datasetCode : layerTableName;
            if (!datasets.TryGetValue(datasetCode, out var datasetIndex))
            {
                datasetIndex = new DatasetRowIndex(
                    targetTableName!,
                    new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase));
                datasets[datasetCode] = datasetIndex;
            }
            else if (string.IsNullOrWhiteSpace(datasetIndex.TargetTableName)
                && !string.IsNullOrWhiteSpace(targetTableName))
            {
                datasetIndex = datasetIndex with { TargetTableName = targetTableName };
                datasets[datasetCode] = datasetIndex;
            }

            var executionStatus = GetCell(row, "ExecutionStatus");
            datasetIndex.Steps[stepName] = executionStatus;
        }

        foreach (var (layerKey, datasets) in index)
        {
            var datasetCount = datasets.Count;
            if (string.Equals(layerKey, TdstgStgKey, StringComparison.OrdinalIgnoreCase))
            {
                paketCounts["TDSTG"] = Math.Max(paketCounts["TDSTG"], datasetCount);
            }
            else if (paketCounts.ContainsKey(layerKey))
            {
                paketCounts[layerKey] = Math.Max(paketCounts[layerKey], datasetCount);
            }
        }

        return (index, successCounts, paketCounts);
    }

    private static int CountCompletedDatasets(IReadOnlyDictionary<string, DatasetRowIndex>? datasets)
    {
        if (datasets is null || datasets.Count == 0)
        {
            return 0;
        }

        return datasets.Values.Count(dataset =>
            AggregateMappedStatuses(dataset.Steps.Values.Select(MapExecutionStatus)).Durum == "done");
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

    private static EtlLoadCockpitLayer BuildTdStgLayer(
        LayerDefinition layer,
        Dictionary<string, Dictionary<string, DatasetRowIndex>> rowIndex,
        Dictionary<string, int> paketSayilari,
        Dictionary<string, int> basariliAdimSayilari)
    {
        rowIndex.TryGetValue(TdstgStgKey, out var stgDatasets);
        rowIndex.TryGetValue(TdstgLndKey, out var lndDatasets);
        stgDatasets ??= new Dictionary<string, DatasetRowIndex>(StringComparer.OrdinalIgnoreCase);
        lndDatasets ??= new Dictionary<string, DatasetRowIndex>(StringComparer.OrdinalIgnoreCase);

        var datasetKeys = stgDatasets.Keys
            .Union(lndDatasets.Keys, StringComparer.OrdinalIgnoreCase)
            .OrderBy(key => key, StringComparer.OrdinalIgnoreCase);

        var datasets = datasetKeys
            .Select(key =>
            {
                stgDatasets.TryGetValue(key, out var stg);
                lndDatasets.TryGetValue(key, out var lnd);
                var targetTableName = stg?.TargetTableName ?? lnd?.TargetTableName ?? key;

                return new EtlLoadCockpitDataset
                {
                    Kod = key,
                    Etiket = targetTableName,
                    Adimlar = BuildDatasetSteps(stg?.Steps ?? [], layer.KatmanKodu),
                    LndAdimlar = BuildLndSteps(lnd?.Steps ?? [])
                };
            })
            .ToList();

        paketSayilari.TryGetValue(layer.KatmanKodu, out var paketSayisi);
        if (paketSayisi <= 0)
        {
            paketSayisi = stgDatasets.Count;
        }

        var basariliAdimSayisi = CountCompletedDatasets(stgDatasets);
        var tamamlanmaYuzdesi = ComputeTamamlanmaYuzdesi(basariliAdimSayisi, paketSayisi);

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
            .Select(entry => new EtlLoadCockpitDataset
            {
                Kod = entry.Key,
                Etiket = entry.Value.TargetTableName,
                Adimlar = BuildDatasetSteps(entry.Value.Steps, layer.KatmanKodu)
            })
            .ToList();

        paketSayilari.TryGetValue(layer.KatmanKodu, out var paketSayisi);
        if (paketSayisi <= 0)
        {
            paketSayisi = datasetsForLayer.Count;
        }

        var basariliAdimSayisi = CountCompletedDatasets(datasetsForLayer);
        var tamamlanmaYuzdesi = ComputeTamamlanmaYuzdesi(basariliAdimSayisi, paketSayisi);

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

    private static readonly HashSet<string> HideSuccessStepLabelLayers = new(StringComparer.OrdinalIgnoreCase)
    {
        "TDSTG",
        "TDMAIN",
        "TDREPORT"
    };

    private static IReadOnlyList<EtlLoadCockpitStep> BuildDatasetSteps(
        Dictionary<string, string?> stepStatuses,
        string katmanKodu)
    {
        if (stepStatuses.Count == 0)
        {
            return
            [
                new EtlLoadCockpitStep
                {
                    Etiket = "—",
                    Durum = "not-started",
                    DurumMetni = "Not Started"
                }
            ];
        }

        var mappedSteps = stepStatuses
            .Select(entry => new
            {
                entry.Key,
                Mapped = MapExecutionStatus(entry.Value)
            })
            .ToList();

        var aggregate = AggregateMappedStatuses(mappedSteps.Select(step => step.Mapped));
        var activeStep = mappedSteps.FirstOrDefault(step => step.Mapped.Durum == aggregate.Durum)
            ?? mappedSteps[0];
        var hideSuccessLabel = aggregate.Durum == "done"
            && HideSuccessStepLabelLayers.Contains(katmanKodu);

        return
        [
            new EtlLoadCockpitStep
            {
                Etiket = hideSuccessLabel ? "—" : activeStep.Key,
                Durum = aggregate.Durum,
                DurumMetni = aggregate.DurumMetni
            }
        ];
    }

    private static IReadOnlyList<EtlLoadCockpitStep> BuildLndSteps(Dictionary<string, string?> stepStatuses)
    {
        if (stepStatuses.Count == 0)
        {
            return [];
        }

        var aggregate = AggregateMappedStatuses(stepStatuses.Values.Select(MapExecutionStatus));
        if (aggregate.Durum == "not-started")
        {
            return [];
        }

        var durumMetni = aggregate.Durum switch
        {
            "failed" => "LND Failed",
            "done" => "LND Completed",
            "running" => "LND Completed",
            _ => "Not Started"
        };

        return
        [
            new EtlLoadCockpitStep
            {
                Etiket = "—",
                Durum = aggregate.Durum,
                DurumMetni = durumMetni
            }
        ];
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
