namespace MerkeziFinansalVeri.Domain.Entities;

public class SurecGorevTanim
{
    public int GorevTanimId { get; set; }
    public int DatasetId { get; set; }
    public string Etiket { get; set; } = string.Empty;
    public int Sira { get; set; }

    public SurecDataset Dataset { get; set; } = null!;
    public ICollection<SurecGorevDurum> SurecGorevDurumlari { get; set; } = [];
    public ICollection<SurecGorevYenidenBaslatmaLog> YenidenBaslatmaLoglari { get; set; } = [];
}
