namespace MerkeziFinansalVeri.Api;

public static class CurrentUserKeys
{
    public const string UserIdItemKey = "CurrentUserId";
    public const int DefaultUserId = 9;
}

public static class HttpContextExtensions
{
    public static int GetCurrentUserId(this HttpContext context)
    {
        if (context.Items.TryGetValue(CurrentUserKeys.UserIdItemKey, out var value) && value is int userId)
        {
            return userId;
        }

        return CurrentUserKeys.DefaultUserId;
    }
}
