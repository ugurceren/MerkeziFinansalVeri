using MerkeziFinansalVeri.Api.Dtos;
using MerkeziFinansalVeri.Domain.Entities;
using MerkeziFinansalVeri.Infrastructure.Data;
using MerkeziFinansalVeri.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MerkeziFinansalVeri.Api.Controllers;

[ApiController]
[Route("api/kullanicilar")]
public class KullanicilarController(
    AppDbContext dbContext,
    IPermissionService permissionService,
    IActivityLogService activityLogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<KullaniciDto>>> GetList(CancellationToken cancellationToken)
    {
        var items = await dbContext.Kullanicilar
            .AsNoTracking()
            .Include(k => k.Rol)
            .Where(k => !k.SilindiMi)
            .OrderBy(k => k.Ad)
            .Select(k => ToDto(k))
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<KullaniciDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.Kullanicilar
            .AsNoTracking()
            .Include(k => k.Rol)
            .FirstOrDefaultAsync(k => k.KullaniciId == id && !k.SilindiMi, cancellationToken);

        if (entity is null)
        {
            return NotFound();
        }

        return Ok(ToDto(entity));
    }

    [HttpPost]
    public async Task<ActionResult<KullaniciDto>> Create(
        [FromBody] KullaniciCreateDto dto,
        CancellationToken cancellationToken)
    {
        var entity = new Kullanici
        {
            KullaniciId = dto.KullaniciId,
            Ad = dto.Ad,
            Eposta = dto.Eposta,
            RolId = dto.RolId,
            Durum = dto.Durum,
            OlusturmaZamani = DateTime.UtcNow
        };

        dbContext.Kullanicilar.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        await dbContext.Entry(entity).Reference(e => e.Rol).LoadAsync(cancellationToken);

        await activityLogService.LogAsync("kullanici", "Kullanıcı oluşturuldu", dto.Ad, HttpContext.GetCurrentUserId(), cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = entity.KullaniciId }, ToDto(entity));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<KullaniciDto>> Update(
        int id,
        [FromBody] KullaniciUpdateDto dto,
        CancellationToken cancellationToken)
    {
        var entity = await dbContext.Kullanicilar
            .Include(k => k.Rol)
            .FirstOrDefaultAsync(k => k.KullaniciId == id && !k.SilindiMi, cancellationToken);

        if (entity is null)
        {
            return NotFound();
        }

        entity.Ad = dto.Ad;
        entity.Eposta = dto.Eposta;
        entity.RolId = dto.RolId;
        entity.Durum = dto.Durum;
        entity.GuncellemeZamani = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        await activityLogService.LogAsync("kullanici", "Kullanıcı güncellendi", dto.Ad, HttpContext.GetCurrentUserId(), cancellationToken);

        return Ok(ToDto(entity));
    }

    [HttpGet("{id:int}/yetkiler")]
    public async Task<ActionResult<IReadOnlyList<SayfaYetkiApiDto>>> GetYetkiler(int id, CancellationToken cancellationToken)
    {
        var exists = await dbContext.Kullanicilar.AnyAsync(k => k.KullaniciId == id && !k.SilindiMi, cancellationToken);
        if (!exists)
        {
            return NotFound();
        }

        var yetkiler = await permissionService.GetEffectivePermissionsAsync(id, cancellationToken);
        return Ok(yetkiler.Select(y => new SayfaYetkiApiDto
        {
            SayfaId = y.SayfaId,
            Etiket = y.Etiket,
            Bolum = y.Bolum,
            IzinVerildi = y.IzinVerildi,
            RolVarsayilan = y.RolVarsayilan,
            KullaniciOverride = y.KullaniciOverride
        }).ToList());
    }

    [HttpPut("{id:int}/yetkiler")]
    public async Task<IActionResult> UpdateYetkiler(
        int id,
        [FromBody] IReadOnlyList<KullaniciYetkiGuncelleDto> yetkiler,
        CancellationToken cancellationToken)
    {
        var kullanici = await dbContext.Kullanicilar
            .FirstOrDefaultAsync(k => k.KullaniciId == id && !k.SilindiMi, cancellationToken);

        if (kullanici is null)
        {
            return NotFound();
        }

        var mevcut = await dbContext.KullaniciSayfaYetkileri
            .Where(k => k.KullaniciId == id)
            .ToListAsync(cancellationToken);

        dbContext.KullaniciSayfaYetkileri.RemoveRange(mevcut);

        foreach (var yetki in yetkiler)
        {
            dbContext.KullaniciSayfaYetkileri.Add(new KullaniciSayfaYetki
            {
                KullaniciId = id,
                SayfaId = yetki.SayfaId,
                IzinVerildi = yetki.IzinVerildi
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await activityLogService.LogAsync("yetki", "Kullanıcı yetkileri güncellendi", kullanici.Ad, HttpContext.GetCurrentUserId(), cancellationToken);

        return NoContent();
    }

    [HttpPost("{id:int}/yetkiler/sifirla")]
    public async Task<IActionResult> SifirlaYetkiler(int id, CancellationToken cancellationToken)
    {
        var kullanici = await dbContext.Kullanicilar
            .FirstOrDefaultAsync(k => k.KullaniciId == id && !k.SilindiMi, cancellationToken);

        if (kullanici is null)
        {
            return NotFound();
        }

        var mevcut = await dbContext.KullaniciSayfaYetkileri
            .Where(k => k.KullaniciId == id)
            .ToListAsync(cancellationToken);

        dbContext.KullaniciSayfaYetkileri.RemoveRange(mevcut);
        await dbContext.SaveChangesAsync(cancellationToken);

        await activityLogService.LogAsync("yetki", "Kullanıcı yetkileri sıfırlandı", kullanici.Ad, HttpContext.GetCurrentUserId(), cancellationToken);

        return NoContent();
    }

    private static KullaniciDto ToDto(Kullanici k) => new()
    {
        KullaniciId = k.KullaniciId,
        Ad = k.Ad,
        Eposta = k.Eposta,
        RolId = k.RolId,
        RolAdi = k.Rol?.Ad,
        Durum = k.Durum,
        SonGiris = k.SonGiris
    };
}
