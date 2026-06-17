namespace MerkeziFinansalVeri.Infrastructure.Services;

public interface INazimHesaplariService
{
    NazimHesaplariAyarlar GetAyarlar();

    Task<NazimHesaplariQueryResult> CalistirAsync(
        NazimHesaplariRaporIstek istek,
        CancellationToken cancellationToken = default);
}

public sealed class NazimHesaplariAyarlar
{
    public string KatmanKodu { get; init; } = "TDREPORT";
    public string StoredProcedure { get; init; } = "RCL.rpt_OffBalanceAccountReconciliation";
    public int MaxSatir { get; init; } = 100000;
    public int SorguTimeoutSaniye { get; init; } = 300;
    public IReadOnlyList<string> KolonSira { get; init; } = [];
    public IReadOnlyDictionary<string, string> KolonEtiketleri { get; init; }
        = new Dictionary<string, string>();
}

public sealed class NazimHesaplariRaporIstek
{
    public DateOnly DataDate { get; init; }
    public string? LevelName { get; init; }
    public int? FECId { get; init; }
    public int? BranchId { get; init; }
    public string? MinToLedgerId { get; init; }
    public string? MaxToLedgerId { get; init; }
    public decimal? MinDifferenceAmount { get; init; }
}

public sealed class NazimHesaplariQueryResult
{
    public bool Basarili { get; init; }
    public string? Hata { get; init; }
    public IReadOnlyList<string> Kolonlar { get; init; } = [];
    public IReadOnlyList<Dictionary<string, object?>> Satirlar { get; init; } = [];
    public int SatirSayisi { get; init; }
    public int SureMs { get; init; }
    public bool Kisitlandi { get; init; }
    public int MaxSatir { get; init; }
}
