(function () {
    function loadStylesheet() {
        if (document.querySelector('link[href="table-count.css"]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'table-count.css';
        document.head.appendChild(link);
    }

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString('tr-TR');
    }

    function formatInner(filtered, total, options = {}) {
        const shown = Number(filtered) || 0;
        const all = Number(total ?? filtered) || 0;
        const isFiltered = shown !== all;
        const shownLabel = options.shownLabel || 'Gösterilen';
        const totalLabel = options.totalLabel || 'Toplam';

        return `
            <span class="table-count${isFiltered ? ' is-filtered' : ''}" role="status" aria-live="polite">
                <span class="table-count-block">
                    <span class="table-count-label">${escapeHtml(shownLabel)}</span>
                    <strong class="table-count-value">${formatNumber(shown)}</strong>
                </span>
                <span class="table-count-divider" aria-hidden="true">/</span>
                <span class="table-count-block">
                    <span class="table-count-label">${escapeHtml(totalLabel)}</span>
                    <strong class="table-count-value">${formatNumber(all)}</strong>
                </span>
            </span>`;
    }

    function formatHtml(filtered, total, options = {}) {
        loadStylesheet();
        const wrapId = options.wrapId ? ` id="${escapeHtml(options.wrapId)}"` : '';
        const footnote = options.footnote
            ? `<span class="table-count-note">${escapeHtml(options.footnote)}</span>`
            : '';
        return `<div class="table-count-wrap"${wrapId}>${formatInner(filtered, total, options)}${footnote}</div>`;
    }

    function resolveHost(root, options = {}) {
        if (!root) return null;
        if (typeof root === 'string') {
            return document.querySelector(root);
        }
        if (options.wrapId) {
            return root.querySelector(`#${options.wrapId}`) || document.getElementById(options.wrapId);
        }
        if (options.selector) {
            return root.querySelector(options.selector);
        }
        if (root.classList?.contains('table-count-wrap')) {
            return root;
        }
        return root.querySelector('.table-count-wrap') || root;
    }

    function set(root, filtered, total, options = {}) {
        loadStylesheet();
        const host = resolveHost(root, options);
        if (!host) return;

        const footnote = options.footnote
            ? `<span class="table-count-note">${escapeHtml(options.footnote)}</span>`
            : '';
        const inner = formatInner(filtered, total, options) + footnote;
        const hostIsWrap = host.classList.contains('table-count-wrap')
            || host.classList.contains('tl-count-wrap')
            || (host.id && options.wrapId && host.id === options.wrapId);

        if (hostIsWrap) {
            host.classList.add('table-count-wrap');
            host.innerHTML = inner;
            return;
        }

        host.innerHTML = formatHtml(filtered, total, options);
    }

    window.TableCount = {
        formatNumber,
        formatInner,
        formatHtml,
        set
    };
})();
