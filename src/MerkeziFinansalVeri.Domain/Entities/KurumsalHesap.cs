namespace MerkeziFinansalVeri.Domain.Entities;

public class KurumsalHesap
{
    public int HesapNo { get; set; }
    public int HesapId { get; set; }
    public string HesapAdi { get; set; } = string.Empty;
    public int EkipId { get; set; }
    public string? BeklenenAksiyon { get; set; }
    public string? Kaynak { get; set; }
    public DateOnly KayitTarihi { get; set; }
    public DateTime GuncellemeTarihi { get; set; }
    public int? OlusturanKullaniciId { get; set; }
    public int? GuncelleyenKullaniciId { get; set; }
    public DateTime OlusturmaZamani { get; set; }
    public bool SilindiMi { get; set; }

    public Ekip Ekip { get; set; } = null!;
    public Kullanici? OlusturanKullanici { get; set; }
    public Kullanici? GuncelleyenKullanici { get; set; }
}
