namespace MerkeziFinansalVeri.Infrastructure.Services;

public interface ILedgerBalanceCockpitService
{
    Task<EtlLoadCockpitResult> GetCockpitAsync(DateOnly? dataDate = null, CancellationToken cancellationToken = default);
}
