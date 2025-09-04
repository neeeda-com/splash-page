/*
=============================================================================
 Module: radial-box.js
 Purpose: Encapsulate radial action ring sizing logic independently from the
          layout mixin. Provides initialization + responsive interpolation of
          center/button sizes driven by viewport width.
 Features:
   - Lazy init via initRadialBox() so tests without a [data-radial] element
     do not fail.
   - updateRadialScale() interpolates between mobile & desktop baselines and
     writes CSS custom properties consumed by styles (_radial.css).
   - Idempotent: skips DOM writes if interpolation ratio unchanged.
 Implementation Notes:
   - Stored config mirrors previous inlined values (MIN_W/MAX_W/EASE_EXP kept
     for potential future easing adjustments; currently linear).
   - Kept BOOST for optional multiplicative tuning (defaults to 1.0).

=============================================================================
*/

export class RadialBox {
  /** Interpolate radial sizes based on viewport width and update CSS vars. */
  updateRadialScale() {
    if (!this.radialEl) return;

    const { MIN_W, MAX_W, BOOST, LOW_W } = this.scaleConfig;
    const w = window.innerWidth || 1;
    const ratioRaw = (w - MIN_W) / (MAX_W - MIN_W);
    const r = Math.max(0, Math.min(1, ratioRaw));

    if (Math.abs(r - this.lastScaleRatio) < 0.001) return; // skip redundant

    this.lastScaleRatio = r;

  const minCfg = this.originalMinSizes;
    const maxCfg = this.originalSizes;
    const lerp = (a, b, t) => a + (b - a) * t;
  // Make BOOST ramp from 1.0 at LOW_W up to full BOOST at MIN_W (or higher)
  const boostT = Math.max(0, Math.min(1, (w - LOW_W) / Math.max(1, MIN_W - LOW_W)));
  const effBOOST = 1 + (BOOST - 1) * boostT;
  const centerSize = Math.min(maxCfg.center, lerp(minCfg.center, maxCfg.center, r) * effBOOST);

    this.radialEl.style.setProperty('--center-base', `${centerSize}px`);

    maxCfg.buttons.forEach((maxVal, idx) => {
      const minVal = minCfg.buttons[idx] ?? maxVal;
      const v = Math.min(maxVal, lerp(minVal, maxVal, r) * effBOOST);

      this.radialEl.style.setProperty(`--btn-size-${idx}-base`, `${v}px`);
    });

    const halfC = centerSize / 2;
    let maxRadius = halfC;

    maxCfg.buttons.forEach((maxVal, idx) => {
      const minVal = minCfg.buttons[idx] ?? maxVal;
      const v = Math.min(maxVal, lerp(minVal, maxVal, r) * effBOOST);
      const outer = halfC + v;

      if (outer > maxRadius) maxRadius = outer;
    });

    const diameter = Math.ceil(maxRadius * 2 + 8);

    this.radialEl.style.setProperty('--radial-box', `${diameter}px`);
  }

  /** Compute geometry (radii, angles, x/y) from current sizes and write per-button vars. */
  updateGeometry() {
    if (!this.radialEl) return;

    // Elements
    const centerBtn = this.radialEl.querySelector("[data-btn][data-role='center']");
    if (!centerBtn) return;

    const iconOrder = ['mail', 'facebook', 'instagram', 'youtube', 'linked-in', 'color-scheme-dark'];

    const btnEls = iconOrder.map((icon) => this.radialEl.querySelector(`[data-btn][data-icon='${icon}']`));
    if (btnEls.some((el) => !el)) return; // guard until DOM is ready

    const rs = getComputedStyle(this.radialEl);
    // Read config variables with safe fallbacks
    const eps = parseFloat(rs.getPropertyValue('--eps')) || 0.000001;
    const kissPx = parseFloat(rs.getPropertyValue('--kiss')) || 0.5; // px
    const a0Decl = rs.getPropertyValue('--a0').trim();
    const a0Deg = a0Decl ? parseFloat(a0Decl) : 175;

    // Current sizes from computed layout (these reflect CSS transitions on @property)
    const centerSize = parseFloat(getComputedStyle(centerBtn).width) || 0;
    const btnSizes = btnEls.map((el) => parseFloat(getComputedStyle(el).width) || 0);

    // Geometry
    const cr = centerSize / 2;
    const b = btnSizes.map((s) => s / 2);
    const R = b.map((bi) => Math.max(0, cr + bi - kissPx));

    // neighbor distances to maintain "kiss"
    const D = b.slice(0, -1).map((bi, i) => Math.max(0, bi + b[i + 1] - kissPx));

    // Δ angles via law of cosines, numerically stable with clamping
    const deltas = D.map((d, i) => {
      const r1 = Math.max(eps, R[i]);
      const r2 = Math.max(eps, R[i + 1]);
      const num = r1 * r1 + r2 * r2 - d * d;
      const den = Math.max(eps, 2 * r1 * r2);
      const c = Math.min(1, Math.max(-1, num / den));
      return Math.acos(c); // radians
    });

    // Accumulate absolute angles
    const aRad = new Array(6);
    aRad[0] = (a0Deg * Math.PI) / 180;
    for (let i = 1; i < 6; i++) aRad[i] = aRad[i - 1] + (deltas[i - 1] || 0);
    const aDeg = aRad.map((ar) => (ar * 180) / Math.PI);

    // Expose container-level variables too (preserve original variable names)
    for (let i = 0; i < 6; i++) {
      this.radialEl.style.setProperty(`--R${i}`, `${R[i]}px`);
      this.radialEl.style.setProperty(`--a${i}`, `${aDeg[i]}deg`);
    }

    // Write per-button variables used by CSS transforms
    // Center
    centerBtn.style.setProperty('--size', `var(--center-size)`);
    centerBtn.style.setProperty('--radius', `0px`);
    centerBtn.style.setProperty('--angle', `${a0Deg}deg`);
    centerBtn.style.setProperty('--x', `0px`);
    centerBtn.style.setProperty('--y', `0px`);

    // Satellites
    btnEls.forEach((el, i) => {
      const x = Math.round(Math.cos(aRad[i]) * R[i]);
      const y = Math.round(Math.sin(aRad[i]) * R[i]);
      // Keep size animating via CSS by referencing container vars
      el.style.setProperty('--size', `var(--btn-size-${i})`);
      el.style.setProperty('--radius', `${R[i]}px`);
      el.style.setProperty('--angle', `${aDeg[i]}deg`);
      el.style.setProperty('--x', `${x}px`);
      el.style.setProperty('--y', `${y}px`);
    });
  }

  /** Start a lightweight rAF loop to follow CSS transitions/hover changes. */
  startGeometryLoop() {
    if (this._raf) return;
    const step = () => {
      this.updateGeometry();
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  initRadialBox() {
    if (this.__radialBoxInitialized) return;

    // Feature-detect CSS trigonometric functions (cos,sin,round,acos).
    // If available, expose the radial UI by adding .supports-trig to <html>.
    try {
      // Always enable radial UI now that JS computes geometry
      if (globalThis?.document?.documentElement) {
        document.documentElement.classList.add('supports-trig');
      }
    } catch {}

    this.radialEl = document.querySelector('[data-radial]');
    this.originalSizes = { center: 288, buttons: [96, 144, 216, 144, 216, 96] };
    this.originalMinSizes = { center: 112, buttons: [30, 54, 94, 54, 94, 30] };
    this.lastScaleRatio = -1;

    this.scaleConfig = {
      LOW_W: 320,
      MIN_W: 480,
      MAX_W: 1920,
      EASE_EXP: 1,
      BOOST: 1.3,
    };

    this.updateRadialScale();
    this.updateGeometry();
    this.startGeometryLoop();

    window.addEventListener('resize', () => {
      this.updateRadialScale();
      // Geometry follows via rAF loop, but update once immediately too
      this.updateGeometry();
    });

    // React to orientation changes on mobile. Run update after two frames to
    // allow the browser to stabilise layout and viewport metrics.
    window.addEventListener('orientationchange', () => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          this.updateRadialScale();
          this.updateGeometry();
        })
      );
    });

    // visualViewport can change on mobile when browser chrome or keyboard
    // appears; prefer it when available for accurate sizing.
    if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function') {
      window.visualViewport.addEventListener('resize', () => {
        this.updateRadialScale();
        this.updateGeometry();
      });
    }

    this.__radialBoxInitialized = true;
  }

  constructor() {
    this.initRadialBox();
  }
}

// Auto-instantiate only in browser runtime (skip when running unit tests)
if (!import.meta?.vitest) {
  new RadialBox();
}
