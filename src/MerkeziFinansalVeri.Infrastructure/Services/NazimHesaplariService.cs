using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MerkeziFinansalVeri.Infrastructure.Services;

public sealed class NazimHesaplariService(
    ITdConnectionService tdConnectionService,
    IConfiguration configuration,
    ILogger<NazimHesaplariService> logger) : INazimHesaplariService
{
    public NazimHesaplariAyarlar GetAyarlar() => new()
    {
        KatmanKodu = configuration["NazimHesaplari:KatmanKodu"] ?? "TDREPORT",
        StoredProcedure = configuration["NazimHesaplari:StoredProcedure"]
            ?? "RCL.rpt_OffBalanceAccountReconciliation",
        MaxSatir = int.TryParse(configuration["NazimHesaplari:MaxSatir"], out var maxSatir) ? maxSatir : 100000,
        SorguTimeoutSaniye = int.TryParse(configuration["NazimHesaplari:SorguTimeoutSaniye"], out var timeout)
            ? timeout
            : 300,
        KolonSira = configuration.GetSection("NazimHesaplari:KolonSira").Get<string[]>() ?? [],
        KolonEtiketleri = configuration.GetSection("NazimHesaplari:KolonEtiketleri").Get<Dictionary<string, string>>()
            ?? new Dictionary<string, string>()
    };

    public async Task<NazimHesaplariQueryResult> CalistirAsync(
        NazimHesaplariRaporIstek istek,
        CancellationToken cancellationToken = default)
    {
        var ayarlar = GetAyarlar();

        try
        {
            var parameters = BuildParameters(istek);
            var result = await tdConnectionService.ExecuteStoredProcedureAsync(
                ayarlar.KatmanKodu,
                ayarlar.StoredProcedure,
                parameters,
                ayarlar.SorguTimeoutSaniye,
                ayarlar.MaxSatir,
                cancellationToken);

            if (!result.Basarili)
            {
                return Fail(result.Hata, result.SureMs, ayarlar.MaxSatir);
            }

            var satirlar = LedgerLeftFilter.Apply(
                result.Satirlar,
                "ToLedgerId",
                istek.MinToLedgerId,
                istek.MaxToLedgerId);

            var kolonlar = satirlar.Count > 0
                ? satirlar[0].Keys.ToList()
                : result.Satirlar.Count > 0
                    ? result.Satirlar[0].Keys.ToList()
                    : (IReadOnlyList<string>)[];

            return new NazimHesaplariQueryResult
            {
                Basarili = true,
                Kolonlar = kolonlar,
                Satirlar = satirlar,
                SatirSayisi = satirlar.Count,
                SureMs = result.SureMs,
                Kisitlandi = result.Satirlar.Count >= ayarlar.MaxSatir,
                MaxSatir = ayarlar.MaxSatir
            };
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Nazım hesapları raporu çalıştırılamadı");
            return Fail(ex.Message, 0, ayarlar.MaxSatir);
        }
    }

    private static IReadOnlyList<SqlParameter> BuildParameters(NazimHesaplariRaporIstek istek) =>
    [
        new("@DataDate", SqlDbType.Date) { Value = istek.DataDate.ToDateTime(TimeOnly.MinValue) },
        new("@LevelName", SqlDbType.NVarChar, 100) { Value = ToDbValue(TrimOrNull(istek.LevelName)) },
        new("@FECId", SqlDbType.Int) { Value = istek.FECId ?? 0 },
        new("@BranchId", SqlDbType.Int) { Value = ToDbValue(istek.BranchId) },
        new("@minToLedgerId", SqlDbType.VarChar, 50) { Value = DBNull.Value },
        new("@maxToLedgerId", SqlDbType.VarChar, 50) { Value = DBNull.Value },
        new("@minDifferenceAmount", SqlDbType.Decimal)
        {
            Precision = 18,
            Scale = 2,
            Value = istek.MinDifferenceAmount ?? 0m
        }
    ];

    private static object ToDbValue(object? value) => value ?? DBNull.Value;

    private static string? TrimOrNull(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private static NazimHesaplariQueryResult Fail(string? hata, int sureMs, int maxSatir) => new()
    {
        Basarili = false,
        Hata = hata,
        SureMs = sureMs,
        MaxSatir = maxSatir
    };
}
