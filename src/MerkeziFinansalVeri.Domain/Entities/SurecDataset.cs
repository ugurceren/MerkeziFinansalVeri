namespace MerkeziFinansalVeri.Domain.Entities;

public class SurecDataset
{
    public int DatasetId { get; set; }
    public string Kod { get; set; } = string.Empty;
    public string Etiket { get; set; } = string.Empty;
    public string? KatmanKodu { get; set; }
    public string? DomainId { get; set; }
    public int Sira { get; set; }

    public VeriKatmani? VeriKatmani { get; set; }
    public VeriDomain? VeriDomain { get; set; }
    public ICollection<SurecGorevTanim> SurecGorevTanimlari { get; set; } = [];
}
