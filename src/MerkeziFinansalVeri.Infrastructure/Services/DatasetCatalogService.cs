using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MerkeziFinansalVeri.Infrastructure.Services;

public sealed class DatasetCatalogService(
    ITdConnectionService tdConnectionService,
    IConfiguration configuration,
    ILogger<DatasetCatalogService> logger,
    string repoRoot) : IDatasetCatalogService
{
    private static readonly string[] ThemeCycle = ["teal", "blue", "purple", "amber", "rose"];

    public DatasetCatalogAyarlar GetAyarlar() => new()
    {
        KatmanKodu = configuration["DatasetCatalog:KatmanKodu"] ?? "TDUTIL",
        SorguDosyasi = configuration["DatasetCatalog:SorguDosyasi"] ?? "config/queries/td-datasets.sql",
        ListeSorguDosyasi = configuration["DatasetCatalog:ListeSorguDosyasi"] ?? "config/queries/td-datasets-list.sql",
        StatusSorguDosyasi = configuration["DatasetCatalog:StatusSorguDosyasi"] ?? "config/queries/td-datasets-status.sql",
        MaxSatir = int.TryParse(configuration["DatasetCatalog:MaxSatir"], out var maxSatir) ? maxSatir : 100000,
        SorguTimeoutSaniye = int.TryParse(configuration["DatasetCatalog:SorguTimeoutSaniye"], out var timeout)
            ? timeout
            : 120
    };

    public async Task<DatasetCatalogResult> GetCatalogAsync(CancellationToken cancellationToken = default)
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
            return Fail(result.Hata ?? "Dataset katalog sorgusu çalıştırılamadı.", result.SureMs);
        }

        var grouped = new Dictionary<string, List<DatasetCatalogItem>>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in result.Satirlar)
        {
            var model = GetCell(row, "Data_Model");
            var name = GetCell(row, "Dataset_Name");
            var stagingTable = GetCell(row, "Staging_Table_Name")?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(model) || string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            model = model.Trim();
            name = name.Trim();

            if (!grouped.TryGetValue(model, out var list))
            {
                list = [];
                grouped[model] = list;
            }

            if (list.Any(item => string.Equals(item.Ad, name, StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }

            list.Add(new DatasetCatalogItem
            {
                Ad = name,
                StagingTableName = stagingTable
            });
        }

        var kategoriler = grouped
            .OrderBy(entry => entry.Key, StringComparer.OrdinalIgnoreCase)
            .Select((entry, index) => new DatasetCatalogCategory
            {
                KategoriId = ToCategoryId(entry.Key),
                Ad = entry.Key,
                Tema = ThemeCycle[index % ThemeCycle.Length],
                Datasetler = entry.Value
                    .OrderBy(item => item.Ad, StringComparer.OrdinalIgnoreCase)
                    .ToList()
            })
            .ToList();

        return new DatasetCatalogResult
        {
            Basarili = true,
            Kategoriler = kategoriler,
            SureMs = result.SureMs
        };
    }

    public async Task<DatasetCatalogListResult> GetListAsync(CancellationToken cancellationToken = default)
    {
        var ayarlar = GetAyarlar();
        var query = await LoadQueryAsync(ayarlar.ListeSorguDosyasi, cancellationToken);
        if (!query.Basarili)
        {
            return FailList(query.Hata!);
        }

        var result = await ExecuteQueryAsync(ayarlar, query.Sql!, cancellationToken);
        if (!result.Basarili)
        {
            return FailList(result.Hata ?? "Dataset liste sorgusu çalıştırılamadı.", result.SureMs);
        }

        var kayitlar = result.Satirlar
            .Select(row => new DatasetCatalogListItem
            {
                DatasetName = GetCell(row, "Dataset_Name")?.Trim() ?? string.Empty,
                DescriptionScope = GetCell(row, "Description_Scope")?.Trim(),
                Layer = GetCell(row, "Layer")?.Trim() ?? string.Empty,
                StagingTableName = GetCell(row, "Staging_Table_Name")?.Trim() ?? string.Empty,
                KtResponsibleItUnit = GetCell(row, "KT_Responsible_IT_Unit")?.Trim() ?? string.Empty,
                Note = GetCell(row, "Note")?.Trim(),
                TdAnalyst = GetCell(row, "TD_Analyst")?.Trim() ?? string.Empty,
                Tester = GetCell(row, "Tester")?.Trim() ?? string.Empty,
                DataModel = GetCell(row, "Data_Model")?.Trim() ?? string.Empty,
                KtSpName = GetCell(row, "KT_SP_Name")?.Trim(),
                Status = GetCell(row, "Status")?.Trim() ?? string.Empty,
                StatusResponsible = GetCell(row, "Status_Responsible")?.Trim() ?? string.Empty,
                StatusChangeDate = ParseDate(GetCell(row, "StatusChangeDate"))
            })
            .Where(item => !string.IsNullOrWhiteSpace(item.DatasetName))
            .ToList();

        return new DatasetCatalogListResult
        {
            Basarili = true,
            Kayitlar = kayitlar,
            SureMs = result.SureMs
        };
    }

    public async Task<DatasetCatalogStatusResult> GetStatusAsync(CancellationToken cancellationToken = default)
    {
        var ayarlar = GetAyarlar();
        var query = await LoadQueryAsync(ayarlar.StatusSorguDosyasi, cancellationToken);
        if (!query.Basarili)
        {
            return FailStatus(query.Hata!);
        }

        var result = await ExecuteQueryAsync(ayarlar, query.Sql!, cancellationToken);
        if (!result.Basarili)
        {
            return FailStatus(result.Hata ?? "Dataset statü sorgusu çalıştırılamadı.", result.SureMs);
        }

        var satirlar = result.Satirlar
            .Select(row => new DatasetCatalogStatusRow
            {
                DataModel = GetCell(row, "Data_Model")?.Trim() ?? string.Empty,
                Status = GetCell(row, "Status")?.Trim() ?? string.Empty,
                Adet = ParseInt(GetCell(row, "DatasetCount")),
                SonDurumTarihi = ParseDate(GetCell(row, "LastStatusChangeDate"))
            })
            .Where(row => !string.IsNullOrWhiteSpace(row.DataModel) && !string.IsNullOrWhiteSpace(row.Status))
            .OrderBy(row => row.DataModel, StringComparer.OrdinalIgnoreCase)
            .ThenBy(row => row.Status, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new DatasetCatalogStatusResult
        {
            Basarili = true,
            Satirlar = satirlar,
            SureMs = result.SureMs
        };
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
            logger.LogWarning(ex, "Dataset sorgu dosyası okunamadı: {Path}", relativePath);
            return (false, null, "Sorgu dosyası okunamadı.");
        }
    }

    private Task<TdQueryResult> ExecuteQueryAsync(
        DatasetCatalogAyarlar ayarlar,
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

    private static int ParseInt(string? value) =>
        int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) ? parsed : 0;

    private static DateTime? ParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed))
        {
            return parsed;
        }

        return DateTime.TryParse(value, out parsed) ? parsed : null;
    }

    private static string ToCategoryId(string value)
    {
        var slug = Regex.Replace(value.Trim().ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');
        return string.IsNullOrEmpty(slug) ? "diger" : slug;
    }

    private static DatasetCatalogResult Fail(string hata, int sureMs = 0) => new()
    {
        Basarili = false,
        Hata = hata,
        SureMs = sureMs
    };

    private static DatasetCatalogListResult FailList(string hata, int sureMs = 0) => new()
    {
        Basarili = false,
        Hata = hata,
        SureMs = sureMs
    };

    private static DatasetCatalogStatusResult FailStatus(string hata, int sureMs = 0) => new()
    {
        Basarili = false,
        Hata = hata,
        SureMs = sureMs
    };
}
