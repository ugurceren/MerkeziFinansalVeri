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

    let ayarlar = null;
    let selectedKatman = 'TDSTG';
    let customConnections = [];

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

    function saveCustomConnections() {
        localStorage.setItem(CUSTOM_CONN_KEY, JSON.stringify(customConnections));
    }

    function isCustomKatman(value) {
        return String(value || '').startsWith(CUSTOM_PREFIX);
    }

    function getCustomId(katmanValue) {
        return String(katmanValue || '').slice(CUSTOM_PREFIX.length);
    }

    function getCustomConnection(katmanValue) {
        const id = getCustomId(katmanValue);
        return customConnections.find(c => c.id === id) || null;
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

    function getSelectedConnection() {
        const katman = document.getElementById('vsKatmanSelect')?.value || selectedKatman;
        if (isCustomKatman(katman)) {
            const conn = getCustomConnection(katman);
            return {
                katmanKodu: conn?.etiket || conn?.veritabani || 'OZEL',
                baglanti: toBaglantiDto(conn),
                displayName: conn ? `${conn.etiket} — ${conn.veritabani}` : katman
            };
        }
        return { katmanKodu: katman, baglanti: null, displayName: katman };
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

    function setMeta(textOrPayload) {
        const meta = document.getElementById('vsQueryMeta');
        if (!meta) return;

        if (typeof textOrPayload === 'string') {
            meta.textContent = textOrPayload || '';
            return;
        }

        if (!textOrPayload) {
            meta.innerHTML = '';
            return;
        }

        const rows = textOrPayload.satirlar || [];
        const total = textOrPayload.satirSayisi ?? rows.length;
        const notes = [];
        if (textOrPayload.sureMs != null) notes.push(`${textOrPayload.sureMs} ms`);
        if (textOrPayload.kisitlandi) notes.push(`ilk ${textOrPayload.maxSatir} satır gösterildi`);

        if (window.TableCount?.set) {
            window.TableCount.set(meta, rows.length, total, {
                wrapId: 'vsQueryMeta',
                footnote: notes.join(' · ') || undefined
            });
            return;
        }

        let metaText = `${total} satır`;
        if (textOrPayload.sureMs != null) metaText += ` · ${textOrPayload.sureMs} ms`;
        if (textOrPayload.kisitlandi) metaText += ` · ilk ${textOrPayload.maxSatir} satır gösterildi`;
        meta.textContent = metaText;
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

    function renderKatmanSelect() {
        const sel = document.getElementById('vsKatmanSelect');
        if (!sel) return;

        const katmanlar = ayarlar?.katmanlar?.length
            ? ayarlar.katmanlar
            : [
                { katmanKodu: 'TDSTG', veritabani: 'TDSTG' },
                { katmanKodu: 'TDMAIN', veritabani: 'TDMAIN' },
                { katmanKodu: 'TDREPORT', veritabani: 'TDREPORT' }
            ];

        const configOptions = katmanlar.map(k =>
            `<option value="${escapeHtml(k.katmanKodu)}" ${k.katmanKodu === selectedKatman ? 'selected' : ''}>${escapeHtml(k.katmanKodu)} — ${escapeHtml(k.veritabani)}</option>`
        );

        const customOptions = customConnections.map(c => {
            const value = `${CUSTOM_PREFIX}${c.id}`;
            const label = `${c.etiket} — ${c.veritabani}`;
            return `<option value="${escapeHtml(value)}" ${value === selectedKatman ? 'selected' : ''}>${escapeHtml(label)} (özel)</option>`;
        });

        const divider = customConnections.length
            ? '<option disabled>──────────</option>'
            : '';

        sel.innerHTML = configOptions.join('') + divider + customOptions.join('');
    }

    function renderResults(payload) {
        const head = document.getElementById('vsResultsHead');
        const body = document.getElementById('vsResultsBody');
        const wrap = document.getElementById('vsResultsWrap');
        const empty = document.getElementById('vsResultsEmpty');
        if (!head || !body || !wrap) return;

        const cols = payload.kolonlar || [];
        const rows = payload.satirlar || [];

        head.innerHTML = `<tr>${cols.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr>`;
        body.innerHTML = rows.map(row => {
            const cells = cols.map(col => {
                const val = getQueryRowValue(row, col);
                const display = val === null || val === undefined ? '' : String(val);
                return `<td class="vs-cell-wrap" title="${escapeHtml(display)}">${escapeHtml(display)}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        const table = wrap.querySelector('.vs-results-table');
        table?.classList.add('vs-results-table--wrap');

        if (empty) empty.hidden = rows.length > 0;
        wrap.classList.toggle('has-data', rows.length > 0);

        setMeta(payload);
    }

    function apiErrorMessage(err) {
        const msg = err?.message || String(err);
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
            return `API'ye ulaşılamıyor. Proje kökünde start-api.bat çalıştırın, sayfayı HTTP sunucusundan açın (file:// değil). Varsayılan API: ${ApiClient.baseUrl}`;
        }
        return msg;
    }

    async function loadAyarlar() {
        customConnections = loadCustomConnections();
        try {
            ayarlar = await ApiClient.getVeritabaniSorguAyarlar();
            if (!isCustomKatman(selectedKatman)) {
                selectedKatman = ayarlar.varsayilanKatman || 'TDSTG';
            }
            renderKatmanSelect();
        } catch (err) {
            console.warn('Sorgu ayarları yüklenemedi:', err);
            ayarlar = null;
            renderKatmanSelect();
            setStatus('err', apiErrorMessage(err));
        }
    }

    async function testConnection() {
        setStatus('pending', 'Bağlantı test ediliyor…');
        setError('');
        try {
            const selected = getSelectedConnection();
            let res;
            if (selected.baglanti) {
                res = await ApiClient.testVeritabaniSorguBaglanti(selected.baglanti);
            } else {
                res = await ApiClient.testVeritabaniSorguKatman(selected.katmanKodu);
            }
            if (res.basarili) {
                setStatus('ok', res.mesaj || 'Bağlantı başarılı.');
            } else {
                setStatus('err', res.mesaj || 'Bağlantı başarısız.');
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

        if (isCustomKatman(document.getElementById('vsKatmanSelect')?.value) && !selected.baglanti) {
            setError('Seçili özel bağlantı bulunamadı.');
            return;
        }

        setError('');
        setMeta('Sorgu çalıştırılıyor…');
        if (runBtn) runBtn.disabled = true;

        const payload = { katmanKodu: selected.katmanKodu, sql };
        if (selected.baglanti) payload.baglanti = selected.baglanti;

        try {
            const res = await ApiClient.calistirVeritabaniSorgu(payload);

            if (!res.basarili) {
                setMeta('');
                setError(res.hata || 'Sorgu başarısız.');
                const wrap = document.getElementById('vsResultsWrap');
                if (wrap) wrap.classList.remove('has-data');
                setStatus('err', `${selected.displayName} — sorgu hatası`);
                return;
            }

            renderResults(res);
            setStatus('ok', `${selected.displayName} — sorgu tamamlandı`);
        } catch (err) {
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

        document.getElementById('vsKatmanSelect')?.addEventListener('change', e => {
            selectedKatman = e.target.value;
            testConnection();
        });
        document.getElementById('vsQueryInput')?.addEventListener('keydown', e => {
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
        if (document.getElementById('vsStatusDot')?.classList.contains('err')) return;
        testConnection();
    });
})();
