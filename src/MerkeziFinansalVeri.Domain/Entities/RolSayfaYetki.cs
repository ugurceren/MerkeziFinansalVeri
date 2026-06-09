namespace MerkeziFinansalVeri.Domain.Entities;

public class RolSayfaYetki
{
    public string RolId { get; set; } = string.Empty;
    public string SayfaId { get; set; } = string.Empty;

    public Rol Rol { get; set; } = null!;
    public Sayfa Sayfa { get; set; } = null!;
}
