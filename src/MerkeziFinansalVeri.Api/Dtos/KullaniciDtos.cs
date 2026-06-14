namespace MerkeziFinansalVeri.Api.Dtos;

public sealed class KullaniciDto
{
    public int KullaniciId { get; set; }
    public string KullaniciKodu { get; set; } = string.Empty;
    public string Ad { get; set; } = string.Empty;
    public string Eposta { get; set; } = string.Empty;
    public string RolId { get; set; } = string.Empty;
    public string? RolAdi { get; set; }
    public string Durum { get; set; } = string.Empty;
    public DateTime? SonGiris { get; set; }
}

public sealed class KullaniciCreateDto
{
    public int KullaniciId { get; set; }
    public string KullaniciKodu { get; set; } = string.Empty;
    public string Ad { get; set; } = string.Empty;
    public string Eposta { get; set; } = string.Empty;
    public string RolId { get; set; } = string.Empty;
    public string Durum { get; set; } = "active";
}

public sealed class KullaniciUpdateDto
{
    public string KullaniciKodu { get; set; } = string.Empty;
    public string Ad { get; set; } = string.Empty;
    public string Eposta { get; set; } = string.Empty;
    public string RolId { get; set; } = string.Empty;
    public string Durum { get; set; } = "active";
}

public sealed class SayfaYetkiApiDto
{
    public string SayfaId { get; set; } = string.Empty;
    public string Etiket { get; set; } = string.Empty;
    public string Bolum { get; set; } = string.Empty;
    public bool IzinVerildi { get; set; }
    public bool RolVarsayilan { get; set; }
    public bool KullaniciOverride { get; set; }
}

public sealed class KullaniciYetkiGuncelleDto
{
    public string SayfaId { get; set; } = string.Empty;
    public bool IzinVerildi { get; set; }
}
