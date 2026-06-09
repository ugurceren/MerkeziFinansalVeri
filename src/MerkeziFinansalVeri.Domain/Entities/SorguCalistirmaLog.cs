namespace MerkeziFinansalVeri.Domain.Entities;

public class SorguCalistirmaLog
{
    public int LogId { get; set; }
    public int? SorguId { get; set; }
    public string KatmanKodu { get; set; } = string.Empty;
    public DateTime CalistirmaZamani { get; set; }
    public int? SatirSayisi { get; set; }
    public int? SureMs { get; set; }
    public string? Hata { get; set; }
    public int? KullaniciId { get; set; }

    public Kullanici? Kullanici { get; set; }
}
