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

        var catalog = await datasetCatalogService.GetCatalogAsync(cancellationToken);
        var toplamDataset = catalog.Basarili
            ? catalog.Kategoriler.Sum(k => k.Datasetler.Count)
            : 0;

        return Ok(new SurecCockpitDto
        {
            ToplamDataset = toplamDataset,
            TamamlananGorev = 0,
            BekleyenGorev = 0,
            HataliGorev = 0,
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
                    DurumMetni = step.DurumMetni,
                    KayitSayisi = step.KayitSayisi,
                    HataMesaji = step.HataMesaji
                }).ToList(),
                LndGorevler = dataset.LndAdimlar.Select(step => new SurecKokpitGorevDto
                {
                    Etiket = step.Etiket,
                    Durum = step.Durum,
                    DurumMetni = step.DurumMetni,
                    KayitSayisi = step.KayitSayisi,
                    HataMesaji = step.HataMesaji
                }).ToList()
            }).ToList(),
            OzetSatirlar = layer.OzetSatirlar.Select(item => new SurecKokpitOzetSatirDto
            {
                HedefTablo = item.HedefTablo,
                Durum = item.Durum,
                DurumMetni = item.DurumMetni
            }).ToList(),
            Kayitlar = layer.Kayitlar.Select(item => new SurecKokpitKayitDto
            {
                TargetTableName = item.TargetTableName,
                DataDate = item.DataDate?.ToString("yyyy-MM-dd"),
                ExecutionStartTime = FormatDateTime(item.ExecutionStartTime),
                ExecutionEndTime = FormatDateTime(item.ExecutionEndTime),
                SureDakika = item.SureDakika,
                ExecutionRecordCount = item.ExecutionRecordCount,
                ErrorMessageText = item.ErrorMessageText
            }).ToList()
        }).ToList();

        return Ok(items);
    }

    [HttpGet("domainler")]
    public Task<ActionResult<IReadOnlyList<VeriDomainDto>>> GetDomainler(CancellationToken cancellationToken) =>
        GetDatasetKatalog(cancellationToken);

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
                    Kod = dataset.StagingTableName,
                    Etiket = dataset.Ad,
                    DescriptionScope = dataset.DescriptionScope,
                    Gorevler = []
                })
                .ToList()
        }).ToList();

        return Ok(items);
    }

    [HttpGet("dataset-liste")]
    public async Task<ActionResult<IReadOnlyList<TdDatasetListeDto>>> GetDatasetListe(CancellationToken cancellationToken)
    {
        var result = await datasetCatalogService.GetListAsync(cancellationToken);
        if (!result.Basarili)
        {
            return StatusCode(502, new { error = result.Hata ?? "Dataset liste sorgusu başarısız." });
        }

        var items = result.Kayitlar.Select(item => new TdDatasetListeDto
        {
            DatasetName = item.DatasetName,
            DescriptionScope = item.DescriptionScope,
            Layer = item.Layer,
            StagingTableName = item.StagingTableName,
            KtResponsibleItUnit = item.KtResponsibleItUnit,
            Note = item.Note,
            TdAnalyst = item.TdAnalyst,
            Tester = item.Tester,
            DataModel = item.DataModel,
            KtSpName = item.KtSpName,
            Status = item.Status,
            StatusResponsible = item.StatusResponsible,
            StatusChangeDate = item.StatusChangeDate
        }).ToList();

        return Ok(items);
    }

    [HttpGet("dataset-status")]
    public async Task<ActionResult<TdDatasetStatusResponseDto>> GetDatasetStatus(CancellationToken cancellationToken)
    {
        var result = await datasetCatalogService.GetStatusAsync(cancellationToken);
        if (!result.Basarili)
        {
            return StatusCode(502, new { error = result.Hata ?? "Dataset statü sorgusu başarısız." });
        }

        return Ok(new TdDatasetStatusResponseDto
        {
            DurumOzeti = result.DurumOzeti.Select(row => new TdDatasetStatusOzetDto
            {
                Status = row.Status,
                Adet = row.Adet,
                SonDurumTarihi = row.SonDurumTarihi
            }).ToList(),
            ModelDurumlar = result.ModelDurumlar.Select(row => new TdDatasetStatusSatirDto
            {
                DataModel = row.DataModel,
                Status = row.Status,
                Adet = row.Adet,
                SonDurumTarihi = row.SonDurumTarihi
            }).ToList()
        });
    }

    [HttpGet("datasets")]
    public async Task<ActionResult<IReadOnlyList<SurecDatasetDto>>> GetDatasets(CancellationToken cancellationToken)
    {
        var result = await datasetCatalogService.GetCatalogAsync(cancellationToken);
        if (!result.Basarili)
        {
            return Ok(Array.Empty<SurecDatasetDto>());
        }

        var items = new List<SurecDatasetDto>();
        var datasetId = 1;
        foreach (var kategori in result.Kategoriler)
        {
            var sira = 1;
            foreach (var dataset in kategori.Datasetler)
            {
                items.Add(new SurecDatasetDto
                {
                    DatasetId = datasetId++,
                    Kod = dataset.StagingTableName,
                    Etiket = dataset.Ad,
                    KatmanKodu = kategori.Ad,
                    DomainId = kategori.KategoriId,
                    Sira = sira++,
                    GorevSayisi = 0
                });
            }
        }

        return Ok(items);
    }

    [HttpGet("gorevler")]
    public ActionResult<IReadOnlyList<SurecGorevDto>> GetGorevler(
        [FromQuery] int? datasetId,
        [FromQuery] int? donemId,
        CancellationToken cancellationToken) =>
        Ok(Array.Empty<SurecGorevDto>());

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
            TransferTipi = item.TransferTipi,
            Aktif = item.Aktif,
            SonGuncelleme = item.SonGuncelleme
        }).ToList();

        return Ok(items);
    }

    private static string? FormatDateTime(DateTime? value) =>
        value?.ToString("yyyy-MM-dd HH:mm:ss");
}
