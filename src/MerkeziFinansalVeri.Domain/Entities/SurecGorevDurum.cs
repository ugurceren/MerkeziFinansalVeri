namespace MerkeziFinansalVeri.Domain.Entities;

public class SurecGorevDurum
{
    public int GorevDurumId { get; set; }
    public int GorevTanimId { get; set; }
    public int? DonemId { get; set; }
    public string Durum { get; set; } = "pending";
    public DateTime SonGuncelleme { get; set; }

    public SurecGorevTanim GorevTanim { get; set; } = null!;
    public MutabakatDonem? Donem { get; set; }
}
