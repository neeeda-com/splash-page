/**
 * =============================================================================
 * Neeeda Splash Page · Module: animation
 * =============================================================================
 * Lightweight helpers (no external deps) for translate-only animations:
 *  • Parse/apply translate(x,y)
 *  • power2 / power3 inOut easing
 *  • Promise-based (rAF) tween + robust WeakMap store
 *
 * Technical notes:
 *  • Preserves existing scale() (compact-mode friendly)
 *  • WeakMap avoids losing state if browser reformats style.transform
 *  • Test-friendly: no hidden global side-effects
 * =============================================================================
 * @ts-check
 */

// Internal cache: persiste l'ultimo translate anche se il browser riformatta style.transform
const __translateStore = new WeakMap();

/**
 * Parse the element's CSS translate(x, y) and return coordinates in px.
 * Uses an internal store for robustness across browsers/SVG.
 * @param {HTMLElement} el
 * @returns {{x:number,y:number}}
 */
export function getTranslate(el) {
  const cached = __translateStore.get(el);

  if (cached) return cached;

  const t = el.style.transform || '';

  const m =
    /translate\(([-0-9.]+)px\s*,\s*([-0-9.]+)px\)/.exec(t) ||
    /translate3d\(([-0-9.]+)px\s*,\s*([-0-9.]+)px\s*,\s*[-0-9.]+px\)/.exec(t);

  const res = m ? { x: parseFloat(m[1]) || 0, y: parseFloat(m[2]) || 0 } : { x: 0, y: 0 };

  __translateStore.set(el, res);

  return res;
}

/**
 * Set translate(x,y) (px) while preserving any existing scale().
 * @param {HTMLElement} el
 * @param {number} x
 * @param {number} y
 */
export function setTranslate(el, x, y) {
  // Preserva un eventuale scale(...) già presente per non perdere lo stato di logoCompact.
  const prev = el.style.transform || '';
  const sm = /scale\([^)]*\)/.exec(prev);
  const scalePart = sm ? ` ${sm[0]}` : '';

  el.style.transform = `translate(${x}px, ${y}px)${scalePart}`;
  __translateStore.set(el, { x, y });
}

/**
 * Increment element's current translate by dx, dy.
 * @param {HTMLElement} el
 * @param {number} dx
 * @param {number} dy
 */
export function incTranslate(el, dx, dy) {
  const { x, y } = getTranslate(el);

  setTranslate(el, x + dx, y + dy);
}

/** Easing functions (monotone, clamp t∈[0,1]) */
export const Easing = {
  power2InOut: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
  power3InOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
};

/** Mappa nome easing → funzione (fallback: identità) */
export function easingByName(name) {
  return name === 'power2.inOut' ? Easing.power2InOut : name === 'power3.inOut' ? Easing.power3InOut : (t) => t;
}

/**
 * Animate element translate by a delta using requestAnimationFrame.
 * @param {HTMLElement} el
 * @param {number} dx
 * @param {number} dy
 * @param {{duration?:number,ease?:string,onUpdate?:()=>void,onComplete?:()=>void}} [options]
 * @returns {Promise<void>}
 */
export function animateTranslate(el, dx, dy, { duration = 0.5, ease = 'power3.inOut', onUpdate, onComplete } = {}) {
  const start = performance.now();
  const { x: sx, y: sy } = getTranslate(el);
  const ez = easingByName(ease);

  return new Promise((resolve) => {
    const frame = (now) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const k = ez(t);

      setTranslate(el, sx + dx * k, sy + dy * k);
      onUpdate?.();

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        // snap
        setTranslate(el, sx + dx, sy + dy);
        onUpdate?.();
        onComplete?.();
        resolve();
      }
    };

    requestAnimationFrame(frame);
  });
}

/** Sleep async (ms). */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
