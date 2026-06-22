(function () {
    const LAYER_ORDER = ['STG', 'LND', 'TDMAIN'];
    const LAYER_ICONS = { STG: 'ti-database-import', LND: 'ti-transform', TDMAIN: 'ti-database-export' };
    const TARGET_TABLES = {
        STG: 'TDSTG.STG.LedgerBalance',
        LND: 'TDSTG.LND.LedgerBalance',
        TDMAIN: 'TDMAIN.COR.LedgerBalance'
    };

    let mizanLayers = [];
    let mizanDataDate = null;
    let mizanRoot = null;

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

    function canStartLayer(layer, prevLayer) {
        const pkg = layer.package;
        if (!pkg) return false;
        if (pkg.status === 'running') return false;
        if (prevLayer && resolveLayerStatus(prevLayer) !== 'done') return false;
        return layer.tamamlanmaYuzdesi < 100
            || pkg.status === 'failed'
            || pkg.status === 'not-started';
    }

    function buildPackageNode(pkg) {
        const count = formatRecordCount(pkg.recordCount);
        const countHtml = count !== null
            ? `<span class="mizan-pkg-count">${count}</span><span class="mizan-pkg-count-label">kayıt</span>`
            : `<span class="mizan-pkg-count mizan-pkg-count-empty">—</span>`;

        const errorHtml = pkg.errorMessage
            ? `<p class="mizan-pkg-error" title="${escapeHtml(pkg.errorMessage)}">${escapeHtml(pkg.errorMessage)}</p>`
            : '';

        return `
            <div class="mizan-pkg-node status-${escapeHtml(pkg.status)}">
                ${countHtml}
                <span class="mizan-pkg-name" title="${escapeHtml(pkg.name)}">${escapeHtml(pkg.name)}</span>
                <span class="mizan-pkg-status">${escapeHtml(pkg.statusText)}</span>
                ${errorHtml}
            </div>`;
    }

    function buildStageConnector() {
        return `
            <div class="mizan-stage-connector" aria-hidden="true">
                <span class="mizan-stage-connector-line"></span>
                <i class="ti ti-chevron-right"></i>
            </div>`;
    }

    function buildStageHtml(layer, prevLayer) {
        const status = resolveLayerStatus(layer);
        const icon = LAYER_ICONS[layer.code] || 'ti-layers-intersect';
        const pkg = layer.package;
        const pct = layer.tamamlanmaYuzdesi ?? 0;
        const showStart = canStartLayer(layer, prevLayer);
        const startDisabled = pkg?.status === 'running'
            || (prevLayer && resolveLayerStatus(prevLayer) !== 'done');

        const packageHtml = pkg
            ? buildPackageNode(pkg)
            : '<div class="mizan-stage-empty">Paket bilgisi bulunamadı.</div>';

        const startHtml = showStart
            ? `<div class="mizan-stage-actions">
                <button type="button"
                    class="mizan-start-btn"
                    data-layer="${escapeHtml(layer.code)}"
                    ${startDisabled ? 'disabled' : ''}
                    title="${startDisabled ? 'Önceki katman tamamlanmalı' : `${layer.targetTable} paketini başlat`}">
                    <i class="ti ti-player-play" aria-hidden="true"></i>
                    Paket Başlat
                </button>
            </div>`
            : '';

        return `
            <article class="mizan-stage theme-${escapeHtml(layer.theme)} status-${status}" data-layer="${escapeHtml(layer.code)}">
                <header class="mizan-stage-head">
                    <div class="mizan-stage-icon" aria-hidden="true"><i class="ti ${icon}"></i></div>
                    <div class="mizan-stage-titles">
                        <h4>${escapeHtml(layer.code)}</h4>
                        <p>${escapeHtml(layer.role)}</p>
                    </div>
                    <div class="mizan-stage-meta">
                        <span class="mizan-stage-pct">${pct}%</span>
                        <span class="mizan-stage-pct-label">tamamlandı</span>
                        <span class="mizan-stage-badge">${status === 'done' ? 'Tamam' : status === 'failed' ? 'Hata' : status === 'running' ? 'Aktif' : 'Bekliyor'}</span>
                    </div>
                </header>
                <div class="mizan-stage-body">
                    ${packageHtml}
                </div>
                ${startHtml}
            </article>`;
    }

    function buildPipelineHtml(layers) {
        return layers.map((layer, index) => {
            const prev = index > 0 ? layers[index - 1] : null;
            const connector = index > 0 ? buildStageConnector() : '';
            return `${connector}${buildStageHtml(layer, prev)}`;
        }).join('');
    }

    function buildMizanHTML(layers) {
        const dataDate = getMizanDataDate();
        return `
            <section class="mizan-page">
                <header class="mizan-header">
                    <div class="mizan-header-main">
                        <h2>Mizan Akışı</h2>
                        <p>TDSTG.STG → TDSTG.LND → TDMAIN.COR · LedgerBalance</p>
                    </div>
                    <label class="mizan-date-filter">
                        <span>Veri Tarihi</span>
                        <input type="date" id="mizanDataDate" value="${dataDate}" aria-label="Veri tarihi">
                    </label>
                </header>
                <div class="mizan-pipeline" role="list" aria-label="Mizan katman akışı">
                    ${buildPipelineHtml(layers)}
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
        const btn = root.querySelector(`.mizan-start-btn[data-layer="${layerCode}"]`);
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
        mizanRoot = root;

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

        root.querySelectorAll('.mizan-start-btn').forEach(btn => {
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
