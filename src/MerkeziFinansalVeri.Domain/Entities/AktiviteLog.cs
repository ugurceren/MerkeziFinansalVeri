namespace MerkeziFinansalVeri.Domain.Entities;

public class AktiviteLog
{
    public int LogId { get; set; }
    public string OlayTipi { get; set; } = string.Empty;
    public string Baslik { get; set; } = string.Empty;
    public string? Detay { get; set; }
    public int? KullaniciId { get; set; }
    public DateTime OlusturmaZamani { get; set; }

    public Kullanici? Kullanici { get; set; }
}
