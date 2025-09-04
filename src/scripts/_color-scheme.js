// Color scheme controller: cycles system -> light -> dark, syncs meta and localStorage
// Converted to a class so it can be instantiated or imported from tests.

export class ColorSchemeController {
  constructor() {
    this.META_NAME = 'color-scheme';
    this.LS_KEY = 'color-scheme';
    this.ORDER = ['light dark', 'light', 'dark']; // system, light, dark

    // start the controller on construction to preserve previous behaviour
    this.init();
  }

  getMeta() {
    let m = document.querySelector(`meta[name="${this.META_NAME}"]`);

    if (!m) {
      m = document.createElement('meta');
      m.setAttribute('name', this.META_NAME);
      m.setAttribute('content', 'light dark');
      document.head.appendChild(m);
    }

    return m;
  }

  setMetaContent(value) {
    const m = this.getMeta();

    m.setAttribute('content', value);
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
    const i = this.currentIndex(value);

    return this.ORDER[(i + 1) % this.ORDER.length];
  }

  valueToIconClass(value) {
    if (value === 'light') return 'neeeda-icon-color-scheme-light';
    if (value === 'dark') return 'neeeda-icon-color-scheme-dark';

    return 'neeeda-icon-color-scheme-system'; // 'light dark' => system
  }

  applyIcon(btn, value) {
    const i = btn?.querySelector('i');

    if (!i) return;

    i.classList.remove(
      'neeeda-icon-color-scheme-system',
      'neeeda-icon-color-scheme-light',
      'neeeda-icon-color-scheme-dark'
    );

    i.classList.add(this.valueToIconClass(value));
  }

  init() {
    const meta = this.getMeta();

    // Init synchronization between meta and localStorage
    const stored = this.readStored();
    const initial = stored || meta.getAttribute('content') || 'light dark';

    this.setMetaContent(initial);
    this.writeStored(initial);

    // Apply initial icon if button exists
    const btn = document.querySelector('button[data-icon="color-scheme-dark"], button[data-icon^="color-scheme"]');

    if (btn) this.applyIcon(btn, initial);

    // Click cycles value: system -> light -> dark -> system
    btn?.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent opening countdown modal
      const current = meta.getAttribute('content') || 'light dark';
      const next = this.nextValue(current);

      this.setMetaContent(next);
      this.writeStored(next);
      this.applyIcon(btn, next);
    });
  }
}

// default runtime instance to preserve previous page behaviour
const colorSchemeController = new ColorSchemeController();

export default colorSchemeController;
