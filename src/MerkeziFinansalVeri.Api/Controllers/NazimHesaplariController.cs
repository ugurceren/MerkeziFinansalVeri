using MerkeziFinansalVeri.Api.Dtos;
using MerkeziFinansalVeri.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace MerkeziFinansalVeri.Api.Controllers;

[ApiController]
[Route("api/raporlar/nazim-hesaplari")]
public class NazimHesaplariController(INazimHesaplariService nazimHesaplariService) : ControllerBase
{
    [HttpGet("ayarlar")]
    public ActionResult<NazimHesaplariAyarDto> GetAyarlar()
    {
        var ayarlar = nazimHesaplariService.GetAyarlar();
        return Ok(new NazimHesaplariAyarDto
        {
            KatmanKodu = ayarlar.KatmanKodu,
            StoredProcedure = ayarlar.StoredProcedure,
            MaxSatir = ayarlar.MaxSatir,
            SorguTimeoutSaniye = ayarlar.SorguTimeoutSaniye,
            KolonSira = ayarlar.KolonSira,
            KolonEtiketleri = ayarlar.KolonEtiketleri
        });
    }

    [HttpPost("calistir")]
    public async Task<ActionResult<NazimHesaplariSonucDto>> Calistir(
        [FromBody] NazimHesaplariCalistirDto dto,
        CancellationToken cancellationToken)
    {
        var result = await nazimHesaplariService.CalistirAsync(ToIstek(dto), cancellationToken);
        return Ok(ToDto(result));
    }

    private static NazimHesaplariRaporIstek ToIstek(NazimHesaplariCalistirDto dto) => new()
    {
        DataDate = dto.DataDate,
        LevelName = string.IsNullOrWhiteSpace(dto.LevelName) ? null : dto.LevelName.Trim(),
        FECId = dto.FECId,
        BranchId = NullIfAll(dto.BranchId, 0),
        MinToLedgerId = dto.MinToLedgerId,
        MaxToLedgerId = dto.MaxToLedgerId,
        MinDifferenceAmount = dto.MinDifferenceAmount
    };

    private static int? NullIfAll(int? value, int allValue) =>
        value == allValue ? null : value;

    private static NazimHesaplariSonucDto ToDto(NazimHesaplariQueryResult result) => new()
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
