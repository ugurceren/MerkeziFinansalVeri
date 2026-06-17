using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MerkeziFinansalVeri.Infrastructure.Services;

public sealed class TersBakiyeService(
    ITdConnectionService tdConnectionService,
    IConfiguration configuration,
    ILogger<TersBakiyeService> logger) : ITersBakiyeService
{
    public TersBakiyeAyarlar GetAyarlar() => new()
    {
        KatmanKodu = configuration["TersBakiye:KatmanKodu"] ?? "TDREPORT",
        SpByAccount = configuration["TersBakiye:SpByAccount"] ?? "RCL.rpt_ReverseBalanceReconciliationByAccount",
        SpByLedger = configuration["TersBakiye:SpByLedger"] ?? "RCL.rpt_ReverseBalanceReconciliationByLedger",
        IntListTableType = configuration["TersBakiye:IntListTableType"] ?? "dbo.IntListTable",
        MaxSatir = int.TryParse(configuration["TersBakiye:MaxSatir"], out var maxSatir) ? maxSatir : 100000,
        SorguTimeoutSaniye = int.TryParse(configuration["TersBakiye:SorguTimeoutSaniye"], out var timeout) ? timeout : 300,
        KolonSira = configuration.GetSection("TersBakiye:KolonSira").Get<string[]>() ?? [],
        KolonEtiketleri = configuration.GetSection("TersBakiye:KolonEtiketleri").Get<Dictionary<string, string>>()
            ?? new Dictionary<string, string>(),
        FiltreKolonMap = configuration.GetSection("TersBakiye:FiltreKolonMap").Get<Dictionary<string, string>>()
            ?? new Dictionary<string, string>()
    };

    public async Task<TersBakiyeQueryResult> CalistirAsync(
        TersBakiyeRaporIstek istek,
        CancellationToken cancellationToken = default)
    {
        var ayarlar = GetAyarlar();
        var mod = NormalizeMod(istek.Mod);
        var spName = mod == "ledger" ? ayarlar.SpByLedger : ayarlar.SpByAccount;

        try
        {
            var parameters = BuildParameters(istek, ayarlar.IntListTableType, mod);
            var result = await tdConnectionService.ExecuteStoredProcedureAsync(
                ayarlar.KatmanKodu,
                spName,
                parameters,
                ayarlar.SorguTimeoutSaniye,
                ayarlar.MaxSatir,
                cancellationToken);

            if (!result.Basarili)
            {
                return Fail(mod, result.Hata, result.SureMs, ayarlar.MaxSatir);
            }

            var satirlar = result.Satirlar;
            if (mod == "ledger")
            {
                satirlar = LedgerLeftFilter.Apply(
                    satirlar,
                    "LedgerCode",
                    istek.MinLedgerCode,
                    istek.MaxLedgerCode);
            }

            var kolonlar = satirlar.Count > 0
                ? satirlar[0].Keys.ToList()
                : result.Satirlar.Count > 0
                    ? result.Satirlar[0].Keys.ToList()
                    : (IReadOnlyList<string>)[];

            var kisitlandi = result.Satirlar.Count >= ayarlar.MaxSatir;
            return new TersBakiyeQueryResult
            {
                Basarili = true,
                Mod = mod,
                Kolonlar = kolonlar,
                Satirlar = satirlar,
                SatirSayisi = satirlar.Count,
                SureMs = result.SureMs,
                Kisitlandi = kisitlandi,
                MaxSatir = ayarlar.MaxSatir
            };
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Ters bakiye raporu çalıştırılamadı: {Mod}", mod);
            return Fail(mod, ex.Message, 0, ayarlar.MaxSatir);
        }
    }

    private static string NormalizeMod(string? mod) =>
        string.Equals(mod, "ledger", StringComparison.OrdinalIgnoreCase) ? "ledger" : "account";

    private static IReadOnlyList<SqlParameter> BuildParameters(
        TersBakiyeRaporIstek istek,
        string intListTypeName,
        string mod)
    {
        var isAccount = mod == "account";
        var useLeftLedgerFilter = mod == "ledger";
        var parameters = new List<SqlParameter>
        {
            new("@minLedgerCode", SqlDbType.VarChar, 50)
            {
                Value = useLeftLedgerFilter ? DBNull.Value : ToDbValue(TrimOrNull(istek.MinLedgerCode))
            },
            new("@maxLedgerCode", SqlDbType.VarChar, 50)
            {
                Value = useLeftLedgerFilter ? DBNull.Value : ToDbValue(TrimOrNull(istek.MaxLedgerCode))
            },
            new("@BeginDate", SqlDbType.Date) { Value = istek.BeginDate.ToDateTime(TimeOnly.MinValue) },
            new("@EndDate", SqlDbType.Date) { Value = istek.EndDate.ToDateTime(TimeOnly.MinValue) },
            new("@FECId", SqlDbType.Int) { Value = ToDbValue(istek.FECId) },
            new("@LedgerTypeId", SqlDbType.Int) { Value = ToDbValue(istek.LedgerTypeId) },
            new("@CreditCardLedgerFlag", SqlDbType.TinyInt) { Value = ToDbValue(istek.CreditCardLedgerFlag) },
            new("@IncomeLossLedgerFlag", SqlDbType.TinyInt) { Value = ToDbValue(istek.IncomeLossLedgerFlag) },
            new("@minBalance", SqlDbType.Decimal)
            {
                Precision = 18,
                Scale = 2,
                Value = ToDbValue(istek.MinBalance)
            }
        };

        if (isAccount)
        {
            parameters.Insert(0, new("@AccountNumber", SqlDbType.Int) { Value = ToDbValue(istek.AccountNumber) });

            var accountList = BuildIntListTable(istek.AccountNumberList);
            parameters.Insert(1, new SqlParameter("@AccountNumberList", SqlDbType.Structured)
            {
                TypeName = intListTypeName,
                Value = accountList
            });

            parameters.Add(new("@BranchId", SqlDbType.Int) { Value = ToDbValue(istek.BranchId) });
            parameters.Add(new("@CustomerRiskStatusId", SqlDbType.Int) { Value = ToDbValue(istek.CustomerRiskStatusId) });
            parameters.Add(new("@AccountNumberKTFlag", SqlDbType.TinyInt) { Value = ToDbValue(istek.AccountNumberKTFlag) });
        }

        return parameters;
    }

    private static DataTable BuildIntListTable(IReadOnlyList<int>? values)
    {
        var table = new DataTable();
        table.Columns.Add("Value", typeof(int));

        if (values is null)
        {
            return table;
        }

        foreach (var value in values)
        {
            table.Rows.Add(value);
        }

        return table;
    }

    private static object ToDbValue(object? value) => value ?? DBNull.Value;

    private static string? TrimOrNull(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private static TersBakiyeQueryResult Fail(string mod, string? hata, int sureMs, int maxSatir) => new()
    {
        Basarili = false,
        Mod = mod,
        Hata = hata,
        SureMs = sureMs,
        MaxSatir = maxSatir
    };
}
