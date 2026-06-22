using System.Globalization;
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

        var result = await ExecuteQueryAsync(ayarlar, query.Sql!, cancellationToken);
        if (!result.Basarili)
        {
            return Fail(result.Hata ?? "Paket listesi sorgusu çalıştırılamadı.", result.SureMs);
        }

        var loadPeriodLookup = await TryLoadLookupAsync(
            ayarlar,
            ayarlar.LoadPeriodLookupSorguDosyasi,
            "LoadPeriodTypeId",
            "LoadPeriodTypeName",
            cancellationToken);

        var transferTypeLookup = await TryLoadLookupAsync(
            ayarlar,
            ayarlar.TransferTypeLookupSorguDosyasi,
            "TransferTypeId",
            "TransferTypeName",
            cancellationToken);

        var kayitlar = result.Satirlar
            .Select(row => MapRow(row, loadPeriodLookup, transferTypeLookup))
            .Where(item => !string.IsNullOrWhiteSpace(item.Task))
            .OrderBy(item => item.Katman, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.DatasetKod, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.Task, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new ParallelRunTaskListResult
        {
            Basarili = true,
            Kayitlar = kayitlar,
            SureMs = result.SureMs
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
                loadPeriodLookup,
                "LoadPeriodTypeId",
                "LoadPeriodTypeName",
                "Yükleme Periyodu"),
            TransferTipi = ResolveLookupField(
                row,
                transferTypeLookup,
                "TransferTypeId",
                "TransferTypeName",
                "Transfer Tipi"),
            Aktif = activeFlag,
            SonGuncelleme = lastExecution
        };
    }

    private static string ResolveLookupField(
        IReadOnlyDictionary<string, object?> row,
        IReadOnlyDictionary<int, string> lookup,
        string idColumn,
        string primarySuffix,
        params string[] nameColumns)
    {
        foreach (var nameColumn in nameColumns)
        {
            var joinedName = GetCell(row, nameColumn)?.Trim();
            if (!string.IsNullOrWhiteSpace(joinedName))
            {
                return joinedName;
            }
        }

        var suffixName = FindCellByKeySuffix(row, primarySuffix);
        if (!string.IsNullOrWhiteSpace(suffixName))
        {
            return suffixName;
        }

        var id = GetCellInt(row, idColumn);
        if (id.HasValue && lookup.TryGetValue(id.Value, out var name) && !string.IsNullOrWhiteSpace(name))
        {
            return name.Trim();
        }

        return "—";
    }

    private static string? FindCellByKeySuffix(IReadOnlyDictionary<string, object?> row, string suffix)
    {
        foreach (var key in row.Keys)
        {
            if (!key.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var text = GetCell(row, key)?.Trim();
            if (!string.IsNullOrWhiteSpace(text))
            {
                return text;
            }
        }

        return null;
    }

    private async Task<IReadOnlyDictionary<int, string>> TryLoadLookupAsync(
        ParallelRunTaskListAyarlar ayarlar,
        string relativePath,
        string idColumn,
        string nameColumn,
        CancellationToken cancellationToken)
    {
        var query = await LoadQueryAsync(relativePath, cancellationToken);
        if (!query.Basarili)
        {
            logger.LogWarning("Paket listesi lookup sorgu dosyası okunamadı: {Path} — {Hata}", relativePath, query.Hata);
            return new Dictionary<int, string>();
        }

        var result = await LoadLookupAsync(ayarlar, query.Sql!, idColumn, nameColumn, cancellationToken);
        if (!result.Basarili)
        {
            logger.LogWarning(
                "Paket listesi lookup sorgusu başarısız: {Path} — {Hata}",
                relativePath,
                result.Hata);
            return new Dictionary<int, string>();
        }

        return result.Lookup;
    }

    private async Task<(bool Basarili, string? Hata, Dictionary<int, string> Lookup)> LoadLookupAsync(
        ParallelRunTaskListAyarlar ayarlar,
        string sql,
        string idColumn,
        string nameColumn,
        CancellationToken cancellationToken)
    {
        var result = await ExecuteQueryAsync(ayarlar, sql, cancellationToken);
        if (!result.Basarili)
        {
            return (false, result.Hata, []);
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

        return (true, null, lookup);
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
            if (!TryGetRawCell(row, columnName, out var value) || value is null)
            {
                continue;
            }

            var text = Convert.ToString(value, CultureInfo.InvariantCulture);
            if (!string.IsNullOrWhiteSpace(text))
            {
                return text;
            }
        }

        return null;
    }

    private static bool TryGetRawCell(
        IReadOnlyDictionary<string, object?> row,
        string columnName,
        out object? value)
    {
        if (row.TryGetValue(columnName, out value))
        {
            return true;
        }

        var trimmedTarget = columnName.Trim();
        foreach (var key in row.Keys)
        {
            if (!string.Equals(key.Trim(), trimmedTarget, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            value = row[key];
            return true;
        }

        value = null;
        return false;
    }

    private static int? GetCellInt(IReadOnlyDictionary<string, object?> row, params string[] columnNames)
    {
        foreach (var columnName in columnNames)
        {
            if (!TryGetRawCell(row, columnName, out var value) || value is null)
            {
                continue;
            }

            switch (value)
            {
                case byte byteValue:
                    return byteValue;
                case sbyte sbyteValue:
                    return sbyteValue;
                case ushort ushortValue when ushortValue <= int.MaxValue:
                    return ushortValue;
                case short shortValue:
                    return shortValue;
                case int intValue:
                    return intValue;
                case long longValue when longValue is >= int.MinValue and <= int.MaxValue:
                    return (int)longValue;
                case decimal decimalValue when decimalValue == decimal.Truncate(decimalValue)
                    && decimalValue is >= int.MinValue and <= int.MaxValue:
                    return (int)decimalValue;
                case double doubleValue when doubleValue == Math.Truncate(doubleValue)
                    && doubleValue is >= int.MinValue and <= int.MaxValue:
                    return (int)doubleValue;
                case float floatValue when floatValue == Math.Truncate(floatValue)
                    && floatValue is >= int.MinValue and <= int.MaxValue:
                    return (int)floatValue;
                default:
                    var text = Convert.ToString(value, CultureInfo.InvariantCulture);
                    if (int.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
                    {
                        return parsed;
                    }

                    break;
            }
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
