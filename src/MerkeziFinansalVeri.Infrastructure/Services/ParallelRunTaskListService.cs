using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MerkeziFinansalVeri.Infrastructure.Services;

public sealed class ParallelRunTaskListService(
    ITdConnectionService tdConnectionService,
    IConfiguration configuration,
    ILogger<ParallelRunTaskListService> logger,
    string repoRoot) : IParallelRunTaskListService
{
    public ParallelRunTaskListAyarlar GetAyarlar() => new()
    {
        KatmanKodu = configuration["TaskListesi:KatmanKodu"] ?? "TDUTIL",
        SorguDosyasi = configuration["TaskListesi:SorguDosyasi"] ?? "config/queries/td-parallel-run.sql",
        LoadPeriodLookupSorguDosyasi = configuration["TaskListesi:LoadPeriodLookupSorguDosyasi"] ?? "config/queries/td-load-period-type-lookup.sql",
        TransferTypeLookupSorguDosyasi = configuration["TaskListesi:TransferTypeLookupSorguDosyasi"] ?? "config/queries/td-transfer-type-lookup.sql",
        MaxSatir = int.TryParse(configuration["TaskListesi:MaxSatir"], out var maxSatir) ? maxSatir : 100000,
        SorguTimeoutSaniye = int.TryParse(configuration["TaskListesi:SorguTimeoutSaniye"], out var timeout)
            ? timeout
            : 120
    };

    public async Task<ParallelRunTaskListResult> GetTaskListAsync(CancellationToken cancellationToken = default)
    {
        var ayarlar = GetAyarlar();
        var query = await LoadQueryAsync(ayarlar.SorguDosyasi, cancellationToken);
        if (!query.Basarili)
        {
            return Fail(query.Hata!);
        }

        var loadPeriodLookupQuery = await LoadQueryAsync(ayarlar.LoadPeriodLookupSorguDosyasi, cancellationToken);
        if (!loadPeriodLookupQuery.Basarili)
        {
            return Fail(loadPeriodLookupQuery.Hata!);
        }

        var transferTypeLookupQuery = await LoadQueryAsync(ayarlar.TransferTypeLookupSorguDosyasi, cancellationToken);
        if (!transferTypeLookupQuery.Basarili)
        {
            return Fail(transferTypeLookupQuery.Hata!);
        }

        var loadPeriodLookup = await LoadLookupAsync(
            ayarlar,
            loadPeriodLookupQuery.Sql!,
            "LoadPeriodTypeId",
            "LoadPeriodTypeName",
            cancellationToken);

        if (!loadPeriodLookup.Basarili)
        {
            return Fail(loadPeriodLookup.Hata ?? "Yükleme periyodu lookup sorgusu başarısız.", loadPeriodLookup.SureMs);
        }

        var transferTypeLookup = await LoadLookupAsync(
            ayarlar,
            transferTypeLookupQuery.Sql!,
            "TransferTypeId",
            "TransferTypeName",
            cancellationToken);

        if (!transferTypeLookup.Basarili)
        {
            return Fail(transferTypeLookup.Hata ?? "Transfer tipi lookup sorgusu başarısız.", transferTypeLookup.SureMs);
        }

        var result = await ExecuteQueryAsync(ayarlar, query.Sql!, cancellationToken);
        if (!result.Basarili)
        {
            return Fail(result.Hata ?? "Paket listesi sorgusu çalıştırılamadı.", result.SureMs);
        }

        var kayitlar = result.Satirlar
            .Select(row => MapRow(row, loadPeriodLookup.Lookup, transferTypeLookup.Lookup))
            .Where(item => !string.IsNullOrWhiteSpace(item.Task))
            .OrderBy(item => item.Katman, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.DatasetKod, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.Task, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new ParallelRunTaskListResult
        {
            Basarili = true,
            Kayitlar = kayitlar,
            SureMs = result.SureMs + loadPeriodLookup.SureMs + transferTypeLookup.SureMs
        };
    }

    private static ParallelRunTaskListItem MapRow(
        IReadOnlyDictionary<string, object?> row,
        IReadOnlyDictionary<int, string> loadPeriodLookup,
        IReadOnlyDictionary<int, string> transferTypeLookup)
    {
        var mainPackage = GetCell(row, "MainPackageName")?.Trim() ?? string.Empty;
        var packageName = GetCell(row, "Paket Adı", "PackageName")?.Trim() ?? string.Empty;
        var targetTable = GetCell(row, "Hedef Tablo", "TargetTableName")?.Trim() ?? string.Empty;
        var description = GetCell(row, "Description")?.Trim();
        var lastExecution = GetCellDate(row, "LastExecutionDate");
        var activeFlag = GetCellBool(row, "ActiveFlag");

        return new ParallelRunTaskListItem
        {
            Katman = string.IsNullOrWhiteSpace(mainPackage) ? "—" : mainPackage,
            DatasetKod = targetTable,
            DatasetEtiket = string.IsNullOrWhiteSpace(description) ? targetTable : description,
            Task = packageName,
            YuklemePeriyodu = ResolveLookupField(
                row,
                "LoadPeriodTypeName",
                "LoadPeriodTypeId",
                loadPeriodLookup),
            TransferTipi = ResolveLookupField(
                row,
                "TransferTypeName",
                "TransferTypeId",
                transferTypeLookup),
            Aktif = activeFlag,
            SonGuncelleme = lastExecution
        };
    }

    private static string ResolveLookupField(
        IReadOnlyDictionary<string, object?> row,
        string nameColumn,
        string idColumn,
        IReadOnlyDictionary<int, string> lookup)
    {
        var joinedName = GetCell(row, nameColumn)?.Trim();
        if (!string.IsNullOrWhiteSpace(joinedName))
        {
            return joinedName;
        }

        var id = GetCellInt(row, idColumn);
        if (id.HasValue && lookup.TryGetValue(id.Value, out var name) && !string.IsNullOrWhiteSpace(name))
        {
            return name.Trim();
        }

        return "—";
    }

    private async Task<(bool Basarili, string? Hata, int SureMs, Dictionary<int, string> Lookup)> LoadLookupAsync(
        ParallelRunTaskListAyarlar ayarlar,
        string sql,
        string idColumn,
        string nameColumn,
        CancellationToken cancellationToken)
    {
        var result = await ExecuteQueryAsync(ayarlar, sql, cancellationToken);
        if (!result.Basarili)
        {
            return (false, result.Hata, result.SureMs, []);
        }

        var lookup = new Dictionary<int, string>();
        foreach (var row in result.Satirlar)
        {
            var id = GetCellInt(row, idColumn);
            var name = GetCell(row, nameColumn)?.Trim();
            if (!id.HasValue || string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            lookup[id.Value] = name;
        }

        return (true, null, result.SureMs, lookup);
    }

    private async Task<(bool Basarili, string? Sql, string? Hata)> LoadQueryAsync(
        string relativePath,
        CancellationToken cancellationToken)
    {
        var sqlPath = Path.Combine(repoRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));

        if (!File.Exists(sqlPath))
        {
            return (false, null, $"Sorgu dosyası bulunamadı: {relativePath}");
        }

        try
        {
            var sql = (await File.ReadAllTextAsync(sqlPath, cancellationToken)).Trim().TrimEnd(';');
            if (string.IsNullOrWhiteSpace(sql))
            {
                return (false, null, "Sorgu dosyası boş.");
            }

            return (true, sql, null);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Paket listesi sorgu dosyası okunamadı: {Path}", sqlPath);
            return (false, null, "Sorgu dosyası okunamadı.");
        }
    }

    private Task<TdQueryResult> ExecuteQueryAsync(
        ParallelRunTaskListAyarlar ayarlar,
        string sql,
        CancellationToken cancellationToken) =>
        tdConnectionService.ExecuteReadOnlyQueryAsync(
            ayarlar.KatmanKodu,
            sql,
            ayarlar.SorguTimeoutSaniye,
            ayarlar.MaxSatir,
            cancellationToken);

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

    private static int? GetCellInt(IReadOnlyDictionary<string, object?> row, params string[] columnNames)
    {
        var text = GetCell(row, columnNames);
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        if (int.TryParse(text, out var intValue))
        {
            return intValue;
        }

        return null;
    }

    private static bool? GetCellBool(IReadOnlyDictionary<string, object?> row, string columnName)
    {
        var text = GetCell(row, columnName);
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        if (bool.TryParse(text, out var boolValue))
        {
            return boolValue;
        }

        if (byte.TryParse(text, out var byteValue))
        {
            return byteValue != 0;
        }

        if (int.TryParse(text, out var intValue))
        {
            return intValue != 0;
        }

        return null;
    }

    private static DateTime? GetCellDate(IReadOnlyDictionary<string, object?> row, string columnName)
    {
        var text = GetCell(row, columnName);
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        return DateTime.TryParse(text, out var parsed) ? parsed : null;
    }

    private static ParallelRunTaskListResult Fail(string hata, int sureMs = 0) => new()
    {
        Basarili = false,
        Hata = hata,
        SureMs = sureMs
    };
}
