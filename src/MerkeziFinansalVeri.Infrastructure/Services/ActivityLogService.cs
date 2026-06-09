using MerkeziFinansalVeri.Domain.Entities;
using MerkeziFinansalVeri.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace MerkeziFinansalVeri.Infrastructure.Services;

public class ActivityLogService(AppDbContext dbContext) : IActivityLogService
{
    public async Task LogAsync(
        string olayTipi,
        string baslik,
        string? detay = null,
        int? kullaniciId = null,
        CancellationToken cancellationToken = default)
    {
        var log = new AktiviteLog
        {
            OlayTipi = olayTipi,
            Baslik = baslik,
            Detay = detay,
            KullaniciId = kullaniciId,
            OlusturmaZamani = DateTime.UtcNow
        };

        dbContext.AktiviteLoglari.Add(log);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
