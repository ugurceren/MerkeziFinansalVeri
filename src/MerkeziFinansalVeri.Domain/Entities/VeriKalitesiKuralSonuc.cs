namespace MerkeziFinansalVeri.Domain.Entities;

public class VeriKalitesiKuralSonuc
{
    public int SonucId { get; set; }
    public DateOnly CalistirmaTarihi { get; set; }
    public string KuralId { get; set; } = string.Empty;
    public int GecenSayi { get; set; }
    public int HataliSayi { get; set; }
    public string Sonuc { get; set; } = string.Empty;
    public string? DetayJson { get; set; }

    public VeriKalitesiKural Kural { get; set; } = null!;
}
