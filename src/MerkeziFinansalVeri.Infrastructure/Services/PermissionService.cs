using MerkeziFinansalVeri.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace MerkeziFinansalVeri.Infrastructure.Services;

public class PermissionService(AppDbContext dbContext) : IPermissionService
{
    public async Task<IReadOnlyList<SayfaYetkiDto>> GetEffectivePermissionsAsync(
        int kullaniciId,
        CancellationToken cancellationToken = default)
    {
        var kullanici = await dbContext.Kullanicilar
            .AsNoTracking()
            .FirstOrDefaultAsync(k => k.KullaniciId == kullaniciId && !k.SilindiMi, cancellationToken);

        if (kullanici is null)
        {
            return [];
        }

        var sayfalar = await dbContext.Sayfalar
            .AsNoTracking()
            .OrderBy(s => s.Bolum).ThenBy(s => s.Sira)
            .ToListAsync(cancellationToken);

        var rolYetkileri = (await dbContext.RolSayfaYetkileri
            .AsNoTracking()
            .Where(r => r.RolId == kullanici.RolId)
            .Select(r => r.SayfaId)
            .ToListAsync(cancellationToken)).ToHashSet();

        var kullaniciYetkileri = await dbContext.KullaniciSayfaYetkileri
            .AsNoTracking()
            .Where(k => k.KullaniciId == kullaniciId)
            .ToDictionaryAsync(k => k.SayfaId, k => k.IzinVerildi, cancellationToken);

        return sayfalar.Select(s =>
        {
            var rolVarsayilan = rolYetkileri.Contains(s.SayfaId);
            var overrideVar = kullaniciYetkileri.TryGetValue(s.SayfaId, out var izin);
            var izinVerildi = overrideVar ? izin : rolVarsayilan;

            return new SayfaYetkiDto
            {
                SayfaId = s.SayfaId,
                Etiket = s.Etiket,
                Bolum = s.Bolum,
                IzinVerildi = izinVerildi,
                RolVarsayilan = rolVarsayilan,
                KullaniciOverride = overrideVar
            };
        }).ToList();
    }

    public async Task<IReadOnlyList<SayfaYetkiDto>> GetRolePermissionsAsync(
        string rolId,
        CancellationToken cancellationToken = default)
    {
        var sayfalar = await dbContext.Sayfalar
            .AsNoTracking()
            .OrderBy(s => s.Bolum).ThenBy(s => s.Sira)
            .ToListAsync(cancellationToken);

        var rolYetkileri = (await dbContext.RolSayfaYetkileri
            .AsNoTracking()
            .Where(r => r.RolId == rolId)
            .Select(r => r.SayfaId)
            .ToListAsync(cancellationToken)).ToHashSet();

        return sayfalar.Select(s => new SayfaYetkiDto
        {
            SayfaId = s.SayfaId,
            Etiket = s.Etiket,
            Bolum = s.Bolum,
            IzinVerildi = rolYetkileri.Contains(s.SayfaId),
            RolVarsayilan = rolYetkileri.Contains(s.SayfaId),
            KullaniciOverride = false
        }).ToList();
    }
}
