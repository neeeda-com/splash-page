/*
=============================================================================
 Module: _drag.js
 Purpose: Provide pointer/touch dragging capability for each logo group while
          enforcing viewport clamping and updating the trail in real time.
 Key Points:
   - Unified pointer & touch handling (touch events kept for broader support).
  - Clamping logic respects SAFE_AREA_PADDING margin on desktop while allowing flush
     edges on mobile to maximize usable space.
   - Translate values are mutated via animation helpers (preserve scale part).
   - Drag can be globally enabled/disabled (e.g., during preload / tweens).
=============================================================================
*/
import { getTranslate, setTranslate } from './_animation-engine.js';
import { SAFE_AREA_PADDING } from './_constants.js';

export function installDrag(cls) {
  Object.assign(cls.prototype, {
    clampGroupBox(groupNode) {
      const s = this.svgRect();
      const flush = this.isMobile();
      const margin = flush ? SAFE_AREA_PADDING.mobile : SAFE_AREA_PADDING.desktop;

      const bounds = {
        minLeft: s.left + margin,
        minTop: s.top + margin,
        maxRight: s.right - margin,
        maxBottom: s.bottom - margin,
      };

      const g = groupNode.getBoundingClientRect();
      const dx = this._clampDelta(g.left, g.right, bounds.minLeft, bounds.maxRight);
      const dy = this._clampDelta(g.top, g.bottom, bounds.minTop, bounds.maxBottom);

      if (dx || dy) {
        const t = getTranslate(groupNode);

        setTranslate(groupNode, t.x + dx, t.y + dy);
      }
    },
    /** Compute translation delta needed to bring a min/max inside limits. */
    _clampDelta(minEdge, maxEdge, minLimit, maxLimit) {
      let delta = 0;

      if (minEdge < minLimit) delta += minLimit - minEdge;
      if (maxEdge > maxLimit) delta += maxLimit - maxEdge;

      return delta;
    },
    setupDrag(groupNode) {
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let base = { x: 0, y: 0 };

      const onDown = (e) => {
        dragging = true;
        groupNode.setPointerCapture?.(e.pointerId);

        const t = e.touches?.[0];
        const cx = t ? t.clientX : e.clientX;
        const cy = t ? t.clientY : e.clientY;

        startX = cx;
        startY = cy;
        base = getTranslate(groupNode);

        this.clampGroupBox(groupNode);
        this.updateTrail();
      };
      const onMove = (e) => {
        if (!dragging) return;

        const t = e.touches?.[0];
        const cx = t ? t.clientX : e.clientX;
        const cy = t ? t.clientY : e.clientY;
        const dx = cx - startX;
        const dy = cy - startY;

        setTranslate(groupNode, base.x + dx, base.y + dy);
        this.clampGroupBox(groupNode);
        this.updateTrail();
      };

      const onUp = (e) => {
        dragging = false;
        groupNode.releasePointerCapture?.(e.pointerId);
        this.clampGroupBox(groupNode);
        this.updateTrail();
      };

      const enable = () => {
        groupNode.addEventListener('pointerdown', onDown, { passive: true });
        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('pointerup', onUp, { passive: true });
        groupNode.addEventListener('touchstart', onDown, { passive: true });
        window.addEventListener('touchmove', onMove, { passive: true });
        window.addEventListener('touchend', onUp, { passive: true });
      };

      const disable = () => {
        groupNode.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        groupNode.removeEventListener('touchstart', onDown);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onUp);
      };

      this.dragRegistry.set(groupNode, { enable, disable });
      enable();
    },
    setDragEnabled(on) {
      this.groups.forEach(({ node }) => {
        const reg = this.dragRegistry.get(node);
        reg && (on ? reg.enable() : reg.disable());
      });
    },
  });
}
