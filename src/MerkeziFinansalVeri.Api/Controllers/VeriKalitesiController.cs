using MerkeziFinansalVeri.Api.Dtos;
using MerkeziFinansalVeri.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MerkeziFinansalVeri.Api.Controllers;

[ApiController]
[Route("api/veri-kalitesi")]
public class VeriKalitesiController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet("kurallar")]
    public async Task<ActionResult<IReadOnlyList<VeriKalitesiKuralDto>>> GetKurallar(CancellationToken cancellationToken)
    {
        var items = await dbContext.VeriKalitesiKurallari
            .AsNoTracking()
            .OrderBy(k => k.KuralId)
            .Select(k => new VeriKalitesiKuralDto
            {
                KuralId = k.KuralId,
                Ad = k.Ad,
                Alan = k.Alan,
                Onem = k.Onem,
                Durum = k.Durum
            })
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpGet("gunluk-sonuclar")]
    public async Task<ActionResult<IReadOnlyList<VeriKalitesiGunlukSonucDto>>> GetGunlukSonuclar(
        [FromQuery] DateOnly? tarih,
        [FromQuery] int gun = 7,
        CancellationToken cancellationToken = default)
    {
        var query = dbContext.VeriKalitesiKuralSonuclari
            .AsNoTracking()
            .Include(s => s.Kural)
            .AsQueryable();

        if (tarih.HasValue)
        {
            query = query.Where(s => s.CalistirmaTarihi == tarih.Value);
        }
        else
        {
            var minTarih = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-Math.Clamp(gun, 1, 90)));
            query = query.Where(s => s.CalistirmaTarihi >= minTarih);
        }

        var items = await query
            .OrderByDescending(s => s.CalistirmaTarihi)
            .ThenBy(s => s.KuralId)
            .Select(s => new VeriKalitesiGunlukSonucDto
            {
                CalistirmaTarihi = s.CalistirmaTarihi,
                KuralId = s.KuralId,
                KuralAdi = s.Kural.Ad,
                GecenSayi = s.GecenSayi,
                HataliSayi = s.HataliSayi,
                Sonuc = s.Sonuc
            })
            .ToListAsync(cancellationToken);

        return Ok(items);
    }
}
