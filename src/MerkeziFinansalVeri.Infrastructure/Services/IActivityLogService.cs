namespace MerkeziFinansalVeri.Infrastructure.Services;

public interface IActivityLogService
{
    Task LogAsync(
        string olayTipi,
        string baslik,
        string? detay = null,
        int? kullaniciId = null,
        CancellationToken cancellationToken = default);
}
