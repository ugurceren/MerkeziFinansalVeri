namespace MerkeziFinansalVeri.Domain.Entities;

public class Rol
{
    public string RolId { get; set; } = string.Empty;
    public string Ad { get; set; } = string.Empty;
    public string? Aciklama { get; set; }
    public string? RozetSinifi { get; set; }

    public ICollection<Kullanici> Kullanicilar { get; set; } = [];
    public ICollection<RolSayfaYetki> RolSayfaYetkileri { get; set; } = [];
}
