(function () {
    const CUSTOM_CONN_KEY = 'vs_custom_connections';
    const CUSTOM_PREFIX = '__custom__:';

    const RUN_QUERY_SHORTCUT = {
        matches(e) {
            return (e.ctrlKey || e.metaKey) && e.key === 'Enter';
        },
        label() {
            return /Mac|iPhone|iPad/i.test(navigator.userAgent) ? '⌘Enter' : 'Ctrl+Enter';
        }
    };

    const LAST_TARGET_KEY = 'vs_last_target';

    let ayarlar = null;
    let selectedKatman = 'TDSTG';
    let customConnections = [];
    /* Seçilebilir sorgu hedefleri: config katmanları + Veritabanı Bağlantısı sayfasında eklenen özel bağlantılar */
    let targets = [];
    let intellisense = null;
    const schemaCache = new Map();
    let schemaRequestId = 0;

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function loadCustomConnections() {
        try {
            const raw = localStorage.getItem(CUSTOM_CONN_KEY);
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch {
            return [];
        }
    }

    function readLastTarget() {
        try {
            return localStorage.getItem(LAST_TARGET_KEY);
        } catch {
            return null;
        }
    }

    function saveLastTarget() {
        try {
            localStorage.setItem(LAST_TARGET_KEY, selectedKatman);
        } catch {
            /* tercih kaydedilemezse varsayılan katmanla devam edilir */
        }
    }

    function serverKeyOf(sunucu, port) {
        return `${String(sunucu || '').trim().toLowerCase()},${port || 1433}`;
    }

    function serverLabel(sunucu, port) {
        if (!sunucu) return 'Yapılandırılmış sunucu';
        return port && port !== 1433 ? `${sunucu}:${port}` : sunucu;
    }

    function toBaglantiDto(conn) {
        if (!conn) return null;
        return {
            etiket: conn.etiket,
            sunucu: conn.sunucu,
            veritabani: conn.veritabani,
            port: conn.port || 1433,
            kimlikDogrulama: conn.kimlikDogrulama || 'windows',
            kullaniciAdi: conn.kullaniciAdi || null
        };
    }

    function buildTargets() {
        const katmanlar = ayarlar?.katmanlar?.length
            ? ayarlar.katmanlar
            : [
                { katmanKodu: 'TDSTG', veritabani: 'TDSTG' },
                { katmanKodu: 'TDMAIN', veritabani: 'TDMAIN' },
                { katmanKodu: 'TDREPORT', veritabani: 'TDREPORT' }
            ];

        const configTargets = katmanlar.map(k => {
            const veritabani = k.veritabani || k.katmanKodu;
            return {
                key: k.katmanKodu,
                katmanKodu: k.katmanKodu,
                sunucu: k.sunucu || '',
                port: k.port || 1433,
                veritabani,
                baglanti: null,
                dbLabel: veritabani === k.katmanKodu ? k.katmanKodu : `${k.katmanKodu} — ${veritabani}`
            };
        });

        const customTargets = customConnections.map(c => {
            const varsayilanEtiket = `${c.sunucu} — ${c.veritabani}`;
            const etiket = c.etiket && c.etiket !== varsayilanEtiket && c.etiket !== c.veritabani
                ? ` · ${c.etiket}`
                : '';
            return {
                key: `${CUSTOM_PREFIX}${c.id}`,
                katmanKodu: c.etiket || c.veritabani || 'OZEL',
                sunucu: c.sunucu,
                port: c.port || 1433,
                veritabani: c.veritabani,
                baglanti: toBaglantiDto(c),
                dbLabel: `${c.veritabani}${etiket} (özel)`
            };
        });

        return [...configTargets, ...customTargets].map(t => ({
            ...t,
            serverKey: serverKeyOf(t.sunucu, t.port),
            displayName: `${serverLabel(t.sunucu, t.port)} / ${t.veritabani}`
        }));
    }

    function getSelectedConnection() {
        return targets.find(t => t.key === selectedKatman) || null;
    }

    function setStatus(state, text) {
        const dot = document.getElementById('vsStatusDot');
        const label = document.getElementById('vsStatusText');
        if (!dot || !label) return;
        dot.className = 'vs-status-dot';
        if (state) dot.classList.add(state);
        label.textContent = text;
    }

    function setError(message) {
        const box = document.getElementById('vsQueryError');
        if (!box) return;
        if (!message) {
            box.hidden = true;
            box.textContent = '';
            return;
        }
        box.hidden = false;
        box.textContent = message;
    }

    function setMeta(textOrPayload, kaynak) {
        const meta = document.getElementById('vsQueryMeta');
        if (!meta) return;

        if (typeof textOrPayload === 'string') {
            meta.textContent = textOrPayload || '';
            return;
        }

        if (!textOrPayload) {
            meta.textContent = '';
            return;
        }

        const rows = textOrPayload.satirlar || [];
        const total = textOrPayload.satirSayisi ?? rows.length;
        const count = Number(total || 0).toLocaleString('tr-TR');
        const parts = [`${count} kayıt`];
        if (kaynak) parts.unshift(`Kaynak: ${kaynak}`);
        if (textOrPayload.sureMs != null) parts.push(`${textOrPayload.sureMs} ms`);
        meta.textContent = parts.join(' · ');
    }

    function getQueryRowValue(row, column) {
        if (window.FilterBar?.getQueryRowValue) {
            return window.FilterBar.getQueryRowValue(row, column);
        }
        if (!row || column == null || column === '') return undefined;
        if (Object.prototype.hasOwnProperty.call(row, column) && row[column] !== undefined && row[column] !== null) {
            return row[column];
        }
        const matchedKey = Object.keys(row).find(key => key.toLowerCase() === String(column).toLowerCase());
        return matchedKey ? row[matchedKey] : undefined;
    }

    function renderDbSelect(serverKey) {
        const sel = document.getElementById('vsKatmanSelect');
        if (!sel) return;
        sel.innerHTML = targets
            .filter(t => t.serverKey === serverKey)
            .map(t => `<option value="${escapeHtml(t.key)}" ${t.key === selectedKatman ? 'selected' : ''}>${escapeHtml(t.dbLabel)}</option>`)
            .join('');
    }

    /* Sunucu listesi hedeflerden türetilir; aynı sunucudaki config katmanı ve özel bağlantılar tek sunucu altında toplanır. */
    function renderTargetSelects() {
        targets = buildTargets();
        if (!targets.some(t => t.key === selectedKatman)) {
            const varsayilan = ayarlar?.varsayilanKatman;
            selectedKatman = targets.some(t => t.key === varsayilan) ? varsayilan : targets[0]?.key || 'TDSTG';
        }

        const current = getSelectedConnection();
        const servers = [];
        targets.forEach(t => {
            const server = servers.find(s => s.key === t.serverKey);
            if (server) server.count += 1;
            else servers.push({ key: t.serverKey, label: serverLabel(t.sunucu, t.port), count: 1 });
        });

        const serverSel = document.getElementById('vsServerSelect');
        if (serverSel) {
            serverSel.innerHTML = servers.map(s =>
                `<option value="${escapeHtml(s.key)}" ${s.key === current?.serverKey ? 'selected' : ''}>${escapeHtml(s.label)} (${s.count} veritabanı)</option>`
            ).join('');
        }
        renderDbSelect(current?.serverKey);
    }

    function onTargetChanged() {
        saveLastTarget();
        testConnection();
        loadSchema();
    }

    function showResultsSkeleton() {
        const head = document.getElementById('vsResultsHead');
        const body = document.getElementById('vsResultsBody');
        const wrap = document.getElementById('vsResultsWrap');
        const empty = document.getElementById('vsResultsEmpty');
        if (!head || !body) return;

        if (empty) empty.hidden = true;
        wrap?.classList.add('has-data');
        window.ReportResults.renderSkeleton({ scrollEl: wrap, headEl: head, bodyEl: body, rowCount: 10 });
    }

    function clearResultsSkeleton() {
        const head = document.getElementById('vsResultsHead');
        const body = document.getElementById('vsResultsBody');
        if (!body?.querySelector('.tbl-skeleton-row')) return;
        if (head) head.innerHTML = '';
        window.ReportResults.clearSkeleton(body);
        document.getElementById('vsResultsEmpty')?.removeAttribute('hidden');
    }

    function renderResults(payload, kaynak) {
        const head = document.getElementById('vsResultsHead');
        const body = document.getElementById('vsResultsBody');
        const wrap = document.getElementById('vsResultsWrap');
        const empty = document.getElementById('vsResultsEmpty');
        if (!head || !body || !wrap) return;

        const cols = payload.kolonlar || [];
        const rows = payload.satirlar || [];

        window.ReportResults.destroyActiveTable();

        if (!cols.length || !rows.length) {
            head.innerHTML = '';
            body.innerHTML = '';
            if (empty) empty.hidden = rows.length > 0;
            wrap.classList.toggle('has-data', rows.length > 0);
            setMeta(payload, kaynak);
            return;
        }

        const displayRows = window.ReportResults.sliceForDisplay(rows);

        window.ReportResults.renderTable({
            scrollEl: wrap,
            headEl: head,
            bodyEl: body,
            cols,
            rows: displayRows,
            getValue: getQueryRowValue,
            wrapCells: true
        });

        if (empty) empty.hidden = true;
        wrap.classList.add('has-data');
        setMeta(payload, kaynak);
    }

    function apiErrorMessage(err) {
        const msg = err?.message || String(err);
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
            return `API'ye ulaşılamıyor. Proje kökünde start-api.bat çalıştırın, sayfayı HTTP sunucusundan açın (file:// değil). Varsayılan API: ${ApiClient.baseUrl}`;
        }
        return msg;
    }

    function setIntellisenseHint(state, text) {
        const hint = document.getElementById('vsIntellisenseHint');
        const label = document.getElementById('vsIntellisenseText');
        if (!hint || !label) return;
        hint.classList.toggle('is-loading', state === 'loading');
        hint.classList.toggle('is-error', state === 'error');
        hint.querySelector('i')?.setAttribute(
            'class',
            state === 'loading' ? 'ti ti-loader-2' : 'ti ti-sparkles'
        );
        label.textContent = text;
    }

    /* Katmanın tablo/kolon şemasını çekip IntelliSense'e verir.
       Şema yoksa motor anahtar kelime ve fonksiyonlarla çalışmaya devam eder. */
    async function loadSchema() {
        const selected = getSelectedConnection();
        if (!intellisense || !selected) return;

        const cacheKey = selected.baglanti
            ? `${selected.baglanti.sunucu}/${selected.baglanti.veritabani}`
            : selected.katmanKodu;

        const cached = schemaCache.get(cacheKey);
        if (cached) {
            intellisense.setSchema(cached);
            setIntellisenseHint('ok', `IntelliSense · ${cached.length} nesne`);
            return;
        }

        const requestId = ++schemaRequestId;
        setIntellisenseHint('loading', 'Şema yükleniyor…');

        const payload = { katmanKodu: selected.katmanKodu };
        if (selected.baglanti) payload.baglanti = selected.baglanti;

        try {
            const res = await ApiClient.getVeritabaniSorguSema(payload);
            if (requestId !== schemaRequestId) return;

            if (!res?.basarili) {
                intellisense.setSchema([]);
                setIntellisenseHint('error', 'IntelliSense · yalnızca anahtar kelimeler');
                return;
            }

            const tablolar = res.tablolar || [];
            schemaCache.set(cacheKey, tablolar);
            intellisense.setSchema(tablolar);
            setIntellisenseHint('ok', `IntelliSense · ${tablolar.length} nesne`);
        } catch (err) {
            if (requestId !== schemaRequestId) return;
            console.warn('Şema yüklenemedi:', err);
            intellisense.setSchema([]);
            setIntellisenseHint('error', 'IntelliSense · yalnızca anahtar kelimeler');
        }
    }

    async function loadAyarlar() {
        customConnections = loadCustomConnections();
        const lastTarget = readLastTarget();
        try {
            ayarlar = await ApiClient.getVeritabaniSorguAyarlar();
            selectedKatman = lastTarget || ayarlar.varsayilanKatman || 'TDSTG';
            renderTargetSelects();
        } catch (err) {
            console.warn('Sorgu ayarları yüklenemedi:', err);
            ayarlar = null;
            if (lastTarget) selectedKatman = lastTarget;
            renderTargetSelects();
            setStatus('err', apiErrorMessage(err));
        }
    }

    async function testConnection() {
        const selected = getSelectedConnection();
        if (!selected) return;

        setStatus('pending', `${selected.displayName} — bağlantı test ediliyor…`);
        setError('');
        try {
            const res = selected.baglanti
                ? await ApiClient.testVeritabaniSorguBaglanti(selected.baglanti)
                : await ApiClient.testVeritabaniSorguKatman(selected.katmanKodu);
            // Yanıt gelene kadar seçim değiştiyse eski hedefin sonucu gösterilmez
            if (getSelectedConnection()?.key !== selected.key) return;
            if (res.basarili) {
                setStatus('ok', `${selected.displayName} — ${res.mesaj || 'Bağlantı başarılı.'}`);
            } else {
                setStatus('err', `${selected.displayName} — ${res.mesaj || 'Bağlantı başarısız.'}`);
            }
        } catch (err) {
            setStatus('err', apiErrorMessage(err));
        }
    }

    async function runQuery() {
        const sql = document.getElementById('vsQueryInput')?.value?.trim();
        const selected = getSelectedConnection();
        const runBtn = document.getElementById('vsRunBtn');

        if (!sql) {
            setError('Sorgu metni boş.');
            return;
        }

        if (!selected) {
            setError('Seçili bağlantı bulunamadı.');
            return;
        }

        setError('');
        setMeta(`${selected.displayName} — sorgu çalıştırılıyor…`);
        if (runBtn) runBtn.disabled = true;
        showResultsSkeleton();

        const payload = { katmanKodu: selected.katmanKodu, sql };
        if (selected.baglanti) payload.baglanti = selected.baglanti;

        try {
            const res = await ApiClient.calistirVeritabaniSorgu(payload);

            if (!res.basarili) {
                clearResultsSkeleton();
                setMeta('');
                setError(res.hata || 'Sorgu başarısız.');
                const wrap = document.getElementById('vsResultsWrap');
                if (wrap) wrap.classList.remove('has-data');
                setStatus('err', `${selected.displayName} — sorgu hatası`);
                return;
            }

            renderResults(res, selected.displayName);
            setStatus('ok', `${selected.displayName} — sorgu tamamlandı`);
        } catch (err) {
            clearResultsSkeleton();
            setMeta('');
            setError(apiErrorMessage(err));
            const wrap = document.getElementById('vsResultsWrap');
            if (wrap) wrap.classList.remove('has-data');
        } finally {
            if (runBtn) runBtn.disabled = false;
        }
    }

    function bindEvents() {
        const shortcutLabel = RUN_QUERY_SHORTCUT.label();
        const runBtn = document.getElementById('vsRunBtn');
        const shortcutEl = document.getElementById('vsRunShortcut');

        if (runBtn) {
            runBtn.title = `Sorguyu çalıştır (${shortcutLabel})`;
            runBtn.addEventListener('click', runQuery);
        }
        if (shortcutEl) shortcutEl.textContent = shortcutLabel;

        document.getElementById('vsServerSelect')?.addEventListener('change', e => {
            const first = targets.find(t => t.serverKey === e.target.value);
            if (!first) return;
            selectedKatman = first.key;
            renderDbSelect(first.serverKey);
            onTargetChanged();
        });

        document.getElementById('vsKatmanSelect')?.addEventListener('change', e => {
            selectedKatman = e.target.value;
            onTargetChanged();
        });

        // Veritabanı Bağlantısı sayfası başka sekmede açıkken eklenen/silinen bağlantılar listeye yansır
        window.addEventListener('storage', e => {
            if (e.key !== CUSTOM_CONN_KEY) return;
            const previous = selectedKatman;
            customConnections = loadCustomConnections();
            renderTargetSelects();
            if (selectedKatman !== previous) onTargetChanged();
        });

        const input = document.getElementById('vsQueryInput');
        // IntelliSense önce bağlanır ki popup açıkken Enter'ı o karşılasın;
        // Ctrl+Enter'ı hiç ele almadığı için çalıştırma kısayolu etkilenmez.
        intellisense = window.SqlIntellisense?.attach(input) || null;

        input?.addEventListener('keydown', e => {
            if (RUN_QUERY_SHORTCUT.matches(e)) {
                e.preventDefault();
                runQuery();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', async () => {
        await window.PagePermissions?.ready?.();
        bindEvents();
        await loadAyarlar();
        if (document.getElementById('vsStatusDot')?.classList.contains('err')) {
            setIntellisenseHint('error', 'IntelliSense · yalnızca anahtar kelimeler');
            return;
        }
        testConnection();
        loadSchema();
    });
})();
