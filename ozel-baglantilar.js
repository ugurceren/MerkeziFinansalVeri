/*
  Özel veritabanı bağlantıları — Veritabanı Bağlantısı sayfasında eklenir,
  Veritabanı Sorgusu sayfasında "(özel)" hedef olarak listelenir.
  Yalnızca bu tarayıcının localStorage'ında tutulur.
*/
(function () {
    const STORAGE_KEY = 'vs_custom_connections';

    /** Aynı sunucu + veritabanı + port + kimlik doğrulama (+ SQL kullanıcısı) aynı bağlantıdır; ad fark etmez. */
    function connectionKey(conn) {
        const auth = String(conn?.kimlikDogrulama || 'windows').toLowerCase();
        return [
            String(conn?.sunucu || '').trim().toLowerCase(),
            String(conn?.veritabani || '').trim().toLowerCase(),
            Number(conn?.port) || 1433,
            auth,
            auth === 'sql' ? String(conn?.kullaniciAdi || '').trim().toLowerCase() : ''
        ].join('|');
    }

    /* İlk (en eski) kayıt tutulur; böylece id'si seçili hedef olarak saklanmış bağlantı kaybolmaz */
    function dedupe(list) {
        const seen = new Set();
        return list.filter(conn => {
            const key = connectionKey(conn);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function readRaw() {
        try {
            const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            return Array.isArray(list) ? list : [];
        } catch {
            return [];
        }
    }

    function save(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (err) {
            console.warn('Özel bağlantılar kaydedilemedi:', err);
        }
    }

    /** Tekrarları ayıklanmış liste; önceden biriken tekrarlar depodan da temizlenir. */
    function load() {
        const raw = readRaw();
        const list = dedupe(raw);
        if (list.length !== raw.length) save(list);
        return list;
    }

    function findDuplicate(list, conn) {
        const key = connectionKey(conn);
        return list.find(c => connectionKey(c) === key) || null;
    }

    window.OzelBaglantilar = { STORAGE_KEY, load, save, findDuplicate };
})();
