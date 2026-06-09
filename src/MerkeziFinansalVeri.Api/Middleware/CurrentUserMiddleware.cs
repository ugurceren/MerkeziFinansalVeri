using MerkeziFinansalVeri.Api;

namespace MerkeziFinansalVeri.Api.Middleware;

public class CurrentUserMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var userId = CurrentUserKeys.DefaultUserId;

        if (context.Request.Headers.TryGetValue("X-User-Id", out var headerValue)
            && int.TryParse(headerValue.FirstOrDefault(), out var parsed))
        {
            userId = parsed;
        }

        context.Items[CurrentUserKeys.UserIdItemKey] = userId;
        await next(context);
    }
}
