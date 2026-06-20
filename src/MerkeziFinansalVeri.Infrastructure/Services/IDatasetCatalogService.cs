namespace MerkeziFinansalVeri.Infrastructure.Services;

public interface IDatasetCatalogService
{
    DatasetCatalogAyarlar GetAyarlar();

    Task<DatasetCatalogResult> GetCatalogAsync(CancellationToken cancellationToken = default);
}

public sealed class DatasetCatalogAyarlar
{
    public string KatmanKodu { get; init; } = "TDUTIL";
    public string SorguDosyasi { get; init; } = "config/queries/td-datasets.sql";
    public int MaxSatir { get; init; } = 100000;
    public int SorguTimeoutSaniye { get; init; } = 120;
}

public sealed class DatasetCatalogResult
{
    public bool Basarili { get; init; }
    public string? Hata { get; init; }
    public IReadOnlyList<DatasetCatalogCategory> Kategoriler { get; init; } = [];
    public int SureMs { get; init; }
}

public sealed class DatasetCatalogCategory
{
    public string KategoriId { get; init; } = string.Empty;
    public string Ad { get; init; } = string.Empty;
    public string Tema { get; init; } = "blue";
    public IReadOnlyList<DatasetCatalogItem> Datasetler { get; init; } = [];
}

public sealed class DatasetCatalogItem
{
    public string Ad { get; init; } = string.Empty;
}
