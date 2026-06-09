namespace MerkeziFinansalVeri.Domain.Entities;

public class VeriKatmani
{
    public string KatmanKodu { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public string Tema { get; set; } = string.Empty;
    public int Sira { get; set; }

    public ICollection<VeriKaynagi> VeriKaynaklari { get; set; } = [];
    public ICollection<SurecDataset> SurecDatasetler { get; set; } = [];
}
