using MerkeziFinansalVeri.Api.Middleware;
using MerkeziFinansalVeri.Infrastructure;
using MerkeziFinansalVeri.Infrastructure.Data;
using MerkeziFinansalVeri.Infrastructure.Services;
using System.IO.Compression;

var builder = WebApplication.CreateBuilder(args);

var repoRoot = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", ".."));
var webRootPath = Path.Combine(builder.Environment.ContentRootPath, "wwwroot");
if (!Directory.Exists(webRootPath))
{
    Directory.CreateDirectory(webRootPath);
}

builder.Environment.WebRootPath = webRootPath;
var tdConfigPath = Path.Combine(repoRoot, "config", "td-connections.json");
if (File.Exists(tdConfigPath))
{
    builder.Configuration.AddJsonFile(tdConfigPath, optional: true, reloadOnChange: true);
}

var vkKurallarConfigPath = Path.Combine(repoRoot, "config", "vk-kurallar.json");
if (File.Exists(vkKurallarConfigPath))
{
    builder.Configuration.AddJsonFile(vkKurallarConfigPath, optional: true, reloadOnChange: true);
}

var vkGunlukConfigPath = Path.Combine(repoRoot, "config", "vk-gunluk-sonuclar.json");
if (File.Exists(vkGunlukConfigPath))
{
    builder.Configuration.AddJsonFile(vkGunlukConfigPath, optional: true, reloadOnChange: true);
}

var vkPortalKpiConfigPath = Path.Combine(repoRoot, "config", "vk-portal-kpi.json");
if (File.Exists(vkPortalKpiConfigPath))
{
    builder.Configuration.AddJsonFile(vkPortalKpiConfigPath, optional: true, reloadOnChange: true);
}

var matrixMapConfigPath = Path.Combine(repoRoot, "config", "matrixmap.json");
if (File.Exists(matrixMapConfigPath))
{
    builder.Configuration.AddJsonFile(matrixMapConfigPath, optional: true, reloadOnChange: true);
}

var tersBakiyeConfigPath = Path.Combine(repoRoot, "config", "ters-bakiye.json");
if (File.Exists(tersBakiyeConfigPath))
{
    builder.Configuration.AddJsonFile(tersBakiyeConfigPath, optional: true, reloadOnChange: true);
}

var nazimHesaplariConfigPath = Path.Combine(repoRoot, "config", "nazim-hesaplari.json");
if (File.Exists(nazimHesaplariConfigPath))
{
    builder.Configuration.AddJsonFile(nazimHesaplariConfigPath, optional: true, reloadOnChange: true);
}

var datasetsConfigPath = Path.Combine(repoRoot, "config", "datasets.json");
if (File.Exists(datasetsConfigPath))
{
    builder.Configuration.AddJsonFile(datasetsConfigPath, optional: true, reloadOnChange: true);
}

var taskListesiConfigPath = Path.Combine(repoRoot, "config", "task-listesi.json");
if (File.Exists(taskListesiConfigPath))
{
    builder.Configuration.AddJsonFile(taskListesiConfigPath, optional: true, reloadOnChange: true);
}

var gunlukAkisConfigPath = Path.Combine(repoRoot, "config", "gunluk-akis.json");
if (File.Exists(gunlukAkisConfigPath))
{
    builder.Configuration.AddJsonFile(gunlukAkisConfigPath, optional: true, reloadOnChange: true);
}

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultBufferSize = 65536;
    });

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.BrotliCompressionProvider>();
    options.Providers.Add<Microsoft.AspNetCore.ResponseCompression.GzipCompressionProvider>();
});

builder.Services.Configure<Microsoft.AspNetCore.ResponseCompression.BrotliCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});

builder.Services.Configure<Microsoft.AspNetCore.ResponseCompression.GzipCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddScoped<IVeriKalitesiKpiService>(sp => new VeriKalitesiKpiService(
    sp.GetRequiredService<AppDbContext>(),
    sp.GetRequiredService<ITdConnectionService>(),
    sp.GetRequiredService<IConfiguration>(),
    sp.GetRequiredService<ILogger<VeriKalitesiKpiService>>(),
    repoRoot));

builder.Services.AddScoped<ITrustedDataMatrixMapService>(sp => new TrustedDataMatrixMapService(
    sp.GetRequiredService<ITdConnectionService>(),
    sp.GetRequiredService<IConfiguration>(),
    sp.GetRequiredService<ILogger<TrustedDataMatrixMapService>>(),
    repoRoot));

builder.Services.AddScoped<ITersBakiyeService, TersBakiyeService>();
builder.Services.AddScoped<INazimHesaplariService, NazimHesaplariService>();
builder.Services.AddScoped<IDatasetCatalogService>(sp => new DatasetCatalogService(
    sp.GetRequiredService<ITdConnectionService>(),
    sp.GetRequiredService<IConfiguration>(),
    sp.GetRequiredService<ILogger<DatasetCatalogService>>(),
    repoRoot));
builder.Services.AddScoped<IParallelRunTaskListService>(sp => new ParallelRunTaskListService(
    sp.GetRequiredService<ITdConnectionService>(),
    sp.GetRequiredService<IConfiguration>(),
    sp.GetRequiredService<ILogger<ParallelRunTaskListService>>(),
    repoRoot));
builder.Services.AddScoped<IEtlLoadCockpitService>(sp => new EtlLoadCockpitService(
    sp.GetRequiredService<ITdConnectionService>(),
    sp.GetRequiredService<IConfiguration>(),
    sp.GetRequiredService<ILogger<EtlLoadCockpitService>>(),
    repoRoot));

builder.Services.AddCors(options =>
{
    options.AddPolicy("StaticFiles", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyOrigin()
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
        else
        {
            policy.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [])
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    try
    {
        var bootstrap = scope.ServiceProvider.GetRequiredService<VeriKaynagiBootstrap>();
        await bootstrap.EnsureSeededAsync();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "Veri kaynağı bootstrap atlandı — veritabanı henüz hazır olmayabilir.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseResponseCompression();
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("StaticFiles");
app.UseMiddleware<CurrentUserMiddleware>();
app.UseStaticFiles();
app.MapControllers();

app.Run();
