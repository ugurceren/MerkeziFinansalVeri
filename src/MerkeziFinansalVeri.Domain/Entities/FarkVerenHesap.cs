using MerkeziFinansalVeri.Domain.Common;

namespace MerkeziFinansalVeri.Domain.Entities;

public class FarkVerenHesap : AuditBase
{
    public int FarkId { get; set; }
    public int DonemId { get; set; }
    public string HesapKodu { get; set; } = string.Empty;
    public string HesapAdi { get; set; } = string.Empty;
    public int EkipId { get; set; }
    public decimal MizanBakiye { get; set; }
    public decimal KartonBakiye { get; set; }
    public decimal Fark { get; set; }
    public string Durum { get; set; } = "acik";

    public MutabakatDonem Donem { get; set; } = null!;
    public Ekip Ekip { get; set; } = null!;
}
