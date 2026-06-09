namespace MerkeziFinansalVeri.Domain.Entities;

public class VeriKaynagi
{
    public int KaynakId { get; set; }
    public string KatmanKodu { get; set; } = string.Empty;
    public string Sunucu { get; set; } = string.Empty;
    public string Veritabani { get; set; } = string.Empty;
    public int Port { get; set; } = 1433;
    public string KimlikDogrulama { get; set; } = "sql";
    public string? KullaniciAdi { get; set; }
    public bool SifreSaklandi { get; set; }
    public string Durum { get; set; } = "unknown";
    public DateTime GuncellemeZamani { get; set; }

    public VeriKatmani VeriKatmani { get; set; } = null!;
}
