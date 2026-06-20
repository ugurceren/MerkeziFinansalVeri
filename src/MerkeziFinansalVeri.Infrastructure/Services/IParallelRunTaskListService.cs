namespace MerkeziFinansalVeri.Infrastructure.Services;

public interface IParallelRunTaskListService
{
    ParallelRunTaskListAyarlar GetAyarlar();

    Task<ParallelRunTaskListResult> GetTaskListAsync(CancellationToken cancellationToken = default);
}

public sealed class ParallelRunTaskListAyarlar
{
    public string KatmanKodu { get; init; } = "TDUTIL";
    public string SorguDosyasi { get; init; } = "config/queries/td-parallel-run.sql";
    public int MaxSatir { get; init; } = 100000;
    public int SorguTimeoutSaniye { get; init; } = 120;
}

public sealed class ParallelRunTaskListResult
{
    public bool Basarili { get; init; }
    public string? Hata { get; init; }
    public IReadOnlyList<ParallelRunTaskListItem> Kayitlar { get; init; } = [];
    public int SureMs { get; init; }
}

public sealed class ParallelRunTaskListItem
{
    public string Katman { get; init; } = string.Empty;
    public string DatasetKod { get; init; } = string.Empty;
    public string DatasetEtiket { get; init; } = string.Empty;
    public string Task { get; init; } = string.Empty;
    public string YuklemePeriyodu { get; init; } = string.Empty;
    public int? TransferTypeId { get; init; }
    public string TransferTipi { get; init; } = string.Empty;
    public string Durum { get; init; } = "pending";
    public DateTime? SonGuncelleme { get; init; }
}
