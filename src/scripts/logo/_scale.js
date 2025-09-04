/*
==============================================================================
 Module: _scale.js
 Role: Provides group scaling utilities preserving visual centers and the
        animated transition between scale 1 and 0.5.
 Exports: installScale(mixinTarget)
 Methods installed on prototype:
   - applyGroupScaleTransform()
   - animateGroupScaleTransform(targetScale, { duration, easing })
 Implementation notes:
   - Center-stability achieved by measuring boundingClientRect pre/post and
     compensating via translate delta.
   - Animation uses requestAnimationFrame and easing function (power3InOut by default).
==============================================================================
*/
import { Easing } from './_animation-engine.js';

export function installScale(cls) {
  Object.assign(cls.prototype, {
    /** Apply immediate scale (1 or 0.5) preserving each group's visual center. */
    applyGroupScaleTransform() {
      const newScale = this.logoCompact ? 0.5 : 1;

      if (this.currentGroupScale === newScale) return; // no-op

      for (const { node } of this.groups) this._applyImmediateScaleToNode(node, newScale);

      this.currentGroupScale = newScale;
    },
    _applyImmediateScaleToNode(node, newScale) {
      if (!node) return;

      const old = this._centerOfNode(node);
      const { tx, ty } = this._parseTranslate(node.style.transform);

      node.style.transform = `translate(${tx}px, ${ty}px) scale(${newScale})`;

      const neu = this._centerOfNode(node) || old;
      const dx = old.cx - neu.cx;
      const dy = old.cy - neu.cy;

      if (dx || dy) node.style.transform = `translate(${tx + dx}px, ${ty + dy}px) scale(${newScale})`;
    },
    _parseTranslate(style) {
      const m = /translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/.exec(style || '');

      return m ? { tx: parseFloat(m[1]) || 0, ty: parseFloat(m[2]) || 0 } : { tx: 0, ty: 0 };
    },
    _centerOfNode(node) {
      try {
        const r = node.getBoundingClientRect();

        return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      } catch {
        return { cx: 0, cy: 0 };
      }
    },
    /** Animate scale with center-preserving compensation each frame. */
    animateGroupScaleTransform(targetScale, { duration = 400, easing = Easing.power3InOut } = {}) {
      // if an animation is running, cancel it first so new requests always win
      if (this._scaleAnim && typeof this._scaleAnim.cancel === 'function') {
        this._scaleAnim.cancel();
      }

      const startScale = this.currentGroupScale;

      if (Math.abs(startScale - targetScale) < 0.0001) return Promise.resolve();

      const start = performance.now();

      const groupsMeta = this.groups.map(({ node }) => {
        if (!node) return null;

        const old = this._centerOfNode(node);
        const { tx, ty } = this._parseTranslate(node.style.transform);

        return { node, old, tx, ty };
      });

      let resolveFn = null;
      // ensure only the latest animation may set the final currentGroupScale

      if (typeof this._scaleAnimCounter !== 'number') this._scaleAnimCounter = 0;

      const token = ++this._scaleAnimCounter;
      const anim = { rafId: null, cancelled: false, token };

      let settled = false;

      const promise = new Promise((resolve) => {
        resolveFn = resolve;

        const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

        const step = (now) => {
          if (anim.cancelled) {
            // ensure promise resolves for the cancelled animation and stop here
            settled = true;
            resolve();

            return;
          }

          const t = clamp01((now - start) / duration);
          const s = startScale + (targetScale - startScale) * easing(t);

          for (const meta of groupsMeta) this._applyAnimatedScaleFrame(meta, s);

          if (t < 1) {
            anim.rafId = requestAnimationFrame(step);
            return;
          }

          if (!anim.cancelled && anim.token === this._scaleAnimCounter) {
            this.currentGroupScale = targetScale;
          }

          settled = true;
          resolve();
        };

        anim.rafId = requestAnimationFrame(step);
      });

      // store animation handle for cancellation
      this._scaleAnim = {
        id: anim.rafId,
        cancel: () => {
          if (settled) return;

          anim.cancelled = true;

          if (anim.rafId != null) cancelAnimationFrame(anim.rafId);

          // resolve the previous promise if not settled
          if (typeof resolveFn === 'function') resolveFn();

          this._scaleAnim = null;
        },
        promise,
      };
      return promise;
    },
    _applyAnimatedScaleFrame(meta, s) {
      if (!meta || !meta.node) return;

      const { node, tx, ty, old } = meta;

      node.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;

      const neu = this._centerOfNode(node);
      const dx = old.cx - neu.cx;
      const dy = old.cy - neu.cy;

      if (dx || dy) node.style.transform = `translate(${tx + dx}px, ${ty + dy}px) scale(${s})`;
    },
  });
}
