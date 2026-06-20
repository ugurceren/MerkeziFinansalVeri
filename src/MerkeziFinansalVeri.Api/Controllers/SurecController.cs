using MerkeziFinansalVeri.Api.Dtos;
using MerkeziFinansalVeri.Infrastructure.Data;
using MerkeziFinansalVeri.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MerkeziFinansalVeri.Api.Controllers;

[ApiController]
[Route("api/surec")]
public class SurecController(
    AppDbContext dbContext,
    IDatasetCatalogService datasetCatalogService,
    IParallelRunTaskListService parallelRunTaskListService,
    IEtlLoadCockpitService etlLoadCockpitService) : ControllerBase
{
    [HttpGet("cockpit")]
    public async Task<ActionResult<SurecCockpitDto>> GetCockpit(CancellationToken cancellationToken)
    {
        var aktifDonem = await dbContext.MutabakatDonemleri
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.AktifMi, cancellationToken);

        var donemId = aktifDonem?.DonemId;

        var gorevDurumlari = await dbContext.SurecGorevDurumlari
            .AsNoTracking()
            .Where(g => g.DonemId == donemId || (donemId == null && g.DonemId == null))
            .ToListAsync(cancellationToken);

        var toplamDataset = await dbContext.SurecDatasetleri.CountAsync(cancellationToken);

        return Ok(new SurecCockpitDto
        {
            ToplamDataset = toplamDataset,
            TamamlananGorev = gorevDurumlari.Count(g => g.Durum == "done"),
            BekleyenGorev = gorevDurumlari.Count(g => g.Durum is "pending" or "running"),
            HataliGorev = gorevDurumlari.Count(g => g.Durum == "failed"),
            AktifDonem = aktifDonem?.YilAy
        });
    }

    [HttpGet("kokpit")]
    public async Task<ActionResult<IReadOnlyList<SurecKokpitKatmanDto>>> GetKokpit(
        [FromQuery] string? dataDate,
        CancellationToken cancellationToken)
    {
        DateOnly? parsedDate = null;
        if (!string.IsNullOrWhiteSpace(dataDate) && DateOnly.TryParse(dataDate, out var date))
        {
            parsedDate = date;
        }

        var result = await etlLoadCockpitService.GetCockpitAsync(parsedDate, cancellationToken);
        if (!result.Basarili)
        {
            return StatusCode(502, new { error = result.Hata ?? "Günlük akış sorgusu başarısız." });
        }

        var items = result.Katmanlar.Select(layer => new SurecKokpitKatmanDto
        {
            KatmanKodu = layer.KatmanKodu,
            Rol = layer.Rol,
            Tema = layer.Tema,
            PaketSayisi = layer.PaketSayisi,
            BasariliAdimSayisi = layer.BasariliAdimSayisi,
            TamamlanmaYuzdesi = layer.TamamlanmaYuzdesi,
            Datasets = layer.Datasets.Select(dataset => new SurecKokpitDatasetDto
            {
                Kod = dataset.Kod,
                Etiket = dataset.Etiket,
                Gorevler = dataset.Adimlar.Select(step => new SurecKokpitGorevDto
                {
                    Etiket = step.Etiket,
                    Durum = step.Durum,
                    DurumMetni = step.DurumMetni
                }).ToList()
            }).ToList()
        }).ToList();

        return Ok(items);
    }

    [HttpGet("domainler")]
    public async Task<ActionResult<IReadOnlyList<VeriDomainDto>>> GetDomainler(CancellationToken cancellationToken)
    {
        var domainler = await dbContext.VeriDomainleri
            .AsNoTracking()
            .OrderBy(d => d.Sira)
            .ToListAsync(cancellationToken);

        var datasets = await dbContext.SurecDatasetleri
            .AsNoTracking()
            .Where(d => d.DomainId != null)
            .OrderBy(d => d.Sira)
            .ToListAsync(cancellationToken);

        var result = domainler.Select(domain => new VeriDomainDto
        {
            DomainId = domain.DomainId,
            Ad = domain.Ad,
            Tema = domain.Tema,
            Datasets = datasets
                .Where(d => d.DomainId == domain.DomainId)
                .Select(d => new SurecKokpitDatasetDto { Kod = d.Kod, Etiket = d.Etiket, Gorevler = [] })
                .ToList()
        }).ToList();

        return Ok(result);
    }

    [HttpGet("dataset-katalog")]
    public async Task<ActionResult<IReadOnlyList<VeriDomainDto>>> GetDatasetKatalog(CancellationToken cancellationToken)
    {
        var result = await datasetCatalogService.GetCatalogAsync(cancellationToken);
        if (!result.Basarili)
        {
            return StatusCode(502, new { error = result.Hata ?? "Dataset katalog sorgusu başarısız." });
        }

        var items = result.Kategoriler.Select(kategori => new VeriDomainDto
        {
            DomainId = kategori.KategoriId,
            Ad = kategori.Ad,
            Tema = kategori.Tema,
            Datasets = kategori.Datasetler
                .Select(dataset => new SurecKokpitDatasetDto
                {
                    Kod = dataset.Ad,
                    Etiket = dataset.Ad,
                    Gorevler = []
                })
                .ToList()
        }).ToList();

        return Ok(items);
    }

    [HttpGet("datasets")]
    public async Task<ActionResult<IReadOnlyList<SurecDatasetDto>>> GetDatasets(CancellationToken cancellationToken)
    {
        var items = await dbContext.SurecDatasetleri
            .AsNoTracking()
            .OrderBy(d => d.Sira)
            .Select(d => new SurecDatasetDto
            {
                DatasetId = d.DatasetId,
                Kod = d.Kod,
                Etiket = d.Etiket,
                KatmanKodu = d.KatmanKodu,
                DomainId = d.DomainId,
                Sira = d.Sira,
                GorevSayisi = d.SurecGorevTanimlari.Count
            })
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpGet("gorevler")]
    public async Task<ActionResult<IReadOnlyList<SurecGorevDto>>> GetGorevler(
        [FromQuery] int? datasetId,
        [FromQuery] int? donemId,
        CancellationToken cancellationToken)
    {
        if (!donemId.HasValue)
        {
            donemId = await dbContext.MutabakatDonemleri
                .AsNoTracking()
                .Where(d => d.AktifMi)
                .Select(d => (int?)d.DonemId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var query = dbContext.SurecGorevTanimlari
            .AsNoTracking()
            .Include(g => g.Dataset)
            .AsQueryable();

        if (datasetId.HasValue)
        {
            query = query.Where(g => g.DatasetId == datasetId.Value);
        }

        var tanimlar = await query.OrderBy(g => g.Sira).ToListAsync(cancellationToken);

        var durumlar = await dbContext.SurecGorevDurumlari
            .AsNoTracking()
            .Where(d => d.DonemId == donemId)
            .ToDictionaryAsync(d => d.GorevTanimId, cancellationToken);

        var items = tanimlar.Select(t =>
        {
            durumlar.TryGetValue(t.GorevTanimId, out var durum);
            return new SurecGorevDto
            {
                GorevTanimId = t.GorevTanimId,
                DatasetId = t.DatasetId,
                DatasetKod = t.Dataset.Kod,
                Etiket = t.Etiket,
                Sira = t.Sira,
                Durum = durum?.Durum ?? "pending",
                SonGuncelleme = durum?.SonGuncelleme
            };
        }).ToList();

        return Ok(items);
    }

    [HttpGet("task-listesi")]
    public async Task<ActionResult<IReadOnlyList<TaskListesiDto>>> GetTaskListesi(CancellationToken cancellationToken)
    {
        var result = await parallelRunTaskListService.GetTaskListAsync(cancellationToken);
        if (!result.Basarili)
        {
            return StatusCode(502, new { error = result.Hata ?? "Paket listesi sorgusu başarısız." });
        }

        var items = result.Kayitlar.Select(item => new TaskListesiDto
        {
            Katman = item.Katman,
            DatasetKod = item.DatasetKod,
            DatasetEtiket = item.DatasetEtiket,
            Etiket = item.Task,
            YuklemePeriyodu = item.YuklemePeriyodu,
            TransferTypeId = item.TransferTypeId,
            TransferTipi = item.TransferTipi,
            Durum = item.Durum,
            SonGuncelleme = item.SonGuncelleme
        }).ToList();

        return Ok(items);
    }
}
