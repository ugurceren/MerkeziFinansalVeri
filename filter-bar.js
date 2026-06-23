(function () {
    function debounce(fn, ms) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    }

    function syncFieldClearBtn(field, btn) {
        if (!field || !btn) return;
        const hasVal = field.tagName === 'SELECT'
            ? field.value !== ''
            : String(field.value || '').trim() !== '';
        btn.hidden = !hasVal;
        field.classList.toggle('has-filter-value', hasVal);
    }

    function wrapFilterField(field) {
        if (!field || field.closest('.filter-input-wrap')) {
            return field?.closest('.filter-input-wrap')?.querySelector('.filter-field-clear') || null;
        }

        const wrap = document.createElement('div');
        wrap.className = 'filter-input-wrap';
        field.classList.add('filter-input-with-clear');
        field.parentNode.insertBefore(wrap, field);
        wrap.appendChild(field);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter-field-clear';
        btn.setAttribute('aria-label', 'Alanı temizle');
        btn.innerHTML = '<i class="ti ti-x" aria-hidden="true"></i>';
        wrap.appendChild(btn);
        syncFieldClearBtn(field, btn);
        return btn;
    }

    function clearAllButtonHtml(id) {
        const idAttr = id ? ` id="${id}"` : '';
        return `<button type="button" class="filter-btn filter-btn-clear filter-clear-all-btn"${idAttr} title="Tüm filtreleri temizle">
            <i class="ti ti-filter-off" aria-hidden="true"></i>
            <span>Temizle</span>
        </button>`;
    }

    function wrapControlHtml(controlHtml) {
        return `<div class="filter-input-wrap">
            ${controlHtml}
            <button type="button" class="filter-field-clear" aria-label="Alanı temizle" hidden>
                <i class="ti ti-x" aria-hidden="true"></i>
            </button>
        </div>`;
    }

    function resolveBar(root, barSelector) {
        if (!root) return null;
        if (typeof root === 'string') return document.querySelector(root);
        if (root.matches?.(barSelector)) return root;
        return root.querySelector(barSelector);
    }

    function getFilterFields(bar, fieldSelector) {
        const selector = fieldSelector
            || '.fg input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), .fg select, .al-field input, .al-field select, .filter-input-with-clear';
        return [...bar.querySelectorAll(selector)];
    }

    function removeLegacyFilterButtons(bar) {
        bar.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.classList.contains('filter-btn-clear')) return;
            const id = btn.id || '';
            const label = (btn.textContent || '').trim().toLowerCase();
            if (label === 'filtrele' || id === 'filterBtn' || id === 'mtFilterBtn'
                || id === 'mtMatrixFilterBtn' || id === 'vkKurallarFilterBtn' || id === 'alFilterBtn') {
                btn.remove();
            }
        });
        bar.querySelectorAll('#alClearBtn.filter-btn-secondary').forEach(btn => btn.remove());
    }

    function ensureClearAllButton(bar, clearAllId) {
        removeLegacyFilterButtons(bar);
        let btn = clearAllId ? bar.querySelector(`#${clearAllId}`) : bar.querySelector('.filter-clear-all-btn');
        if (btn) return btn;

        const wrap = document.createElement('template');
        wrap.innerHTML = clearAllButtonHtml(clearAllId).trim();
        btn = wrap.content.firstElementChild;
        bar.appendChild(btn);
        return btn;
    }

    function bind(root, options = {}) {
        const barSelector = options.barSelector
            || '.filter-bar, .mt-filter-bar, .al-filters, .vk-kurallar-filter-bar, .mt-mm-filter-bar';
        const bar = resolveBar(root, barSelector);
        if (!bar) return;

        const bindKey = options.bindKey || 'default';
        const stateKey = `filterBarBound_${bindKey}`;
        if (bar.dataset[stateKey] === '1') return;
        bar.dataset[stateKey] = '1';

        const fields = getFilterFields(bar, options.fieldSelector);
        const runFilter = debounce(() => options.onFilter?.(), options.debounceMs ?? 250);

        fields.forEach(field => {
            let clearBtn = field.closest('.filter-input-wrap')?.querySelector('.filter-field-clear');
            if (!clearBtn) {
                clearBtn = wrapFilterField(field);
            } else {
                field.classList.add('filter-input-with-clear');
                syncFieldClearBtn(field, clearBtn);
            }

            if (!clearBtn) return;

            clearBtn.addEventListener('click', e => {
                e.preventDefault();
                if (field.tagName === 'SELECT') field.value = '';
                else field.value = '';
                syncFieldClearBtn(field, clearBtn);
                options.onFilter?.();
                field.focus();
            });

            field.addEventListener('input', () => {
                syncFieldClearBtn(field, clearBtn);
                runFilter();
            });

            field.addEventListener('change', () => {
                syncFieldClearBtn(field, clearBtn);
                if (field.type === 'date' || field.tagName === 'SELECT') {
                    options.onFilter?.();
                } else {
                    runFilter();
                }
            });
        });

        if (options.onClearAll || options.onFilter) {
            const clearAll = ensureClearAllButton(bar, options.clearAllId);
            clearAll.addEventListener('click', e => {
                e.preventDefault();
                if (options.onClearAll) {
                    options.onClearAll();
                    return;
                }
                fields.forEach(field => {
                    if (field.tagName === 'SELECT') field.value = '';
                    else field.value = '';
                    const btn = field.closest('.filter-input-wrap')?.querySelector('.filter-field-clear');
                    syncFieldClearBtn(field, btn);
                });
                options.onFilter?.();
            });
        }

        bar.querySelectorAll('.filter-input-wrap .filter-field-clear').forEach(btn => {
            const field = btn.closest('.filter-input-wrap')?.querySelector('input, select');
            if (field) syncFieldClearBtn(field, btn);
        });
    }

    function bindField(field, options = {}) {
        if (!field) return;

        const runFilter = debounce(() => options.onFilter?.(), options.debounceMs ?? 250);
        let clearBtn = field.closest('.filter-input-wrap')?.querySelector('.filter-field-clear');
        if (!clearBtn) {
            clearBtn = wrapFilterField(field);
        } else {
            field.classList.add('filter-input-with-clear');
            syncFieldClearBtn(field, clearBtn);
        }
        if (!clearBtn) return;

        clearBtn.addEventListener('click', e => {
            e.preventDefault();
            field.value = '';
            syncFieldClearBtn(field, clearBtn);
            options.onFilter?.();
            field.focus();
        });

        field.addEventListener('input', () => {
            syncFieldClearBtn(field, clearBtn);
            runFilter();
        });

        field.addEventListener('change', () => {
            syncFieldClearBtn(field, clearBtn);
            if (field.type === 'date' || field.tagName === 'SELECT') {
                options.onFilter?.();
            } else {
                runFilter();
            }
        });
    }

    function syncFieldsInBar(bar, fieldSelector) {
        getFilterFields(bar, fieldSelector).forEach(field => {
            const btn = field.closest('.filter-input-wrap')?.querySelector('.filter-field-clear');
            syncFieldClearBtn(field, btn);
        });
    }

    function getQueryRowValue(row, column) {
        if (!row || column == null || column === '') return undefined;

        const name = String(column);
        const candidates = [
            name,
            name.charAt(0).toLowerCase() + name.slice(1),
            name.charAt(0).toUpperCase() + name.slice(1)
        ];

        for (const key of candidates) {
            if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined && row[key] !== null) {
                return row[key];
            }
        }

        const matchedKey = Object.keys(row).find(key => key.toLowerCase() === name.toLowerCase());
        return matchedKey ? row[matchedKey] : undefined;
    }

    window.FilterBar = {
        bind,
        bindField,
        clearAllButtonHtml,
        wrapControlHtml,
        wrapFilterField,
        syncFieldClearBtn,
        syncFieldsInBar,
        getQueryRowValue
    };
})();
