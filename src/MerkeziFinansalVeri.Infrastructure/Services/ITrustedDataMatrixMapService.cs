namespace MerkeziFinansalVeri.Infrastructure.Services;

public interface ITrustedDataMatrixMapService
{
    MatrixMapAyarlar GetAyarlar();

    Task<MatrixMapQueryResult> QueryAsync(
        TrustedDataMatrixMapFilter? filter,
        CancellationToken cancellationToken = default);
}

public sealed class MatrixMapAyarlar
{
    public string KatmanKodu { get; init; } = "TDMAIN";
    public string SorguDosyasi { get; init; } = "config/queries/matrixmap.sql";
    public int MaxSatir { get; init; } = 5000;
    public int SorguTimeoutSaniye { get; init; } = 120;
}

public sealed class TrustedDataMatrixMapFilter
{
    public string? MatrixTableName { get; init; }
    public string? MatrixTableDescription { get; init; }
    public string? MatrixColumnName { get; init; }
    public string? MatrixColumnDescription { get; init; }
    public int? TdInscopeFlag { get; init; }
    public string? BalanceTypeName { get; init; }
}

public sealed class MatrixMapQueryResult
{
    public bool Basarili { get; init; }
    public string? Hata { get; init; }
    public IReadOnlyList<string> Kolonlar { get; init; } = [];
    public IReadOnlyList<Dictionary<string, object?>> Satirlar { get; init; } = [];
    public int SatirSayisi { get; init; }
    public int SureMs { get; init; }
    public bool Kisitlandi { get; init; }
    public int MaxSatir { get; init; }
}
