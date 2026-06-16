using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MerkeziFinansalVeri.Infrastructure.Services;

public sealed class TrustedDataMatrixMapService(
    ITdConnectionService tdConnectionService,
    IConfiguration configuration,
    ILogger<TrustedDataMatrixMapService> logger,
    string repoRoot) : ITrustedDataMatrixMapService
{
    private static readonly string[] Columns =
    [
        "LoadId",
        "UpdateLoadId",
        "SystemDateTime",
        "ValidFrom",
        "ValidUntil",
        "SCDActiveFlag",
        "TrustedDataMatrixMapId",
        "SourceName",
        "MatrixTableId",
        "MatrixTableName",
        "MatrixTableDescription",
        "MatrixColumnId",
        "MatrixColumnName",
        "MatrixColumnDescription",
        "TDInscopeFlag",
        "BalanceTypeId",
        "BalanceTypeName",
        "InsertUserCode",
        "UpdateUserCode"
    ];

    public MatrixMapAyarlar GetAyarlar() => new()
    {
        KatmanKodu = configuration["MatrixMap:KatmanKodu"] ?? "TDMAIN",
        SorguDosyasi = configuration["MatrixMap:SorguDosyasi"] ?? "config/queries/matrixmap.sql",
        MaxSatir = int.TryParse(configuration["MatrixMap:MaxSatir"], out var maxSatir) ? maxSatir : 5000,
        SorguTimeoutSaniye = int.TryParse(configuration["MatrixMap:SorguTimeoutSaniye"], out var timeout) ? timeout : 120
    };

    public async Task<MatrixMapQueryResult> QueryAsync(
        TrustedDataMatrixMapFilter? filter,
        CancellationToken cancellationToken = default)
    {
        var ayarlar = GetAyarlar();
        var sqlPath = Path.Combine(repoRoot, ayarlar.SorguDosyasi.Replace('/', Path.DirectorySeparatorChar));

        if (!File.Exists(sqlPath))
        {
            return Fail($"Sorgu dosyası bulunamadı: {ayarlar.SorguDosyasi}");
        }

        string baseSql;
        try
        {
            baseSql = (await File.ReadAllTextAsync(sqlPath, cancellationToken)).Trim().TrimEnd(';');
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "MatrixMap sorgu dosyası okunamadı: {Path}", sqlPath);
            return Fail("Sorgu dosyası okunamadı.");
        }

        if (string.IsNullOrWhiteSpace(baseSql))
        {
            return Fail("Sorgu dosyası boş.");
        }

        var sql = BuildFilteredSql(baseSql, filter);
        var result = await tdConnectionService.ExecuteReadOnlyQueryAsync(
            ayarlar.KatmanKodu,
            sql,
            ayarlar.SorguTimeoutSaniye,
            ayarlar.MaxSatir,
            cancellationToken);

        if (!result.Basarili)
        {
            return new MatrixMapQueryResult
            {
                Basarili = false,
                Hata = result.Hata,
                SureMs = result.SureMs,
                MaxSatir = ayarlar.MaxSatir
            };
        }

        var kisitlandi = result.Satirlar.Count >= ayarlar.MaxSatir;
        return new MatrixMapQueryResult
        {
            Basarili = true,
            Kolonlar = Columns.ToList(),
            Satirlar = result.Satirlar,
            SatirSayisi = result.SatirSayisi,
            SureMs = result.SureMs,
            Kisitlandi = kisitlandi,
            MaxSatir = ayarlar.MaxSatir
        };
    }

    private static string BuildFilteredSql(string baseSql, TrustedDataMatrixMapFilter? filter)
    {
        if (filter is null)
        {
            return $"{baseSql}\nORDER BY TrustedDataMatrixMapId";
        }

        var where = new StringBuilder();
        AppendIntFilter(where, "LoadId", filter.LoadId);
        AppendIntFilter(where, "UpdateLoadId", filter.UpdateLoadId);
        AppendDateFilter(where, "SystemDateTime", filter.SystemDateTime);
        AppendDateFilter(where, "ValidFrom", filter.ValidFrom);
        AppendDateFilter(where, "ValidUntil", filter.ValidUntil);
        AppendIntFilter(where, "SCDActiveFlag", filter.ScdActiveFlag);
        AppendIntFilter(where, "TrustedDataMatrixMapId", filter.TrustedDataMatrixMapId);
        AppendStringFilter(where, "SourceName", filter.SourceName);
        AppendIntFilter(where, "MatrixTableId", filter.MatrixTableId);
        AppendStringFilter(where, "MatrixTableName", filter.MatrixTableName);
        AppendStringFilter(where, "MatrixTableDescription", filter.MatrixTableDescription);
        AppendIntFilter(where, "MatrixColumnId", filter.MatrixColumnId);
        AppendStringFilter(where, "MatrixColumnName", filter.MatrixColumnName);
        AppendStringFilter(where, "MatrixColumnDescription", filter.MatrixColumnDescription);
        AppendIntFilter(where, "TDInscopeFlag", filter.TdInscopeFlag);
        AppendIntFilter(where, "BalanceTypeId", filter.BalanceTypeId);
        AppendStringFilter(where, "BalanceTypeName", filter.BalanceTypeName);
        AppendStringFilter(where, "InsertUserCode", filter.InsertUserCode);
        AppendStringFilter(where, "UpdateUserCode", filter.UpdateUserCode);

        if (where.Length == 0)
        {
            return $"{baseSql}\nORDER BY TrustedDataMatrixMapId";
        }

        return $"{baseSql}\nWHERE 1=1{where}\nORDER BY TrustedDataMatrixMapId";
    }

    private static void AppendIntFilter(StringBuilder where, string column, int? value)
    {
        if (!value.HasValue)
        {
            return;
        }

        where.Append('\n').Append("  AND ").Append(column).Append(" = ").Append(value.Value);
    }

    private static void AppendStringFilter(StringBuilder where, string column, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        var escaped = value.Trim().Replace("'", "''");
        where.Append('\n')
            .Append("  AND ")
            .Append(column)
            .Append(" LIKE '%")
            .Append(escaped)
            .Append("%'");
    }

    private static void AppendDateFilter(StringBuilder where, string column, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        var escaped = value.Trim().Replace("'", "''");
        where.Append('\n')
            .Append("  AND CONVERT(varchar(23), ")
            .Append(column)
            .Append(", 121) LIKE '%")
            .Append(escaped)
            .Append("%'");
    }

    private static MatrixMapQueryResult Fail(string message) => new()
    {
        Basarili = false,
        Hata = message
    };
}
