namespace MerkeziFinansalVeri.Infrastructure.Services;

public sealed class VeriKalitesiKpiSnapshot
{
    public int ToplamKuralSayisi { get; init; }
    public int AktifKuralSayisi { get; init; }
    public int SonCalistirmaHataliSayisi { get; init; }
    public int SonCalistirmaGecenSayisi { get; init; }
    public int BasariYuzdesi { get; init; }
    public DateOnly? SonCalistirmaTarihi { get; init; }
    public string Kaynak { get; init; } = "local";
}

public interface IVeriKalitesiKpiService
{
    Task<VeriKalitesiKpiSnapshot> GetKpiAsync(CancellationToken cancellationToken = default);
}
