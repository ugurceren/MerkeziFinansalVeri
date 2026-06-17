namespace MerkeziFinansalVeri.Api.Dtos;

public sealed class NazimHesaplariCalistirDto
{
    public DateOnly DataDate { get; set; }
    public string? LevelName { get; set; }
    public int? FECId { get; set; }
    public int? BranchId { get; set; }
    public string? MinToLedgerId { get; set; }
    public string? MaxToLedgerId { get; set; }
    public decimal? MinDifferenceAmount { get; set; }
}

public sealed class NazimHesaplariAyarDto
{
    public string KatmanKodu { get; set; } = "TDREPORT";
    public string StoredProcedure { get; set; } = string.Empty;
    public int MaxSatir { get; set; }
    public int SorguTimeoutSaniye { get; set; }
    public IReadOnlyList<string> KolonSira { get; set; } = [];
    public IReadOnlyDictionary<string, string> KolonEtiketleri { get; set; }
        = new Dictionary<string, string>();
}

public sealed class NazimHesaplariSonucDto
{
    public bool Basarili { get; set; }
    public string? Hata { get; set; }
    public IReadOnlyList<string> Kolonlar { get; set; } = [];
    public IReadOnlyList<Dictionary<string, object?>> Satirlar { get; set; } = [];
    public int SatirSayisi { get; set; }
    public int SureMs { get; set; }
    public bool Kisitlandi { get; set; }
    public int MaxSatir { get; set; }
}
