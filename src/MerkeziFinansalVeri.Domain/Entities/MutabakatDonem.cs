namespace MerkeziFinansalVeri.Domain.Entities;

public class MutabakatDonem
{
    public int DonemId { get; set; }
    public string YilAy { get; set; } = string.Empty;
    public string Etiket { get; set; } = string.Empty;
    public string Durum { get; set; } = string.Empty;
    public int HesapSayisi { get; set; }
    public int FarkVerenSayisi { get; set; }
    public DateOnly? KapanisTarihi { get; set; }
    public bool AktifMi { get; set; }
    public DateTime OlusturmaZamani { get; set; }
    public DateTime? GuncellemeZamani { get; set; }

    public ICollection<FarkVerenHesap> FarkVerenHesaplar { get; set; } = [];
    public ICollection<SurecGorevDurum> SurecGorevDurumlari { get; set; } = [];
    public ICollection<RaporSonucSnapshot> RaporSonucSnapshotlari { get; set; } = [];
}
