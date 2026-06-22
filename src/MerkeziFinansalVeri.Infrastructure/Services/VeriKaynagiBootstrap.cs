using MerkeziFinansalVeri.Domain.Entities;
using MerkeziFinansalVeri.Infrastructure.Configuration;
using MerkeziFinansalVeri.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MerkeziFinansalVeri.Infrastructure.Services;

public class VeriKaynagiBootstrap(
    AppDbContext dbContext,
    IOptions<TdConnectionsOptions> tdOptions,
    ILogger<VeriKaynagiBootstrap> logger)
{
    public async Task EnsureSeededAsync(CancellationToken cancellationToken = default)
    {
        var config = tdOptions.Value.Connections;
        if (config.Count == 0)
        {
            return;
        }

        foreach (var (katmanKodu, entry) in config)
        {
            var layerExists = await dbContext.VeriKatmanlari
                .AnyAsync(v => v.KatmanKodu == katmanKodu, cancellationToken);

            if (!layerExists)
            {
                dbContext.VeriKatmanlari.Add(new VeriKatmani
                {
                    KatmanKodu = katmanKodu,
                    Rol = katmanKodu == "TDUTIL"
                        ? "Operasyon / metadata"
                        : $"{katmanKodu} veri katmanı",
                    Tema = katmanKodu == "TDUTIL" ? "gray" : "blue",
                    Sira = katmanKodu == "TDUTIL" ? 4 : 99
                });
                logger.LogInformation("Eksik veri katmanı oluşturuldu: {KatmanKodu}", katmanKodu);
            }

            var entity = await dbContext.VeriKaynaklari
                .FirstOrDefaultAsync(v => v.KatmanKodu == katmanKodu, cancellationToken);

            if (entity is null)
            {
                dbContext.VeriKaynaklari.Add(new VeriKaynagi
                {
                    KatmanKodu = katmanKodu,
                    Sunucu = entry.Server,
                    Veritabani = entry.Database,
                    Port = entry.Port,
                    KimlikDogrulama = entry.KimlikDogrulama,
                    KullaniciAdi = entry.Username,
                    Durum = "unknown",
                    GuncellemeZamani = DateTime.UtcNow
                });
                logger.LogInformation("Veri kaynağı oluşturuldu: {KatmanKodu}", katmanKodu);
            }
            else if (entity is not null)
            {
                var needsSync = string.IsNullOrWhiteSpace(entity.Sunucu)
                    || entity.Sunucu.Contains("sirket.local", StringComparison.OrdinalIgnoreCase)
                    || !string.Equals(entity.Sunucu, entry.Server, StringComparison.OrdinalIgnoreCase)
                    || !string.Equals(entity.Veritabani, entry.Database, StringComparison.OrdinalIgnoreCase);

                if (needsSync)
                {
                    entity.Sunucu = entry.Server;
                    entity.Veritabani = entry.Database;
                    entity.Port = entry.Port;
                    entity.KimlikDogrulama = entry.KimlikDogrulama;
                    entity.KullaniciAdi = entry.Username ?? entity.KullaniciAdi;
                    entity.GuncellemeZamani = DateTime.UtcNow;
                    logger.LogInformation("Veri kaynağı config ile senkronize edildi: {KatmanKodu}", katmanKodu);
                }
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
