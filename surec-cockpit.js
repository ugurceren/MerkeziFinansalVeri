const COCKPIT_COLUMNS = [
    {
        name: 'TDSTG',
        role: 'Staging — ham veri katmanı',
        theme: 'teal',
        datasets: [
            { name: 'ds_banka_ham', label: 'Banka Ham Veri', tasks: [
                { label: 'Yükleme', status: 'done' },
                { label: 'Validasyon', status: 'done' },
                { label: 'Staging Onay', status: 'done' }
            ]},
            { name: 'ds_muhasebe_raw', label: 'Muhasebe Raw', tasks: [
                { label: 'Yükleme', status: 'done' },
                { label: 'Validasyon', status: 'running' },
                { label: 'Staging Onay', status: 'pending' }
            ]},
            { name: 'ds_doviz_kurlari', label: 'Döviz Kurları', tasks: [
                { label: 'Yükleme', status: 'done' },
                { label: 'Validasyon', status: 'done' },
                { label: 'Staging Onay', status: 'done' }
            ]},
            { name: 'ds_masraf_stg', label: 'Masraf Staging', tasks: [
                { label: 'Yükleme', status: 'running' },
                { label: 'Validasyon', status: 'pending' },
                { label: 'Staging Onay', status: 'pending' }
            ]}
        ]
    },
    {
        name: 'TDMAIN',
        role: 'Ana veri — kurumsal çekirdek',
        theme: 'blue',
        datasets: [
            { name: 'ds_kebir', label: 'Kebir Defteri', tasks: [
                { label: 'Dönüşüm', status: 'done' },
                { label: 'Mutabakat', status: 'running' },
                { label: 'Ana Veri Onay', status: 'pending' }
            ]},
            { name: 'ds_mizan', label: 'Mizan', tasks: [
                { label: 'Dönüşüm', status: 'done' },
                { label: 'Mutabakat', status: 'running' },
                { label: 'Ana Veri Onay', status: 'pending' }
            ]},
            { name: 'ds_yevmiye', label: 'Yevmiye', tasks: [
                { label: 'Dönüşüm', status: 'done' },
                { label: 'Mutabakat', status: 'pending' },
                { label: 'Ana Veri Onay', status: 'pending' }
            ]},
            { name: 'ds_hesap_plan', label: 'Hesap Planı', tasks: [
                { label: 'Dönüşüm', status: 'done' },
                { label: 'Mutabakat', status: 'done' },
                { label: 'Ana Veri Onay', status: 'done' }
            ]}
        ]
    },
    {
        name: 'TDREPORT',
        role: 'Raporlama — analitik katman',
        theme: 'purple',
        datasets: [
            { name: 'ds_bilanco', label: 'Bilanço', tasks: [
                { label: 'Agregasyon', status: 'pending' },
                { label: 'Rapor Üretim', status: 'pending' },
                { label: 'Yayınlama', status: 'pending' }
            ]},
            { name: 'ds_gelir', label: 'Gelir Tablosu', tasks: [
                { label: 'Agregasyon', status: 'pending' },
                { label: 'Rapor Üretim', status: 'pending' },
                { label: 'Yayınlama', status: 'pending' }
            ]},
            { name: 'ds_ters_bakiye', label: 'Ters Bakiye', tasks: [
                { label: 'Agregasyon', status: 'pending' },
                { label: 'Rapor Üretim', status: 'pending' },
                { label: 'Yayınlama', status: 'pending' }
            ]},
            { name: 'ds_nazim', label: 'Nazım Hesapları', tasks: [
                { label: 'Agregasyon', status: 'pending' },
                { label: 'Rapor Üretim', status: 'pending' },
                { label: 'Yayınlama', status: 'pending' }
            ]}
        ]
    }
];

function buildCockpitColumn({ name, role, theme, datasets }) {
    let doneTasks = 0;
    let totalTasks = 0;
    datasets.forEach(ds => {
        ds.tasks.forEach(t => {
            totalTasks++;
            if (t.status === 'done') doneTasks++;
        });
    });
    const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const allDone = doneTasks === totalTasks;
    const hasRunning = datasets.some(ds => ds.tasks.some(t => t.status === 'running'));
    const colStatus = allDone ? 'done' : hasRunning ? 'running' : 'waiting';

    const datasetHtml = datasets.map(ds => {
        const dsDone = ds.tasks.every(t => t.status === 'done');
        const dsRunning = ds.tasks.some(t => t.status === 'running');
        const dsStatus = dsDone ? 'done' : dsRunning ? 'running' : 'waiting';
        const tasksHtml = ds.tasks.map(t => `
            <div class="flow-step ${t.status}">
                <span class="flow-icon">${t.status === 'done' ? '✓' : t.status === 'running' ? '◉' : t.status === 'failed' ? '✕' : '○'}</span>
                <span class="flow-label">${t.label}</span>
            </div>`).join('');
        return `
            <article class="dataset-card ${dsStatus}">
                <div class="dataset-head">
                    <strong>${ds.label}</strong>
                    <code>${ds.name}</code>
                </div>
                <div class="task-flow">${tasksHtml}</div>
            </article>`;
    }).join('');

    return `
        <div class="cockpit-col theme-${theme} status-${colStatus}">
            <header class="col-header">
                <div class="col-title">
                    <i class="ti ti-database"></i>
                    <div>
                        <h4>${name}</h4>
                        <span>${role}</span>
                    </div>
                </div>
                <div class="col-meta">
                    <span class="col-pct">${pct}%</span>
                    <span class="col-status-badge">${allDone ? 'Tamam' : hasRunning ? 'Aktif' : 'Bekliyor'}</span>
                </div>
            </header>
            <div class="col-stats">
                <span><strong>${datasets.length}</strong> dataset</span>
                <span><strong>${doneTasks}/${totalTasks}</strong> task</span>
            </div>
            <div class="dataset-list">${datasetHtml}</div>
        </div>`;
}

function buildSurecHTML() {
    const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const columns = COCKPIT_COLUMNS.map(buildCockpitColumn).join('');
    return `<section class="cockpit">
        <div class="cockpit-head">
            <div>
                <h3>Süreç Kokpiti</h3>
                <p>Dataset ve task akışlarının canlı durumu</p>
            </div>
            <div class="cockpit-live">
                <span class="live-dot"></span>
                <span>Canlı</span>
                <time id="cockpitClock">${now}</time>
            </div>
        </div>
        <div class="cockpit-grid">${columns}</div>
    </section>`;
}

function bindSurecCockpit() {
    const clock = document.getElementById('cockpitClock');
    if (!clock) return;
    if (window._cockpitTimer) clearInterval(window._cockpitTimer);
    window._cockpitTimer = setInterval(() => {
        clock.textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }, 1000);
}

function initSurecCockpit(container) {
    const el = container || document.getElementById('pageBody');
    if (!el) return;
    el.innerHTML = buildSurecHTML();
    bindSurecCockpit();
}
