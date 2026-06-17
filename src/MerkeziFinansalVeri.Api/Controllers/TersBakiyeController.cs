using MerkeziFinansalVeri.Api.Dtos;
using MerkeziFinansalVeri.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace MerkeziFinansalVeri.Api.Controllers;

[ApiController]
[Route("api/raporlar/ters-bakiye")]
public class TersBakiyeController(ITersBakiyeService tersBakiyeService) : ControllerBase
{
    [HttpGet("ayarlar")]
    public ActionResult<TersBakiyeAyarDto> GetAyarlar()
    {
        var ayarlar = tersBakiyeService.GetAyarlar();
        return Ok(new TersBakiyeAyarDto
        {
            KatmanKodu = ayarlar.KatmanKodu,
            SpByAccount = ayarlar.SpByAccount,
            SpByLedger = ayarlar.SpByLedger,
            MaxSatir = ayarlar.MaxSatir,
            SorguTimeoutSaniye = ayarlar.SorguTimeoutSaniye,
            KolonSira = ayarlar.KolonSira,
            KolonEtiketleri = ayarlar.KolonEtiketleri,
            FiltreKolonMap = ayarlar.FiltreKolonMap
        });
    }

    [HttpPost("calistir")]
    public async Task<ActionResult<TersBakiyeSonucDto>> Calistir(
        [FromBody] TersBakiyeCalistirDto dto,
        CancellationToken cancellationToken)
    {
        var result = await tersBakiyeService.CalistirAsync(ToIstek(dto), cancellationToken);
        return Ok(ToDto(result));
    }

    private static TersBakiyeRaporIstek ToIstek(TersBakiyeCalistirDto dto) => new()
    {
        Mod = dto.Mod,
        AccountNumber = dto.AccountNumber,
        AccountNumberList = dto.AccountNumberList,
        MinLedgerCode = dto.MinLedgerCode,
        MaxLedgerCode = dto.MaxLedgerCode,
        BeginDate = dto.BeginDate,
        EndDate = dto.EndDate,
        BranchId = NullIfAll(dto.BranchId, 0),
        FECId = NullIfAll(dto.FECId, -1),
        LedgerTypeId = dto.LedgerTypeId,
        CreditCardLedgerFlag = dto.CreditCardLedgerFlag,
        IncomeLossLedgerFlag = dto.IncomeLossLedgerFlag,
        CustomerRiskStatusId = dto.CustomerRiskStatusId,
        MinBalance = dto.MinBalance,
        AccountNumberKTFlag = dto.AccountNumberKTFlag
    };

    private static int? NullIfAll(int? value, int allValue) =>
        value == allValue ? null : value;

    private static TersBakiyeSonucDto ToDto(TersBakiyeQueryResult result) => new()
    {
        Basarili = result.Basarili,
        Hata = result.Hata,
        Mod = result.Mod,
        Kolonlar = result.Kolonlar,
        Satirlar = result.Satirlar,
        SatirSayisi = result.SatirSayisi,
        SureMs = result.SureMs,
        Kisitlandi = result.Kisitlandi,
        MaxSatir = result.MaxSatir
    };
}
