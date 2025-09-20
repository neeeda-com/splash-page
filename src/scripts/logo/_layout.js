/*
=============================================================================
 Module: _layout.js
 Purpose: Own responsibilities related to initial positioning, responsive
          scaling and reacting to window resize events (including automatic
          compact-mode toggling on breakpoint changes).
 Features:
   - ViewBox synchronization so 1 CSS pixel == 1 SVG unit (math-friendly).
   - Center & scale logo to desired visual height (placeLogoAtHeight).
   - Breakpoint detection triggers anchor reposition + optional scale change.
   - Compact mode toggle (scale 1 ↔ 0.5) is invoked here without animation
     on breakpoint transitions unless explicitly enabled.
 Implementation Notes:
   - Resize handler debounced with rAF to avoid layout thrash.
   - repositionGroupsToAnchors uses immediate translate deltas (no tween)
     for deterministic post-resize layout.
=============================================================================
*/
import { incTranslate } from './_animation-engine.js';

export function installLayout(cls) {
  Object.assign(cls.prototype, {
    repositionGroupsToAnchors() {
      const t = this.anchorTargetsPx();
      const keys = ['v1', 'v2', 'v3'];

      this.groups.forEach((g, idx) => {
        const [tx, ty] = t[keys[idx]];
        const c = this.centerOf(g.node);

        incTranslate(g.node, tx - c.x, ty - c.y);
        this.clampGroupBox(g.node);
      });

      this.updateTrail();
    },
    syncViewBoxToPixels() {
      const w = Math.max(1, Math.round(window.innerWidth));
      const h = Math.max(1, Math.round(window.innerHeight));

      this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      this.svg.setAttribute('preserveAspectRatio', 'none');
    },
    placeLogoAtHeight(heightPx = 64) {
      this.logo.removeAttribute('transform');

      const bb = this.logo.getBBox();
      const r = this.svgRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const p0 = this.screenToSvg(0, 0);
      const p1 = this.screenToSvg(0, heightPx);
      const scale = Math.abs(p1.y - p0.y) / bb.height;
      const c = this.screenToSvg(cx, cy);
      const tx = c.x - (bb.x * scale + (bb.width * scale) / 2);
      const ty = c.y - (bb.y * scale + (bb.height * scale) / 2);

      this.logo.setAttribute('transform', `translate(${tx} ${ty}) scale(${scale})`);
    },
    layout() {
      this.syncViewBoxToPixels();
      this.placeLogoAtHeight(64);
      this.applyTrailStrokeWidth();
      this.updateTrail();
    },
    attachResize() {
  // Reusable resize handler (debounced via rAF)
      const handleResize = () => {
        this.resizeRaf && cancelAnimationFrame(this.resizeRaf);

        this.resizeRaf = requestAnimationFrame(() => {
          this.syncViewBoxToPixels();

          const newLayoutMode = this.isMobile() ? 'mobile' : 'desktop';
          const crossed = this.currentLayoutMode !== newLayoutMode;

          if (crossed) {
            // Auto-toggle compact mode based on new breakpoint
            const wantCompact = newLayoutMode === 'mobile';

            const proceed = () => {
              if (this.animateBreakpointTransitions) {
                this.animateLayoutTransition(newLayoutMode);
              } else {
                this.repositionGroupsToAnchors();
              }
              this.currentLayoutMode = newLayoutMode;
            };

            if (wantCompact !== this.logoCompact) {
              // Apply immediate (non-animated) scale for coherent reposition
              this.setLogoCompact(wantCompact, { animate: false }).then(proceed);
            } else {
              proceed();
            }
          } else {
            this.repositionGroupsToAnchors();
          }
        });
      };

      // Standard resize
      window.addEventListener('resize', handleResize);

  // Orientation changes on mobile may happen before the layout is fully
  // settled; run the same handler but give the UA a couple frames to
  // stabilize so view sizes (and getBoundingClientRect) are reliable.
      window.addEventListener('orientationchange', () => {
  // Run after two frames to allow orientation/layout to stabilize
        requestAnimationFrame(() => requestAnimationFrame(handleResize));
      });

  // visualViewport resize is helpful on mobile when on-screen keyboard or
  // browser chrome changes size; prefer it when available.
      if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function') {
        window.visualViewport.addEventListener('resize', handleResize);
      }
    },
  });
}
