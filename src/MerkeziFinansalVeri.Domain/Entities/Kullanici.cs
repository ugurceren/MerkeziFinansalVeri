using MerkeziFinansalVeri.Domain.Common;

namespace MerkeziFinansalVeri.Domain.Entities;

public class Kullanici : AuditBase
{
    public int KullaniciId { get; set; }
    public string KullaniciKodu { get; set; } = string.Empty;
    public string Ad { get; set; } = string.Empty;
    public string Eposta { get; set; } = string.Empty;
    public string RolId { get; set; } = string.Empty;
    public string Durum { get; set; } = "active";
    public DateTime? SonGiris { get; set; }

    public Rol Rol { get; set; } = null!;
    public ICollection<KullaniciSayfaYetki> KullaniciSayfaYetkileri { get; set; } = [];
    public ICollection<KurumsalHesap> OlusturduguKurumsalHesaplar { get; set; } = [];
    public ICollection<KurumsalHesap> GuncelledigiKurumsalHesaplar { get; set; } = [];
    public ICollection<SurecGorevYenidenBaslatmaLog> SurecGorevYenidenBaslatmaLoglari { get; set; } = [];
    public ICollection<KayitliSorgu> KayitliSorgular { get; set; } = [];
    public ICollection<AktiviteLog> AktiviteLoglari { get; set; } = [];
    public ICollection<SorguCalistirmaLog> SorguCalistirmaLoglari { get; set; } = [];
}
