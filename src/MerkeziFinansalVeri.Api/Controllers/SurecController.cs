using MerkeziFinansalVeri.Api.Dtos;
using MerkeziFinansalVeri.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MerkeziFinansalVeri.Api.Controllers;

[ApiController]
[Route("api/surec")]
public class SurecController(AppDbContext dbContext) : ControllerBase
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
    public async Task<ActionResult<IReadOnlyList<SurecKokpitKatmanDto>>> GetKokpit(CancellationToken cancellationToken)
    {
        var donemId = await dbContext.MutabakatDonemleri
            .AsNoTracking()
            .Where(d => d.AktifMi)
            .Select(d => (int?)d.DonemId)
            .FirstOrDefaultAsync(cancellationToken);

        var katmanlar = await dbContext.VeriKatmanlari
            .AsNoTracking()
            .OrderBy(k => k.Sira)
            .ToListAsync(cancellationToken);

        var datasets = await dbContext.SurecDatasetleri
            .AsNoTracking()
            .Include(d => d.SurecGorevTanimlari)
            .Where(d => d.KatmanKodu != null)
            .OrderBy(d => d.Sira)
            .ToListAsync(cancellationToken);

        var durumlar = await dbContext.SurecGorevDurumlari
            .AsNoTracking()
            .Where(g => g.DonemId == donemId)
            .ToDictionaryAsync(g => g.GorevTanimId, cancellationToken);

        var result = katmanlar.Select(katman =>
        {
            var katmanDatasets = datasets
                .Where(d => d.KatmanKodu == katman.KatmanKodu)
                .Select(d => new SurecKokpitDatasetDto
                {
                    Kod = d.Kod,
                    Etiket = d.Etiket,
                    Gorevler = d.SurecGorevTanimlari
                        .OrderBy(g => g.Sira)
                        .Select(g =>
                        {
                            durumlar.TryGetValue(g.GorevTanimId, out var durum);
                            return new SurecKokpitGorevDto
                            {
                                GorevTanimId = g.GorevTanimId,
                                Etiket = g.Etiket,
                                Durum = durum?.Durum ?? "pending"
                            };
                        }).ToList()
                }).ToList();

            return new SurecKokpitKatmanDto
            {
                KatmanKodu = katman.KatmanKodu,
                Rol = katman.Rol,
                Tema = katman.Tema,
                Datasets = katmanDatasets
            };
        }).ToList();

        return Ok(result);
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
        var donemId = await dbContext.MutabakatDonemleri
            .AsNoTracking()
            .Where(d => d.AktifMi)
            .Select(d => (int?)d.DonemId)
            .FirstOrDefaultAsync(cancellationToken);

        var tanimlar = await dbContext.SurecGorevTanimlari
            .AsNoTracking()
            .Include(t => t.Dataset)
            .OrderBy(t => t.Dataset.Sira).ThenBy(t => t.Sira)
            .ToListAsync(cancellationToken);

        var durumlar = await dbContext.SurecGorevDurumlari
            .AsNoTracking()
            .Where(d => d.DonemId == donemId)
            .ToDictionaryAsync(d => d.GorevTanimId, cancellationToken);

        var items = tanimlar
            .Where(t => !durumlar.TryGetValue(t.GorevTanimId, out var d) || d.Durum is not "done")
            .Select(t =>
            {
                durumlar.TryGetValue(t.GorevTanimId, out var durum);
                return new TaskListesiDto
                {
                    GorevTanimId = t.GorevTanimId,
                    Etiket = t.Etiket,
                    DatasetKod = t.Dataset.Kod,
                    Durum = durum?.Durum ?? "pending",
                    SonGuncelleme = durum?.SonGuncelleme
                };
            })
            .ToList();

        return Ok(items);
    }
}
