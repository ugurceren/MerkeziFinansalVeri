using MerkeziFinansalVeri.Api.Dtos;
using MerkeziFinansalVeri.Infrastructure.Data;
using MerkeziFinansalVeri.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MerkeziFinansalVeri.Api.Controllers;

[ApiController]
[Route("api/portal")]
public class PortalController(
    AppDbContext dbContext,
    IVeriKalitesiKpiService veriKalitesiKpiService,
    IDatasetCatalogService datasetCatalogService,
    IEtlLoadCockpitService etlLoadCockpitService) : ControllerBase
{
    [HttpGet("ozet")]
    public async Task<ActionResult<PortalOzetDto>> GetOzet(CancellationToken cancellationToken)
    {
        var veriTarihi = DateOnly.FromDateTime(DateTime.Today.AddDays(-1));

        var acikFarkSayisi = await dbContext.FarkVerenHesaplar
            .CountAsync(f => !f.SilindiMi && (f.Durum == "acik" || f.Durum == "inceleniyor"), cancellationToken);

        var kurumsalHesapSayisi = await dbContext.KurumsalHesaplar
            .CountAsync(k => !k.SilindiMi, cancellationToken);

        var mutabakatDonemSayisi = await dbContext.MutabakatDonemleri
            .CountAsync(cancellationToken);

        var ekipler = await dbContext.Ekipler
            .AsNoTracking()
            .Where(e => e.Aktif && !e.SilindiMi)
            .ToListAsync(cancellationToken);

        var farklar = await dbContext.FarkVerenHesaplar
            .AsNoTracking()
            .Where(f => !f.SilindiMi)
            .ToListAsync(cancellationToken);

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

        // TDUTIL sorguları aynı DbContext'i paylaştığı için sıralı çalıştırılır.
        var catalog = await datasetCatalogService.GetCatalogAsync(cancellationToken);
        var kokpit = await etlLoadCockpitService.GetCockpitAsync(veriTarihi, cancellationToken);
        var vkSnapshot = await veriKalitesiKpiService.GetKpiAsync(cancellationToken);

        var surec = BuildSurecOzet(catalog, kokpit, veriTarihi);

        var kpi = new PortalKpiDto
        {
            KurumsalHesapSayisi = kurumsalHesapSayisi,
            MutabakatDonemSayisi = mutabakatDonemSayisi,
            AcikFarkSayisi = acikFarkSayisi,
            BekleyenGorevSayisi = surec.GunlukAkis.DevamEdenAdimSayisi + surec.GunlukAkis.BekleyenAdimSayisi
        };

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

        var veriKalitesiKpi = new VeriKalitesiKpiDto
        {
            ToplamKuralSayisi = vkSnapshot.ToplamKuralSayisi,
            AktifKuralSayisi = vkSnapshot.AktifKuralSayisi,
            SonCalistirmaHataliSayisi = vkSnapshot.SonCalistirmaHataliSayisi,
            SonCalistirmaGecenSayisi = vkSnapshot.SonCalistirmaGecenSayisi,
            BasariYuzdesi = vkSnapshot.BasariYuzdesi,
            SonCalistirmaTarihi = vkSnapshot.SonCalistirmaTarihi,
            Kaynak = vkSnapshot.Kaynak
        };

        return Ok(new PortalOzetDto
        {
            Kpi = kpi,
            Surec = surec,
            VeriKalitesiKpi = veriKalitesiKpi,
            AktifDonem = aktifDonem,
            EkipIlerleme = ekipIlerleme,
            SonAktiviteler = sonAktiviteler,
            EkipIsYuku = ekipIsYuku,
            SistemDurumu = new SistemDurumuDto { VeriKaynaklari = veriKaynaklari }
        });
    }

    private static PortalSurecOzetDto BuildSurecOzet(
        DatasetCatalogResult catalog,
        EtlLoadCockpitResult kokpit,
        DateOnly veriTarihi)
    {
        var domainSayisi = catalog.Basarili ? catalog.Kategoriler.Count : 0;
        var datasetSayisi = catalog.Basarili
            ? catalog.Kategoriler.Sum(k => k.Datasetler.Count)
            : 0;

        var bekleyen = 0;
        var devam = 0;
        var basarili = 0;
        var hatali = 0;
        var katmanlar = new List<PortalGunlukAkisKatmanOzetDto>();

        if (kokpit.Basarili)
        {
            foreach (var layer in kokpit.Katmanlar)
            {
                var layerFailed = false;
                var layerRunning = false;
                var layerAllDone = layer.Datasets.Count > 0;

                foreach (var dataset in layer.Datasets)
                {
                    CountAdimSteps(dataset.Adimlar, ref basarili, ref devam, ref bekleyen, ref hatali, ref layerFailed, ref layerRunning, ref layerAllDone);
                    CountAdimSteps(dataset.LndAdimlar, ref basarili, ref devam, ref bekleyen, ref hatali, ref layerFailed, ref layerRunning, ref layerAllDone);
                }

                if (layer.Datasets.Count == 0)
                {
                    layerAllDone = false;
                }

                var durum = layerFailed
                    ? "failed"
                    : layerAllDone
                        ? "done"
                        : layerRunning
                            ? "running"
                            : "pending";

                katmanlar.Add(new PortalGunlukAkisKatmanOzetDto
                {
                    KatmanKodu = layer.KatmanKodu,
                    Etiket = string.IsNullOrWhiteSpace(layer.Rol) ? layer.KatmanKodu : layer.Rol,
                    Tema = layer.Tema,
                    PaketSayisi = layer.PaketSayisi,
                    TamamlanmaYuzdesi = layer.TamamlanmaYuzdesi,
                    Durum = durum
                });
            }
        }

        var toplamAdim = basarili + devam + bekleyen + hatali;
        var tamamlanmaYuzdesi = toplamAdim > 0
            ? (int)Math.Round(basarili * 100.0 / toplamAdim)
            : kokpit.Basarili && kokpit.Katmanlar.Count > 0
                ? (int)Math.Round(kokpit.Katmanlar.Average(l => l.TamamlanmaYuzdesi))
                : 0;

        return new PortalSurecOzetDto
        {
            Dataset = new PortalDatasetOzetDto
            {
                DomainSayisi = domainSayisi,
                DatasetSayisi = datasetSayisi,
                Basarili = catalog.Basarili
            },
            GunlukAkis = new PortalGunlukAkisOzetDto
            {
                VeriTarihi = veriTarihi.ToString("yyyy-MM-dd"),
                TamamlanmaYuzdesi = tamamlanmaYuzdesi,
                ToplamAdimSayisi = toplamAdim,
                BasariliAdimSayisi = basarili,
                DevamEdenAdimSayisi = devam,
                BekleyenAdimSayisi = bekleyen,
                HataliAdimSayisi = hatali,
                Basarili = kokpit.Basarili,
                Katmanlar = katmanlar
            }
        };
    }

    private static void CountAdimSteps(
        IReadOnlyList<EtlLoadCockpitStep> adimlar,
        ref int basarili,
        ref int devam,
        ref int bekleyen,
        ref int hatali,
        ref bool layerFailed,
        ref bool layerRunning,
        ref bool layerAllDone)
    {
        foreach (var adim in adimlar)
        {
            switch (adim.Durum)
            {
                case "done":
                    basarili++;
                    break;
                case "running":
                    devam++;
                    layerRunning = true;
                    layerAllDone = false;
                    break;
                case "failed":
                    hatali++;
                    layerFailed = true;
                    layerAllDone = false;
                    break;
                default:
                    bekleyen++;
                    layerAllDone = false;
                    break;
            }
        }
    }
}
