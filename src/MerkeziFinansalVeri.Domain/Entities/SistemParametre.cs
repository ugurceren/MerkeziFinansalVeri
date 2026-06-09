namespace MerkeziFinansalVeri.Domain.Entities;

public class SistemParametre
{
    public string Anahtar { get; set; } = string.Empty;
    public string Deger { get; set; } = string.Empty;
    public DateTime GuncellemeZamani { get; set; }
}
