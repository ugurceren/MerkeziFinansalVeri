using MerkeziFinansalVeri.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MerkeziFinansalVeri.Infrastructure.Services;

public sealed class VeriKalitesiKpiService(
    AppDbContext dbContext,
    ITdConnectionService tdConnectionService,
    IConfiguration configuration,
    ILogger<VeriKalitesiKpiService> logger,
    string repoRoot) : IVeriKalitesiKpiService
{
    public async Task<VeriKalitesiKpiSnapshot> GetKpiAsync(CancellationToken cancellationToken = default)
    {
        var tdKpi = await TryGetKpiFromTdUtilAsync(cancellationToken);
        if (tdKpi is not null)
        {
            return tdKpi;
        }

        logger.LogDebug("VK KPI TDUTIL'den alınamadı, yerel veritabanı kullanılıyor.");
        return await GetKpiFromLocalDbAsync(cancellationToken);
    }

    private async Task<VeriKalitesiKpiSnapshot?> TryGetKpiFromTdUtilAsync(CancellationToken cancellationToken)
    {
        var katmanKodu = configuration["VkPortalKpi:KatmanKodu"]
            ?? configuration["VkKurallar:KatmanKodu"]
            ?? "TDUTIL";
        var sorguDosyasi = configuration["VkPortalKpi:SorguDosyasi"] ?? "config/queries/vk-portal-kpi.sql";
        var timeoutSeconds = int.TryParse(configuration["VkPortalKpi:SorguTimeoutSaniye"], out var timeout) ? timeout : 60;

        var sqlPath = Path.Combine(repoRoot, sorguDosyasi.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(sqlPath))
        {
            logger.LogWarning("VK portal KPI sorgu dosyası bulunamadı: {Path}", sqlPath);
            return null;
        }

        string sql;
        try
        {
            sql = await File.ReadAllTextAsync(sqlPath, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "VK portal KPI sorgu dosyası okunamadı: {Path}", sqlPath);
            return null;
        }

        if (string.IsNullOrWhiteSpace(sql))
        {
            return null;
        }

        var result = await tdConnectionService.ExecuteReadOnlyQueryAsync(
            katmanKodu,
            sql,
            timeoutSeconds,
            maxRows: 1,
            cancellationToken);

        if (!result.Basarili || result.Satirlar.Count == 0)
        {
            logger.LogWarning("VK portal KPI TD sorgusu başarısız: {Hata}", result.Hata);
            return null;
        }

        var row = result.Satirlar[0];
        var hatali = ReadInt(row, "SonCalistirmaHataliSayisi");
        var gecen = ReadInt(row, "SonCalistirmaGecenSayisi");
        var toplamSonuc = hatali + gecen;

        return new VeriKalitesiKpiSnapshot
        {
            ToplamKuralSayisi = ReadInt(row, "ToplamKuralSayisi"),
            AktifKuralSayisi = ReadInt(row, "AktifKuralSayisi"),
            SonCalistirmaHataliSayisi = hatali,
            SonCalistirmaGecenSayisi = gecen,
            BasariYuzdesi = toplamSonuc == 0 ? 100 : (int)(gecen * 100.0 / toplamSonuc),
            SonCalistirmaTarihi = ReadDateOnly(row, "SonCalistirmaTarihi"),
            Kaynak = "tdutil"
        };
    }

    private async Task<VeriKalitesiKpiSnapshot> GetKpiFromLocalDbAsync(CancellationToken cancellationToken)
    {
        var toplamKural = await dbContext.VeriKalitesiKurallari.CountAsync(cancellationToken);
        var aktifKural = await dbContext.VeriKalitesiKurallari
            .CountAsync(k => k.Durum.ToLower() == "aktif" || k.Durum.ToLower() == "active", cancellationToken);

        var sonTarih = await dbContext.VeriKalitesiKuralSonuclari
            .MaxAsync(s => (DateOnly?)s.CalistirmaTarihi, cancellationToken);

        var sonCalistirmaHatali = 0;
        var sonCalistirmaGecen = 0;
        if (sonTarih.HasValue)
        {
            var sonuclar = await dbContext.VeriKalitesiKuralSonuclari
                .AsNoTracking()
                .Where(s => s.CalistirmaTarihi == sonTarih.Value)
                .Select(s => new { s.HataliSayi, s.Sonuc })
                .ToListAsync(cancellationToken);

            foreach (var s in sonuclar)
            {
                if (IsVkSonucHatali(s.HataliSayi, s.Sonuc))
                    sonCalistirmaHatali++;
                else
                    sonCalistirmaGecen++;
            }
        }

        var toplamSonuc = sonCalistirmaHatali + sonCalistirmaGecen;

        return new VeriKalitesiKpiSnapshot
        {
            ToplamKuralSayisi = toplamKural,
            AktifKuralSayisi = aktifKural,
            SonCalistirmaHataliSayisi = sonCalistirmaHatali,
            SonCalistirmaGecenSayisi = sonCalistirmaGecen,
            BasariYuzdesi = toplamSonuc == 0 ? 100 : (int)(sonCalistirmaGecen * 100.0 / toplamSonuc),
            SonCalistirmaTarihi = sonTarih,
            Kaynak = "local"
        };
    }

    private static int ReadInt(IReadOnlyDictionary<string, object?> row, string key)
    {
        if (!row.TryGetValue(key, out var value) || value is null)
        {
            return 0;
        }

        return value switch
        {
            int i => i,
            long l => (int)l,
            decimal d => (int)d,
            double dbl => (int)dbl,
            string s when int.TryParse(s, out var parsed) => parsed,
            _ => Convert.ToInt32(value)
        };
    }

    private static DateOnly? ReadDateOnly(IReadOnlyDictionary<string, object?> row, string key)
    {
        if (!row.TryGetValue(key, out var value) || value is null)
        {
            return null;
        }

        return value switch
        {
            DateOnly d => d,
            DateTime dt => DateOnly.FromDateTime(dt),
            string s when DateOnly.TryParse(s, out var parsed) => parsed,
            string s when DateTime.TryParse(s, out var dtParsed) => DateOnly.FromDateTime(dtParsed),
            _ => null
        };
    }

    private static bool IsVkSonucHatali(int hataliSayi, string? sonuc)
    {
        if (hataliSayi > 0) return true;
        if (string.IsNullOrWhiteSpace(sonuc)) return false;

        var normalized = sonuc.Trim().ToLowerInvariant();
        return normalized is "hata" or "fail" or "failed" or "basarisiz" or "error"
            || normalized.Contains("hata")
            || normalized.Contains("fail");
    }
}
