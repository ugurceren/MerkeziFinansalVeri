namespace MerkeziFinansalVeri.Api.Dtos;

public sealed class KurumsalHesapDto
{
    public int HesapNo { get; set; }
    public int HesapId { get; set; }
    public string HesapAdi { get; set; } = string.Empty;
    public int EkipId { get; set; }
    public string? EkipAdi { get; set; }
    public string? BeklenenAksiyon { get; set; }
    public string? Kaynak { get; set; }
    public DateOnly KayitTarihi { get; set; }
    public DateTime GuncellemeTarihi { get; set; }
}

public sealed class KurumsalHesapCreateDto
{
    public int HesapId { get; set; }
    public string HesapAdi { get; set; } = string.Empty;
    public int EkipId { get; set; }
    public string? BeklenenAksiyon { get; set; }
    public string? Kaynak { get; set; }
    public DateOnly KayitTarihi { get; set; }
}

public sealed class KurumsalHesapUpdateDto
{
    public string HesapAdi { get; set; } = string.Empty;
    public int EkipId { get; set; }
    public string? BeklenenAksiyon { get; set; }
    public string? Kaynak { get; set; }
}
