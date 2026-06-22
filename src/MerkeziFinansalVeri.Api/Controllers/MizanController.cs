using MerkeziFinansalVeri.Api.Dtos;
using MerkeziFinansalVeri.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace MerkeziFinansalVeri.Api.Controllers;

[ApiController]
[Route("api/mizan")]
public class MizanController(
    IEtlLoadCockpitService etlLoadCockpitService,
    IActivityLogService activityLogService) : ControllerBase
{
    [HttpGet("akis")]
    public async Task<ActionResult<IReadOnlyList<SurecKokpitKatmanDto>>> GetAkis(
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
            return StatusCode(502, new { error = result.Hata ?? "Mizan akış sorgusu başarısız." });
        }

        return Ok(MapKokpitKatmanlar(result.Katmanlar));
    }

    [HttpGet("gorevler")]
    public Task<ActionResult<IReadOnlyList<MizanGorevDto>>> GetGorevler(CancellationToken cancellationToken) =>
        Task.FromResult<ActionResult<IReadOnlyList<MizanGorevDto>>>(Ok(Array.Empty<MizanGorevDto>()));

    [HttpPut("gorevler/{gorevTanimId:int}")]
    public IActionResult UpdateGorev(
        int gorevTanimId,
        [FromBody] MizanGorevGuncelleDto dto,
        CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status503ServiceUnavailable, new
        {
            error = "Mizan görev durumu ETLLoad akış ekranından izlenir."
        });

    [HttpPost("gorevler/yeniden-baslat")]
    public async Task<IActionResult> YenidenBaslat(
        [FromBody] MizanYenidenBaslatDto dto,
        CancellationToken cancellationToken)
    {
        await activityLogService.LogAsync(
            "mizan",
            "Mizan görevi yeniden başlatma isteği (devre dışı)",
            $"GorevTanimId={dto.GorevTanimId}",
            HttpContext.GetCurrentUserId(),
            cancellationToken);

        return StatusCode(StatusCodes.Status503ServiceUnavailable, new
        {
            error = "Mizan yeniden başlatma henüz ETLLoad ile entegre değil."
        });
    }

    private static IReadOnlyList<SurecKokpitKatmanDto> MapKokpitKatmanlar(IReadOnlyList<EtlLoadCockpitLayer> katmanlar) =>
        katmanlar.Select(layer => new SurecKokpitKatmanDto
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
            }).ToList()
        }).ToList();
}
