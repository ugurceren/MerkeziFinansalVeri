using MerkeziFinansalVeri.Api.Dtos;
using MerkeziFinansalVeri.Domain.Entities;
using MerkeziFinansalVeri.Infrastructure.Data;
using MerkeziFinansalVeri.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MerkeziFinansalVeri.Api.Controllers;

[ApiController]
[Route("api/mizan")]
public class MizanController(
    AppDbContext dbContext,
    IActivityLogService activityLogService) : ControllerBase
{
    private const string MizanDatasetKod = "ds_mizan";

    [HttpGet("gorevler")]
    public async Task<ActionResult<IReadOnlyList<MizanGorevDto>>> GetGorevler(CancellationToken cancellationToken)
    {
        var donemId = await dbContext.MutabakatDonemleri
            .AsNoTracking()
            .Where(d => d.AktifMi)
            .Select(d => (int?)d.DonemId)
            .FirstOrDefaultAsync(cancellationToken);

        var tanimlar = await dbContext.SurecGorevTanimlari
            .AsNoTracking()
            .Include(t => t.Dataset)
            .Where(t => t.Dataset.Kod == MizanDatasetKod)
            .OrderBy(t => t.Sira)
            .ToListAsync(cancellationToken);

        var durumlar = await dbContext.SurecGorevDurumlari
            .AsNoTracking()
            .Where(d => d.DonemId == donemId)
            .ToDictionaryAsync(d => d.GorevTanimId, cancellationToken);

        var items = tanimlar.Select(t =>
        {
            durumlar.TryGetValue(t.GorevTanimId, out var durum);
            return new MizanGorevDto
            {
                GorevTanimId = t.GorevTanimId,
                Etiket = t.Etiket,
                Durum = durum?.Durum ?? "pending",
                SonGuncelleme = durum?.SonGuncelleme
            };
        }).ToList();

        return Ok(items);
    }

    [HttpPut("gorevler/{gorevTanimId:int}")]
    public async Task<ActionResult<MizanGorevDto>> UpdateGorev(
        int gorevTanimId,
        [FromBody] MizanGorevGuncelleDto dto,
        CancellationToken cancellationToken)
    {
        var tanim = await dbContext.SurecGorevTanimlari
            .AsNoTracking()
            .Include(t => t.Dataset)
            .FirstOrDefaultAsync(t => t.GorevTanimId == gorevTanimId && t.Dataset.Kod == MizanDatasetKod, cancellationToken);

        if (tanim is null)
        {
            return NotFound();
        }

        var donemId = await dbContext.MutabakatDonemleri
            .Where(d => d.AktifMi)
            .Select(d => (int?)d.DonemId)
            .FirstOrDefaultAsync(cancellationToken);

        var durum = await dbContext.SurecGorevDurumlari
            .FirstOrDefaultAsync(d => d.GorevTanimId == gorevTanimId && d.DonemId == donemId, cancellationToken);

        if (durum is null)
        {
            durum = new SurecGorevDurum
            {
                GorevTanimId = gorevTanimId,
                DonemId = donemId,
                Durum = dto.Durum,
                SonGuncelleme = DateTime.UtcNow
            };
            dbContext.SurecGorevDurumlari.Add(durum);
        }
        else
        {
            durum.Durum = dto.Durum;
            durum.SonGuncelleme = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new MizanGorevDto
        {
            GorevTanimId = tanim.GorevTanimId,
            Etiket = tanim.Etiket,
            Durum = durum.Durum,
            SonGuncelleme = durum.SonGuncelleme
        });
    }

    [HttpPost("gorevler/yeniden-baslat")]
    public async Task<IActionResult> YenidenBaslat(
        [FromBody] MizanYenidenBaslatDto dto,
        CancellationToken cancellationToken)
    {
        var tanim = await dbContext.SurecGorevTanimlari
            .AsNoTracking()
            .Include(t => t.Dataset)
            .FirstOrDefaultAsync(t => t.GorevTanimId == dto.GorevTanimId && t.Dataset.Kod == MizanDatasetKod, cancellationToken);

        if (tanim is null)
        {
            return NotFound();
        }

        var kullaniciId = HttpContext.GetCurrentUserId();

        dbContext.SurecGorevYenidenBaslatmaLoglari.Add(new SurecGorevYenidenBaslatmaLog
        {
            GorevTanimId = dto.GorevTanimId,
            KullaniciId = kullaniciId,
            OlusturmaZamani = DateTime.UtcNow
        });

        var donemId = await dbContext.MutabakatDonemleri
            .Where(d => d.AktifMi)
            .Select(d => (int?)d.DonemId)
            .FirstOrDefaultAsync(cancellationToken);

        var durum = await dbContext.SurecGorevDurumlari
            .FirstOrDefaultAsync(d => d.GorevTanimId == dto.GorevTanimId && d.DonemId == donemId, cancellationToken);

        if (durum is null)
        {
            dbContext.SurecGorevDurumlari.Add(new SurecGorevDurum
            {
                GorevTanimId = dto.GorevTanimId,
                DonemId = donemId,
                Durum = "running",
                SonGuncelleme = DateTime.UtcNow
            });
        }
        else
        {
            durum.Durum = "running";
            durum.SonGuncelleme = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await activityLogService.LogAsync("mizan", "Mizan görevi yeniden başlatıldı", tanim.Etiket, kullaniciId, cancellationToken);

        return Accepted();
    }
}
