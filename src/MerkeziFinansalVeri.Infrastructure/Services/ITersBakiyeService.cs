namespace MerkeziFinansalVeri.Infrastructure.Services;

public interface ITersBakiyeService
{
    TersBakiyeAyarlar GetAyarlar();

    Task<TersBakiyeQueryResult> CalistirAsync(
        TersBakiyeRaporIstek istek,
        CancellationToken cancellationToken = default);
}

public sealed class TersBakiyeAyarlar
{
    public string KatmanKodu { get; init; } = "TDREPORT";
    public string SpByAccount { get; init; } = "RCL.rpt_ReverseBalanceReconciliationByAccount";
    public string SpByLedger { get; init; } = "RCL.rpt_ReverseBalanceReconciliationByLedger";
    public string IntListTableType { get; init; } = "dbo.IntListTable";
    public int MaxSatir { get; init; } = 100000;
    public int SorguTimeoutSaniye { get; init; } = 300;
    public IReadOnlyList<string> KolonSira { get; init; } = [];
    public IReadOnlyDictionary<string, string> KolonEtiketleri { get; init; }
        = new Dictionary<string, string>();
    public IReadOnlyDictionary<string, string> FiltreKolonMap { get; init; }
        = new Dictionary<string, string>();
}

public sealed class TersBakiyeRaporIstek
{
    public string Mod { get; init; } = "account";
    public int? AccountNumber { get; init; }
    public IReadOnlyList<int>? AccountNumberList { get; init; }
    public string? MinLedgerCode { get; init; }
    public string? MaxLedgerCode { get; init; }
    public DateOnly BeginDate { get; init; }
    public DateOnly EndDate { get; init; }
    public int? BranchId { get; init; }
    public int? FECId { get; init; }
    public int? LedgerTypeId { get; init; }
    public byte? CreditCardLedgerFlag { get; init; }
    public byte? IncomeLossLedgerFlag { get; init; }
    public int? CustomerRiskStatusId { get; init; }
    public decimal? MinBalance { get; init; }
    public byte? AccountNumberKTFlag { get; init; }
}

public sealed class TersBakiyeQueryResult
{
    public bool Basarili { get; init; }
    public string? Hata { get; init; }
    public string Mod { get; init; } = "account";
    public IReadOnlyList<string> Kolonlar { get; init; } = [];
    public IReadOnlyList<Dictionary<string, object?>> Satirlar { get; init; } = [];
    public int SatirSayisi { get; init; }
    public int SureMs { get; init; }
    public bool Kisitlandi { get; init; }
    public int MaxSatir { get; init; }
}
