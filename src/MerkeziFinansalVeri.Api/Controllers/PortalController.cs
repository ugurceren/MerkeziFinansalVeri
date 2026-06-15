using MerkeziFinansalVeri.Api.Dtos;
using MerkeziFinansalVeri.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MerkeziFinansalVeri.Api.Controllers;

[ApiController]
[Route("api/portal")]
public class PortalController(AppDbContext dbContext) : ControllerBase
{
    [HttpGet("ozet")]
    public async Task<ActionResult<PortalOzetDto>> GetOzet(CancellationToken cancellationToken)
    {
        var kpi = new PortalKpiDto
        {
            KurumsalHesapSayisi = await dbContext.KurumsalHesaplar.CountAsync(k => !k.SilindiMi, cancellationToken),
            MutabakatDonemSayisi = await dbContext.MutabakatDonemleri.CountAsync(cancellationToken),
            AcikFarkSayisi = await dbContext.FarkVerenHesaplar
                .CountAsync(f => !f.SilindiMi && (f.Durum == "acik" || f.Durum == "inceleniyor"), cancellationToken),
            BekleyenGorevSayisi = await dbContext.SurecGorevDurumlari
                .CountAsync(g => g.Durum == "running" || g.Durum == "pending", cancellationToken)
        };

        var ekipler = await dbContext.Ekipler
            .AsNoTracking()
            .Where(e => e.Aktif && !e.SilindiMi)
            .ToListAsync(cancellationToken);

        var farklar = await dbContext.FarkVerenHesaplar
            .AsNoTracking()
            .Where(f => !f.SilindiMi)
            .ToListAsync(cancellationToken);

        var ekipIlerleme = ekipler.Select(e =>
        {
            var ekipFarklar = farklar.Where(f => f.EkipId == e.EkipId).ToList();
            var toplam = ekipFarklar.Count;
            var kapatilan = ekipFarklar.Count(f => f.Durum == "kapatildi");
            var yuzde = toplam == 0 ? 100 : (int)(kapatilan * 100.0 / toplam);

            return new EkipIlerlemeDto
            {
                EkipId = e.EkipId,
                EkipAdi = e.Ad,
                ToplamFark = toplam,
                KapatilanFark = kapatilan,
                IlerlemeYuzde = yuzde
            };
        }).ToList();

        var ekipIsYuku = ekipler.Select(e => new EkipIsYukuDto
        {
            EkipId = e.EkipId,
            EkipAdi = e.Ad,
            AcikFarkSayisi = farklar.Count(f => f.EkipId == e.EkipId && (f.Durum == "acik" || f.Durum == "inceleniyor")),
            BekleyenAksiyonSayisi = farklar.Count(f => f.EkipId == e.EkipId && f.Durum == "acik")
        }).ToList();

        var sonAktiviteler = await dbContext.AktiviteLoglari
            .AsNoTracking()
            .Include(a => a.Kullanici)
            .OrderByDescending(a => a.OlusturmaZamani)
            .Take(20)
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

        var veriKaynaklari = await dbContext.VeriKaynaklari
            .AsNoTracking()
            .Select(v => new VeriKaynagiDurumDto
            {
                KatmanKodu = v.KatmanKodu,
                Durum = v.Durum
            })
            .ToListAsync(cancellationToken);

        var aktifDonem = await dbContext.MutabakatDonemleri
            .AsNoTracking()
            .Where(d => d.AktifMi)
            .Select(d => new AktifDonemOzetDto
            {
                DonemId = d.DonemId,
                YilAy = d.YilAy,
                Etiket = d.Etiket
            })
            .FirstOrDefaultAsync(cancellationToken);

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
        var basariYuzdesi = toplamSonuc == 0 ? 100 : (int)(sonCalistirmaGecen * 100.0 / toplamSonuc);

        var veriKalitesiKpi = new VeriKalitesiKpiDto
        {
            ToplamKuralSayisi = toplamKural,
            AktifKuralSayisi = aktifKural,
            SonCalistirmaHataliSayisi = sonCalistirmaHatali,
            SonCalistirmaGecenSayisi = sonCalistirmaGecen,
            BasariYuzdesi = basariYuzdesi,
            SonCalistirmaTarihi = sonTarih
        };

        return Ok(new PortalOzetDto
        {
            Kpi = kpi,
            VeriKalitesiKpi = veriKalitesiKpi,
            AktifDonem = aktifDonem,
            EkipIlerleme = ekipIlerleme,
            SonAktiviteler = sonAktiviteler,
            EkipIsYuku = ekipIsYuku,
            SistemDurumu = new SistemDurumuDto { VeriKaynaklari = veriKaynaklari }
        });
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
