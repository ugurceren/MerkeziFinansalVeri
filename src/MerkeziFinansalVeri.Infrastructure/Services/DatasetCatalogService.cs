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
        MaxSatir = int.TryParse(configuration["DatasetCatalog:MaxSatir"], out var maxSatir) ? maxSatir : 100000,
        SorguTimeoutSaniye = int.TryParse(configuration["DatasetCatalog:SorguTimeoutSaniye"], out var timeout)
            ? timeout
            : 120
    };

    public async Task<DatasetCatalogResult> GetCatalogAsync(CancellationToken cancellationToken = default)
    {
        var ayarlar = GetAyarlar();
        var sqlPath = Path.Combine(repoRoot, ayarlar.SorguDosyasi.Replace('/', Path.DirectorySeparatorChar));

        if (!File.Exists(sqlPath))
        {
            return Fail($"Sorgu dosyası bulunamadı: {ayarlar.SorguDosyasi}");
        }

        string sql;
        try
        {
            sql = (await File.ReadAllTextAsync(sqlPath, cancellationToken)).Trim().TrimEnd(';');
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Dataset katalog sorgu dosyası okunamadı: {Path}", sqlPath);
            return Fail("Sorgu dosyası okunamadı.");
        }

        if (string.IsNullOrWhiteSpace(sql))
        {
            return Fail("Sorgu dosyası boş.");
        }

        var result = await tdConnectionService.ExecuteReadOnlyQueryAsync(
            ayarlar.KatmanKodu,
            sql,
            ayarlar.SorguTimeoutSaniye,
            ayarlar.MaxSatir,
            cancellationToken);

        if (!result.Basarili)
        {
            return Fail(result.Hata ?? "Dataset katalog sorgusu çalıştırılamadı.", result.SureMs);
        }

        var grouped = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in result.Satirlar)
        {
            var model = GetCell(row, "Data_Model");
            var name = GetCell(row, "Dataset_Name");
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

            if (!list.Contains(name, StringComparer.OrdinalIgnoreCase))
            {
                list.Add(name);
            }
        }

        var kategoriler = grouped
            .OrderBy(entry => entry.Key, StringComparer.OrdinalIgnoreCase)
            .Select((entry, index) => new DatasetCatalogCategory
            {
                KategoriId = ToCategoryId(entry.Key),
                Ad = entry.Key,
                Tema = ThemeCycle[index % ThemeCycle.Length],
                Datasetler = entry.Value
                    .OrderBy(name => name, StringComparer.OrdinalIgnoreCase)
                    .Select(name => new DatasetCatalogItem { Ad = name })
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

    private static string? GetCell(IReadOnlyDictionary<string, object?> row, string columnName)
    {
        if (row.TryGetValue(columnName, out var direct) && direct is not null)
        {
            return Convert.ToString(direct);
        }

        var key = row.Keys.FirstOrDefault(k => string.Equals(k, columnName, StringComparison.OrdinalIgnoreCase));
        if (key is null || !row.TryGetValue(key, out var value) || value is null)
        {
            return null;
        }

        return Convert.ToString(value);
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
}
