namespace MerkeziFinansalVeri.Domain.Entities;

public class RaporSonucSnapshot
{
    public int SnapshotId { get; set; }
    public string RaporKodu { get; set; } = string.Empty;
    public int? DonemId { get; set; }
    public string? JsonSonuc { get; set; }
    public DateTime OlusturmaZamani { get; set; }

    public RaporTanim RaporTanim { get; set; } = null!;
    public MutabakatDonem? Donem { get; set; }
}
