namespace MerkeziFinansalVeri.Infrastructure.Services;

public interface IEtlLoadCockpitService
{
    EtlLoadCockpitAyarlar GetAyarlar();

    Task<EtlLoadCockpitResult> GetCockpitAsync(DateOnly? dataDate = null, CancellationToken cancellationToken = default);
}

public sealed class EtlLoadCockpitAyarlar
{
    public string KatmanKodu { get; init; } = "TDUTIL";
    public string SorguDosyasi { get; init; } = "config/queries/td-etl-load.sql";
    public string ParallelRunSorguDosyasi { get; init; } = "config/queries/td-parallel-run-packages.sql";
    public int MaxSatir { get; init; } = 100000;
    public int SorguTimeoutSaniye { get; init; } = 120;
}

public sealed class EtlLoadCockpitResult
{
    public bool Basarili { get; init; }
    public string? Hata { get; init; }
    public IReadOnlyList<EtlLoadCockpitLayer> Katmanlar { get; init; } = [];
    public int SureMs { get; init; }
}

public sealed class EtlLoadCockpitLayer
{
    public string KatmanKodu { get; init; } = string.Empty;
    public string Rol { get; init; } = string.Empty;
    public string Tema { get; init; } = "blue";
    public int PaketSayisi { get; init; }
    public int BasariliAdimSayisi { get; init; }
    public int TamamlanmaYuzdesi { get; init; }
    public IReadOnlyList<EtlLoadCockpitDataset> Datasets { get; init; } = [];
}

public sealed class EtlLoadCockpitDataset
{
    public string Kod { get; init; } = string.Empty;
    public string Etiket { get; init; } = string.Empty;
    public IReadOnlyList<EtlLoadCockpitStep> Adimlar { get; init; } = [];
}

public sealed class EtlLoadCockpitStep
{
    public string Etiket { get; init; } = string.Empty;
    public string Durum { get; init; } = "not-started";
    public string DurumMetni { get; init; } = "Not Started";
}
