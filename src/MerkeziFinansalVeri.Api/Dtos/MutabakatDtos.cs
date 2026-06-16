namespace MerkeziFinansalVeri.Api.Dtos;

public sealed class RolDto
{
    public string RolId { get; set; } = string.Empty;
    public string Ad { get; set; } = string.Empty;
    public string? Aciklama { get; set; }
    public string? RozetSinifi { get; set; }
}

public sealed class MutabakatDonemDto
{
    public int DonemId { get; set; }
    public string YilAy { get; set; } = string.Empty;
    public string Etiket { get; set; } = string.Empty;
    public string Durum { get; set; } = string.Empty;
    public int HesapSayisi { get; set; }
    public int FarkVerenSayisi { get; set; }
    public DateOnly? KapanisTarihi { get; set; }
    public bool AktifMi { get; set; }
}

public sealed class MutabakatDonemUpdateDto
{
    public string Etiket { get; set; } = string.Empty;
    public string Durum { get; set; } = string.Empty;
    public DateOnly? KapanisTarihi { get; set; }
}

public sealed class MutabakatAktifDonemDto
{
    public int DonemId { get; set; }
}

public sealed class FarkVerenHesapDto
{
    public int FarkId { get; set; }
    public int DonemId { get; set; }
    public string HesapKodu { get; set; } = string.Empty;
    public string HesapAdi { get; set; } = string.Empty;
    public int EkipId { get; set; }
    public string? EkipAdi { get; set; }
    public decimal MizanBakiye { get; set; }
    public decimal KartonBakiye { get; set; }
    public decimal Fark { get; set; }
    public string Durum { get; set; } = string.Empty;
}

public sealed class TrustedDataMatrixMapFilterDto
{
    public int? LoadId { get; set; }
    public int? UpdateLoadId { get; set; }
    public string? SystemDateTime { get; set; }
    public string? ValidFrom { get; set; }
    public string? ValidUntil { get; set; }
    public int? ScdActiveFlag { get; set; }
    public int? TrustedDataMatrixMapId { get; set; }
    public string? SourceName { get; set; }
    public int? MatrixTableId { get; set; }
    public string? MatrixTableName { get; set; }
    public string? MatrixTableDescription { get; set; }
    public int? MatrixColumnId { get; set; }
    public string? MatrixColumnName { get; set; }
    public string? MatrixColumnDescription { get; set; }
    public int? TdInscopeFlag { get; set; }
    public int? BalanceTypeId { get; set; }
    public string? BalanceTypeName { get; set; }
    public string? InsertUserCode { get; set; }
    public string? UpdateUserCode { get; set; }
}

public sealed class MatrixMapAyarDto
{
    public string KatmanKodu { get; set; } = "TDMAIN";
    public string SorguDosyasi { get; set; } = "config/queries/matrixmap.sql";
    public int MaxSatir { get; set; } = 5000;
    public int SorguTimeoutSaniye { get; set; } = 120;
}
