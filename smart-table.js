(function () {
    const DISPLAY_MAX_ROWS = 5000;
    const ROW_HEIGHT = 33;
    const OVERSCAN = 6;
    const DEFAULT_COL_WIDTH = 140;
    const MIN_COL_WIDTH = 72;
    const FILTER_ROW_HEIGHT = 36;
    const HEADER_ROW_HEIGHT = 34;

    const instances = new WeakMap();

    function loadStylesheet() {
        if (document.querySelector('link[href="smart-table.css"]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'smart-table.css';
        document.head.appendChild(link);
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        const str = typeof value === 'string' ? value : String(value);
        if (!/[<>&"]/.test(str)) return str;
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function debounce(fn, ms) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    }

    function getRowCell(row, column, getValue) {
        if (typeof getValue === 'function') {
            return getValue(row, column);
        }
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

    function normalizeColumn(col) {
        if (typeof col === 'string') {
            return { key: col, label: col, type: 'text' };
        }
        return {
            key: col.key,
            label: col.label || col.key,
            type: col.type || 'text'
        };
    }

    function inferColumnType(rows, key, getValue) {
        for (let i = 0; i < Math.min(rows.length, 40); i++) {
            const raw = getRowCell(rows[i], key, getValue);
            if (raw === null || raw === undefined || raw === '') continue;
            if (typeof raw === 'number') return 'number';
            const text = String(raw).trim();
            if (/^-?\d+([.,]\d+)?$/.test(text.replace(/\./g, '').replace(',', '.'))) return 'number';
            if (/^\d{4}-\d{2}-\d{2}/.test(text)) return 'date';
            return 'text';
        }
        return 'text';
    }

    function toSortableNumber(value) {
        if (value === null || value === undefined || value === '') return null;
        if (typeof value === 'number') return value;
        const normalized = String(value).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
        const num = Number(normalized);
        return Number.isNaN(num) ? null : num;
    }

    function compareValues(a, b, type) {
        if (a === b) return 0;
        if (a === null || a === undefined || a === '') return 1;
        if (b === null || b === undefined || b === '') return -1;

        if (type === 'number') {
            const na = toSortableNumber(a);
            const nb = toSortableNumber(b);
            if (na === null && nb === null) return 0;
            if (na === null) return 1;
            if (nb === null) return -1;
            return na - nb;
        }

        if (type === 'date') {
            const da = new Date(a).getTime();
            const db = new Date(b).getTime();
            if (Number.isNaN(da) && Number.isNaN(db)) return 0;
            if (Number.isNaN(da)) return 1;
            if (Number.isNaN(db)) return -1;
            return da - db;
        }

        return String(a).localeCompare(String(b), 'tr', { numeric: true, sensitivity: 'base' });
    }

    function filterRows(rows, cols, columnFilters, getValue) {
        const active = Object.entries(columnFilters).filter(([, value]) => String(value || '').trim());
        if (!active.length) return rows;

        return rows.filter(row =>
            active.every(([col, term]) => {
                const raw = getRowCell(row, col, getValue);
                return String(raw ?? '').toLocaleLowerCase('tr-TR').includes(String(term).toLocaleLowerCase('tr-TR'));
            })
        );
    }

    function sortRows(rows, sortCol, sortDir, colTypes, getValue) {
        if (!sortCol || !sortDir) return rows;
        const type = colTypes[sortCol] || 'text';
        return [...rows].sort((a, b) => {
            const cmp = compareValues(getRowCell(a, sortCol, getValue), getRowCell(b, sortCol, getValue), type);
            return sortDir === 'desc' ? -cmp : cmp;
        });
    }

    class SmartTable {
        constructor(options) {
            this.options = options;
            this.cols = (options.cols || []).map(normalizeColumn);
            this.sourceRows = options.rows || [];
            this.sortCol = null;
            this.sortDir = null;
            this.columnFilters = {};
            this.colWidths = {};
            this.colTypes = {};
            this.cols.forEach(col => {
                this.colTypes[col.key] = col.type === 'text' ? inferColumnType(this.sourceRows, col.key, options.getValue) : col.type;
                this.colWidths[col.key] = options.initialWidths?.[col.key] || DEFAULT_COL_WIDTH;
            });
            this.virtualCleanup = null;
            this.resizeCleanup = null;
            this.filtersVisible = false;
            this.filterDebounced = debounce(() => this.refresh(), 200);
        }

        resolveElements() {
            const { scrollEl, headEl, bodyEl } = this.options;
            const table = bodyEl?.closest('table') || headEl?.closest('table');
            const thead = headEl?.tagName === 'THEAD' ? headEl : table?.querySelector('thead');
            const tbody = bodyEl?.tagName === 'TBODY' ? bodyEl : table?.querySelector('tbody');
            const wrap = scrollEl || table?.closest('.vs-results-wrap, .mt-scroll, .mt-mm-scroll, .vk-scroll, .um-scroll, .tl-card .vs-results-wrap');
            return { table, thead, tbody, wrap };
        }

        getLabel(col) {
            const labelFn = this.options.getColumnLabel;
            if (typeof labelFn === 'function') return labelFn(col.key);
            return col.label;
        }

        pipelineRows() {
            let rows = filterRows(this.sourceRows, this.cols, this.columnFilters, this.options.getValue);
            rows = sortRows(rows, this.sortCol, this.sortDir, this.colTypes, this.options.getValue);
            return rows;
        }

        buildColgroup() {
            const colsHtml = this.cols.map(col => {
                const width = this.colWidths[col.key] || DEFAULT_COL_WIDTH;
                return `<col data-col="${escapeHtml(col.key)}" style="width:${width}px">`;
            }).join('');
            let colgroup = this.table.querySelector('colgroup');
            if (!colgroup) {
                colgroup = document.createElement('colgroup');
                this.table.insertBefore(colgroup, this.table.firstChild);
            }
            colgroup.innerHTML = colsHtml;
        }

        renderHeader() {
            const filterable = this.options.filterable !== false;
            const labelCells = this.cols.map(col => {
                const isSorted = this.sortCol === col.key;
                const sortIcon = !isSorted
                    ? 'ti-arrows-sort'
                    : (this.sortDir === 'asc' ? 'ti-sort-ascending' : 'ti-sort-descending');
                const sortClass = isSorted
                    ? (this.sortDir === 'asc' ? ' is-sorted-asc' : ' is-sorted-desc')
                    : '';
                const funnelBtn = filterable
                    ? `<button type="button" class="st-filter-toggle" data-filter-toggle title="Filtreleri göster/gizle" aria-pressed="${this.filtersVisible}">
                        <i class="ti ti-filter st-filter-toggle-icon" aria-hidden="true"></i>
                    </button>`
                    : '';
                return `<th scope="col" data-col="${escapeHtml(col.key)}" class="st-label-cell${sortClass}">
                    <button type="button" class="st-sort-btn" data-sort-col="${escapeHtml(col.key)}" title="Sırala">
                        <span class="st-sort-label">${escapeHtml(this.getLabel(col))}</span>
                        <i class="ti ${sortIcon} st-sort-icon" aria-hidden="true"></i>
                    </button>
                    ${funnelBtn}
                    <span class="st-col-resizer" data-resize-col="${escapeHtml(col.key)}" title="Genişliği ayarla"></span>
                </th>`;
            }).join('');

            const filterRow = !filterable
                ? ''
                : `<tr class="st-filter-row">${this.cols.map(col => `
                <th scope="col" class="st-filter-cell">
                    <input type="search" class="st-filter-input" data-filter-col="${escapeHtml(col.key)}"
                        placeholder="Filtrele…" value="${escapeHtml(this.columnFilters[col.key] || '')}" autocomplete="off">
                </th>`).join('')}</tr>`;

            this.thead.innerHTML = `
                <tr class="st-label-row">${labelCells}</tr>
                ${filterRow}`;

            this.thead.querySelectorAll('.st-sort-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const col = btn.dataset.sortCol;
                    if (this.sortCol !== col) {
                        this.sortCol = col;
                        this.sortDir = 'asc';
                    } else if (this.sortDir === 'asc') {
                        this.sortDir = 'desc';
                    } else if (this.sortDir === 'desc') {
                        this.sortCol = null;
                        this.sortDir = null;
                    } else {
                        this.sortDir = 'asc';
                    }
                    this.renderHeader();
                    this.refresh();
                });
            });

            this.bindHeaderEvents();
            this.updateFilterUI();
        }

        hasActiveFilters() {
            return Object.values(this.columnFilters).some(v => String(v || '').trim());
        }

        updateFilterUI() {
            if (!this.table) return;
            this.table.classList.toggle('st-filters-open', this.filtersVisible);
            const active = this.hasActiveFilters();
            this.thead.querySelectorAll('[data-filter-toggle]').forEach(btn => {
                btn.classList.toggle('is-active', active);
                btn.setAttribute('aria-pressed', String(this.filtersVisible));
            });
        }

        bindResize() {
            if (this.resizeCleanup) {
                this.resizeCleanup();
                this.resizeCleanup = null;
            }

            const onPointerMove = event => {
                if (!this.resizeState) return;
                const delta = event.clientX - this.resizeState.startX;
                const next = Math.max(MIN_COL_WIDTH, this.resizeState.startWidth + delta);
                this.colWidths[this.resizeState.col] = next;
                const colEl = this.table.querySelector(`colgroup col[data-col="${this.resizeState.col}"]`);
                if (colEl) colEl.style.width = `${next}px`;
            };

            const onPointerUp = () => {
                this.resizeState = null;
                document.body.classList.remove('st-col-resizing');
            };

            const onPointerDown = event => {
                const handle = event.target.closest('.st-col-resizer');
                if (!handle) return;
                event.preventDefault();
                const col = handle.dataset.resizeCol;
                this.resizeState = {
                    col,
                    startX: event.clientX,
                    startWidth: this.colWidths[col] || DEFAULT_COL_WIDTH
                };
                document.body.classList.add('st-col-resizing');
            };

            this.thead.addEventListener('pointerdown', onPointerDown);
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);

            this.resizeCleanup = () => {
                this.thead.removeEventListener('pointerdown', onPointerDown);
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
            };
        }

        bindHeaderEvents() {
            this.thead.querySelectorAll('[data-filter-toggle]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.filtersVisible = !this.filtersVisible;
                    this.updateFilterUI();
                    if (this.filtersVisible) {
                        this.thead.querySelector('.st-filter-input')?.focus();
                    }
                });
            });

            this.thead.querySelectorAll('.st-filter-input').forEach(input => {
                input.addEventListener('input', () => {
                    this.columnFilters[input.dataset.filterCol] = input.value;
                    this.updateFilterUI();
                    this.filterDebounced();
                });
            });
        }

        formatCell(col, row, value) {
            if (typeof this.options.formatCell === 'function') {
                const formatted = this.options.formatCell(col.key, row, value);
                if (formatted && String(formatted).trim().startsWith('<td')) {
                    return formatted;
                }
                const wrapClass = this.options.wrapCells ? 'vs-cell-wrap' : '';
                return `<td class="${wrapClass}">${formatted ?? ''}</td>`;
            }
            const wrapClass = this.options.wrapCells ? 'vs-cell-wrap' : '';
            return `<td class="${wrapClass}">${escapeHtml(value)}</td>`;
        }

        buildRowHtml(row) {
            if (typeof this.options.renderRow === 'function') {
                return this.options.renderRow(row);
            }

            const attrs = typeof this.options.rowAttrs === 'function' ? this.options.rowAttrs(row) : {};
            const attrText = Object.entries(attrs)
                .filter(([key]) => key !== 'class')
                .map(([key, val]) => ` ${key}="${escapeHtml(val)}"`)
                .join('');
            const rowClass = [attrs.class, typeof this.options.rowClass === 'function' ? this.options.rowClass(row) : '']
                .filter(Boolean)
                .join(' ');

            const cells = this.cols.map(col => {
                const value = getRowCell(row, col.key, this.options.getValue);
                return this.formatCell(col, row, value);
            }).join('');

            return `<tr${rowClass ? ` class="${escapeHtml(rowClass)}"` : ''}${attrText}>${cells}</tr>`;
        }

        destroyVirtual() {
            if (this.virtualCleanup) {
                this.virtualCleanup();
                this.virtualCleanup = null;
            }
        }

        renderBodyAll(rows) {
            this.destroyVirtual();
            if (!rows.length) {
                this.tbody.innerHTML = `<tr><td colspan="${this.cols.length}" class="st-empty-row">Kayıt bulunamadı.</td></tr>`;
                return;
            }
            this.tbody.innerHTML = rows.map(row => this.buildRowHtml(row)).join('');
            this.bindRowEvents();
        }

        renderBodyVirtual(rows) {
            this.destroyVirtual();
            if (!rows.length) {
                this.tbody.innerHTML = `<tr><td colspan="${this.cols.length}" class="st-empty-row">Kayıt bulunamadı.</td></tr>`;
                return;
            }

            const scrollEl = this.wrap;
            const cols = this.cols;
            const buildRowHtml = row => this.buildRowHtml(row);
            let rafId = 0;
            let destroyed = false;

            const paint = () => {
                if (destroyed) return;
                const scrollTop = scrollEl.scrollTop;
                const viewHeight = scrollEl.clientHeight || 480;
                const firstVisible = Math.floor(scrollTop / ROW_HEIGHT);
                const start = Math.max(0, firstVisible - OVERSCAN);
                const visibleCount = Math.ceil(viewHeight / ROW_HEIGHT) + OVERSCAN * 2;
                const end = Math.min(rows.length, start + visibleCount);
                const topPad = start * ROW_HEIGHT;
                const bottomPad = Math.max(0, (rows.length - end) * ROW_HEIGHT);
                const parts = [];

                if (topPad > 0) {
                    parts.push(`<tr class="virtual-spacer" aria-hidden="true"><td colspan="${cols.length}" style="height:${topPad}px"></td></tr>`);
                }
                for (let i = start; i < end; i++) {
                    parts.push(buildRowHtml(rows[i]));
                }
                if (bottomPad > 0) {
                    parts.push(`<tr class="virtual-spacer" aria-hidden="true"><td colspan="${cols.length}" style="height:${bottomPad}px"></td></tr>`);
                }
                this.tbody.innerHTML = parts.join('');
                this.bindRowEvents();
            };

            const schedulePaint = () => {
                if (destroyed || rafId) return;
                rafId = requestAnimationFrame(() => {
                    rafId = 0;
                    paint();
                });
            };

            const onScroll = () => schedulePaint();
            scrollEl.addEventListener('scroll', onScroll, { passive: true });
            scrollEl.scrollTop = 0;
            schedulePaint();

            this.virtualCleanup = () => {
                destroyed = true;
                scrollEl.removeEventListener('scroll', onScroll);
                if (rafId) cancelAnimationFrame(rafId);
            };
        }

        bindRowEvents() {
            if (typeof this.options.onRowClick !== 'function') return;
            this.tbody.querySelectorAll('tr:not(.virtual-spacer)').forEach((rowEl, index) => {
                rowEl.addEventListener('click', event => {
                    if (event.target.closest('button, a, input, select, textarea')) return;
                    const rows = this.displayRows || [];
                    const dataIndex = rowEl.dataset.rowIndex != null
                        ? Number(rowEl.dataset.rowIndex)
                        : index;
                    this.options.onRowClick(rows[dataIndex], rowEl, event);
                });
            });
        }

        refresh() {
            const piped = this.pipelineRows();
            const useVirtual = this.options.virtualScroll !== false && !this.options.wrapCells;
            this.displayRows = useVirtual ? piped.slice(0, DISPLAY_MAX_ROWS) : piped;

            if (useVirtual) {
                this.renderBodyVirtual(this.displayRows);
            } else {
                this.renderBodyAll(this.displayRows.slice(0, DISPLAY_MAX_ROWS));
            }

            if (typeof this.options.onFilteredChange === 'function') {
                // Primary argument is the shown (post-filter) count. The second argument
                // is the current source length; consumers should derive the original total
                // from their own state, since setRows() can replace the source dataset.
                this.options.onFilteredChange(this.displayRows.length, this.sourceRows.length);
            }
        }

        setRows(rows) {
            this.sourceRows = rows || [];
            this.cols.forEach(col => {
                if (col.type === 'text') {
                    this.colTypes[col.key] = inferColumnType(this.sourceRows, col.key, this.options.getValue);
                }
            });
            this.refresh();
        }

        getExportData() {
            const rows = this.pipelineRows();
            return {
                columns: this.cols.map(col => col.key),
                rows
            };
        }

        mount() {
            loadStylesheet();
            const { table, thead, tbody, wrap } = this.resolveElements();
            if (!table || !thead || !tbody) return this;

            this.table = table;
            this.thead = thead;
            this.tbody = tbody;
            this.wrap = wrap || table.parentElement;

            this.table.classList.add('smart-table', 'vs-results-table');
            if (this.options.wrapCells) {
                this.table.classList.add('vs-results-table--wrap');
            }
            if (this.options.tableClass) {
                this.options.tableClass.split(' ').forEach(cls => cls && this.table.classList.add(cls));
            }

            this.buildColgroup();
            this.renderHeader();
            this.bindResize();
            this.refresh();
            if (this.wrap) this.wrap.scrollTop = 0;

            instances.set(this.table, this);
            return this;
        }

        destroy() {
            this.destroyVirtual();
            if (this.resizeCleanup) this.resizeCleanup();
            if (this.table) instances.delete(this.table);
            this.table = null;
        }
    }

    function mount(options) {
        const { table, bodyEl } = options;
        const existingTable = (typeof table === 'string' ? document.querySelector(table) : table)
            || bodyEl?.closest('table');
        const existing = existingTable ? instances.get(existingTable) : null;
        if (existing) existing.destroy();

        const instance = new SmartTable(options);
        instance.mount();
        return instance;
    }

    function destroy(tableEl) {
        const table = typeof tableEl === 'string' ? document.querySelector(tableEl) : tableEl;
        const instance = table ? instances.get(table) : null;
        if (instance) instance.destroy();
    }

    window.SmartTable = {
        DISPLAY_MAX_ROWS,
        ROW_HEIGHT,
        mount,
        destroy,
        getRowCell,
        escapeHtml
    };
})();
