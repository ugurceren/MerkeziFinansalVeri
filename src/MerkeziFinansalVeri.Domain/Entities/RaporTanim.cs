namespace MerkeziFinansalVeri.Domain.Entities;

public class RaporTanim
{
    public string RaporKodu { get; set; } = string.Empty;
    public string Ad { get; set; } = string.Empty;
    public string KaynakKatman { get; set; } = string.Empty;
    public string? ViewAdi { get; set; }
    public string? SpAdi { get; set; }

    public ICollection<RaporSonucSnapshot> RaporSonucSnapshotlari { get; set; } = [];
}
