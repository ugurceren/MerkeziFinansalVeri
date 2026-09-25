using MerkeziFinansalVeri.Api.Dtos;
using MerkeziFinansalVeri.Domain.Entities;
using MerkeziFinansalVeri.Infrastructure.Data;
using MerkeziFinansalVeri.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace MerkeziFinansalVeri.Api.Controllers;

[ApiController]
[Route("api/kullanicilar")]
public partial class KullanicilarController(
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
        var denied = await PermissionAuthorization.EnsurePageAccessAsync(
            this, permissionService, "kullanici-yonetimi", cancellationToken);
        if (denied is not null) return denied;

        var kod = dto.KullaniciKodu?.Trim() ?? string.Empty;
        var ad = dto.Ad?.Trim() ?? string.Empty;
        var eposta = dto.Eposta?.Trim() ?? string.Empty;
        var rolId = dto.RolId?.Trim() ?? string.Empty;
        var durum = dto.Durum == "passive" ? "passive" : "active";

        if (kod.Length == 0 || ad.Length == 0 || eposta.Length == 0 || rolId.Length == 0)
        {
            return BadRequest(new { message = "Kullanıcı kodu, ad soyad, e-posta ve rol zorunludur." });
        }

        if (dto.KullaniciId is <= 0)
        {
            return BadRequest(new { message = "Sicil no pozitif bir sayı olmalıdır; bilinmiyorsa boş bırakın." });
        }

        var kullaniciId = dto.KullaniciId ?? await NextOtomatikKullaniciIdAsync(cancellationToken);

        if (!EpostaRegex().IsMatch(eposta))
        {
            return BadRequest(new { message = "Geçerli bir e-posta adresi girin." });
        }

        if (!await dbContext.Roller.AnyAsync(r => r.RolId == rolId, cancellationToken))
        {
            return BadRequest(new { message = $"'{rolId}' rolü bulunamadı." });
        }

        var kodKullanimda = await dbContext.Kullanicilar.AnyAsync(
            k => k.KullaniciKodu == kod && k.KullaniciId != kullaniciId && !k.SilindiMi,
            cancellationToken);
        if (kodKullanimda)
        {
            return Conflict(new { message = $"'{kod}' kullanıcı kodu başka bir kullanıcıda kayıtlı." });
        }

        // UserId sicil numarasıdır; silinmiş bir kullanıcıya aitse yeni bilgilerle geri getirilir
        var entity = await dbContext.Kullanicilar
            .FirstOrDefaultAsync(k => k.KullaniciId == kullaniciId, cancellationToken);
        var geriGetirildi = entity is not null;

        if (entity is { SilindiMi: false })
        {
            return Conflict(new { message = $"{kullaniciId} sicil numaralı kullanıcı zaten kayıtlı ({entity.Ad})." });
        }

        if (entity is null)
        {
            entity = new Kullanici
            {
                KullaniciId = kullaniciId,
                OlusturmaZamani = DateTime.UtcNow
            };
            dbContext.Kullanicilar.Add(entity);
        }
        else
        {
            entity.SilindiMi = false;
            entity.GuncellemeZamani = DateTime.UtcNow;
        }

        entity.KullaniciKodu = kod;
        entity.Ad = ad;
        entity.Eposta = eposta;
        entity.RolId = rolId;
        entity.Durum = durum;

        await dbContext.SaveChangesAsync(cancellationToken);
        await dbContext.Entry(entity).Reference(e => e.Rol).LoadAsync(cancellationToken);

        await activityLogService.LogAsync(
            "kullanici",
            geriGetirildi ? "Silinmiş kullanıcı geri getirildi" : "Kullanıcı oluşturuldu",
            ad,
            HttpContext.GetCurrentUserId(),
            cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = entity.KullaniciId }, ToDto(entity));
    }

    /* Sicil no girilmeyen kullanıcılar gerçek sicil numaralarıyla çakışmasın diye ayrı aralıktan numara alır */
    private const int OtomatikKullaniciIdBaslangic = 900001;

    private async Task<int> NextOtomatikKullaniciIdAsync(CancellationToken cancellationToken)
    {
        var enBuyuk = await dbContext.Kullanicilar
            .Where(k => k.KullaniciId >= OtomatikKullaniciIdBaslangic)
            .MaxAsync(k => (int?)k.KullaniciId, cancellationToken);
        return (enBuyuk ?? OtomatikKullaniciIdBaslangic - 1) + 1;
    }

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
    private static partial Regex EpostaRegex();

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

        entity.KullaniciKodu = dto.KullaniciKodu;
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

        var rolYetkileri = (await dbContext.RolSayfaYetkileri
            .AsNoTracking()
            .Where(r => r.RolId == kullanici.RolId)
            .Select(r => r.SayfaId)
            .ToListAsync(cancellationToken)).ToHashSet();

        foreach (var yetki in yetkiler)
        {
            var rolVarsayilan = rolYetkileri.Contains(yetki.SayfaId);
            if (yetki.IzinVerildi == rolVarsayilan)
            {
                continue;
            }

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
        KullaniciKodu = k.KullaniciKodu,
        Ad = k.Ad,
        Eposta = k.Eposta,
        RolId = k.RolId,
        RolAdi = k.Rol?.Ad,
        Durum = k.Durum,
        SonGiris = k.SonGiris
    };
}
