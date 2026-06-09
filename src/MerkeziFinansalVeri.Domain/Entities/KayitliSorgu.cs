namespace MerkeziFinansalVeri.Domain.Entities;

public class KayitliSorgu
{
    public int SorguId { get; set; }
    public string Ad { get; set; } = string.Empty;
    public string KatmanKodu { get; set; } = string.Empty;
    public string SqlMetin { get; set; } = string.Empty;
    public int? OlusturanKullaniciId { get; set; }
    public DateTime OlusturmaZamani { get; set; }

    public Kullanici? OlusturanKullanici { get; set; }
}
