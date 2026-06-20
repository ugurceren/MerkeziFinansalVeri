namespace MerkeziFinansalVeri.Infrastructure.Services;

public interface ITdConnectionService
{
    Task<bool> TestConnectionAsync(string katmanKodu, CancellationToken cancellationToken = default);

    Task<bool> TestConnectionAsync(TdConnectionParams parameters, CancellationToken cancellationToken = default);

    Task<TdQueryResult> ExecuteReadOnlyQueryAsync(
        string katmanKodu,
        string sql,
        int timeoutSeconds = 30,
        int maxRows = 1000,
        CancellationToken cancellationToken = default);

    Task<TdQueryResult> ExecuteReadOnlyQueryAsync(
        TdConnectionParams parameters,
        string sql,
        int timeoutSeconds = 30,
        int maxRows = 1000,
        CancellationToken cancellationToken = default);

    Task<TdQueryResult> ExecuteStoredProcedureAsync(
        string katmanKodu,
        string procedureName,
        IReadOnlyList<Microsoft.Data.SqlClient.SqlParameter> parameters,
        int timeoutSeconds = 120,
        int maxRows = 10000,
        CancellationToken cancellationToken = default);
}

public sealed class TdQueryResult
{
    public IReadOnlyList<Dictionary<string, object?>> Satirlar { get; init; } = [];
    public int SatirSayisi { get; init; }
    public int SureMs { get; init; }
    public string? Hata { get; init; }
    public bool Basarili => Hata is null;
}
