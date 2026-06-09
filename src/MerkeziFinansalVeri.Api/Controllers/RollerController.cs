using MerkeziFinansalVeri.Api.Dtos;
using MerkeziFinansalVeri.Infrastructure.Data;
using MerkeziFinansalVeri.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MerkeziFinansalVeri.Api.Controllers;

[ApiController]
[Route("api/roller")]
public class RollerController(
    AppDbContext dbContext,
    IPermissionService permissionService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RolDto>>> GetList(CancellationToken cancellationToken)
    {
        var items = await dbContext.Roller
            .AsNoTracking()
            .OrderBy(r => r.Ad)
            .Select(r => new RolDto
            {
                RolId = r.RolId,
                Ad = r.Ad,
                Aciklama = r.Aciklama,
                RozetSinifi = r.RozetSinifi
            })
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpGet("{id}/yetkiler")]
    public async Task<ActionResult<IReadOnlyList<SayfaYetkiApiDto>>> GetYetkiler(string id, CancellationToken cancellationToken)
    {
        var exists = await dbContext.Roller.AnyAsync(r => r.RolId == id, cancellationToken);
        if (!exists)
        {
            return NotFound();
        }

        var yetkiler = await permissionService.GetRolePermissionsAsync(id, cancellationToken);
        return Ok(yetkiler.Select(y => new SayfaYetkiApiDto
        {
            SayfaId = y.SayfaId,
            Etiket = y.Etiket,
            Bolum = y.Bolum,
            IzinVerildi = y.IzinVerildi,
            RolVarsayilan = y.RolVarsayilan,
            KullaniciOverride = y.KullaniciOverride
        }).ToList());
    }
}
