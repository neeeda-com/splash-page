// Mixin: svg background sync for InteractiveNeeedaLogo
// Adds instance methods to attach/detach a small helper that keeps the
// #svg-bg rect in sync with the SVG viewBox (width/height).
export function installCoverBg(cls) {
  Object.assign(cls.prototype, {
    attachCoverBg() {
      // detach any previous
      this.detachCoverBg && this.detachCoverBg();

      const svg = this.svg || document.querySelector('svg[aria-label="neeeda interactive logo"]');

      if (!svg) return null;

      const rect = svg.querySelector('#cover-bg');

      if (!rect) return null;

      const apply = () => {
        const vb = svg.getAttribute('viewBox') || '';

        const parts = vb
          .split(/\s+|,/)
          .map((v) => parseFloat(v))
          .filter((n) => !Number.isNaN(n));

        if (parts.length >= 4) {
          const [, , w, h] = parts;

          rect.setAttribute('width', String(w));
          rect.setAttribute('height', String(h));
        }
      };

      apply();

      const onResize = () => apply();
      window.addEventListener('resize', onResize);

      this._coverBgHandle = {
        disconnect() {
          window.removeEventListener('resize', onResize);
        },
      };

      return this._coverBgHandle;
    },

    detachCoverBg() {
      if (this._coverBgHandle && typeof this._coverBgHandle.disconnect === 'function') {
        this._coverBgHandle.disconnect();
        this._coverBgHandle = null;
      }
    },
  });
}
