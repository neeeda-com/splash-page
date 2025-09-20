// Color scheme controller: toggles light <-> dark (no system), syncs meta and localStorage
// Converted to a class so it can be instantiated or imported from tests.

export class ColorSchemeController {
  constructor() {
    this.META_NAME = 'color-scheme';
    this.THEME_META_NAME = 'theme-color';
    this.STATUS_BAR_META_NAME = 'apple-mobile-web-app-status-bar-style';
    this.LS_KEY = 'color-scheme';
    this.ORDER = ['light', 'dark']; // toggle only

    // start the controller on construction to preserve previous behaviour
    this.init();
  }

  getMeta() {
    let m = document.querySelector(`meta[name="${this.META_NAME}"]`);

    if (!m) {
      document.head.insertAdjacentHTML('beforeend', `<meta name="${this.META_NAME}" content="dark">`);
      m = document.querySelector(`meta[name="${this.META_NAME}"]`);
    }

    return m;
  }

  setMetaContent(value) {
    this.getMeta().setAttribute('content', value);
  }

  getThemeMeta() {
    let m = document.querySelector(`meta[name="${this.THEME_META_NAME}"]`);

    if (!m) {
      document.head.insertAdjacentHTML('beforeend', `<meta name="${this.THEME_META_NAME}" content="#000">`);

      m = document.querySelector(`meta[name="${this.THEME_META_NAME}"]`);
    }

    return m;
  }

  getStatusBarMeta() {
    let m = document.querySelector(`meta[name="${this.STATUS_BAR_META_NAME}"]`);

    if (!m) {
      document.head.insertAdjacentHTML('beforeend', `<meta name="${this.STATUS_BAR_META_NAME}" content="black-translucent">`);
      m = document.querySelector(`meta[name="${this.STATUS_BAR_META_NAME}"]`);
    }

    return m;
  }

  setThemeColorByScheme(value) {
    this.getThemeMeta().setAttribute('content', value === 'light' ? '#fff' : '#000');
    // Sync iOS status bar style
    this.getStatusBarMeta().setAttribute('content', value === 'light' ? 'default' : 'black-translucent');
  }

  readStored() {
    try {
      return localStorage.getItem(this.LS_KEY);
    } catch {
      return null;
    }
  }

  writeStored(value) {
    try {
      localStorage.setItem(this.LS_KEY, value);
    } catch {}
  }

  currentIndex(value) {
    const idx = this.ORDER.indexOf(value);

    return idx >= 0 ? idx : 0;
  }

  nextValue(value) {
    return this.ORDER[(this.currentIndex(value) + 1) % this.ORDER.length];
  }

  valueToIconClass(value) {
    return value === 'light' ? 'neeeda-icon-color-scheme-light' : 'neeeda-icon-color-scheme-dark';
  }

  applyIcon(btn, value) {
    const i = btn?.querySelector('i');

    if (!i) return;

    i.classList.remove('neeeda-icon-color-scheme-light', 'neeeda-icon-color-scheme-dark');
    i.classList.add(this.valueToIconClass(value));
  }

  init() {
    const meta = this.getMeta();

    // Init: default to dark unless a preference exists in localStorage
    const stored = this.readStored();
    const initial = stored ?? 'dark';

    this.setMetaContent(initial);
    this.setThemeColorByScheme(initial);

    // Apply initial icon on any existing theme button(s)
    const applyInitialToAll = () => {
      document
        .querySelectorAll('button[data-icon="color-scheme-dark"], button[data-icon^="color-scheme"]')
        .forEach((b) => {
          this.applyIcon(b, initial);
        });
    };
    applyInitialToAll();

    // Delegate click: handle buttons added later too
    document.addEventListener(
      'click',
      (e) => {
        const target = e.target && /** @type {Element} */ (e.target).closest?.(
          'button[data-icon="color-scheme-dark"], button[data-icon^="color-scheme"]'
        );
        if (!target) return;
        e.stopPropagation(); // prevent opening countdown modal

        const current = meta.getAttribute('content') || 'dark';
        const next = this.nextValue(current);

        this.setMetaContent(next);
        this.setThemeColorByScheme(next);
        this.writeStored(next);
        this.applyIcon(target, next);
      },
      { capture: true }
    );

    // Observe DOM insertions to apply icon to buttons injected later
    try {
      const mo = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type !== 'childList') continue;
          m.addedNodes.forEach((n) => {
            if (!(n instanceof Element)) return;
            if (n.matches?.('button[data-icon="color-scheme-dark"], button[data-icon^="color-scheme"]')) {
              this.applyIcon(n, meta.getAttribute('content') || initial);
            }
            n.querySelectorAll?.(
              'button[data-icon="color-scheme-dark"], button[data-icon^="color-scheme"]'
            )?.forEach((b) => {
              this.applyIcon(b, meta.getAttribute('content') || initial);
            });
          });
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
      this._mo = mo;
    } catch {}
  }
}

// default runtime instance to preserve previous page behaviour
const colorSchemeController = new ColorSchemeController();

export default colorSchemeController;
