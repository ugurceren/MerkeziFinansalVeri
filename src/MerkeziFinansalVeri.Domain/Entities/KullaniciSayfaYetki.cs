namespace MerkeziFinansalVeri.Domain.Entities;

public class KullaniciSayfaYetki
{
    public int KullaniciId { get; set; }
    public string SayfaId { get; set; } = string.Empty;
    public bool IzinVerildi { get; set; } = true;

    public Kullanici Kullanici { get; set; } = null!;
    public Sayfa Sayfa { get; set; } = null!;
}
