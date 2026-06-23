(function () {
    const FP_VERSION = '4.6.13';
    const FP_BASE = `https://cdn.jsdelivr.net/npm/flatpickr@${FP_VERSION}/dist`;
    const SELECTOR = 'input[type="date"], input[type="month"], input[type="datetime-local"]';

    let fpReadyPromise = null;
    let observerStarted = false;

    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, { once: true });
        } else {
            fn();
        }
    }

    function loadStylesheet(href) {
        if (document.querySelector(`link[href="${href}"]`)) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Script yüklenemedi: ${src}`));
            document.head.appendChild(script);
        });
    }

    function ensureFlatpickr() {
        if (window.flatpickr) {
            return Promise.resolve();
        }
        if (!fpReadyPromise) {
            fpReadyPromise = (async () => {
                await loadScript(`${FP_BASE}/flatpickr.min.js`);
                await loadScript(`${FP_BASE}/l10n/tr.js`);
                await loadScript(`${FP_BASE}/plugins/monthSelect/index.js`);
            })().catch(err => {
                fpReadyPromise = null;
                console.warn('Türkçe takvim bileşeni yüklenemedi:', err);
                throw err;
            });
        }
        return fpReadyPromise;
    }

    function isDateInput(input) {
        if (!(input instanceof HTMLInputElement)) return false;
        const type = (input.getAttribute('type') || '').toLowerCase();
        return type === 'date' || type === 'month' || type === 'datetime-local';
    }

    function decorateDateInput(instance, sourceInput) {
        const altInput = instance?.altInput;
        if (!altInput || altInput.closest('.date-input-wrap')) return;

        const wrap = document.createElement('div');
        wrap.className = 'date-input-wrap';
        altInput.classList.add('date-input-field');

        const parent = altInput.parentNode;
        parent.insertBefore(wrap, altInput);
        wrap.appendChild(altInput);

        const label = sourceInput.labels?.[0]
            || (sourceInput.id ? document.querySelector(`label[for="${sourceInput.id}"]`) : null);
        const ariaLabel = sourceInput.getAttribute('aria-label')
            || label?.textContent?.trim()
            || '';
        if (ariaLabel && !altInput.getAttribute('aria-label')) {
            altInput.setAttribute('aria-label', ariaLabel);
        }

        wrap.addEventListener('mousedown', event => {
            if (event.target === altInput) return;
            event.preventDefault();
            instance.open();
            altInput.focus();
        });
    }

    function buildOptions(input) {
        const type = (input.getAttribute('type') || 'date').toLowerCase();
        const locale = window.flatpickr?.l10ns?.tr || 'tr';
        const common = {
            locale,
            allowInput: true,
            disableMobile: true,
            altInput: true,
            monthSelectorType: 'dropdown',
            onReady(_selectedDates, _dateStr, instance) {
                decorateDateInput(instance, input);
            }
        };

        if (type === 'month') {
            return {
                ...common,
                altFormat: 'F Y',
                dateFormat: 'Y-m',
                placeholder: 'Ay seçin',
                plugins: [
                    new window.monthSelectPlugin({
                        shorthand: false,
                        dateFormat: 'Y-m',
                        altFormat: 'F Y'
                    })
                ]
            };
        }

        if (type === 'datetime-local') {
            return {
                ...common,
                enableTime: true,
                time_24hr: true,
                altFormat: 'd.m.Y H:i',
                dateFormat: 'Y-m-d H:i',
                placeholder: 'GG.AA.YYYY SS:DD'
            };
        }

        return {
            ...common,
            altFormat: 'd.m.Y',
            dateFormat: 'Y-m-d',
            placeholder: 'GG.AA.YYYY'
        };
    }

    async function bindInput(input) {
        if (!isDateInput(input) || input.dataset.fpBound === '1' || input.disabled) {
            return;
        }

        try {
            await ensureFlatpickr();
        } catch {
            input.lang = 'tr';
            return;
        }

        if (input._flatpickr) {
            input.dataset.fpBound = '1';
            decorateDateInput(input._flatpickr, input);
            return;
        }

        input.lang = 'tr';
        input.dataset.fpBound = '1';
        window.flatpickr(input, buildOptions(input));
    }

    function scan(root) {
        const scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll(SELECTOR).forEach(input => {
            bindInput(input);
        });
    }

    function startObserver() {
        if (observerStarted || !document.body) return;
        observerStarted = true;

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    if (isDateInput(node)) {
                        bindInput(node);
                        return;
                    }
                    if (node.querySelectorAll) {
                        scan(node);
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function init() {
        document.documentElement.lang = 'tr';
        loadStylesheet('date-locale.css');
        scan(document);
        startObserver();
    }

    window.DateLocale = {
        init,
        rescan: scan,
        bind: bindInput
    };

    onReady(init);
})();
