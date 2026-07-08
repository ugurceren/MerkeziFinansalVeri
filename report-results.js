(function () {
    const DISPLAY_MAX_ROWS = 5000;
    const ROW_HEIGHT = 33;
    const OVERSCAN = 6;

    let activeTable = null;

    function sliceForDisplay(rows) {
        if (!Array.isArray(rows)) return [];
        return rows.slice(0, DISPLAY_MAX_ROWS);
    }

    function buildRecordCountFootnote(total, options = {}) {
        const opts = options || {};
        const notes = [];
        const displayMax = opts.displayMax ?? DISPLAY_MAX_ROWS;

        if (total > displayMax) {
            notes.push(`ekranda ilk ${displayMax.toLocaleString('tr-TR')} gösteriliyor`);
        }
        if (opts.kisitlandi && opts.maxSatir) {
            notes.push(`sunucu limiti (${Number(opts.maxSatir).toLocaleString('tr-TR')}) uygulandı`);
        }
        if (opts.extraNotes?.length) {
            notes.push(...opts.extraNotes.filter(Boolean));
        }
        return notes.join(' · ');
    }

    function setRecordCount(host, payload, rows, options = {}) {
        if (!host) return;

        const allRows = payload?.satirlar || rows || [];
        const total = Number(payload?.satirSayisi ?? allRows.length) || 0;
        const displayMax = options.displayMax ?? DISPLAY_MAX_ROWS;
        const shown = total === 0 ? 0 : Math.min(allRows.length, displayMax);
        const footnote = buildRecordCountFootnote(total, {
            displayMax,
            kisitlandi: payload?.kisitlandi,
            maxSatir: payload?.maxSatir,
            extraNotes: options.extraNotes
        });

        if (window.TableCount?.set) {
            window.TableCount.set(host, shown, total, {
                wrapId: host.id || options.wrapId,
                footnote: footnote || undefined
            });
            return;
        }

        host.textContent = formatRecordInfo(total, {
            kisitlandi: payload?.kisitlandi,
            maxSatir: payload?.maxSatir
        });
    }

    function formatRecordInfo(totalCount, options) {
        const opts = options || {};
        const total = Number(totalCount) || 0;
        if (total === 0) return 'Toplam 0 kayıt döndü';

        const formattedTotal = total.toLocaleString('tr-TR');
        let text = `Toplam ${formattedTotal} kayıt döndü`;

        if (total > DISPLAY_MAX_ROWS) {
            text += ` · ekranda ilk ${DISPLAY_MAX_ROWS.toLocaleString('tr-TR')} gösteriliyor`;
        }

        if (opts.kisitlandi && opts.maxSatir) {
            text += ` · sunucu limiti (${Number(opts.maxSatir).toLocaleString('tr-TR')}) uygulandı`;
        }

        return text;
    }

    function escapeHtmlFast(value) {
        if (value === null || value === undefined) return '';
        const str = typeof value === 'string' ? value : String(value);
        if (!/[<>&"]/.test(str)) return str;
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function destroyActiveTable() {
        if (activeTable) {
            activeTable.destroy();
            activeTable = null;
        }
    }

    function getActiveTable() {
        return activeTable;
    }

    function getRowCell(row, column) {
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

    function renderTable(options) {
        destroyActiveTable();

        const {
            scrollEl,
            headEl,
            bodyEl,
            cols,
            rows,
            getColumnLabel,
            wrapCells,
            getValue,
            formatCell,
            onFilteredChange,
            virtualScroll
        } = options || {};

        if (!headEl || !bodyEl) return null;

        if (!cols?.length || !rows?.length) {
            headEl.innerHTML = '';
            bodyEl.innerHTML = '';
            return null;
        }

        if (window.SmartTable?.mount) {
            activeTable = window.SmartTable.mount({
                scrollEl,
                headEl,
                bodyEl,
                cols,
                rows,
                getColumnLabel,
                getValue,
                formatCell,
                wrapCells,
                virtualScroll,
                onFilteredChange
            });
            return activeTable;
        }

        const labelFn = typeof getColumnLabel === 'function' ? getColumnLabel : col => col;
        const table = bodyEl.closest('table');
        table?.classList.toggle('vs-results-table--wrap', !!wrapCells);
        headEl.innerHTML = `<tr>${cols.map(col => `<th>${escapeHtmlFast(labelFn(col))}</th>`).join('')}</tr>`;

        if (wrapCells) {
            bodyEl.innerHTML = rows.map(row => {
                const cells = cols.map(col =>
                    `<td class="vs-cell-wrap">${escapeHtmlFast(getRowCell(row, col))}</td>`
                ).join('');
                return `<tr>${cells}</tr>`;
            }).join('');
            scrollEl && (scrollEl.scrollTop = 0);
            activeTable = { destroy() {} };
            return activeTable;
        }

        let rafId = 0;
        let destroyed = false;

        function paint() {
            if (destroyed) return;

            const scrollTop = scrollEl.scrollTop;
            const viewHeight = scrollEl.clientHeight || 480;
            const firstVisible = Math.floor(scrollTop / ROW_HEIGHT);
            const start = Math.max(0, firstVisible - OVERSCAN);
            const visibleCount = Math.ceil(viewHeight / ROW_HEIGHT) + OVERSCAN * 2;
            const end = Math.min(rows.length, start + visibleCount);
            const topPad = start * ROW_HEIGHT;
            const bottomPad = Math.max(0, (rows.length - end) * ROW_HEIGHT);

            const parts = new Array(end - start + 2);
            let partIndex = 0;

            if (topPad > 0) {
                parts[partIndex++] = `<tr class="virtual-spacer" aria-hidden="true"><td colspan="${cols.length}" style="height:${topPad}px"></td></tr>`;
            }

            for (let i = start; i < end; i++) {
                const row = rows[i];
                let rowHtml = '<tr>';
                for (let c = 0; c < cols.length; c++) {
                    rowHtml += `<td>${escapeHtmlFast(getRowCell(row, cols[c]))}</td>`;
                }
                parts[partIndex++] = `${rowHtml}</tr>`;
            }

            if (bottomPad > 0) {
                parts[partIndex++] = `<tr class="virtual-spacer" aria-hidden="true"><td colspan="${cols.length}" style="height:${bottomPad}px"></td></tr>`;
            }

            bodyEl.innerHTML = parts.slice(0, partIndex).join('');
        }

        function schedulePaint() {
            if (destroyed || rafId) return;
            rafId = requestAnimationFrame(() => {
                rafId = 0;
                paint();
            });
        }

        const onScroll = () => schedulePaint();
        scrollEl.addEventListener('scroll', onScroll, { passive: true });
        scrollEl.scrollTop = 0;
        schedulePaint();

        activeTable = {
            destroy() {
                destroyed = true;
                scrollEl.removeEventListener('scroll', onScroll);
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = 0;
                }
            }
        };

        return activeTable;
    }

    function cellValue(val) {
        if (val === null || val === undefined) return '';
        if (val instanceof Date) return val.toISOString();
        if (typeof val === 'object') return JSON.stringify(val);
        return val;
    }

    function exportToExcel({ columns, rows, getHeaderLabel, fileName }) {
        if (!window.XLSX) {
            window.alert('Excel aktarımı için kütüphane yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
            return;
        }

        if (!Array.isArray(columns) || !columns.length || !Array.isArray(rows) || !rows.length) {
            window.alert('Dışa aktarılacak veri bulunamadı.');
            return;
        }

        const labelFn = typeof getHeaderLabel === 'function' ? getHeaderLabel : col => col;
        const headers = columns.map(labelFn);
        const data = rows.map(row => columns.map(col => cellValue(getRowCell(row, col))));
        const sheet = window.XLSX.utils.aoa_to_sheet([headers, ...data]);
        const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, sheet, 'Sonuç');
        window.XLSX.writeFile(workbook, fileName || 'rapor.xlsx');
    }

    function defaultFileName(prefix) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const h = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        return `${prefix}_${y}${m}${d}_${h}${min}.xlsx`;
    }

    const EXCEL_ICON_SVG = `<svg class="report-export-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2"/><path d="M8 11h8v7h-8z"/><path d="M8 15h8"/><path d="M11 11v7"/></svg>`;

    function mountExportButtons() {
        document.querySelectorAll('.report-export-btn').forEach(btn => {
            if (!btn.querySelector('.report-export-icon')) {
                btn.insertAdjacentHTML('afterbegin', EXCEL_ICON_SVG);
            }
        });
    }

    window.ReportResults = {
        DISPLAY_MAX_ROWS,
        ROW_HEIGHT,
        sliceForDisplay,
        formatRecordInfo,
        buildRecordCountFootnote,
        setRecordCount,
        escapeHtmlFast,
        renderTable,
        destroyActiveTable,
        getActiveTable,
        exportToExcel,
        defaultFileName,
        mountExportButtons
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountExportButtons);
    } else {
        mountExportButtons();
    }
})();
