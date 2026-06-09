namespace MerkeziFinansalVeri.Domain.Entities;

public class SurecGorevYenidenBaslatmaLog
{
    public int LogId { get; set; }
    public int GorevTanimId { get; set; }
    public int? KullaniciId { get; set; }
    public DateTime OlusturmaZamani { get; set; }

    public SurecGorevTanim GorevTanim { get; set; } = null!;
    public Kullanici? Kullanici { get; set; }
}
