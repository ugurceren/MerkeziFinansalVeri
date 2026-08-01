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
        "MatrixMapId",
        "SourceName",
        "MatrixTableId",
        "MatrixTableName",
        "MatrixTableDescription",
        "MatrixColumnId",
        "MatrixColumnName",
        "MatrixColumnDescription",
        "ReconciliationInScopeFlag",
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
            return $"{baseSql}\nORDER BY MatrixMapId";
        }

        var where = new StringBuilder();
        AppendStringFilter(where, "MatrixTableName", filter.MatrixTableName, 120);
        AppendStringFilter(where, "MatrixTableDescription", filter.MatrixTableDescription, 250);
        AppendStringFilter(where, "MatrixColumnName", filter.MatrixColumnName, 120);
        AppendStringFilter(where, "MatrixColumnDescription", filter.MatrixColumnDescription, 250);
        AppendTinyIntFilter(
            where,
            "ReconciliationInScopeFlag",
            filter.ReconciliationInScopeFlag is 0 or 1 ? filter.ReconciliationInScopeFlag : null);
        AppendStringFilter(where, "BalanceTypeName", filter.BalanceTypeName, 120);

        if (where.Length == 0)
        {
            return $"{baseSql}\nORDER BY MatrixMapId";
        }

        return $"{baseSql}\nWHERE 1=1{where}\nORDER BY MatrixMapId";
    }

    private static void AppendStringFilter(StringBuilder where, string column, string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        var trimmed = value.Trim();
        if (trimmed.Length > maxLength)
        {
            trimmed = trimmed[..maxLength];
        }

        var escaped = trimmed.Replace("'", "''");
        where.Append('\n')
            .Append("  AND ")
            .Append(column)
            .Append(" LIKE '%")
            .Append(escaped)
            .Append("%'");
    }

    private static void AppendTinyIntFilter(StringBuilder where, string column, int? value)
    {
        if (!value.HasValue)
        {
            return;
        }

        where.Append('\n').Append("  AND ").Append(column).Append(" = ").Append(value.Value);
    }

    private static MatrixMapQueryResult Fail(string message) => new()
    {
        Basarili = false,
        Hata = message
    };
}
