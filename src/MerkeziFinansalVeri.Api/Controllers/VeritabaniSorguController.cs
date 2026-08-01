using MerkeziFinansalVeri.Api.Dtos;
using MerkeziFinansalVeri.Domain.Entities;
using MerkeziFinansalVeri.Infrastructure.Configuration;
using MerkeziFinansalVeri.Infrastructure.Data;
using MerkeziFinansalVeri.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace MerkeziFinansalVeri.Api.Controllers;

[ApiController]
[Route("api/veritabani-sorgu")]
public class VeritabaniSorguController(
    ITdConnectionService tdConnectionService,
    AppDbContext dbContext,
    IActivityLogService activityLogService,
    IPermissionService permissionService,
    IConfiguration configuration,
    IOptions<TdConnectionsOptions> tdOptions,
    ILogger<VeritabaniSorguController> logger) : ControllerBase
{
    [HttpGet("ayarlar")]
    public async Task<ActionResult<VeritabaniSorguAyarDto>> Ayarlar(CancellationToken cancellationToken)
    {
        var denied = await PermissionAuthorization.EnsurePageAccessAsync(
            this, permissionService, "veritabani-sorgu", cancellationToken);
        if (denied is not null) return denied;

        var katmanlar = tdOptions.Value.Connections
            .OrderBy(k => k.Key, StringComparer.OrdinalIgnoreCase)
            .Select(k => new VeritabaniSorguKatmanDto
            {
                KatmanKodu = k.Key,
                Sunucu = k.Value.Server,
                Port = k.Value.Port,
                Veritabani = k.Value.Database,
                KimlikDogrulama = k.Value.KimlikDogrulama
            })
            .ToList();

        return Ok(new VeritabaniSorguAyarDto
        {
            VarsayilanKatman = configuration["varsayilanKatman"] ?? "TDSTG",
            MaxSatir = int.TryParse(configuration["maxSatir"], out var maxSatir) ? maxSatir : 5000,
            SorguTimeoutSaniye = int.TryParse(configuration["sorguTimeoutSaniye"], out var timeout) ? timeout : 120,
            VarsayilanSorgu = configuration["varsayilanSorgu"] ?? string.Empty,
            ConfigDosyasi = "config/td-connections.json",
            Katmanlar = katmanlar
        });
    }

    [HttpPost("calistir")]
    public async Task<ActionResult<VeritabaniSorguSonucDto>> Calistir(
        [FromBody] VeritabaniSorguRequestDto dto,
        CancellationToken cancellationToken)
    {
        var denied = await PermissionAuthorization.EnsurePageAccessAsync(
            this, permissionService, "veritabani-sorgu", cancellationToken);
        if (denied is not null) return denied;

        if (string.IsNullOrWhiteSpace(dto.Sql))
        {
            return BadRequest(new VeritabaniSorguSonucDto { Basarili = false, Hata = "Sorgu metni boş." });
        }

        var maxRows = int.TryParse(configuration["maxSatir"], out var maxSatir) ? maxSatir : 5000;
        var timeoutSeconds = int.TryParse(configuration["sorguTimeoutSaniye"], out var timeout) ? timeout : 120;
        var katman = string.IsNullOrWhiteSpace(dto.KatmanKodu) ? "TDSTG" : dto.KatmanKodu.Trim();

        TdQueryResult result;
        if (TryMapBaglanti(dto.Baglanti, katman, out var baglantiParams))
        {
            result = await tdConnectionService.ExecuteReadOnlyQueryAsync(
                baglantiParams,
                dto.Sql,
                timeoutSeconds,
                maxRows,
                cancellationToken);
            katman = FormatLogKatman(katman, dto.Baglanti);
        }
        else
        {
            result = await tdConnectionService.ExecuteReadOnlyQueryAsync(
                katman,
                dto.Sql,
                timeoutSeconds,
                maxRows,
                cancellationToken);
        }

        await TryLogExecutionAsync(katman, result, cancellationToken);

        if (!result.Basarili)
        {
            await TryActivityLogAsync(
                "veritabani_sorgu",
                "Sorgu hatası",
                $"{katman}: {result.Hata}",
                cancellationToken);

            return Ok(ToDto(result, kisitlandi: false, maxRows));
        }

        await TryActivityLogAsync(
            "veritabani_sorgu",
            "Sorgu çalıştırıldı",
            $"{katman} — {result.SatirSayisi} satır, {result.SureMs} ms",
            cancellationToken);

        var kisitlandi = result.SatirSayisi >= maxRows;
        return Ok(ToDto(result, kisitlandi, maxRows));
    }

    /// <summary>
    /// SQL editöründeki IntelliSense için katmandaki tablo/görünüm ve kolon listesini döndürür.
    /// Sorgu logu yazmaz; sonuç istemci tarafında önbelleklenir.
    /// </summary>
    [HttpPost("sema")]
    public async Task<ActionResult<VeritabaniSorguSemaDto>> Sema(
        [FromBody] VeritabaniSorguSemaRequestDto dto,
        CancellationToken cancellationToken)
    {
        var denied = await PermissionAuthorization.EnsurePageAccessAsync(
            this, permissionService, "veritabani-sorgu", cancellationToken);
        if (denied is not null) return denied;

        var katman = string.IsNullOrWhiteSpace(dto.KatmanKodu) ? "TDSTG" : dto.KatmanKodu.Trim();
        const int maxRows = SemaMaxSatir;

        var result = TryMapBaglanti(dto.Baglanti, katman, out var baglantiParams)
            ? await tdConnectionService.ExecuteReadOnlyQueryAsync(
                baglantiParams, SemaSql, SemaTimeoutSaniye, maxRows, cancellationToken)
            : await tdConnectionService.ExecuteReadOnlyQueryAsync(
                katman, SemaSql, SemaTimeoutSaniye, maxRows, cancellationToken);

        if (!result.Basarili)
        {
            return Ok(new VeritabaniSorguSemaDto
            {
                Basarili = false,
                Hata = result.Hata,
                KatmanKodu = katman
            });
        }

        return Ok(new VeritabaniSorguSemaDto
        {
            Basarili = true,
            KatmanKodu = katman,
            Kisitlandi = result.SatirSayisi >= maxRows,
            Tablolar = GroupSemaRows(result.Satirlar)
        });
    }

    private const int SemaMaxSatir = 60000;
    private const int SemaTimeoutSaniye = 60;

    private const string SemaSql = """
        SELECT t.TABLE_SCHEMA, t.TABLE_NAME, t.TABLE_TYPE, c.COLUMN_NAME, c.DATA_TYPE
        FROM INFORMATION_SCHEMA.TABLES t
        INNER JOIN INFORMATION_SCHEMA.COLUMNS c
            ON c.TABLE_SCHEMA = t.TABLE_SCHEMA AND c.TABLE_NAME = t.TABLE_NAME
        ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME, c.ORDINAL_POSITION
        """;

    private static List<VeritabaniSorguSemaTabloDto> GroupSemaRows(
        IReadOnlyList<Dictionary<string, object?>> satirlar)
    {
        var tablolar = new List<VeritabaniSorguSemaTabloDto>();
        var index = new Dictionary<string, List<VeritabaniSorguSemaKolonDto>>(StringComparer.OrdinalIgnoreCase);

        foreach (var satir in satirlar)
        {
            var sema = Text(satir, "TABLE_SCHEMA");
            var ad = Text(satir, "TABLE_NAME");
            if (ad.Length == 0) continue;

            var key = $"{sema}.{ad}";
            if (!index.TryGetValue(key, out var hedef))
            {
                hedef = [];
                index[key] = hedef;
                tablolar.Add(new VeritabaniSorguSemaTabloDto
                {
                    Sema = sema,
                    Ad = ad,
                    Tip = Text(satir, "TABLE_TYPE").Contains("VIEW", StringComparison.OrdinalIgnoreCase)
                        ? "VIEW"
                        : "TABLE",
                    Kolonlar = hedef
                });
            }

            var kolonAdi = Text(satir, "COLUMN_NAME");
            if (kolonAdi.Length > 0)
            {
                hedef.Add(new VeritabaniSorguSemaKolonDto
                {
                    Ad = kolonAdi,
                    VeriTipi = Text(satir, "DATA_TYPE")
                });
            }
        }

        return tablolar;
    }

    private static string Text(Dictionary<string, object?> satir, string key) =>
        satir.TryGetValue(key, out var value) ? value?.ToString() ?? string.Empty : string.Empty;

    [HttpPost("test/{katmanKodu}")]
    public async Task<ActionResult<VeriKaynagiTestSonucDto>> Test(string katmanKodu, CancellationToken cancellationToken)
    {
        var denied = await PermissionAuthorization.EnsurePageAccessAsync(
            this, permissionService, "veritabani-sorgu", cancellationToken);
        if (denied is not null) return denied;

        var basarili = await tdConnectionService.TestConnectionAsync(katmanKodu, cancellationToken);
        return Ok(new VeriKaynagiTestSonucDto
        {
            KatmanKodu = katmanKodu,
            Basarili = basarili,
            Mesaj = basarili
                ? "Bağlantı başarılı."
                : "Bağlantı başarısız. config/td-connections.json dosyasını kontrol edin."
        });
    }

    [HttpPost("test-baglanti")]
    public async Task<ActionResult<VeriKaynagiTestSonucDto>> TestBaglanti(
        [FromBody] VeritabaniSorguBaglantiDto dto,
        CancellationToken cancellationToken)
    {
        var denied = await PermissionAuthorization.EnsurePageAccessAsync(
            this, permissionService, "veritabani-sorgu", cancellationToken);
        if (denied is not null) return denied;

        if (!TryMapBaglanti(dto, "OZEL", out var baglantiParams))
        {
            return BadRequest(new VeriKaynagiTestSonucDto
            {
                KatmanKodu = "OZEL",
                Basarili = false,
                Mesaj = "Sunucu ve veritabanı alanları zorunludur."
            });
        }

        var basarili = await tdConnectionService.TestConnectionAsync(baglantiParams, cancellationToken);
        var etiket = string.IsNullOrWhiteSpace(dto.Etiket) ? dto.Veritabani : dto.Etiket.Trim();
        return Ok(new VeriKaynagiTestSonucDto
        {
            KatmanKodu = etiket,
            Basarili = basarili,
            Mesaj = basarili
                ? "Bağlantı başarılı."
                : "Bağlantı başarısız. Sunucu, veritabanı ve kimlik doğrulama bilgilerini kontrol edin."
        });
    }

    private async Task TryLogExecutionAsync(string katman, TdQueryResult result, CancellationToken cancellationToken)
    {
        try
        {
            dbContext.SorguCalistirmaLoglari.Add(new SorguCalistirmaLog
            {
                KatmanKodu = katman,
                CalistirmaZamani = DateTime.UtcNow,
                SatirSayisi = result.Basarili ? result.SatirSayisi : null,
                SureMs = result.SureMs,
                Hata = result.Hata,
                KullaniciId = HttpContext.GetCurrentUserId()
            });

            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Sorgu çalıştırma logu yazılamadı (uygulama DB erişilemiyor olabilir).");
        }
    }

    private async Task TryActivityLogAsync(
        string olayTipi,
        string baslik,
        string? detay,
        CancellationToken cancellationToken)
    {
        try
        {
            await activityLogService.LogAsync(
                olayTipi,
                baslik,
                detay,
                HttpContext.GetCurrentUserId(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Aktivite logu yazılamadı.");
        }
    }

    private static bool TryMapBaglanti(
        VeritabaniSorguBaglantiDto? dto,
        string katmanKodu,
        out TdConnectionParams parameters)
    {
        parameters = null!;
        if (dto is null || string.IsNullOrWhiteSpace(dto.Sunucu) || string.IsNullOrWhiteSpace(dto.Veritabani))
        {
            return false;
        }

        parameters = new TdConnectionParams
        {
            KatmanKodu = katmanKodu,
            Sunucu = dto.Sunucu.Trim(),
            Veritabani = dto.Veritabani.Trim(),
            Port = dto.Port > 0 ? dto.Port : 1433,
            KimlikDogrulama = string.IsNullOrWhiteSpace(dto.KimlikDogrulama) ? "windows" : dto.KimlikDogrulama.Trim(),
            KullaniciAdi = dto.KullaniciAdi
        };
        return true;
    }

    private static string FormatLogKatman(string katmanKodu, VeritabaniSorguBaglantiDto? baglanti)
    {
        if (baglanti is null || string.IsNullOrWhiteSpace(baglanti.Etiket))
        {
            return $"{katmanKodu} ({baglanti?.Sunucu}/{baglanti?.Veritabani})";
        }

        return baglanti.Etiket.Trim();
    }

    private static VeritabaniSorguSonucDto ToDto(TdQueryResult result, bool kisitlandi, int maxRows)
    {
        var kolonlar = result.Satirlar.Count > 0
            ? result.Satirlar[0].Keys.ToList()
            : (IReadOnlyList<string>)Array.Empty<string>();

        return new VeritabaniSorguSonucDto
        {
            Basarili = result.Basarili,
            Hata = result.Hata,
            Kolonlar = kolonlar,
            Satirlar = result.Satirlar,
            SatirSayisi = result.SatirSayisi,
            SureMs = result.SureMs,
            Kisitlandi = kisitlandi,
            MaxSatir = maxRows
        };
    }
}
