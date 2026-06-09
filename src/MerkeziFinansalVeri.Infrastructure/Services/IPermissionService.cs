namespace MerkeziFinansalVeri.Infrastructure.Services;

public interface IPermissionService
{
    Task<IReadOnlyList<SayfaYetkiDto>> GetEffectivePermissionsAsync(int kullaniciId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SayfaYetkiDto>> GetRolePermissionsAsync(string rolId, CancellationToken cancellationToken = default);
}

public sealed class SayfaYetkiDto
{
    public string SayfaId { get; init; } = string.Empty;
    public string Etiket { get; init; } = string.Empty;
    public string Bolum { get; init; } = string.Empty;
    public bool IzinVerildi { get; init; }
    public bool RolVarsayilan { get; init; }
    public bool KullaniciOverride { get; init; }
}
