/*
=============================================================================
 Module: _geometry.js
 Purpose: Attach geometry / coordinate space helper methods onto the
          InteractiveNeeedaLogo prototype (installed via mixin pattern).
 Responsibilities:
   - Convert screen (client) coordinates to SVG coordinates using native APIs.
   - Provide convenience helpers for element centers and stroke width handling.
   - Detect responsive breakpoint (mobile vs desktop) without throwing when
     matchMedia is unavailable (e.g. test / SSR environments).
 Design Notes:
   - Methods are installed dynamically so they can access instance fields.
   - No caching: outputs depend on layout which can change after resize or
     animation; callers should cache locally if needed.
   - halfStrokePx respects non-scaling strokes by inspecting CTM + attribute.
=============================================================================
*/

export function installGeometry(cls) {
  Object.assign(cls.prototype, {
    /** Bounding client rect of the root SVG (used as viewport). */
    svgRect() {
      return this.svg.getBoundingClientRect();
    },
    /** Center (client coordinates) of any DOM element. */
    centerOf(el) {
      const r = el.getBoundingClientRect();

      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    /** Convert a client (screen) point into the SVG's internal coordinate space. */
    screenToSvg(x, y) {
      const p = this.svg.createSVGPoint();

      p.x = x;
      p.y = y;

      return p.matrixTransform(this.svg.getScreenCTM().inverse());
    },
    /** Center of an element returned already in SVG coordinates. */
    centerInSvg(el) {
      const c = this.centerOf(el);

      return this.screenToSvg(c.x, c.y);
    },
    /**
     * Half of the applied stroke width in (effective) screen pixels.
     * If vector-effect="non-scaling-stroke" is active, stroke does not scale
     * with transforms so we return the raw half width. Otherwise we measure
     * the current CTM scale components to approximate the scaled stroke.
     */
    halfStrokePx() {
      const sw = parseFloat(this.trailA?.getAttribute('stroke-width')) || 47;
      const ve = this.trailA.getAttribute('vector-effect') || '';

      if (ve.includes('non-scaling-stroke')) return sw / 2;

      const m = this.trailA.getCTM();

      if (!m) return sw / 2;

      const sx = Math.hypot(m.a, m.b);
      const sy = Math.hypot(m.c, m.d);

      return (sw * ((sx + sy) / 2)) / 2;
    },
    /** Simple breakpoint helper (mirrors CSS) tolerant to test envs. */
    isMobile() {
      try {
        return window.matchMedia('(max-width: 1199.98px)').matches;
      } catch {
        return window.innerWidth < 1200;
      }
    },
  });
}
