USE [MGTV_Uygulama];
GO

-- ref.Ekip
MERGE ref.Ekip AS tgt
USING (VALUES
    (N'Banka Ekip 1'),
    (N'Banka Ekip 2'),
    (N'Banka Ekip 3'),
    (N'Merkezi Kontrol')
) AS src(Ad)
ON tgt.Ad = src.Ad AND tgt.SilindiMi = 0
WHEN NOT MATCHED BY TARGET THEN
    INSERT (Ad) VALUES (src.Ad);
GO

-- ref.Sayfa (PAGE_MENU)
MERGE ref.Sayfa AS tgt
USING (VALUES
    (N'portal',           N'PORTAL',              N'ti-home',         N'Portal',                              N'HomePage.html',                        1),
    (N'surec',            N'SÜREÇ',               N'ti-timeline',     N'Süreç',                               N'surec.html',                           2),
    (N'datasetler',       N'SÜREÇ',               N'ti-timeline',     N'Datasetler',                          N'surec.html?view=datasetler',           3),
    (N'task-listesi',     N'SÜREÇ',               N'ti-timeline',     N'Task Listesi',                        N'surec.html?view=task-listesi',         4),
    (N'mizan',            N'MUTABAKAT',           N'ti-scale',        N'Mizan',                               N'mizan.html',                           5),
    (N'mutabakat-donem',  N'MUTABAKAT',           N'ti-scale',        N'Dönem',                               N'mutabakat.html?view=donem',            6),
    (N'fark-veren',       N'MUTABAKAT',           N'ti-scale',        N'Fark Veren Hesaplar',                 N'mutabakat.html?view=fark-veren',       7),
    (N'kebir',            N'PARAMETRE YÖNETİMİ',   N'ti-adjustments',  N'Kebir Hesapları Sorumluluk Listesi',  N'kebir-hesaplari.html',                 8),
    (N'vk-kurallar',      N'VERİ KALİTESİ',       N'ti-list-check',   N'Veri Kalitesi Kuralları',             N'veri-kalitesi-kurallari.html',         9),
    (N'vk-gunluk',        N'VERİ KALİTESİ',       N'ti-list-check',   N'Günlük Kural Sonuçları',              N'gunluk-kural-sonuclari.html',         10),
    (N'veritabani-sorgu', N'RAPORLAMA',           N'ti-chart-bar',    N'Veritabanı Sorgusu',                  N'veritabani-sorgu.html',               11),
    (N'ters-bakiye',      N'RAPORLAMA',           N'ti-chart-bar',    N'Ters Bakiye Raporu',                  NULL,                                   12),
    (N'nazim',            N'RAPORLAMA',           N'ti-chart-bar',    N'Nazım Hesapları Raporu',              NULL,                                   13),
    (N'ayarlar',          N'AYARLAR',             N'ti-settings',     N'Ayarlar',                             N'ayarlar.html',                        14),
    (N'kullanici-yonetimi', N'YÖNETİM',           N'ti-users',        N'Kullanıcı Yönetimi',                  N'kullanici-yonetimi.html',             15),
    (N'kisi-yetkileri',   N'YÖNETİM',             N'ti-users',        N'Kişi Bazlı Yetkiler',                 N'kisi-yetkileri.html',                 16),
    (N'veritabani-baglantisi', N'YÖNETİM',         N'ti-users',        N'Veritabanı Bağlantısı',               N'veritabani-baglantisi.html',          17)
) AS src(SayfaId, Bolum, BolumIkon, Etiket, Href, Sira)
ON tgt.SayfaId = src.SayfaId
WHEN MATCHED THEN
    UPDATE SET
        Bolum = src.Bolum,
        BolumIkon = src.BolumIkon,
        Etiket = src.Etiket,
        Href = src.Href,
        Sira = src.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (SayfaId, Bolum, BolumIkon, Etiket, Href, Sira)
    VALUES (src.SayfaId, src.Bolum, src.BolumIkon, src.Etiket, src.Href, src.Sira);
GO

-- ref.VeriKatmani (COCKPIT_COLUMNS)
MERGE ref.VeriKatmani AS tgt
USING (VALUES
    (N'TDSTG',   N'Staging — ham veri katmanı',      N'teal',   1),
    (N'TDMAIN',  N'Ana veri — kurumsal çekirdek',    N'blue',   2),
    (N'TDREPORT', N'Raporlama — analitik katman',    N'purple', 3)
) AS src(KatmanKodu, Rol, Tema, Sira)
ON tgt.KatmanKodu = src.KatmanKodu
WHEN MATCHED THEN
    UPDATE SET Rol = src.Rol, Tema = src.Tema, Sira = src.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (KatmanKodu, Rol, Tema, Sira)
    VALUES (src.KatmanKodu, src.Rol, src.Tema, src.Sira);
GO

-- ref.VeriDomain (DATASET_DOMAINS)
MERGE ref.VeriDomain AS tgt
USING (VALUES
    (N'fon-kullandirim', N'Fon Kullandırım', N'teal',   1),
    (N'hazine',          N'Hazine',          N'blue',   2),
    (N'mevduat',         N'Mevduat',         N'purple', 3),
    (N'masraf',          N'Masraf',          N'amber',  4),
    (N'reeskont',        N'Reeskont',        N'rose',   5)
) AS src(DomainId, Ad, Tema, Sira)
ON tgt.DomainId = src.DomainId
WHEN MATCHED THEN
    UPDATE SET Ad = src.Ad, Tema = src.Tema, Sira = src.Sira
WHEN NOT MATCHED BY TARGET THEN
    INSERT (DomainId, Ad, Tema, Sira)
    VALUES (src.DomainId, src.Ad, src.Tema, src.Sira);
GO
