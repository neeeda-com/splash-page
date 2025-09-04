/*
=============================================================================
 Module: _trail.js
 Purpose: Maintain the two line segments (trailA, trailB) and their associated
          gradient endpoints so the visual connectors between groups remain
          accurate while dragging, animating or resizing.
 Details:
   - updateTrail() converts each invisible handle's bottom-center point into
     SVG coordinates so stroke thickness does not distort anchor logic.
   - anchorTargetsPx() returns desired on-screen center positions for each
     group given the current breakpoint (mobile: horizontal layout).
  - SAFE_AREA_PADDING margins (desktop/mobile) are applied here for target
    computation; on mobile we intentionally collapse margins for a tighter spread.
=============================================================================
*/
import { SAFE_AREA_PADDING } from './_constants.js';

export function installTrail(cls) {
  Object.assign(cls.prototype, {
    updateTrail() {
      const anchorFromHandle = (handle) => {
        const r = handle.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const halfStroke = this.halfStrokePx();
        const by = r.bottom - halfStroke;
        const p = this.screenToSvg(cx, by);

        return { x: p.x, y: p.y };
      };

      const a = anchorFromHandle(this.groups[0].handle);
      const b = anchorFromHandle(this.groups[1].handle);
      const c = anchorFromHandle(this.groups[2].handle);

      this.trailA.setAttribute('d', `M ${a.x} ${a.y} L ${b.x} ${b.y}`);
      this.trailB.setAttribute('d', `M ${b.x} ${b.y} L ${c.x} ${c.y}`);

      this.gradientA.setAttribute('x1', a.x);
      this.gradientA.setAttribute('y1', a.y);
      this.gradientA.setAttribute('x2', b.x);
      this.gradientA.setAttribute('y2', b.y);
      this.gradientB.setAttribute('x1', b.x);
      this.gradientB.setAttribute('y1', b.y);
      this.gradientB.setAttribute('x2', c.x);
      this.gradientB.setAttribute('y2', c.y);
    },
    anchorTargetsPx() {
      const r = this.svgRect();

      if (this.isMobile()) {
        // Mobile horizontal layout
        const g1 = this.groups[0].node.getBoundingClientRect();
        const g2 = this.groups[1].node.getBoundingClientRect();
        const g3 = this.groups[2].node.getBoundingClientRect();

        const v1 = [r.left + g1.width / 2 + SAFE_AREA_PADDING.mobile, r.top + g1.height / 2 + SAFE_AREA_PADDING.mobile];
        const v2 = [r.left + r.width / 2, r.top + g2.height / 2 + SAFE_AREA_PADDING.mobile];
        const v3 = [r.right - g3.width / 2 - SAFE_AREA_PADDING.mobile, r.top + g3.height / 2 + SAFE_AREA_PADDING.mobile];

        return { v1, v2, v3 };
      }

      const targetFor = (group, corner) => {
        const gr = group.getBoundingClientRect();
        const hw = gr.width / 2;
        const hh = gr.height / 2;

        const pad = SAFE_AREA_PADDING.desktop;

        return corner === 'bl'
          ? [r.left + pad + hw, r.bottom - pad - hh]
          : corner === 'tr'
            ? [r.right - pad - hw, r.top + pad + hh]
            : [r.right - pad - hw, r.bottom - pad - hh];
      };

      return {
        v1: targetFor(this.groups[0].node, 'bl'),
        v2: targetFor(this.groups[1].node, 'br'),
        v3: targetFor(this.groups[2].node, 'tr'),
      };
    },
  });
}
