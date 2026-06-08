function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeSelectionUI(theme);
}

function updateThemeSelectionUI(theme) {
    document.querySelectorAll('[data-theme-switch]').forEach(sw => {
        const isDark = theme === 'dark';
        sw.classList.toggle('is-dark', isDark);
        sw.classList.toggle('is-light', !isDark);
        sw.setAttribute('aria-checked', isDark ? 'true' : 'false');
        sw.setAttribute('aria-label', isDark ? 'Koyu tema' : 'Açık tema');

        const knobIcon = sw.querySelector('.theme-switch-knob-icon');
        if (knobIcon) {
            knobIcon.className = `ti ${isDark ? 'ti-moon' : 'ti-sun'} theme-switch-knob-icon`;
        }
    });

    document.querySelectorAll('[data-theme-option]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.themeOption === theme);
    });
}

function initThemeSwitch() {
    if (initThemeSwitch._bound) return;
    initThemeSwitch._bound = true;

    document.querySelectorAll('[data-theme-switch]').forEach(sw => {
        sw.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            applyTheme(current === 'dark' ? 'light' : 'dark');
        });
    });
}

function initThemeMenu() {
    const savedTheme = document.documentElement.getAttribute('data-theme')
        || localStorage.getItem('theme')
        || 'dark';
    applyTheme(savedTheme);
    initThemeSwitch();
}

function initThemeToggle() {
    initThemeMenu();
}

window.applyTheme = applyTheme;
window.initThemeMenu = initThemeMenu;
window.initThemeToggle = initThemeToggle;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeToggle);
} else {
    initThemeToggle();
}
