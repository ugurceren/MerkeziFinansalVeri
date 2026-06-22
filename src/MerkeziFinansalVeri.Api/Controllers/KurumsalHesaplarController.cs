using MerkeziFinansalVeri.Api.Dtos;
using MerkeziFinansalVeri.Domain.Entities;
using MerkeziFinansalVeri.Infrastructure.Data;
using MerkeziFinansalVeri.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MerkeziFinansalVeri.Api.Controllers;

[ApiController]
[Route("api/kurumsal-hesaplar")]
public class KurumsalHesaplarController(
    AppDbContext dbContext,
    IActivityLogService activityLogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<KurumsalHesapDto>>> GetList(
        [FromQuery] string? hesapAdi,
        [FromQuery] int? ekip,
        [FromQuery] string? ekipAdi,
        [FromQuery] int? hesapIdMin,
        [FromQuery] int? hesapIdMax,
        CancellationToken cancellationToken)
    {
        var query = dbContext.KurumsalHesaplar
            .AsNoTracking()
            .Include(k => k.Ekip)
            .Where(k => !k.SilindiMi);

        if (!string.IsNullOrWhiteSpace(hesapAdi))
        {
            query = query.Where(k => k.HesapAdi.Contains(hesapAdi));
        }

        if (ekip.HasValue)
        {
            query = query.Where(k => k.EkipId == ekip.Value);
        }

        if (!string.IsNullOrWhiteSpace(ekipAdi))
        {
            query = query.Where(k => k.Ekip != null && k.Ekip.Ad.Contains(ekipAdi));
        }

        if (hesapIdMin.HasValue)
        {
            query = query.Where(k => k.HesapId >= hesapIdMin.Value);
        }

        if (hesapIdMax.HasValue)
        {
            query = query.Where(k => k.HesapId <= hesapIdMax.Value);
        }

        var items = await query
            .OrderBy(k => k.HesapId)
            .Select(k => ToDto(k))
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpGet("sonraki-hesap-id")]
    public async Task<ActionResult<object>> GetNextHesapId(CancellationToken cancellationToken)
    {
        var maxId = await dbContext.KurumsalHesaplar
            .MaxAsync(k => (int?)k.HesapId, cancellationToken) ?? 0;

        return Ok(new { hesapId = maxId + 1 });
    }

    [HttpGet("{hesapNo:int}")]
    public async Task<ActionResult<KurumsalHesapDto>> GetById(int hesapNo, CancellationToken cancellationToken)
    {
        var entity = await dbContext.KurumsalHesaplar
            .AsNoTracking()
            .Include(k => k.Ekip)
            .FirstOrDefaultAsync(k => k.HesapNo == hesapNo && !k.SilindiMi, cancellationToken);

        if (entity is null)
        {
            return NotFound();
        }

        return Ok(ToDto(entity));
    }

    [HttpPost]
    public async Task<ActionResult<KurumsalHesapDto>> Create(
        [FromBody] KurumsalHesapCreateDto dto,
        CancellationToken cancellationToken)
    {
        if (await HesapIdExistsAsync(dto.HesapId, cancellationToken))
        {
            return Conflict(new
            {
                message = $"Hesap ID {dto.HesapId} zaten kullanılıyor. Farklı bir ID seçin veya sonraki boş ID'yi kullanın."
            });
        }

        var entity = new KurumsalHesap
        {
            HesapId = dto.HesapId,
            HesapAdi = dto.HesapAdi,
            EkipId = dto.EkipId,
            BeklenenAksiyon = dto.BeklenenAksiyon,
            Kaynak = dto.Kaynak,
            KayitTarihi = dto.KayitTarihi,
            GuncellemeTarihi = DateTime.UtcNow,
            OlusturanKullaniciId = HttpContext.GetCurrentUserId(),
            OlusturmaZamani = DateTime.UtcNow
        };

        dbContext.KurumsalHesaplar.Add(entity);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsDuplicateHesapIdException(ex))
        {
            return Conflict(new
            {
                message = $"Hesap ID {dto.HesapId} zaten kullanılıyor. Farklı bir ID seçin veya sonraki boş ID'yi kullanın."
            });
        }

        await dbContext.Entry(entity).Reference(e => e.Ekip).LoadAsync(cancellationToken);
        await activityLogService.LogAsync("kurumsal_hesap", "Kurumsal hesap oluşturuldu", dto.HesapAdi, HttpContext.GetCurrentUserId(), cancellationToken);

        return CreatedAtAction(nameof(GetById), new { hesapNo = entity.HesapNo }, ToDto(entity));
    }

    [HttpPut("{hesapNo:int}")]
    public async Task<ActionResult<KurumsalHesapDto>> Update(
        int hesapNo,
        [FromBody] KurumsalHesapUpdateDto dto,
        CancellationToken cancellationToken)
    {
        var entity = await dbContext.KurumsalHesaplar
            .Include(k => k.Ekip)
            .FirstOrDefaultAsync(k => k.HesapNo == hesapNo && !k.SilindiMi, cancellationToken);

        if (entity is null)
        {
            return NotFound();
        }

        entity.HesapAdi = dto.HesapAdi;
        entity.EkipId = dto.EkipId;
        entity.BeklenenAksiyon = dto.BeklenenAksiyon;
        entity.Kaynak = dto.Kaynak;
        entity.GuncellemeTarihi = DateTime.UtcNow;
        entity.GuncelleyenKullaniciId = HttpContext.GetCurrentUserId();

        await dbContext.SaveChangesAsync(cancellationToken);
        await activityLogService.LogAsync("kurumsal_hesap", "Kurumsal hesap güncellendi", dto.HesapAdi, HttpContext.GetCurrentUserId(), cancellationToken);

        return Ok(ToDto(entity));
    }

    [HttpDelete("{hesapNo:int}")]
    public async Task<IActionResult> Delete(int hesapNo, CancellationToken cancellationToken)
    {
        var entity = await dbContext.KurumsalHesaplar
            .FirstOrDefaultAsync(k => k.HesapNo == hesapNo && !k.SilindiMi, cancellationToken);

        if (entity is null)
        {
            return NotFound();
        }

        entity.SilindiMi = true;
        entity.GuncellemeTarihi = DateTime.UtcNow;
        entity.GuncelleyenKullaniciId = HttpContext.GetCurrentUserId();

        await dbContext.SaveChangesAsync(cancellationToken);
        await activityLogService.LogAsync("kurumsal_hesap", "Kurumsal hesap silindi", entity.HesapAdi, HttpContext.GetCurrentUserId(), cancellationToken);

        return NoContent();
    }

    private Task<bool> HesapIdExistsAsync(int hesapId, CancellationToken cancellationToken) =>
        dbContext.KurumsalHesaplar.AnyAsync(k => k.HesapId == hesapId, cancellationToken);

    private static bool IsDuplicateHesapIdException(DbUpdateException ex) =>
        ex.InnerException?.Message.Contains("UQ_ops_CorporateAccount_AccountId", StringComparison.OrdinalIgnoreCase) == true
        || ex.InnerException?.Message.Contains("duplicate key", StringComparison.OrdinalIgnoreCase) == true;

    private static KurumsalHesapDto ToDto(KurumsalHesap k) => new()
    {
        HesapNo = k.HesapNo,
        HesapId = k.HesapId,
        HesapAdi = k.HesapAdi,
        EkipId = k.EkipId,
        EkipAdi = k.Ekip?.Ad,
        BeklenenAksiyon = k.BeklenenAksiyon,
        Kaynak = k.Kaynak,
        KayitTarihi = k.KayitTarihi,
        GuncellemeTarihi = k.GuncellemeTarihi
    };
}
