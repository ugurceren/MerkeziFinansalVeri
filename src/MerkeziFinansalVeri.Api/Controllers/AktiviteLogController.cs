using MerkeziFinansalVeri.Api.Dtos;
using MerkeziFinansalVeri.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MerkeziFinansalVeri.Api.Controllers;

[ApiController]
[Route("api/aktivite-log")]
public class AktiviteLogController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AktiviteLogDto>>> GetList(
        [FromQuery] string? olayTipi,
        [FromQuery] int? kullaniciId,
        [FromQuery] DateOnly? beginDate,
        [FromQuery] DateOnly? endDate,
        [FromQuery] int limit = 100,
        CancellationToken cancellationToken = default)
    {
        var query = dbContext.AktiviteLoglari
            .AsNoTracking()
            .Include(a => a.Kullanici)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(olayTipi))
        {
            query = query.Where(a => a.OlayTipi == olayTipi);
        }

        if (kullaniciId.HasValue)
        {
            query = query.Where(a => a.KullaniciId == kullaniciId.Value);
        }

        if (beginDate.HasValue)
        {
            var start = beginDate.Value.ToDateTime(TimeOnly.MinValue);
            query = query.Where(a => a.OlusturmaZamani >= start);
        }

        if (endDate.HasValue)
        {
            var endExclusive = endDate.Value.AddDays(1).ToDateTime(TimeOnly.MinValue);
            query = query.Where(a => a.OlusturmaZamani < endExclusive);
        }

        var items = await query
            .OrderByDescending(a => a.OlusturmaZamani)
            .Take(Math.Clamp(limit, 1, 500))
            .Select(a => new AktiviteLogDto
            {
                LogId = a.LogId,
                OlayTipi = a.OlayTipi,
                Baslik = a.Baslik,
                Detay = a.Detay,
                KullaniciId = a.KullaniciId,
                KullaniciAdi = a.Kullanici != null ? a.Kullanici.Ad : null,
                OlusturmaZamani = a.OlusturmaZamani
            })
            .ToListAsync(cancellationToken);

        return Ok(items);
    }
}
