namespace MerkeziFinansalVeri.Api.Dtos;

public sealed class SurecCockpitDto
{
    public int ToplamDataset { get; set; }
    public int TamamlananGorev { get; set; }
    public int BekleyenGorev { get; set; }
    public int HataliGorev { get; set; }
    public string? AktifDonem { get; set; }
}

public sealed class SurecKokpitKatmanDto
{
    public string KatmanKodu { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
    public string Tema { get; set; } = string.Empty;
    public IReadOnlyList<SurecKokpitDatasetDto> Datasets { get; set; } = [];
}

public sealed class SurecKokpitDatasetDto
{
    public string Kod { get; set; } = string.Empty;
    public string Etiket { get; set; } = string.Empty;
    public IReadOnlyList<SurecKokpitGorevDto> Gorevler { get; set; } = [];
}

public sealed class SurecKokpitGorevDto
{
    public int GorevTanimId { get; set; }
    public string Etiket { get; set; } = string.Empty;
    public string Durum { get; set; } = string.Empty;
}

public sealed class VeriDomainDto
{
    public string DomainId { get; set; } = string.Empty;
    public string Ad { get; set; } = string.Empty;
    public string Tema { get; set; } = string.Empty;
    public IReadOnlyList<SurecKokpitDatasetDto> Datasets { get; set; } = [];
}

public sealed class SurecDatasetDto
{
    public int DatasetId { get; set; }
    public string Kod { get; set; } = string.Empty;
    public string Etiket { get; set; } = string.Empty;
    public string? KatmanKodu { get; set; }
    public string? DomainId { get; set; }
    public int Sira { get; set; }
    public int GorevSayisi { get; set; }
}

public sealed class SurecGorevDto
{
    public int GorevTanimId { get; set; }
    public int DatasetId { get; set; }
    public string DatasetKod { get; set; } = string.Empty;
    public string Etiket { get; set; } = string.Empty;
    public int Sira { get; set; }
    public string Durum { get; set; } = string.Empty;
    public DateTime? SonGuncelleme { get; set; }
}

public sealed class TaskListesiDto
{
    public int GorevTanimId { get; set; }
    public string Etiket { get; set; } = string.Empty;
    public string DatasetKod { get; set; } = string.Empty;
    public string Durum { get; set; } = string.Empty;
    public DateTime? SonGuncelleme { get; set; }
}

public sealed class MizanGorevDto
{
    public int GorevTanimId { get; set; }
    public string Etiket { get; set; } = string.Empty;
    public string Durum { get; set; } = string.Empty;
    public DateTime? SonGuncelleme { get; set; }
}

public sealed class MizanGorevGuncelleDto
{
    public string Durum { get; set; } = string.Empty;
}

public sealed class MizanYenidenBaslatDto
{
    public int GorevTanimId { get; set; }
}
