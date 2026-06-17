namespace MerkeziFinansalVeri.Api.Dtos;

public sealed class TersBakiyeCalistirDto
{
    public string Mod { get; set; } = "account";
    public int? AccountNumber { get; set; }
    public IReadOnlyList<int>? AccountNumberList { get; set; }
    public string? MinLedgerCode { get; set; }
    public string? MaxLedgerCode { get; set; }
    public DateOnly BeginDate { get; set; }
    public DateOnly EndDate { get; set; }
    public int? BranchId { get; set; }
    public int? FECId { get; set; }
    public int? LedgerTypeId { get; set; }
    public byte? CreditCardLedgerFlag { get; set; }
    public byte? IncomeLossLedgerFlag { get; set; }
    public int? CustomerRiskStatusId { get; set; }
    public decimal? MinBalance { get; set; }
    public byte? AccountNumberKTFlag { get; set; }
}

public sealed class TersBakiyeAyarDto
{
    public string KatmanKodu { get; set; } = "TDREPORT";
    public string SpByAccount { get; set; } = string.Empty;
    public string SpByLedger { get; set; } = string.Empty;
    public int MaxSatir { get; set; }
    public int SorguTimeoutSaniye { get; set; }
    public IReadOnlyList<string> KolonSira { get; set; } = [];
    public IReadOnlyDictionary<string, string> KolonEtiketleri { get; set; }
        = new Dictionary<string, string>();
}

public sealed class TersBakiyeSonucDto
{
    public bool Basarili { get; set; }
    public string? Hata { get; set; }
    public string Mod { get; set; } = "account";
    public IReadOnlyList<string> Kolonlar { get; set; } = [];
    public IReadOnlyList<Dictionary<string, object?>> Satirlar { get; set; } = [];
    public int SatirSayisi { get; set; }
    public int SureMs { get; set; }
    public bool Kisitlandi { get; set; }
    public int MaxSatir { get; set; }
}
