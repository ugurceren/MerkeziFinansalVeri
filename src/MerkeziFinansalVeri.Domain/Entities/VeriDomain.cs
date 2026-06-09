namespace MerkeziFinansalVeri.Domain.Entities;

public class VeriDomain
{
    public string DomainId { get; set; } = string.Empty;
    public string Ad { get; set; } = string.Empty;
    public string Tema { get; set; } = string.Empty;
    public int Sira { get; set; }

    public ICollection<SurecDataset> SurecDatasetler { get; set; } = [];
}
