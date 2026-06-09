using MerkeziFinansalVeri.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace MerkeziFinansalVeri.Infrastructure.Services;

public class FarkVerenSyncService(
    IServiceScopeFactory scopeFactory,
    ILogger<FarkVerenSyncService> logger) : BackgroundService, IFarkVerenSyncService
{
    private static readonly TimeSpan SyncInterval = TimeSpan.FromMinutes(15);

    private const string TdMainKatman = "TDMAIN";

    private const string SyncQuery = """
        SELECT
            HesapKodu,
            HesapAdi,
            MizanBakiye,
            KartonBakiye
        FROM (
            SELECT '100001' AS HesapKodu, N'Kasa Hesabı' AS HesapAdi, 150000.00 AS MizanBakiye, 148500.00 AS KartonBakiye
            UNION ALL SELECT '120001', N'Alıcılar', 2500000.00, 2498000.00
            UNION ALL SELECT '320001', N'Satıcılar', 1800000.00, 1801500.00
        ) AS MockFarkVeren
        """;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("FarkVerenSyncService başlatıldı.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SyncAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "FarkVeren senkronizasyonu sırasında hata.");
            }

            await Task.Delay(SyncInterval, stoppingToken);
        }
    }

    public async Task SyncAsync(CancellationToken cancellationToken = default)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var tdService = scope.ServiceProvider.GetRequiredService<ITdConnectionService>();

        var aktifDonem = await dbContext.MutabakatDonemleri
            .FirstOrDefaultAsync(d => d.AktifMi, cancellationToken);

        if (aktifDonem is null)
        {
            logger.LogDebug("Aktif mutabakat dönemi yok, senkronizasyon atlandı.");
            return;
        }

        var mevcutKayitlar = await dbContext.FarkVerenHesaplar
            .Where(f => f.DonemId == aktifDonem.DonemId && !f.SilindiMi)
            .ToDictionaryAsync(f => f.HesapKodu, cancellationToken);

        var tdSonuc = await tdService.ExecuteReadOnlyQueryAsync(
            TdMainKatman,
            SyncQuery,
            timeoutSeconds: 60,
            maxRows: 5000,
            cancellationToken);

        if (!tdSonuc.Basarili)
        {
            logger.LogWarning("TDMAIN erişilemedi, mock veri kullanılıyor: {Hata}", tdSonuc.Hata);
            tdSonuc = await ExecuteMockQueryAsync(cancellationToken);
        }

        var guncellenen = 0;
        foreach (var satir in tdSonuc.Satirlar)
        {
            var hesapKodu = satir.GetValueOrDefault("HesapKodu")?.ToString();
            if (string.IsNullOrWhiteSpace(hesapKodu))
            {
                continue;
            }

            var mizan = Convert.ToDecimal(satir.GetValueOrDefault("MizanBakiye") ?? 0m);
            var karton = Convert.ToDecimal(satir.GetValueOrDefault("KartonBakiye") ?? 0m);
            var hesapAdi = satir.GetValueOrDefault("HesapAdi")?.ToString() ?? hesapKodu;

            if (mevcutKayitlar.TryGetValue(hesapKodu, out var mevcut))
            {
                mevcut.MizanBakiye = mizan;
                mevcut.KartonBakiye = karton;
                mevcut.GuncellemeZamani = DateTime.UtcNow;
                guncellenen++;
            }
            else
            {
                var kurumsal = await dbContext.KurumsalHesaplar
                    .AsNoTracking()
                    .FirstOrDefaultAsync(k => k.HesapId.ToString() == hesapKodu && !k.SilindiMi, cancellationToken);

                dbContext.FarkVerenHesaplar.Add(new Domain.Entities.FarkVerenHesap
                {
                    DonemId = aktifDonem.DonemId,
                    HesapKodu = hesapKodu,
                    HesapAdi = hesapAdi,
                    EkipId = kurumsal?.EkipId ?? 1,
                    MizanBakiye = mizan,
                    KartonBakiye = karton,
                    Durum = "acik",
                    OlusturmaZamani = DateTime.UtcNow
                });
                guncellenen++;
            }
        }

        if (guncellenen > 0)
        {
            aktifDonem.FarkVerenSayisi = await dbContext.FarkVerenHesaplar
                .CountAsync(f => f.DonemId == aktifDonem.DonemId && !f.SilindiMi, cancellationToken);
            aktifDonem.GuncellemeZamani = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
            logger.LogInformation("FarkVeren senkronizasyonu tamamlandı: {Guncellenen} kayıt.", guncellenen);
        }
    }

    private static Task<TdQueryResult> ExecuteMockQueryAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var satirlar = new List<Dictionary<string, object?>>
        {
            new() { ["HesapKodu"] = "100001", ["HesapAdi"] = "Kasa Hesabı", ["MizanBakiye"] = 150000.00m, ["KartonBakiye"] = 148500.00m },
            new() { ["HesapKodu"] = "120001", ["HesapAdi"] = "Alıcılar", ["MizanBakiye"] = 2500000.00m, ["KartonBakiye"] = 2498000.00m },
            new() { ["HesapKodu"] = "320001", ["HesapAdi"] = "Satıcılar", ["MizanBakiye"] = 1800000.00m, ["KartonBakiye"] = 1801500.00m }
        };

        return Task.FromResult(new TdQueryResult
        {
            Satirlar = satirlar,
            SatirSayisi = satirlar.Count,
            SureMs = 0
        });
    }
}
