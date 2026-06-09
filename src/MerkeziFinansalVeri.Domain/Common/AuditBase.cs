namespace MerkeziFinansalVeri.Domain.Common;

public abstract class AuditBase
{
    public DateTime OlusturmaZamani { get; set; }
    public DateTime? GuncellemeZamani { get; set; }
    public bool SilindiMi { get; set; }
}
