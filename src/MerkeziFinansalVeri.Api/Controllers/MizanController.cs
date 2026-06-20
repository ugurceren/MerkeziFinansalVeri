using MerkeziFinansalVeri.Api.Dtos;
using MerkeziFinansalVeri.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace MerkeziFinansalVeri.Api.Controllers;

[ApiController]
[Route("api/mizan")]
public class MizanController(IActivityLogService activityLogService) : ControllerBase
{
    [HttpGet("gorevler")]
    public ActionResult<IReadOnlyList<MizanGorevDto>> GetGorevler(CancellationToken cancellationToken) =>
        Ok(Array.Empty<MizanGorevDto>());

    [HttpPut("gorevler/{gorevTanimId:int}")]
    public IActionResult UpdateGorev(
        int gorevTanimId,
        [FromBody] MizanGorevGuncelleDto dto,
        CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status503ServiceUnavailable, new
        {
            error = "Mizan görev durumu artık VIB demo tablolarından okunmuyor. ETLLoad entegrasyonu bekleniyor."
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
            error = "Mizan görev yeniden başlatma artık VIB demo tablolarını kullanmıyor."
        });
    }
}
