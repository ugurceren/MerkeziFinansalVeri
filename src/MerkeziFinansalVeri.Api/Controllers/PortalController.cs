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

        return Ok(new PortalOzetDto
        {
            Kpi = kpi,
            EkipIlerleme = ekipIlerleme,
            SonAktiviteler = sonAktiviteler,
            EkipIsYuku = ekipIsYuku,
            SistemDurumu = new SistemDurumuDto { VeriKaynaklari = veriKaynaklari }
        });
    }
}
