using MerkeziFinansalVeri.Api.Dtos;
using MerkeziFinansalVeri.Infrastructure.Data;
using MerkeziFinansalVeri.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MerkeziFinansalVeri.Api.Controllers;

[ApiController]
[Route("api/mutabakat")]
public class MutabakatController(
    AppDbContext dbContext,
    IActivityLogService activityLogService,
    ITrustedDataMatrixMapService matrixMapService) : ControllerBase
{
    [HttpGet("donemler")]
    public async Task<ActionResult<IReadOnlyList<MutabakatDonemDto>>> GetDonemler(CancellationToken cancellationToken)
    {
        var items = await dbContext.MutabakatDonemleri
            .AsNoTracking()
            .OrderByDescending(d => d.YilAy)
            .Select(d => ToDonemDto(d))
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpPut("donemler/{donemId:int}")]
    public async Task<ActionResult<MutabakatDonemDto>> UpdateDonem(
        int donemId,
        [FromBody] MutabakatDonemUpdateDto dto,
        CancellationToken cancellationToken)
    {
        var entity = await dbContext.MutabakatDonemleri
            .FirstOrDefaultAsync(d => d.DonemId == donemId, cancellationToken);

        if (entity is null)
        {
            return NotFound();
        }

        entity.Etiket = dto.Etiket;
        entity.Durum = dto.Durum;
        entity.KapanisTarihi = dto.KapanisTarihi;
        entity.GuncellemeZamani = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        await activityLogService.LogAsync("mutabakat", "Mutabakat dönemi güncellendi", dto.Etiket, HttpContext.GetCurrentUserId(), cancellationToken);

        return Ok(ToDonemDto(entity));
    }

    [HttpPut("donemler/aktif")]
    public async Task<ActionResult<MutabakatDonemDto>> SetAktifDonem(
        [FromBody] MutabakatAktifDonemDto dto,
        CancellationToken cancellationToken)
    {
        var target = await dbContext.MutabakatDonemleri
            .FirstOrDefaultAsync(d => d.DonemId == dto.DonemId, cancellationToken);

        if (target is null)
        {
            return NotFound();
        }

        var aktifDonemler = await dbContext.MutabakatDonemleri
            .Where(d => d.AktifMi)
            .ToListAsync(cancellationToken);

        foreach (var donem in aktifDonemler)
        {
            donem.AktifMi = false;
            donem.GuncellemeZamani = DateTime.UtcNow;
        }

        target.AktifMi = true;
        target.GuncellemeZamani = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        await activityLogService.LogAsync("mutabakat", "Aktif dönem değiştirildi", target.Etiket, HttpContext.GetCurrentUserId(), cancellationToken);

        return Ok(ToDonemDto(target));
    }

    [HttpGet("fark-veren")]
    public async Task<ActionResult<IReadOnlyList<FarkVerenHesapDto>>> GetFarkVeren(
        [FromQuery] int? donemId,
        [FromQuery] int? ekip,
        [FromQuery] string? durum,
        [FromQuery] string? hesapKodu,
        CancellationToken cancellationToken)
    {
        var query = dbContext.FarkVerenHesaplar
            .AsNoTracking()
            .Include(f => f.Ekip)
            .Where(f => !f.SilindiMi);

        if (donemId.HasValue)
        {
            query = query.Where(f => f.DonemId == donemId.Value);
        }
        else
        {
            var aktifDonemId = await dbContext.MutabakatDonemleri
                .AsNoTracking()
                .Where(d => d.AktifMi)
                .Select(d => (int?)d.DonemId)
                .FirstOrDefaultAsync(cancellationToken);

            if (aktifDonemId.HasValue)
            {
                query = query.Where(f => f.DonemId == aktifDonemId.Value);
            }
        }

        if (ekip.HasValue)
        {
            query = query.Where(f => f.EkipId == ekip.Value);
        }

        if (!string.IsNullOrWhiteSpace(durum))
        {
            query = query.Where(f => f.Durum == durum);
        }

        if (!string.IsNullOrWhiteSpace(hesapKodu))
        {
            query = query.Where(f => f.HesapKodu.Contains(hesapKodu));
        }

        var items = await query
            .OrderBy(f => f.HesapKodu)
            .Select(f => new FarkVerenHesapDto
            {
                FarkId = f.FarkId,
                DonemId = f.DonemId,
                HesapKodu = f.HesapKodu,
                HesapAdi = f.HesapAdi,
                EkipId = f.EkipId,
                EkipAdi = f.Ekip.Ad,
                MizanBakiye = f.MizanBakiye,
                KartonBakiye = f.KartonBakiye,
                Fark = f.Fark,
                Durum = f.Durum
            })
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpGet("matrixmap/ayarlar")]
    public ActionResult<MatrixMapAyarDto> GetMatrixMapAyarlar()
    {
        var ayarlar = matrixMapService.GetAyarlar();
        return Ok(new MatrixMapAyarDto
        {
            KatmanKodu = ayarlar.KatmanKodu,
            SorguDosyasi = ayarlar.SorguDosyasi,
            MaxSatir = ayarlar.MaxSatir,
            SorguTimeoutSaniye = ayarlar.SorguTimeoutSaniye
        });
    }

    [HttpGet("matrixmap")]
    public async Task<ActionResult<VeritabaniSorguSonucDto>> GetMatrixMap(
        [FromQuery] TrustedDataMatrixMapFilterDto filter,
        CancellationToken cancellationToken)
    {
        var result = await matrixMapService.QueryAsync(ToMatrixMapFilter(filter), cancellationToken);
        return Ok(ToMatrixMapDto(result));
    }

    private static MutabakatDonemDto ToDonemDto(Domain.Entities.MutabakatDonem d) => new()
    {
        DonemId = d.DonemId,
        YilAy = d.YilAy,
        Etiket = d.Etiket,
        Durum = d.Durum,
        HesapSayisi = d.HesapSayisi,
        FarkVerenSayisi = d.FarkVerenSayisi,
        KapanisTarihi = d.KapanisTarihi,
        AktifMi = d.AktifMi
    };

    private static TrustedDataMatrixMapFilter ToMatrixMapFilter(TrustedDataMatrixMapFilterDto dto) => new()
    {
        LoadId = dto.LoadId,
        UpdateLoadId = dto.UpdateLoadId,
        SystemDateTime = dto.SystemDateTime,
        ValidFrom = dto.ValidFrom,
        ValidUntil = dto.ValidUntil,
        ScdActiveFlag = dto.ScdActiveFlag,
        TrustedDataMatrixMapId = dto.TrustedDataMatrixMapId,
        SourceName = dto.SourceName,
        MatrixTableId = dto.MatrixTableId,
        MatrixTableName = dto.MatrixTableName,
        MatrixTableDescription = dto.MatrixTableDescription,
        MatrixColumnId = dto.MatrixColumnId,
        MatrixColumnName = dto.MatrixColumnName,
        MatrixColumnDescription = dto.MatrixColumnDescription,
        TdInscopeFlag = dto.TdInscopeFlag,
        BalanceTypeId = dto.BalanceTypeId,
        BalanceTypeName = dto.BalanceTypeName,
        InsertUserCode = dto.InsertUserCode,
        UpdateUserCode = dto.UpdateUserCode
    };

    private static VeritabaniSorguSonucDto ToMatrixMapDto(MatrixMapQueryResult result) => new()
    {
        Basarili = result.Basarili,
        Hata = result.Hata,
        Kolonlar = result.Kolonlar,
        Satirlar = result.Satirlar,
        SatirSayisi = result.SatirSayisi,
        SureMs = result.SureMs,
        Kisitlandi = result.Kisitlandi,
        MaxSatir = result.MaxSatir
    };
}
