namespace MerkeziFinansalVeri.Api.Dtos;

public sealed class RolDto
{
    public string RolId { get; set; } = string.Empty;
    public string Ad { get; set; } = string.Empty;
    public string? Aciklama { get; set; }
    public string? RozetSinifi { get; set; }
}

public sealed class MutabakatDonemDto
{
    public int DonemId { get; set; }
    public string YilAy { get; set; } = string.Empty;
    public string Etiket { get; set; } = string.Empty;
    public string Durum { get; set; } = string.Empty;
    public int HesapSayisi { get; set; }
    public int FarkVerenSayisi { get; set; }
    public DateOnly? KapanisTarihi { get; set; }
    public bool AktifMi { get; set; }
}

public sealed class MutabakatDonemUpdateDto
{
    public string Etiket { get; set; } = string.Empty;
    public string Durum { get; set; } = string.Empty;
    public DateOnly? KapanisTarihi { get; set; }
}

public sealed class MutabakatAktifDonemDto
{
    public int DonemId { get; set; }
}

public sealed class FarkVerenHesapDto
{
    public int FarkId { get; set; }
    public int DonemId { get; set; }
    public string HesapKodu { get; set; } = string.Empty;
    public string HesapAdi { get; set; } = string.Empty;
    public int EkipId { get; set; }
    public string? EkipAdi { get; set; }
    public decimal MizanBakiye { get; set; }
    public decimal KartonBakiye { get; set; }
    public decimal Fark { get; set; }
    public string Durum { get; set; } = string.Empty;
}
