namespace MerkeziFinansalVeri.Infrastructure.Services;

public interface IFarkVerenSyncService
{
    Task SyncAsync(CancellationToken cancellationToken = default);
}
