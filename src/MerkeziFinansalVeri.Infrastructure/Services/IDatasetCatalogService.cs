namespace MerkeziFinansalVeri.Infrastructure.Services;

public interface IDatasetCatalogService
{
    DatasetCatalogAyarlar GetAyarlar();

    Task<DatasetCatalogResult> GetCatalogAsync(CancellationToken cancellationToken = default);

    Task<DatasetCatalogListResult> GetListAsync(CancellationToken cancellationToken = default);

    Task<DatasetCatalogStatusResult> GetStatusAsync(CancellationToken cancellationToken = default);
}

public sealed class DatasetCatalogAyarlar
{
    public string KatmanKodu { get; init; } = "TDUTIL";
    public string SorguDosyasi { get; init; } = "config/queries/td-datasets.sql";
    public string ListeSorguDosyasi { get; init; } = "config/queries/td-datasets-list.sql";
    public string StatusSorguDosyasi { get; init; } = "config/queries/td-datasets-status.sql";
    public string StatusOzetSorguDosyasi { get; init; } = "config/queries/td-datasets-status-summary.sql";
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

public sealed class DatasetCatalogListResult
{
    public bool Basarili { get; init; }
    public string? Hata { get; init; }
    public IReadOnlyList<DatasetCatalogListItem> Kayitlar { get; init; } = [];
    public int SureMs { get; init; }
}

public sealed class DatasetCatalogStatusResult
{
    public bool Basarili { get; init; }
    public string? Hata { get; init; }
    public IReadOnlyList<DatasetCatalogStatusSummaryRow> DurumOzeti { get; init; } = [];
    public IReadOnlyList<DatasetCatalogStatusRow> ModelDurumlar { get; init; } = [];
    public int SureMs { get; init; }
}

public sealed class DatasetCatalogStatusSummaryRow
{
    public string Status { get; init; } = string.Empty;
    public int Adet { get; init; }
    public DateTime? SonDurumTarihi { get; init; }
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
    public string? DescriptionScope { get; init; }
    public string StagingTableName { get; init; } = string.Empty;
}

public sealed class DatasetCatalogListItem
{
    public string DatasetName { get; init; } = string.Empty;
    public string? DescriptionScope { get; init; }
    public string Layer { get; init; } = string.Empty;
    public string StagingTableName { get; init; } = string.Empty;
    public string KtResponsibleItUnit { get; init; } = string.Empty;
    public string? Note { get; init; }
    public string TdAnalyst { get; init; } = string.Empty;
    public string Tester { get; init; } = string.Empty;
    public string DataModel { get; init; } = string.Empty;
    public string? KtSpName { get; init; }
    public string Status { get; init; } = string.Empty;
    public string StatusResponsible { get; init; } = string.Empty;
    public DateTime? StatusChangeDate { get; init; }
}

public sealed class DatasetCatalogStatusRow
{
    public string DataModel { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public int Adet { get; init; }
    public DateTime? SonDurumTarihi { get; init; }
}
