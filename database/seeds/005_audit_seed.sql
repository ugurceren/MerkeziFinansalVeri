USE [MGTV_Uygulama];
GO

-- audit.AktiviteLog (HomePage.html portal — Son Aktiviteler)
IF NOT EXISTS (SELECT 1 FROM audit.AktiviteLog WHERE OlayTipi = N'edit' AND Baslik = N'Kurumsal Hesap 3 güncellendi')
    INSERT INTO audit.AktiviteLog (OlayTipi, Baslik, Detay, KullaniciId, OlusturmaZamani)
    VALUES (N'edit', N'Kurumsal Hesap 3 güncellendi', N'Mehmet Kara — Sorumlu ekip değişikliği', 3, CAST(N'2026-06-07 10:18:00' AS DATETIME2));
GO

IF NOT EXISTS (SELECT 1 FROM audit.AktiviteLog WHERE OlayTipi = N'alert' AND Baslik = N'7 hesapta aksiyon bekleniyor')
    INSERT INTO audit.AktiviteLog (OlayTipi, Baslik, Detay, KullaniciId, OlusturmaZamani)
    VALUES (N'alert', N'7 hesapta aksiyon bekleniyor', N'Banka Ekip 2 — Doğrulama süreci', NULL, CAST(N'2026-06-07 09:30:00' AS DATETIME2));
GO

IF NOT EXISTS (SELECT 1 FROM audit.AktiviteLog WHERE OlayTipi = N'ok' AND Baslik = N'Ocak mutabakatı onaylandı')
    INSERT INTO audit.AktiviteLog (OlayTipi, Baslik, Detay, KullaniciId, OlusturmaZamani)
    VALUES (N'ok', N'Ocak mutabakatı onaylandı', N'Merkezi Kontrol — Mizan eşleşmesi tamam', NULL, CAST(N'2026-06-07 07:30:00' AS DATETIME2));
GO

IF NOT EXISTS (SELECT 1 FROM audit.AktiviteLog WHERE OlayTipi = N'export' AND Baslik = N'Excel dışa aktarım tamamlandı')
    INSERT INTO audit.AktiviteLog (OlayTipi, Baslik, Detay, KullaniciId, OlusturmaZamani)
    VALUES (N'export', N'Excel dışa aktarım tamamlandı', N'Ayşe Demir — Gelir tablosu raporu', 2, CAST(N'2026-06-06 16:42:00' AS DATETIME2));
GO
