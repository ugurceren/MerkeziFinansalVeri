USE [MGTV_Uygulama];
GO

-- ops.MutabakatDonem (PERIODS)
MERGE ops.MutabakatDonem AS tgt
USING (VALUES
    (N'2026-06', N'Haziran 2026', N'aktif',  248, 12, NULL,           1),
    (N'2026-05', N'Mayıs 2026',   N'kapali', 246,  0, N'2026-06-03',  0),
    (N'2026-04', N'Nisan 2026',   N'kapali', 244,  0, N'2026-05-04',  0),
    (N'2026-03', N'Mart 2026',    N'onay',   241,  3, NULL,           0)
) AS src(YilAy, Etiket, Durum, HesapSayisi, FarkVerenSayisi, KapanisTarihi, AktifMi)
ON tgt.YilAy = src.YilAy
WHEN MATCHED THEN
    UPDATE SET
        Etiket = src.Etiket,
        Durum = src.Durum,
        HesapSayisi = src.HesapSayisi,
        FarkVerenSayisi = src.FarkVerenSayisi,
        KapanisTarihi = src.KapanisTarihi,
        AktifMi = src.AktifMi,
        GuncellemeZamani = SYSUTCDATETIME()
WHEN NOT MATCHED BY TARGET THEN
    INSERT (YilAy, Etiket, Durum, HesapSayisi, FarkVerenSayisi, KapanisTarihi, AktifMi)
    VALUES (src.YilAy, src.Etiket, src.Durum, src.HesapSayisi, src.FarkVerenSayisi, src.KapanisTarihi, src.AktifMi);
GO

-- ops.KurumsalHesap (kebir-hesaplari.html — 10 rows)
MERGE ops.KurumsalHesap AS tgt
USING (
    SELECT
        v.HesapId,
        v.HesapAdi,
        e.EkipId,
        v.BeklenenAksiyon,
        v.Kaynak,
        v.KayitTarihi,
        v.GuncellemeTarihi,
        ok.KullaniciId AS OlusturanKullaniciId,
        gk.KullaniciId AS GuncelleyenKullaniciId
    FROM (VALUES
        (1,  N'Kurumsal Hesap 1',  N'Banka Ekip 1',    N'Ödeme İşlemi',      N'Banka Sistemi',   N'2024-01-15', N'2024-01-20', N'Ahmet Yılmaz', N'Mehmet Kara'),
        (2,  N'Kurumsal Hesap 2',  N'Banka Ekip 2',    N'Hesap Aktarımı',    N'Merkezi Sistem',  N'2024-01-18', N'2024-01-21', N'Ayşe Demir',   N'Zeynep Can'),
        (3,  N'Kurumsal Hesap 3',  N'Banka Ekip 1',    N'Kaydı Güncelle',    N'Banka Sistemi',   N'2024-01-20', N'2024-01-22', N'Mehmet Kara',  N'Ahmet Yılmaz'),
        (4,  N'Kurumsal Hesap 4',  N'Banka Ekip 3',    N'Doğrulama Bekle',   N'Merkezi Sistem',  N'2024-01-22', N'2024-01-23', N'Fatih Şahin',  N'Seda Yıldız'),
        (5,  N'Kurumsal Hesap 5',  N'Banka Ekip 2',    N'Bilgi Eksik',       N'Banka Sistemi',   N'2024-01-23', N'2024-01-24', N'Zeynep Can',   N'Ayşe Demir'),
        (6,  N'Kurumsal Hesap 6',  N'Banka Ekip 1',    N'İzin Bekle',        N'Merkezi Sistem',  N'2024-01-25', N'2024-01-26', N'Seda Yıldız',  N'Fatih Şahin'),
        (7,  N'Kurumsal Hesap 7',  N'Banka Ekip 3',    N'Ödeme İşlemi',      N'Banka Sistemi',   N'2024-01-26', N'2024-01-27', N'Ahmet Yılmaz', N'Mehmet Kara'),
        (8,  N'Kurumsal Hesap 8',  N'Banka Ekip 2',    N'Hesap Aktarımı',    N'Merkezi Sistem',  N'2024-01-27', N'2024-01-28', N'Zeynep Can',   N'Ayşe Demir'),
        (9,  N'Kurumsal Hesap 9',  N'Banka Ekip 1',    N'Kaydı Güncelle',    N'Banka Sistemi',   N'2024-01-28', N'2024-01-29', N'Fatih Şahin',  N'Seda Yıldız'),
        (10, N'Kurumsal Hesap 10', N'Banka Ekip 3',    N'Doğrulama Bekle',   N'Merkezi Sistem',  N'2024-01-29', N'2024-01-30', N'Mehmet Kara',  N'Ahmet Yılmaz')
    ) AS v(HesapId, HesapAdi, EkipAd, BeklenenAksiyon, Kaynak, KayitTarihi, GuncellemeTarihi, OlusturanAd, GuncelleyenAd)
    INNER JOIN ref.Ekip e ON e.Ad = v.EkipAd AND e.SilindiMi = 0
    LEFT JOIN sec.Kullanici ok ON ok.Ad = v.OlusturanAd AND ok.SilindiMi = 0
    LEFT JOIN sec.Kullanici gk ON gk.Ad = v.GuncelleyenAd AND gk.SilindiMi = 0
) AS src
ON tgt.HesapId = src.HesapId AND tgt.SilindiMi = 0
WHEN MATCHED THEN
    UPDATE SET
        HesapAdi = src.HesapAdi,
        EkipId = src.EkipId,
        BeklenenAksiyon = src.BeklenenAksiyon,
        Kaynak = src.Kaynak,
        KayitTarihi = src.KayitTarihi,
        GuncellemeTarihi = src.GuncellemeTarihi,
        OlusturanKullaniciId = src.OlusturanKullaniciId,
        GuncelleyenKullaniciId = src.GuncelleyenKullaniciId
WHEN NOT MATCHED BY TARGET THEN
    INSERT (HesapId, HesapAdi, EkipId, BeklenenAksiyon, Kaynak, KayitTarihi, GuncellemeTarihi, OlusturanKullaniciId, GuncelleyenKullaniciId)
    VALUES (src.HesapId, src.HesapAdi, src.EkipId, src.BeklenenAksiyon, src.Kaynak, src.KayitTarihi, src.GuncellemeTarihi, src.OlusturanKullaniciId, src.GuncelleyenKullaniciId);
GO

-- ops.FarkVerenHesap (DIFF_ACCOUNTS — aktif dönem 2026-06)
MERGE ops.FarkVerenHesap AS tgt
USING (
    SELECT
        d.DonemId,
        v.HesapKodu,
        v.HesapAdi,
        e.EkipId,
        v.MizanBakiye,
        v.KartonBakiye,
        v.Durum
    FROM (VALUES
        (N'100.01.001', N'Merkez Kasa',                    N'Banka Ekip 1',    1500000.00,  1485000.00,  N'acik'),
        (N'120.05.042', N'Ticari Alacaklar — X A.Ş.',      N'Banka Ekip 2',    2847500.00,  2851000.00,  N'inceleniyor'),
        (N'320.02.018', N'Satıcılar — Y Ltd.',             N'Banka Ekip 1',     920000.00,   915500.00,  N'acik'),
        (N'102.03.007', N'Vadesiz Mevduat — TL',           N'Merkezi Kontrol', 45800000.00, 45800000.00, N'kapatildi'),
        (N'180.01.003', N'Gelecek Aylara Ait Giderler',    N'Banka Ekip 3',     125400.00,   128900.00,  N'acik'),
        (N'391.01.002', N'Hesaplanan KDV',                 N'Banka Ekip 2',     567800.00,   562300.00,  N'inceleniyor'),
        (N'770.04.011', N'Genel Yönetim Giderleri',        N'Banka Ekip 3',     890000.00,   901200.00,  N'acik'),
        (N'257.01.001', N'Birikmiş Amortisman',            N'Merkezi Kontrol',  3200000.00,  3198500.00,  N'kapatildi')
    ) AS v(HesapKodu, HesapAdi, EkipAd, MizanBakiye, KartonBakiye, Durum)
    INNER JOIN ops.MutabakatDonem d ON d.YilAy = N'2026-06'
    INNER JOIN ref.Ekip e ON e.Ad = v.EkipAd AND e.SilindiMi = 0
) AS src
ON tgt.DonemId = src.DonemId AND tgt.HesapKodu = src.HesapKodu AND tgt.SilindiMi = 0
WHEN MATCHED THEN
    UPDATE SET
        HesapAdi = src.HesapAdi,
        EkipId = src.EkipId,
        MizanBakiye = src.MizanBakiye,
        KartonBakiye = src.KartonBakiye,
        Durum = src.Durum,
        GuncellemeZamani = SYSUTCDATETIME()
WHEN NOT MATCHED BY TARGET THEN
    INSERT (DonemId, HesapKodu, HesapAdi, EkipId, MizanBakiye, KartonBakiye, Durum)
    VALUES (src.DonemId, src.HesapKodu, src.HesapAdi, src.EkipId, src.MizanBakiye, src.KartonBakiye, src.Durum);
GO

-- ops.SurecDataset (COCKPIT_COLUMNS + DATASET_DOMAINS)
MERGE ops.SurecDataset AS tgt
USING (VALUES
    -- COCKPIT_COLUMNS — katman bazlı
    (N'ds_banka_ham',       N'Banka Ham Veri',      N'TDSTG',   NULL,               1),
    (N'ds_muhasebe_raw',    N'Muhasebe Raw',        N'TDSTG',   NULL,               2),
    (N'ds_doviz_kurlari',   N'Döviz Kurları',       N'TDSTG',   NULL,               3),
    (N'ds_masraf_stg',      N'Masraf Staging',      N'TDSTG',   N'masraf',          4),
    (N'ds_kebir',           N'Kebir Defteri',       N'TDMAIN',  NULL,               5),
    (N'ds_mizan',           N'Mizan',               N'TDMAIN',  NULL,               6),
    (N'ds_yevmiye',         N'Yevmiye',             N'TDMAIN',  NULL,               7),
    (N'ds_hesap_plan',      N'Hesap Planı',         N'TDMAIN',  NULL,               8),
    (N'ds_bilanco',         N'Bilanço',             N'TDREPORT', NULL,              9),
    (N'ds_gelir',           N'Gelir Tablosu',       N'TDREPORT', NULL,             10),
    (N'ds_ters_bakiye',     N'Ters Bakiye',         N'TDREPORT', NULL,             11),
    (N'ds_nazim',           N'Nazım Hesapları',     N'TDREPORT', NULL,             12),
    -- DATASET_DOMAINS — domain bazlı
    (N'ds_fon_hareket',      N'Fon Hareket',         NULL,       N'fon-kullandirim', 13),
    (N'ds_fon_limit',        N'Fon Limit',           NULL,       N'fon-kullandirim', 14),
    (N'ds_fon_faiz',         N'Fon Faiz',            NULL,       N'fon-kullandirim', 15),
    (N'ds_fon_izleme',       N'Fon İzleme',          NULL,       N'fon-kullandirim', 16),
    (N'ds_hazine_portfoy',   N'Hazine Portföy',      NULL,       N'hazine',          17),
    (N'ds_hazine_islem',     N'Hazine İşlem',        NULL,       N'hazine',          18),
    (N'ds_hazine_deger',     N'Hazine Değerleme',    NULL,       N'hazine',          19),
    (N'ds_hazine_risk',      N'Hazine Risk',         NULL,       N'hazine',          20),
    (N'ds_hazine_mutabakat', N'Hazine Mutabakat',    NULL,       N'hazine',          21),
    (N'ds_mevduat_vadeli',   N'Vadeli Mevduat',      NULL,       N'mevduat',         22),
    (N'ds_mevduat_vadesiz',  N'Vadesiz Mevduat',     NULL,       N'mevduat',         23),
    (N'ds_mevduat_faiz',     N'Mevduat Faiz',        NULL,       N'mevduat',         24),
    (N'ds_mevduat_musteri',  N'Mevduat Müşteri',     NULL,       N'mevduat',         25),
    (N'ds_mevduat_hareket',  N'Mevduat Hareket',     NULL,       N'mevduat',         26),
    (N'ds_mevduat_rapor',    N'Mevduat Rapor',       NULL,       N'mevduat',         27),
    (N'ds_masraf_hesap',     N'Masraf Hesap',        NULL,       N'masraf',          28),
    (N'ds_masraf_dagitim',   N'Masraf Dağıtım',      NULL,       N'masraf',          29),
    (N'ds_masraf_butce',     N'Masraf Bütçe',        NULL,       N'masraf',          30),
    (N'ds_reeskont_portfoy', N'Reeskont Portföy',    NULL,       N'reeskont',        31),
    (N'ds_reeskont_faiz',    N'Reeskont Faiz',       NULL,       N'reeskont',        32),
    (N'ds_reeskont_vade',    N'Reeskont Vade',       NULL,       N'reeskont',        33)
) AS src(Kod, Etiket, KatmanKodu, DomainId, Sira)
ON tgt.Kod = src.Kod
WHEN MATCHED THEN
    UPDATE SET
        Etiket = src.Etiket,
        KatmanKodu = src.KatmanKodu,
        DomainId = src.DomainId,
        Sira = src.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Kod, Etiket, KatmanKodu, DomainId, Sira)
    VALUES (src.Kod, src.Etiket, src.KatmanKodu, src.DomainId, src.Sira);
GO

-- ops.SurecGorevTanim (COCKPIT_COLUMNS tasks)
MERGE ops.SurecGorevTanim AS tgt
USING (
    SELECT ds.DatasetId, v.Etiket, v.Sira
    FROM (VALUES
        (N'ds_banka_ham',     N'Yükleme',       1),
        (N'ds_banka_ham',     N'Validasyon',    2),
        (N'ds_banka_ham',     N'Staging Onay',  3),
        (N'ds_muhasebe_raw',  N'Yükleme',       1),
        (N'ds_muhasebe_raw',  N'Validasyon',    2),
        (N'ds_muhasebe_raw',  N'Staging Onay',  3),
        (N'ds_doviz_kurlari', N'Yükleme',      1),
        (N'ds_doviz_kurlari', N'Validasyon',    2),
        (N'ds_doviz_kurlari', N'Staging Onay',  3),
        (N'ds_masraf_stg',    N'Yükleme',       1),
        (N'ds_masraf_stg',    N'Validasyon',    2),
        (N'ds_masraf_stg',    N'Staging Onay',  3),
        (N'ds_kebir',         N'Dönüşüm',       1),
        (N'ds_kebir',         N'Mutabakat',     2),
        (N'ds_kebir',         N'Ana Veri Onay', 3),
        (N'ds_mizan',         N'Dönüşüm',       1),
        (N'ds_mizan',         N'Mutabakat',     2),
        (N'ds_mizan',         N'Ana Veri Onay', 3),
        (N'ds_yevmiye',       N'Dönüşüm',       1),
        (N'ds_yevmiye',       N'Mutabakat',     2),
        (N'ds_yevmiye',       N'Ana Veri Onay', 3),
        (N'ds_hesap_plan',    N'Dönüşüm',       1),
        (N'ds_hesap_plan',    N'Mutabakat',     2),
        (N'ds_hesap_plan',    N'Ana Veri Onay', 3),
        (N'ds_bilanco',       N'Agregasyon',    1),
        (N'ds_bilanco',       N'Rapor Üretim',  2),
        (N'ds_bilanco',       N'Yayınlama',     3),
        (N'ds_gelir',         N'Agregasyon',    1),
        (N'ds_gelir',         N'Rapor Üretim',  2),
        (N'ds_gelir',         N'Yayınlama',     3),
        (N'ds_ters_bakiye',   N'Agregasyon',    1),
        (N'ds_ters_bakiye',   N'Rapor Üretim',  2),
        (N'ds_ters_bakiye',   N'Yayınlama',     3),
        (N'ds_nazim',         N'Agregasyon',    1),
        (N'ds_nazim',         N'Rapor Üretim',  2),
        (N'ds_nazim',         N'Yayınlama',     3)
    ) AS v(DatasetKod, Etiket, Sira)
    INNER JOIN ops.SurecDataset ds ON ds.Kod = v.DatasetKod
) AS src
ON tgt.DatasetId = src.DatasetId AND tgt.Etiket = src.Etiket
WHEN MATCHED THEN
    UPDATE SET Sira = src.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (DatasetId, Etiket, Sira)
    VALUES (src.DatasetId, src.Etiket, src.Sira);
GO

-- ops.SurecGorevDurum (COCKPIT_COLUMNS task statuses — aktif dönem)
MERGE ops.SurecGorevDurum AS tgt
USING (
    SELECT
        gt.GorevTanimId,
        d.DonemId,
        v.Durum
    FROM (VALUES
        (N'ds_banka_ham',     N'Yükleme',       N'done'),
        (N'ds_banka_ham',     N'Validasyon',    N'done'),
        (N'ds_banka_ham',     N'Staging Onay',  N'done'),
        (N'ds_muhasebe_raw',  N'Yükleme',       N'done'),
        (N'ds_muhasebe_raw',  N'Validasyon',    N'running'),
        (N'ds_muhasebe_raw',  N'Staging Onay',  N'pending'),
        (N'ds_doviz_kurlari', N'Yükleme',       N'done'),
        (N'ds_doviz_kurlari', N'Validasyon',    N'done'),
        (N'ds_doviz_kurlari', N'Staging Onay',  N'done'),
        (N'ds_masraf_stg',    N'Yükleme',       N'running'),
        (N'ds_masraf_stg',    N'Validasyon',    N'pending'),
        (N'ds_masraf_stg',    N'Staging Onay',  N'pending'),
        (N'ds_kebir',         N'Dönüşüm',       N'done'),
        (N'ds_kebir',         N'Mutabakat',     N'running'),
        (N'ds_kebir',         N'Ana Veri Onay', N'pending'),
        (N'ds_mizan',         N'Dönüşüm',       N'done'),
        (N'ds_mizan',         N'Mutabakat',     N'running'),
        (N'ds_mizan',         N'Ana Veri Onay', N'pending'),
        (N'ds_yevmiye',       N'Dönüşüm',       N'done'),
        (N'ds_yevmiye',       N'Mutabakat',     N'pending'),
        (N'ds_yevmiye',       N'Ana Veri Onay', N'pending'),
        (N'ds_hesap_plan',    N'Dönüşüm',       N'done'),
        (N'ds_hesap_plan',    N'Mutabakat',     N'done'),
        (N'ds_hesap_plan',    N'Ana Veri Onay', N'done'),
        (N'ds_bilanco',       N'Agregasyon',    N'pending'),
        (N'ds_bilanco',       N'Rapor Üretim',  N'pending'),
        (N'ds_bilanco',       N'Yayınlama',     N'pending'),
        (N'ds_gelir',         N'Agregasyon',    N'pending'),
        (N'ds_gelir',         N'Rapor Üretim',  N'pending'),
        (N'ds_gelir',         N'Yayınlama',     N'pending'),
        (N'ds_ters_bakiye',   N'Agregasyon',    N'pending'),
        (N'ds_ters_bakiye',   N'Rapor Üretim',  N'pending'),
        (N'ds_ters_bakiye',   N'Yayınlama',     N'pending'),
        (N'ds_nazim',         N'Agregasyon',    N'pending'),
        (N'ds_nazim',         N'Rapor Üretim',  N'pending'),
        (N'ds_nazim',         N'Yayınlama',     N'pending')
    ) AS v(DatasetKod, GorevEtiket, Durum)
    INNER JOIN ops.SurecDataset ds ON ds.Kod = v.DatasetKod
    INNER JOIN ops.SurecGorevTanim gt ON gt.DatasetId = ds.DatasetId AND gt.Etiket = v.GorevEtiket
    INNER JOIN ops.MutabakatDonem d ON d.YilAy = N'2026-06'
) AS src
ON tgt.GorevTanimId = src.GorevTanimId AND ISNULL(tgt.DonemId, -1) = ISNULL(src.DonemId, -1)
WHEN MATCHED THEN
    UPDATE SET Durum = src.Durum, SonGuncelleme = SYSUTCDATETIME()
WHEN NOT MATCHED BY TARGET THEN
    INSERT (GorevTanimId, DonemId, Durum)
    VALUES (src.GorevTanimId, src.DonemId, src.Durum);
GO

-- ops.VeriKalitesiKural (RULES)
MERGE ops.VeriKalitesiKural AS tgt
USING (VALUES
    (N'DQ-001', N'Bakiye işareti kontrolü',       N'Mutabakat', N'Kritik', N'Aktif'),
    (N'DQ-002', N'Hesap kodu formatı',             N'Parametre', N'Yüksek', N'Aktif'),
    (N'DQ-003', N'Boş alan kontrolü — IBAN',      N'Hazine',    N'Orta',   N'Aktif'),
    (N'DQ-004', N'Tarih aralığı tutarlılığı',      N'Süreç',     N'Yüksek', N'Aktif'),
    (N'DQ-005', N'Duplicate kayıt tespiti',        N'Mevduat',   N'Kritik', N'Pasif'),
    (N'DQ-006', N'Referans tablo eşleşmesi',       N'Masraf',    N'Orta',   N'Aktif')
) AS src(KuralId, Ad, Alan, Onem, Durum)
ON tgt.KuralId = src.KuralId
WHEN MATCHED THEN
    UPDATE SET Ad = src.Ad, Alan = src.Alan, Onem = src.Onem, Durum = src.Durum, GuncellemeZamani = SYSUTCDATETIME()
WHEN NOT MATCHED BY TARGET THEN
    INSERT (KuralId, Ad, Alan, Onem, Durum)
    VALUES (src.KuralId, src.Ad, src.Alan, src.Onem, src.Durum);
GO

-- ops.VeriKalitesiKuralSonuc (DAILY_RESULTS)
MERGE ops.VeriKalitesiKuralSonuc AS tgt
USING (VALUES
    (CAST(N'2026-06-07' AS DATE), N'DQ-001', 248, 3, N'warn'),
    (CAST(N'2026-06-07' AS DATE), N'DQ-002', 512, 0, N'ok'),
    (CAST(N'2026-06-07' AS DATE), N'DQ-003',  89, 7, N'fail'),
    (CAST(N'2026-06-07' AS DATE), N'DQ-004', 156, 1, N'warn'),
    (CAST(N'2026-06-06' AS DATE), N'DQ-001', 247, 4, N'warn'),
    (CAST(N'2026-06-06' AS DATE), N'DQ-006', 320, 0, N'ok')
) AS src(CalistirmaTarihi, KuralId, GecenSayi, HataliSayi, Sonuc)
ON tgt.CalistirmaTarihi = src.CalistirmaTarihi AND tgt.KuralId = src.KuralId
WHEN MATCHED THEN
    UPDATE SET GecenSayi = src.GecenSayi, HataliSayi = src.HataliSayi, Sonuc = src.Sonuc
WHEN NOT MATCHED BY TARGET THEN
    INSERT (CalistirmaTarihi, KuralId, GecenSayi, HataliSayi, Sonuc)
    VALUES (src.CalistirmaTarihi, src.KuralId, src.GecenSayi, src.HataliSayi, src.Sonuc);
GO

-- ops.RaporTanim (placeholder raporlar)
MERGE ops.RaporTanim AS tgt
USING (VALUES
    (N'ters-bakiye', N'Ters Bakiye Raporu',       N'TDREPORT', N'vw_TersBakiye',    NULL),
    (N'nazim',       N'Nazım Hesapları Raporu',   N'TDREPORT', N'vw_NazimHesaplari', NULL)
) AS src(RaporKodu, Ad, KaynakKatman, ViewAdi, SpAdi)
ON tgt.RaporKodu = src.RaporKodu
WHEN MATCHED THEN
    UPDATE SET Ad = src.Ad, KaynakKatman = src.KaynakKatman, ViewAdi = src.ViewAdi, SpAdi = src.SpAdi
WHEN NOT MATCHED BY TARGET THEN
    INSERT (RaporKodu, Ad, KaynakKatman, ViewAdi, SpAdi)
    VALUES (src.RaporKodu, src.Ad, src.KaynakKatman, src.ViewAdi, src.SpAdi);
GO
