namespace MerkeziFinansalVeri.Domain.Entities;

public class Sayfa
{
    public string SayfaId { get; set; } = string.Empty;
    public string Bolum { get; set; } = string.Empty;
    public string? BolumIkon { get; set; }
    public string Etiket { get; set; } = string.Empty;
    public string? Href { get; set; }
    public int Sira { get; set; }

    public ICollection<RolSayfaYetki> RolSayfaYetkileri { get; set; } = [];
    public ICollection<KullaniciSayfaYetki> KullaniciSayfaYetkileri { get; set; } = [];
}
