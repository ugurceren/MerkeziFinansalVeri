namespace MerkeziFinansalVeri.Domain.Entities;

public class VeriKalitesiKural
{
    public string KuralId { get; set; } = string.Empty;
    public string Ad { get; set; } = string.Empty;
    public string Alan { get; set; } = string.Empty;
    public string Onem { get; set; } = string.Empty;
    public string Durum { get; set; } = "Aktif";
    public string? SqlIfade { get; set; }
    public DateTime OlusturmaZamani { get; set; }
    public DateTime? GuncellemeZamani { get; set; }

    public ICollection<VeriKalitesiKuralSonuc> KuralSonuclari { get; set; } = [];
}
