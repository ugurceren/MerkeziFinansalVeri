using MerkeziFinansalVeri.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace MerkeziFinansalVeri.Api;

public static class PermissionAuthorization
{
    public static async Task<ActionResult?> EnsurePageAccessAsync(
        ControllerBase controller,
        IPermissionService permissionService,
        string sayfaId,
        CancellationToken cancellationToken)
    {
        var userId = controller.HttpContext.GetCurrentUserId();

        if (!await permissionService.IsActiveUserAsync(userId, cancellationToken))
        {
            return controller.Unauthorized(new { message = "Geçersiz veya pasif kullanıcı." });
        }

        if (!await permissionService.HasPageAccessAsync(userId, sayfaId, cancellationToken))
        {
            return controller.StatusCode(403, new { message = "Bu işlem için yetkiniz yok." });
        }

        return null;
    }
}
