/* SQL IntelliSense — <textarea> için bağlam duyarlı otomatik tamamlama.
   Kaynaklar: T-SQL anahtar kelimeleri/fonksiyonları + katmandan çekilen tablo & kolon şeması.
   Kullanım: const ac = SqlIntellisense.attach(textarea); ac.setSchema(tablolar); */
(function () {
    const MIN_PREFIX = 1;
    const MAX_ITEMS = 60;

    const KEYWORDS = [
        'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'JOIN', 'INNER JOIN',
        'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN', 'OUTER APPLY', 'CROSS APPLY',
        'ON', 'AS', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS NULL',
        'IS NOT NULL', 'DISTINCT', 'TOP', 'UNION', 'UNION ALL', 'EXCEPT', 'INTERSECT',
        'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'WITH', 'OVER', 'PARTITION BY', 'ASC', 'DESC',
        'INTO', 'VALUES', 'DECLARE', 'SET', 'EXEC', 'NULL', 'OFFSET', 'FETCH NEXT', 'ROWS ONLY'
    ];

    const FUNCTIONS = [
        'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CAST', 'CONVERT', 'COALESCE', 'ISNULL',
        'NULLIF', 'GETDATE', 'SYSDATETIME', 'DATEADD', 'DATEDIFF', 'DATEPART', 'FORMAT',
        'YEAR', 'MONTH', 'DAY', 'LEFT', 'RIGHT', 'LEN', 'LTRIM', 'RTRIM', 'TRIM', 'UPPER',
        'LOWER', 'REPLACE', 'SUBSTRING', 'CONCAT', 'ROUND', 'ABS', 'ROW_NUMBER', 'RANK',
        'DENSE_RANK', 'LAG', 'LEAD', 'STRING_AGG', 'TRY_CAST', 'TRY_CONVERT', 'IIF'
    ];

    // Bir sonraki token'ın ne olması gerektiğini belirleyen bağlam anahtarları
    const TABLE_CONTEXT = /\b(from|join|apply|into|update|table)\s+[^\s,()]*$/i;
    const COLUMN_CONTEXT = /\b(select|where|on|and|or|by|having|set|when|then|else|,)\s+[^\s,()]*$/i;
    const FROM_SOURCES = /\b(?:from|join|apply)\s+((?:\[[^\]]+\]|[\w$#]+)(?:\s*\.\s*(?:\[[^\]]+\]|[\w$#]+)){0,2})(?:\s+(?:as\s+)?(?!on\b|inner\b|left\b|right\b|full\b|cross\b|outer\b|join\b|where\b|group\b|order\b|having\b|union\b)(\[[^\]]+\]|[\w$#]+))?/gi;

    const NEEDS_BRACKETS = /[^A-Za-z0-9_$#]/;

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function loadStylesheet() {
        if (document.querySelector('link[href="sql-intellisense.css"]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'sql-intellisense.css';
        document.head.appendChild(link);
    }

    function unquote(name) {
        const text = String(name || '').trim();
        return text.startsWith('[') && text.endsWith(']') ? text.slice(1, -1) : text;
    }

    function quoteIfNeeded(name) {
        const text = String(name || '');
        return NEEDS_BRACKETS.test(text) ? `[${text}]` : text;
    }

    /* Fuzzy skorlama: önce baştan eşleşme, sonra kelime sınırı, sonra içerme. */
    function score(label, term) {
        if (!term) return 1;
        const haystack = label.toLocaleLowerCase('en');
        const needle = term.toLocaleLowerCase('en');
        if (haystack === needle) return 1000;
        if (haystack.startsWith(needle)) return 800 - haystack.length;
        const boundary = haystack.indexOf('_' + needle);
        if (boundary >= 0) return 600 - boundary;
        const index = haystack.indexOf(needle);
        if (index >= 0) return 400 - index;

        // Harf sırası korunuyorsa zayıf eşleşme (ör. "crtdt" → "CreatedDate")
        let cursor = 0;
        for (const ch of needle) {
            cursor = haystack.indexOf(ch, cursor);
            if (cursor < 0) return -1;
            cursor++;
        }
        return 100;
    }

    function highlight(label, term) {
        if (!term) return escapeHtml(label);
        const index = label.toLocaleLowerCase('en').indexOf(term.toLocaleLowerCase('en'));
        if (index < 0) return escapeHtml(label);
        return escapeHtml(label.slice(0, index))
            + '<mark>' + escapeHtml(label.slice(index, index + term.length)) + '</mark>'
            + escapeHtml(label.slice(index + term.length));
    }

    /* Caret'in piksel konumunu bulmak için textarea'nın birebir kopyası kullanılır. */
    function caretPosition(textarea, index) {
        const mirror = document.createElement('div');
        const styles = window.getComputedStyle(textarea);
        const copied = [
            'boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
            'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
            'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing',
            'lineHeight', 'textTransform', 'wordSpacing', 'tabSize'
        ];
        copied.forEach(prop => { mirror.style[prop] = styles[prop]; });
        mirror.style.position = 'absolute';
        mirror.style.visibility = 'hidden';
        mirror.style.whiteSpace = 'pre-wrap';
        mirror.style.overflowWrap = 'break-word';
        mirror.style.top = '0';
        mirror.style.left = '-9999px';

        mirror.textContent = textarea.value.slice(0, index);
        const marker = document.createElement('span');
        marker.textContent = '\u200b';
        mirror.appendChild(marker);
        document.body.appendChild(mirror);

        const top = marker.offsetTop;
        const left = marker.offsetLeft;
        const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.4;
        document.body.removeChild(mirror);

        return { top, left, lineHeight };
    }

    class Completer {
        constructor(textarea) {
            this.textarea = textarea;
            this.tables = [];
            this.tableIndex = new Map();
            this.tableItems = [];
            this.open = false;
            this.items = [];
            this.activeIndex = 0;
            this.token = null;
            this.suppressRefresh = false;

            this.popup = document.createElement('div');
            this.popup.className = 'sqlac-popup';
            this.popup.setAttribute('role', 'listbox');
            this.popup.hidden = true;
            document.body.appendChild(this.popup);

            this.onInput = this.onInput.bind(this);
            this.onKeyDown = this.onKeyDown.bind(this);
            this.hide = this.hide.bind(this);
            this.reposition = this.reposition.bind(this);

            textarea.addEventListener('input', this.onInput);
            textarea.addEventListener('keydown', this.onKeyDown);
            textarea.addEventListener('blur', () => setTimeout(this.hide, 120));
            textarea.addEventListener('scroll', this.reposition, { passive: true });
            window.addEventListener('resize', this.reposition, { passive: true });
            window.addEventListener('scroll', this.reposition, { passive: true, capture: true });

            this.popup.addEventListener('mousedown', event => {
                const row = event.target.closest('.sqlac-item');
                if (!row) return;
                event.preventDefault();
                this.accept(Number(row.dataset.index));
            });
        }

        setSchema(tables) {
            this.tables = Array.isArray(tables) ? tables : [];
            this.tableIndex = new Map();
            // Tablo listesi her tuş vuruşunda yeniden kurulmasın diye bir kez hazırlanır.
            this.tableItems = this.tables.map(table => {
                const name = unquote(table.ad).toLocaleLowerCase('en');
                if (!this.tableIndex.has(name)) this.tableIndex.set(name, table);
                this.tableIndex.set(`${unquote(table.sema).toLocaleLowerCase('en')}.${name}`, table);

                return {
                    label: `${table.sema}.${table.ad}`,
                    insert: `${quoteIfNeeded(table.sema)}.${quoteIfNeeded(table.ad)}`,
                    kind: table.tip === 'VIEW' ? 'view' : 'table',
                    detail: `${table.kolonlar?.length || 0} kolon`
                };
            });
        }

        isOpen() {
            return this.open;
        }

        /* ---- bağlam çözümleme ---- */

        currentToken() {
            const caret = this.textarea.selectionStart;
            const before = this.textarea.value.slice(0, caret);
            const match = before.match(/(?:(\[[^\]]*\]|[\w$#]+)\s*\.\s*)?(\[[^\]]*|[\w$#]*)$/);
            if (!match) return null;
            return {
                qualifier: match[1] ? unquote(match[1]) : null,
                term: unquote(match[2] || ''),
                start: caret - (match[2] || '').length,
                end: caret,
                before
            };
        }

        /* Sorgudaki FROM/JOIN kaynaklarını ve takma adlarını toplar. */
        resolveSources(sql) {
            const sources = [];
            const aliases = new Map();
            FROM_SOURCES.lastIndex = 0;

            let match;
            while ((match = FROM_SOURCES.exec(sql)) !== null) {
                const parts = match[1].split('.').map(p => unquote(p.trim())).filter(Boolean);
                if (!parts.length) continue;
                const tableName = parts[parts.length - 1];
                const schemaName = parts.length > 1 ? parts[parts.length - 2] : null;
                const table = this.lookupTable(schemaName, tableName);
                if (!table) continue;

                sources.push(table);
                if (match[2]) aliases.set(unquote(match[2]).toLocaleLowerCase('en'), table);
                aliases.set(tableName.toLocaleLowerCase('en'), table);
            }
            return { sources, aliases };
        }

        lookupTable(schemaName, tableName) {
            if (!this.tableIndex || !tableName) return null;
            const name = tableName.toLocaleLowerCase('en');
            if (schemaName) {
                const qualified = this.tableIndex.get(`${schemaName.toLocaleLowerCase('en')}.${name}`);
                if (qualified) return qualified;
            }
            return this.tableIndex.get(name) || null;
        }

        buildCandidates(token) {
            const sql = this.textarea.value;
            const { sources, aliases } = this.resolveSources(sql);

            // "alias." veya "tablo." → yalnızca o nesnenin kolonları
            if (token.qualifier) {
                const key = token.qualifier.toLocaleLowerCase('en');
                const table = aliases.get(key) || this.lookupTable(null, token.qualifier);
                if (table) {
                    return (table.kolonlar || []).map(col => ({
                        label: col.ad,
                        insert: quoteIfNeeded(col.ad),
                        kind: 'column',
                        detail: col.veriTipi || 'kolon'
                    }));
                }
                // Şema adı olabilir: TDMAIN.PRM → o şemadaki tablolar
                const schemaTables = this.tables.filter(t =>
                    unquote(t.sema).toLocaleLowerCase('en') === key);
                if (schemaTables.length) {
                    return schemaTables.map(t => ({
                        label: t.ad,
                        insert: quoteIfNeeded(t.ad),
                        kind: t.tip === 'VIEW' ? 'view' : 'table',
                        detail: `${t.kolonlar?.length || 0} kolon`
                    }));
                }
                return [];
            }

            const head = token.before.slice(0, token.start);
            const tableList = this.tableItems || [];

            if (TABLE_CONTEXT.test(head)) return tableList;

            const columnList = [];
            const seen = new Set();
            (sources.length ? sources : []).forEach(table => {
                (table.kolonlar || []).forEach(col => {
                    const key = col.ad.toLocaleLowerCase('en');
                    if (seen.has(key)) return;
                    seen.add(key);
                    columnList.push({
                        label: col.ad,
                        insert: quoteIfNeeded(col.ad),
                        kind: 'column',
                        detail: `${table.ad}${col.veriTipi ? ' · ' + col.veriTipi : ''}`
                    });
                });
            });

            const keywordList = KEYWORDS.map(k => ({ label: k, insert: k, kind: 'keyword', detail: 'anahtar kelime' }));
            const functionList = FUNCTIONS.map(f => ({ label: f, insert: `${f}(`, kind: 'function', detail: 'fonksiyon' }));

            if (COLUMN_CONTEXT.test(head)) {
                return [...columnList, ...functionList, ...keywordList, ...tableList];
            }
            return [...keywordList, ...columnList, ...functionList, ...tableList];
        }

        /* ---- görünüm ---- */

        refresh(manual) {
            const token = this.currentToken();
            if (!token) return this.hide();

            const hasQualifier = Boolean(token.qualifier);
            if (!manual && !hasQualifier && token.term.length < MIN_PREFIX) return this.hide();

            const scored = [];
            const candidates = this.buildCandidates(token);
            for (let index = 0; index < candidates.length; index++) {
                const value = score(candidates[index].label, token.term);
                if (value < 0) continue;
                scored.push({ item: candidates[index], value, index });
            }
            if (!scored.length) return this.hide();

            // Eşit skorlarda aday sırası korunur: buildCandidates listeleri bağlama göre
            // önceliklendirir (ör. WHERE içinde önce kolonlar, sonra fonksiyon ve anahtar kelimeler).
            scored.sort((a, b) => b.value - a.value || a.index - b.index);
            this.items = scored.slice(0, MAX_ITEMS).map(entry => entry.item);
            this.token = token;
            this.activeIndex = 0;
            this.render(token.term);
            this.show();
        }

        render(term) {
            this.popup.innerHTML = this.items.map((item, index) => `
                <div class="sqlac-item${index === this.activeIndex ? ' is-active' : ''}"
                     role="option" aria-selected="${index === this.activeIndex}" data-index="${index}">
                    <span class="sqlac-kind sqlac-kind--${item.kind}" aria-hidden="true"></span>
                    <span class="sqlac-label">${highlight(item.label, term)}</span>
                    <span class="sqlac-detail">${escapeHtml(item.detail || '')}</span>
                </div>`).join('');
        }

        show() {
            this.popup.hidden = false;
            this.open = true;
            this.reposition();
        }

        hide() {
            if (!this.open) return;
            this.popup.hidden = true;
            this.open = false;
            this.items = [];
            this.token = null;
        }

        reposition() {
            if (!this.open || !this.token) return;
            const rect = this.textarea.getBoundingClientRect();
            const caret = caretPosition(this.textarea, this.token.start);

            let left = rect.left + caret.left - this.textarea.scrollLeft;
            let top = rect.top + caret.top - this.textarea.scrollTop + caret.lineHeight + 4;

            const width = this.popup.offsetWidth || 320;
            const height = this.popup.offsetHeight || 240;
            left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
            if (top + height > window.innerHeight - 8) {
                top = rect.top + caret.top - this.textarea.scrollTop - height - 4;
            }

            this.popup.style.left = `${Math.round(left)}px`;
            this.popup.style.top = `${Math.round(Math.max(8, top))}px`;
        }

        move(delta) {
            if (!this.items.length) return;
            this.activeIndex = (this.activeIndex + delta + this.items.length) % this.items.length;
            this.popup.querySelectorAll('.sqlac-item').forEach((el, index) => {
                const active = index === this.activeIndex;
                el.classList.toggle('is-active', active);
                el.setAttribute('aria-selected', String(active));
                if (active) el.scrollIntoView({ block: 'nearest' });
            });
        }

        accept(index) {
            const item = this.items[index ?? this.activeIndex];
            if (!item || !this.token) return;

            const { start, end } = this.token;
            const value = this.textarea.value;
            this.textarea.value = value.slice(0, start) + item.insert + value.slice(end);
            const caret = start + item.insert.length;
            this.textarea.setSelectionRange(caret, caret);
            this.hide();
            this.textarea.focus();

            // Ekleme sonrası input olayı listeyi yeniden açmasın; öneri kabul edildi.
            this.suppressRefresh = true;
            this.textarea.dispatchEvent(new Event('input', { bubbles: true }));
            this.suppressRefresh = false;
        }

        onInput() {
            if (this.suppressRefresh) return;
            this.refresh(false);
        }

        onKeyDown(event) {
            // Ctrl+Space her zaman öneri açar
            if ((event.ctrlKey || event.metaKey) && event.code === 'Space') {
                event.preventDefault();
                this.refresh(true);
                return;
            }
            // Ctrl+Enter sorguyu çalıştırır; tamamlamaya karışma
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                this.hide();
                return;
            }
            if (!this.open) {
                if (event.key === '.') setTimeout(() => this.refresh(true), 0);
                return;
            }

            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    this.move(1);
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    this.move(-1);
                    break;
                case 'PageDown':
                    event.preventDefault();
                    this.move(5);
                    break;
                case 'PageUp':
                    event.preventDefault();
                    this.move(-5);
                    break;
                case 'Enter':
                case 'Tab':
                    event.preventDefault();
                    this.accept();
                    break;
                case 'Escape':
                    event.preventDefault();
                    this.hide();
                    break;
                case '.':
                    setTimeout(() => this.refresh(true), 0);
                    break;
                default:
                    break;
            }
        }

        destroy() {
            this.hide();
            this.popup.remove();
            this.textarea.removeEventListener('input', this.onInput);
            this.textarea.removeEventListener('keydown', this.onKeyDown);
            this.textarea.removeEventListener('scroll', this.reposition);
            window.removeEventListener('resize', this.reposition);
            window.removeEventListener('scroll', this.reposition, true);
        }
    }

    function attach(textarea) {
        if (!textarea) return null;
        loadStylesheet();
        return new Completer(textarea);
    }

    window.SqlIntellisense = { attach, KEYWORDS, FUNCTIONS };
})();
