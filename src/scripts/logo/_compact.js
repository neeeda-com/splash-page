/*
==============================================================================
 Module: _compact.js
 Role: Provides compact mode toggle & trail stroke width application.
 Exports: installCompact(mixinTarget)
 Methods:
   - applyTrailStrokeWidth()
   - setLogoCompact(on, { animate = true }) → Promise
 Depends on: animateGroupScaleTransform / applyGroupScaleTransform from _scale.js
==============================================================================
*/
export function installCompact(cls) {
  Object.assign(cls.prototype, {
    /** Apply current logoCompact flag to both trail segments. */
    applyTrailStrokeWidth() {
      if (!this.trailA || !this.trailB) return;

      const sw = this.logoCompact ? this.MIN_TRAIL_SW : this.MAX_TRAIL_SW;

      this.trailA.setAttribute('stroke-width', String(sw));
      this.trailB.setAttribute('stroke-width', String(sw));
    },
    /** Toggle compact mode (trail thickness + group scale). */
    setLogoCompact(on, { animate = true } = {}) {
      this.logoCompact = !!on;

      this.applyTrailStrokeWidth();

      const targetScale = this.logoCompact ? 0.5 : 1;
      const shouldAnimate = animate && !this.prefersReducedMotion();

      if (shouldAnimate) {
        return this.animateGroupScaleTransform(targetScale).then(() => {
          this.updateTrail();
        });
      }

      this.applyGroupScaleTransform();
      this.updateTrail();

      return Promise.resolve();
    },
  });
}
