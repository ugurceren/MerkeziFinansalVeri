using MerkeziFinansalVeri.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MerkeziFinansalVeri.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Ekip> Ekipler => Set<Ekip>();
    public DbSet<Sayfa> Sayfalar => Set<Sayfa>();
    public DbSet<VeriKatmani> VeriKatmanlari => Set<VeriKatmani>();
    public DbSet<VeriDomain> VeriDomainleri => Set<VeriDomain>();
    public DbSet<Rol> Roller => Set<Rol>();
    public DbSet<Kullanici> Kullanicilar => Set<Kullanici>();
    public DbSet<RolSayfaYetki> RolSayfaYetkileri => Set<RolSayfaYetki>();
    public DbSet<KullaniciSayfaYetki> KullaniciSayfaYetkileri => Set<KullaniciSayfaYetki>();
    public DbSet<VeriKaynagi> VeriKaynaklari => Set<VeriKaynagi>();
    public DbSet<SistemParametre> SistemParametreleri => Set<SistemParametre>();
    public DbSet<KurumsalHesap> KurumsalHesaplar => Set<KurumsalHesap>();
    public DbSet<MutabakatDonem> MutabakatDonemleri => Set<MutabakatDonem>();
    public DbSet<FarkVerenHesap> FarkVerenHesaplar => Set<FarkVerenHesap>();
    public DbSet<SurecDataset> SurecDatasetleri => Set<SurecDataset>();
    public DbSet<SurecGorevTanim> SurecGorevTanimlari => Set<SurecGorevTanim>();
    public DbSet<SurecGorevDurum> SurecGorevDurumlari => Set<SurecGorevDurum>();
    public DbSet<SurecGorevYenidenBaslatmaLog> SurecGorevYenidenBaslatmaLoglari => Set<SurecGorevYenidenBaslatmaLog>();
    public DbSet<VeriKalitesiKural> VeriKalitesiKurallari => Set<VeriKalitesiKural>();
    public DbSet<VeriKalitesiKuralSonuc> VeriKalitesiKuralSonuclari => Set<VeriKalitesiKuralSonuc>();
    public DbSet<KayitliSorgu> KayitliSorgular => Set<KayitliSorgu>();
    public DbSet<RaporTanim> RaporTanimlari => Set<RaporTanim>();
    public DbSet<RaporSonucSnapshot> RaporSonucSnapshotlari => Set<RaporSonucSnapshot>();
    public DbSet<AktiviteLog> AktiviteLoglari => Set<AktiviteLog>();
    public DbSet<SorguCalistirmaLog> SorguCalistirmaLoglari => Set<SorguCalistirmaLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Ekip>(entity =>
        {
            entity.ToTable("Ekip", "ref");
            entity.HasKey(e => e.EkipId);
            entity.Property(e => e.Ad).HasMaxLength(100);
        });

        modelBuilder.Entity<Sayfa>(entity =>
        {
            entity.ToTable("Sayfa", "ref");
            entity.HasKey(e => e.SayfaId);
            entity.Property(e => e.SayfaId).HasMaxLength(50);
            entity.Property(e => e.Bolum).HasMaxLength(100);
            entity.Property(e => e.BolumIkon).HasMaxLength(50);
            entity.Property(e => e.Etiket).HasMaxLength(200);
            entity.Property(e => e.Href).HasMaxLength(500);
        });

        modelBuilder.Entity<VeriKatmani>(entity =>
        {
            entity.ToTable("VeriKatmani", "ref");
            entity.HasKey(e => e.KatmanKodu);
            entity.Property(e => e.KatmanKodu).HasMaxLength(20);
            entity.Property(e => e.Rol).HasMaxLength(200);
            entity.Property(e => e.Tema).HasMaxLength(20);
        });

        modelBuilder.Entity<VeriDomain>(entity =>
        {
            entity.ToTable("VeriDomain", "ref");
            entity.HasKey(e => e.DomainId);
            entity.Property(e => e.DomainId).HasMaxLength(50);
            entity.Property(e => e.Ad).HasMaxLength(100);
            entity.Property(e => e.Tema).HasMaxLength(20);
        });

        modelBuilder.Entity<Rol>(entity =>
        {
            entity.ToTable("Rol", "sec");
            entity.HasKey(e => e.RolId);
            entity.Property(e => e.RolId).HasMaxLength(50);
            entity.Property(e => e.Ad).HasMaxLength(100);
            entity.Property(e => e.Aciklama).HasMaxLength(500);
            entity.Property(e => e.RozetSinifi).HasMaxLength(50);
        });

        modelBuilder.Entity<Kullanici>(entity =>
        {
            entity.ToTable("Kullanici", "sec");
            entity.HasKey(e => e.KullaniciId);
            entity.Property(e => e.Ad).HasMaxLength(200);
            entity.Property(e => e.Eposta).HasMaxLength(200);
            entity.Property(e => e.RolId).HasMaxLength(50);
            entity.Property(e => e.Durum).HasMaxLength(20);
            entity.HasOne(e => e.Rol).WithMany(r => r.Kullanicilar).HasForeignKey(e => e.RolId);
        });

        modelBuilder.Entity<RolSayfaYetki>(entity =>
        {
            entity.ToTable("RolSayfaYetki", "sec");
            entity.HasKey(e => new { e.RolId, e.SayfaId });
            entity.Property(e => e.RolId).HasMaxLength(50);
            entity.Property(e => e.SayfaId).HasMaxLength(50);
            entity.HasOne(e => e.Rol).WithMany(r => r.RolSayfaYetkileri).HasForeignKey(e => e.RolId);
            entity.HasOne(e => e.Sayfa).WithMany(s => s.RolSayfaYetkileri).HasForeignKey(e => e.SayfaId);
        });

        modelBuilder.Entity<KullaniciSayfaYetki>(entity =>
        {
            entity.ToTable("KullaniciSayfaYetki", "sec");
            entity.HasKey(e => new { e.KullaniciId, e.SayfaId });
            entity.Property(e => e.SayfaId).HasMaxLength(50);
            entity.HasOne(e => e.Kullanici).WithMany(k => k.KullaniciSayfaYetkileri).HasForeignKey(e => e.KullaniciId);
            entity.HasOne(e => e.Sayfa).WithMany(s => s.KullaniciSayfaYetkileri).HasForeignKey(e => e.SayfaId);
        });

        modelBuilder.Entity<VeriKaynagi>(entity =>
        {
            entity.ToTable("VeriKaynagi", "cfg");
            entity.HasKey(e => e.KaynakId);
            entity.Property(e => e.KatmanKodu).HasMaxLength(20);
            entity.Property(e => e.Sunucu).HasMaxLength(200);
            entity.Property(e => e.Veritabani).HasMaxLength(100);
            entity.Property(e => e.KimlikDogrulama).HasMaxLength(20);
            entity.Property(e => e.KullaniciAdi).HasMaxLength(100);
            entity.Property(e => e.Durum).HasMaxLength(20);
            entity.HasOne(e => e.VeriKatmani).WithMany(v => v.VeriKaynaklari).HasForeignKey(e => e.KatmanKodu);
        });

        modelBuilder.Entity<SistemParametre>(entity =>
        {
            entity.ToTable("SistemParametre", "cfg");
            entity.HasKey(e => e.Anahtar);
            entity.Property(e => e.Anahtar).HasMaxLength(100);
            entity.Property(e => e.Deger).HasMaxLength(500);
        });

        modelBuilder.Entity<KurumsalHesap>(entity =>
        {
            entity.ToTable("KurumsalHesap", "ops");
            entity.HasKey(e => e.HesapNo);
            entity.HasIndex(e => e.HesapId).IsUnique();
            entity.Property(e => e.HesapAdi).HasMaxLength(200);
            entity.Property(e => e.BeklenenAksiyon).HasMaxLength(100);
            entity.Property(e => e.Kaynak).HasMaxLength(50);
            entity.HasOne(e => e.Ekip).WithMany(e => e.KurumsalHesaplar).HasForeignKey(e => e.EkipId);
            entity.HasOne(e => e.OlusturanKullanici).WithMany(k => k.OlusturduguKurumsalHesaplar).HasForeignKey(e => e.OlusturanKullaniciId);
            entity.HasOne(e => e.GuncelleyenKullanici).WithMany(k => k.GuncelledigiKurumsalHesaplar).HasForeignKey(e => e.GuncelleyenKullaniciId);
        });

        modelBuilder.Entity<MutabakatDonem>(entity =>
        {
            entity.ToTable("MutabakatDonem", "ops");
            entity.HasKey(e => e.DonemId);
            entity.HasIndex(e => e.YilAy).IsUnique();
            entity.Property(e => e.YilAy).HasMaxLength(7).IsFixedLength();
            entity.Property(e => e.Etiket).HasMaxLength(100);
            entity.Property(e => e.Durum).HasMaxLength(20);
        });

        modelBuilder.Entity<FarkVerenHesap>(entity =>
        {
            entity.ToTable("FarkVerenHesap", "ops");
            entity.HasKey(e => e.FarkId);
            entity.HasIndex(e => new { e.DonemId, e.HesapKodu }).IsUnique();
            entity.Property(e => e.HesapKodu).HasMaxLength(50);
            entity.Property(e => e.HesapAdi).HasMaxLength(200);
            entity.Property(e => e.Durum).HasMaxLength(20);
            entity.Property(e => e.MizanBakiye).HasColumnType("decimal(18,2)");
            entity.Property(e => e.KartonBakiye).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Fark)
                .HasColumnType("decimal(18,2)")
                .HasComputedColumnSql("(MizanBakiye - KartonBakiye)", stored: true);
            entity.HasOne(e => e.Donem).WithMany(d => d.FarkVerenHesaplar).HasForeignKey(e => e.DonemId);
            entity.HasOne(e => e.Ekip).WithMany(e => e.FarkVerenHesaplar).HasForeignKey(e => e.EkipId);
        });

        modelBuilder.Entity<SurecDataset>(entity =>
        {
            entity.ToTable("SurecDataset", "ops");
            entity.HasKey(e => e.DatasetId);
            entity.HasIndex(e => e.Kod).IsUnique();
            entity.Property(e => e.Kod).HasMaxLength(50);
            entity.Property(e => e.Etiket).HasMaxLength(200);
            entity.Property(e => e.KatmanKodu).HasMaxLength(20);
            entity.Property(e => e.DomainId).HasMaxLength(50);
            entity.HasOne(e => e.VeriKatmani).WithMany(v => v.SurecDatasetler).HasForeignKey(e => e.KatmanKodu);
            entity.HasOne(e => e.VeriDomain).WithMany(v => v.SurecDatasetler).HasForeignKey(e => e.DomainId);
        });

        modelBuilder.Entity<SurecGorevTanim>(entity =>
        {
            entity.ToTable("SurecGorevTanim", "ops");
            entity.HasKey(e => e.GorevTanimId);
            entity.Property(e => e.Etiket).HasMaxLength(100);
            entity.HasOne(e => e.Dataset).WithMany(d => d.SurecGorevTanimlari).HasForeignKey(e => e.DatasetId);
        });

        modelBuilder.Entity<SurecGorevDurum>(entity =>
        {
            entity.ToTable("SurecGorevDurum", "ops");
            entity.HasKey(e => e.GorevDurumId);
            entity.HasIndex(e => new { e.GorevTanimId, e.DonemId }).IsUnique();
            entity.Property(e => e.Durum).HasMaxLength(20);
            entity.HasOne(e => e.GorevTanim).WithMany(g => g.SurecGorevDurumlari).HasForeignKey(e => e.GorevTanimId);
            entity.HasOne(e => e.Donem).WithMany(d => d.SurecGorevDurumlari).HasForeignKey(e => e.DonemId);
        });

        modelBuilder.Entity<SurecGorevYenidenBaslatmaLog>(entity =>
        {
            entity.ToTable("SurecGorevYenidenBaslatmaLog", "ops");
            entity.HasKey(e => e.LogId);
            entity.HasOne(e => e.GorevTanim).WithMany(g => g.YenidenBaslatmaLoglari).HasForeignKey(e => e.GorevTanimId);
            entity.HasOne(e => e.Kullanici).WithMany(k => k.SurecGorevYenidenBaslatmaLoglari).HasForeignKey(e => e.KullaniciId);
        });

        modelBuilder.Entity<VeriKalitesiKural>(entity =>
        {
            entity.ToTable("VeriKalitesiKural", "ops");
            entity.HasKey(e => e.KuralId);
            entity.Property(e => e.KuralId).HasMaxLength(20);
            entity.Property(e => e.Ad).HasMaxLength(200);
            entity.Property(e => e.Alan).HasMaxLength(100);
            entity.Property(e => e.Onem).HasMaxLength(20);
            entity.Property(e => e.Durum).HasMaxLength(20);
        });

        modelBuilder.Entity<VeriKalitesiKuralSonuc>(entity =>
        {
            entity.ToTable("VeriKalitesiKuralSonuc", "ops");
            entity.HasKey(e => e.SonucId);
            entity.Property(e => e.KuralId).HasMaxLength(20);
            entity.Property(e => e.Sonuc).HasMaxLength(20);
            entity.HasOne(e => e.Kural).WithMany(k => k.KuralSonuclari).HasForeignKey(e => e.KuralId);
        });

        modelBuilder.Entity<KayitliSorgu>(entity =>
        {
            entity.ToTable("KayitliSorgu", "ops");
            entity.HasKey(e => e.SorguId);
            entity.Property(e => e.Ad).HasMaxLength(200);
            entity.Property(e => e.KatmanKodu).HasMaxLength(20);
            entity.HasOne(e => e.OlusturanKullanici).WithMany(k => k.KayitliSorgular).HasForeignKey(e => e.OlusturanKullaniciId);
        });

        modelBuilder.Entity<RaporTanim>(entity =>
        {
            entity.ToTable("RaporTanim", "ops");
            entity.HasKey(e => e.RaporKodu);
            entity.Property(e => e.RaporKodu).HasMaxLength(50);
            entity.Property(e => e.Ad).HasMaxLength(200);
            entity.Property(e => e.KaynakKatman).HasMaxLength(20);
            entity.Property(e => e.ViewAdi).HasMaxLength(200);
            entity.Property(e => e.SpAdi).HasMaxLength(200);
        });

        modelBuilder.Entity<RaporSonucSnapshot>(entity =>
        {
            entity.ToTable("RaporSonucSnapshot", "ops");
            entity.HasKey(e => e.SnapshotId);
            entity.Property(e => e.RaporKodu).HasMaxLength(50);
            entity.HasOne(e => e.RaporTanim).WithMany(r => r.RaporSonucSnapshotlari).HasForeignKey(e => e.RaporKodu);
            entity.HasOne(e => e.Donem).WithMany(d => d.RaporSonucSnapshotlari).HasForeignKey(e => e.DonemId);
        });

        modelBuilder.Entity<AktiviteLog>(entity =>
        {
            entity.ToTable("AktiviteLog", "audit");
            entity.HasKey(e => e.LogId);
            entity.Property(e => e.OlayTipi).HasMaxLength(50);
            entity.Property(e => e.Baslik).HasMaxLength(200);
            entity.Property(e => e.Detay).HasMaxLength(500);
            entity.HasOne(e => e.Kullanici).WithMany(k => k.AktiviteLoglari).HasForeignKey(e => e.KullaniciId);
        });

        modelBuilder.Entity<SorguCalistirmaLog>(entity =>
        {
            entity.ToTable("SorguCalistirmaLog", "audit");
            entity.HasKey(e => e.LogId);
            entity.Property(e => e.KatmanKodu).HasMaxLength(20);
            entity.HasOne(e => e.Kullanici).WithMany(k => k.SorguCalistirmaLoglari).HasForeignKey(e => e.KullaniciId);
        });
    }
}
