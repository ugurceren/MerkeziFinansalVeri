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

        var kayitlar = result.Satirlar
            .Select(MapRow)
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

    private static ParallelRunTaskListItem MapRow(IReadOnlyDictionary<string, object?> row)
    {
        var mainPackage = GetCell(row, "MainPackageName")?.Trim() ?? string.Empty;
        var packageName = GetCell(row, "PackageName")?.Trim() ?? string.Empty;
        var targetTable = GetCell(row, "TargetTableName")?.Trim() ?? string.Empty;
        var description = GetCell(row, "Description")?.Trim();
        var lastExecution = GetCellDate(row, "LastExecutionDate");
        var activeFlag = GetCellBool(row, "ActiveFlag");

        return new ParallelRunTaskListItem
        {
            Katman = string.IsNullOrWhiteSpace(mainPackage) ? "—" : mainPackage,
            DatasetKod = targetTable,
            DatasetEtiket = string.IsNullOrWhiteSpace(description) ? targetTable : description,
            Task = packageName,
            YuklemePeriyodu = ResolveName(GetCell(row, "LoadPeriodTypeName")),
            TransferTipi = ResolveName(GetCell(row, "TransferTypeName")),
            Aktif = activeFlag,
            SonGuncelleme = lastExecution
        };
    }

    private static string ResolveName(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? "—" : trimmed;
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
