using MerkeziFinansalVeri.Domain.Common;

namespace MerkeziFinansalVeri.Domain.Entities;

public class Ekip : AuditBase
{
    public int EkipId { get; set; }
    public string Ad { get; set; } = string.Empty;
    public bool Aktif { get; set; } = true;

    public ICollection<KurumsalHesap> KurumsalHesaplar { get; set; } = [];
    public ICollection<FarkVerenHesap> FarkVerenHesaplar { get; set; } = [];
}
