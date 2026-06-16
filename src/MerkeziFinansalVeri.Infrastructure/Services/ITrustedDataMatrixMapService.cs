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
    public int? LoadId { get; init; }
    public int? UpdateLoadId { get; init; }
    public string? SystemDateTime { get; init; }
    public string? ValidFrom { get; init; }
    public string? ValidUntil { get; init; }
    public int? ScdActiveFlag { get; init; }
    public int? TrustedDataMatrixMapId { get; init; }
    public string? SourceName { get; init; }
    public int? MatrixTableId { get; init; }
    public string? MatrixTableName { get; init; }
    public string? MatrixTableDescription { get; init; }
    public int? MatrixColumnId { get; init; }
    public string? MatrixColumnName { get; init; }
    public string? MatrixColumnDescription { get; init; }
    public int? TdInscopeFlag { get; init; }
    public int? BalanceTypeId { get; init; }
    public string? BalanceTypeName { get; init; }
    public string? InsertUserCode { get; init; }
    public string? UpdateUserCode { get; init; }
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
