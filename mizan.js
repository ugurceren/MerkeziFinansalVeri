(function () {
    const LAYER_ORDER = ['STG', 'LND', 'TDMAIN'];
    const TARGET_TABLES = {
        STG: 'TDSTG.STG.LedgerBalance',
        LND: 'TDSTG.LND.LedgerBalance',
        TDMAIN: 'TDMAIN.COR.LedgerBalance'
    };

    let mizanLayers = [];
    let mizanDataDate = null;

    function getMizanDataDate() {
        if (mizanDataDate) return mizanDataDate;
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return date.toISOString().slice(0, 10);
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatRecordCount(value) {
        if (value === null || value === undefined) return null;
        const num = Number(value);
        if (Number.isNaN(num)) return null;
        return num.toLocaleString('tr-TR');
    }

    function mapMizanLayers(kokpit) {
        const byCode = Object.fromEntries(
            (kokpit || []).map(k => [String(k.katmanKodu || '').toUpperCase(), k])
        );

        return LAYER_ORDER.map(code => {
            const k = byCode[code] || {};
            const dataset = (k.datasets || [])[0] || {};
            const targetTable = dataset.etiket || TARGET_TABLES[code];
            const g = (dataset.gorevler || [])[0];
            const pkg = {
                name: g?.etiket || targetTable,
                status: g?.durum || 'not-started',
                statusText: g?.durumMetni || 'Not Started',
                recordCount: g?.kayitSayisi ?? null,
                errorMessage: g?.hataMesaji || null
            };

            return {
                code,
                role: k.rol || code,
                theme: k.tema || 'blue',
                targetTable,
                tamamlanmaYuzdesi: k.tamamlanmaYuzdesi ?? 0,
                package: pkg
            };
        });
    }

    function resolveLayerStatus(layer) {
        const pkg = layer.package;
        if (!pkg) return 'waiting';
        if (pkg.status === 'failed') return 'failed';
        if (pkg.status === 'done') return 'done';
        if (pkg.status === 'running') return 'running';
        return 'waiting';
    }

    function statusBadgeText(status) {
        if (status === 'done') return 'Tamam';
        if (status === 'failed') return 'Hata';
        if (status === 'running') return 'Aktif';
        return 'Bekliyor';
    }

    function canStartLayer(layer, prevLayer) {
        const pkg = layer.package;
        if (!pkg) return false;
        if (pkg.status === 'running') return false;
        if (prevLayer && resolveLayerStatus(prevLayer) !== 'done') return false;
        return layer.tamamlanmaYuzdesi < 100
            || pkg.status === 'failed'
            || pkg.status === 'not-started';
    }

    function buildSeqArrow() {
        return `
            <div class="mizan-seq-arrow" aria-hidden="true">
                <span class="mizan-seq-arrow-line"></span>
                <i class="ti ti-chevron-right"></i>
            </div>`;
    }

    function buildSeqStepHtml(layer, prevLayer) {
        const status = resolveLayerStatus(layer);
        const pkg = layer.package;
        const showStart = canStartLayer(layer, prevLayer);
        const startDisabled = pkg?.status === 'running'
            || (prevLayer && resolveLayerStatus(prevLayer) !== 'done');

        const count = formatRecordCount(pkg?.recordCount);
        const countHtml = count !== null
            ? `<span class="mizan-seq-count">${count} <em>kayıt</em></span>`
            : '<span class="mizan-seq-count is-empty">—</span>';

        const errorHtml = pkg?.errorMessage
            ? `<p class="mizan-seq-error" title="${escapeHtml(pkg.errorMessage)}">${escapeHtml(pkg.errorMessage)}</p>`
            : '';

        const messageHtml = pkg
            ? `<div class="mizan-seq-message status-${escapeHtml(pkg.status)}">
                <span class="mizan-seq-status">${escapeHtml(pkg.statusText)}</span>
                <span class="mizan-seq-target" title="${escapeHtml(pkg.name)}">${escapeHtml(layer.targetTable)}</span>
                ${countHtml}
                ${errorHtml}
            </div>`
            : '<div class="mizan-seq-message is-empty">Paket bilgisi yok</div>';

        const startHtml = showStart
            ? `<button type="button"
                class="mizan-seq-start"
                data-layer="${escapeHtml(layer.code)}"
                ${startDisabled ? 'disabled' : ''}
                title="${startDisabled ? 'Önceki adım tamamlanmalı' : `${layer.targetTable} paketini başlat`}">
                <i class="ti ti-player-play" aria-hidden="true"></i>
                Başlat
            </button>`
            : '';

        return `
            <div class="mizan-seq-step theme-${escapeHtml(layer.theme)} status-${status}" data-layer="${escapeHtml(layer.code)}">
                <div class="mizan-seq-participant">
                    <span class="mizan-seq-code">${escapeHtml(layer.code)}</span>
                    <span class="mizan-seq-badge">${statusBadgeText(status)}</span>
                </div>
                <div class="mizan-seq-lifeline" aria-hidden="true"></div>
                ${messageHtml}
                ${startHtml}
            </div>`;
    }

    function buildSequenceHtml(layers) {
        return layers.map((layer, index) => {
            const prev = index > 0 ? layers[index - 1] : null;
            const arrow = index > 0 ? buildSeqArrow() : '';
            return `${arrow}${buildSeqStepHtml(layer, prev)}`;
        }).join('');
    }

    function buildMizanHTML(layers) {
        const dataDate = getMizanDataDate();
        return `
            <section class="mizan-page">
                <header class="mizan-header">
                    <div class="mizan-header-main">
                        <h2>Mizan Akışı</h2>
                        <p>LedgerBalance · STG → LND → TDMAIN</p>
                    </div>
                    <label class="mizan-date-filter">
                        <span>Veri Tarihi</span>
                        <input type="date" id="mizanDataDate" value="${dataDate}" aria-label="Veri tarihi">
                    </label>
                </header>
                <div class="mizan-seq" role="list" aria-label="Mizan katman akışı">
                    <div class="mizan-seq-track">
                        ${buildSequenceHtml(layers)}
                    </div>
                </div>
                <p class="mizan-footnote" id="mizanFootnote" hidden></p>
            </section>`;
    }

    async function reloadMizan(root) {
        root.innerHTML = '<div class="mizan-loading">Yükleniyor…</div>';
        mizanLayers = mapMizanLayers(await ApiClient.getMizanAkis({ dataDate: getMizanDataDate() }));
        root.innerHTML = buildMizanHTML(mizanLayers);
        bindMizanEvents(root);
    }

    function showFootnote(root, message, type = 'info') {
        const el = root.querySelector('#mizanFootnote');
        if (!el) return;
        el.hidden = false;
        el.className = `mizan-footnote is-${type}`;
        el.textContent = message;
    }

    async function handlePaketBaslat(root, layerCode) {
        const btn = root.querySelector(`.mizan-seq-start[data-layer="${layerCode}"]`);
        if (btn) {
            btn.disabled = true;
            btn.classList.add('is-loading');
        }

        try {
            const result = await ApiClient.postMizanKatmanPaketBaslat(layerCode, {
                dataDate: getMizanDataDate()
            });
            showFootnote(root, result?.mesaj || `${layerCode} paket başlatma isteği gönderildi.`, 'success');
        } catch (err) {
            showFootnote(root, err.message || 'Paket başlatılamadı.', 'error');
        } finally {
            if (btn) {
                btn.classList.remove('is-loading');
                btn.disabled = false;
            }
        }
    }

    function bindMizanEvents(root) {
        const dateInput = root.querySelector('#mizanDataDate');
        if (dateInput && dateInput.dataset.bound !== '1') {
            dateInput.dataset.bound = '1';
            dateInput.addEventListener('change', async () => {
                if (!dateInput.value) return;
                mizanDataDate = dateInput.value;
                try {
                    await reloadMizan(root);
                } catch (err) {
                    root.innerHTML = `<div class="mz-error-box">
                        <i class="ti ti-alert-circle" aria-hidden="true"></i>
                        <strong>Mizan akışı yüklenemedi</strong>
                        <p>${escapeHtml(err.message || 'Bilinmeyen hata')}</p>
                    </div>`;
                }
            });
        }

        root.querySelectorAll('.mizan-seq-start').forEach(btn => {
            if (btn.dataset.bound === '1') return;
            btn.dataset.bound = '1';
            btn.addEventListener('click', () => {
                const layerCode = btn.dataset.layer;
                if (layerCode) handlePaketBaslat(root, layerCode);
            });
        });
    }

    async function initMizanPage(container) {
        const el = container || document.querySelector('[data-mizan-page]') || document.getElementById('pageBody');
        if (!el) return;

        el.innerHTML = '<div class="mizan-loading">Yükleniyor…</div>';

        try {
            await reloadMizan(el);
        } catch (err) {
            console.error('Mizan akışı yüklenemedi:', err);
            el.innerHTML = `<div class="mz-error-box">
                <i class="ti ti-alert-circle" aria-hidden="true"></i>
                <strong>Mizan akışı yüklenemedi</strong>
                <p>${escapeHtml(err.message || 'API bağlantısı kurulamadı.')}</p>
                <p class="mz-error-hint">Kaynak: <code>TDUTIL.OPR.ETLLoad</code> · <code>/api/mizan/akis</code></p>
            </div>`;
        }
    }

    window.initMizanPage = initMizanPage;

    document.addEventListener('DOMContentLoaded', async () => {
        await window.PagePermissions?.ready?.();
        const host = document.querySelector('[data-mizan-page]');
        if (host) initMizanPage(host);
    });
})();
