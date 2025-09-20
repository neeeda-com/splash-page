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

    const { MIN_W } = this.scaleConfig;
    const w = window.innerWidth || 1;
    // Reach full (max) sizes by DESKTOP_W to avoid a jump at 992px
    const DESKTOP_W = 992;
    const ratioRaw = (w - MIN_W) / (DESKTOP_W - MIN_W);
    const r = Math.max(0, Math.min(1, ratioRaw));

    // Desktop target and gate
    const isDesktop = w >= DESKTOP_W;
    // New fitScale spec (2025-09):
    // - 1.00 at 320px and below
    // - Smooth ramp 320→375 to 1.20
    // - Clamp 1.20 from 375px up to 767px
    // - Return to 1.00 from 768px and above (tablet / desktop)
    let fitScale;

    if (w >= 768) {
      // Height-aware scaling (desktop/tablet). Spec: if viewport height <900 shrink down to 0.7.
      // We choose 600px as lower clamp (feel free to adjust) => linear 0.7..1 in [600,900].
      const vh = window.innerHeight || 0;
      const H_MIN = 600; // lower reference (produces 0.7)
      const H_MAX = 960; // upper reference (produces 1.0)
      if (vh >= H_MAX) {
        fitScale = 1;
      } else if (vh <= H_MIN) {
        fitScale = 0.6;
      } else {
        const tH = (vh - H_MIN) / (H_MAX - H_MIN);
        fitScale = 0.6 + 0.4 * tH;
      }
    } else if (w >= 375) {
      // Plateau region (375px ≤ w < 768px): 1.2 only in portrait, shrink to 0.8 in landscape
      const isPortrait =
        window.matchMedia?.('(orientation: portrait)')?.matches ?? window.innerHeight >= window.innerWidth;
      fitScale = isPortrait ? 1.2 : 0.8;
    } else if (w <= 320) {
      fitScale = 0.9;
    } else {
      // 320 < w < 375 interpolate
      const t = (w - 320) / (375 - 320);
      fitScale = 1 + t * 0.2; // 1 → 1.2
    }

    // Skip redundant only if interpolation, desktop state AND fitScale unchanged
    if (
      Math.abs(r - this.lastScaleRatio) < 0.001 &&
      this.lastIsDesktop === isDesktop &&
      Math.abs((this.lastFitScale ?? -1) - fitScale) < 0.0001
    ) {
      return;
    }

    this.lastScaleRatio = r;
    this.lastIsDesktop = isDesktop;
    this.lastFitScale = fitScale;

    const minCfg = this.originalMinSizes;
    const maxCfg = this.originalSizes;
    const lerp = (a, b, t) => a + (b - a) * t;
    // BOOST ramp not used in the new spec; interpolation is linear between min and max
    // Prepare base sizes (desktop=max, mobile=min, tablet=interpolated)
    let centerBase;
    let btnBases;

    // Helper to compute diameter from sizes (to far edge)
    const computeDiameter = (cSize, bSizes) => {
      const cr = cSize / 2;
      const maxOuter = bSizes.reduce((acc, s) => Math.max(acc, cr + s - 0.5), cr);
      return Math.ceil(maxOuter * 2 + 8);
    };

    // (fitScale already computed above per spec)
    let boxW;
    let boxH;

    // Precompute desktop reference diameter from design sizes
    const desktopDiameter = computeDiameter(maxCfg.center, maxCfg.buttons);

    if (isDesktop) {
      // Desktop: exact design sizes and fixed 615x495 container
      centerBase = maxCfg.center; // 288
      btnBases = [...maxCfg.buttons];
      boxW = 615;
      boxH = 495;
    } else if (w <= MIN_W) {
      // Mobile: exact min sizes (no interpolation), proportional box to desktop
      centerBase = minCfg.center; // 112
      btnBases = [...minCfg.buttons];
      const currentDiameter = computeDiameter(centerBase, btnBases);
      const k = currentDiameter / Math.max(1, desktopDiameter);
      boxW = Math.round(615 * k);
      boxH = Math.round(495 * k);
    } else {
      // Tablet: interpolate between min and max, proportional box
      centerBase = lerp(minCfg.center, maxCfg.center, r);
      btnBases = maxCfg.buttons.map((maxVal, idx) => lerp(minCfg.buttons[idx] ?? maxVal, maxVal, r));
      const currentDiameter = computeDiameter(centerBase, btnBases);
      const k = currentDiameter / Math.max(1, desktopDiameter);
      boxW = Math.round(615 * k);
      boxH = Math.round(495 * k);
    }

    // Write base sizes and global fit scale
    this.radialEl.style.setProperty('--center-base', `${centerBase}px`);
    btnBases.forEach((v, idx) => {
      this.radialEl.style.setProperty(`--btn-size-${idx}-base`, `${v}px`);
    });
    this.radialEl.style.setProperty('--fit-scale', `${fitScale}`);

    // Set rectangular box dimensions (new vars only)
    this.radialEl.style.setProperty('--radial-box-w', `${boxW}px`);
    this.radialEl.style.setProperty('--radial-box-h', `${boxH}px`);
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
    // Maintain bottom alignment of center by updating origin each frame
    const rs2 = getComputedStyle(this.radialEl);
    const boxH = parseFloat(rs2.getPropertyValue('--radial-box-h')) || parseFloat(rs2.height) || 0;
    const yOrigin = Math.max(0, boxH / 2 - centerSize / 2);
    this.radialEl.style.setProperty('--y-origin', `${yOrigin}px`);
    // x-origin left at 0 by default; can be adjusted externally or via future logic

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
    // Center (top-left positioning: x/y represent top-left offsets)
    centerBtn.style.setProperty('--size', `var(--center-size)`);
    centerBtn.style.setProperty('--radius', `0px`);
    centerBtn.style.setProperty('--angle', `${a0Deg}deg`);
    centerBtn.style.setProperty('--x', `${-centerSize / 2}px`);
    centerBtn.style.setProperty('--y', `${-centerSize / 2}px`);

    // Satellites
    btnEls.forEach((el, i) => {
      const xC = Math.round(Math.cos(aRad[i]) * R[i]);
      const yC = Math.round(Math.sin(aRad[i]) * R[i]);
      const s = btnSizes[i] || 0;
      const x = xC - s / 2;
      const y = yC - s / 2;

      // Keep size animating via CSS by referencing container vars
      el.style.setProperty('--size', `var(--btn-size-${i})`);
      el.style.setProperty('--radius', `${R[i]}px`);
      el.style.setProperty('--angle', `${aDeg[i]}deg`);
      el.style.setProperty('--x', `${x}px`);
      el.style.setProperty('--y', `${y}px`);
    });

    // Compute horizontal extents to center the whole ring within the radial-box
    let minX = -centerSize / 2;
    let maxX = -centerSize / 2 + centerSize;
    for (let i = 0; i < btnSizes.length; i++) {
      const xC = Math.cos(aRad[i]) * R[i];
      const s = btnSizes[i] || 0;
      const xL = xC - s / 2;
      const xR = xL + s;
      if (xL < minX) minX = xL;
      if (xR > maxX) maxX = xR;
    }

    // --- Dynamic radial box sizing (spec: bounding rect between given edges) ---
    this.updateBoundingBox?.(aRad, R, btnSizes, centerSize);
  }

  /** Compute bounding box of ring per spec and update CSS vars. */
  updateBoundingBox(aRad, R, btnSizes, centerSize) {
    // Apply only for viewports below 768px as requested.
    if (window.innerWidth >= 768) return;
    try {
      // Indices aligned with iconOrder: ['mail', 'facebook', 'instagram', 'youtube', 'linked-in', 'color-scheme-dark']
      const idxFacebook = 1; // spec: left edge (facebook)
      const idxInstagram = 2; // spec: top edge (instagram)
      const idxLinkedIn = 4; // spec: right edge (linked-in)
      const fbSize = btnSizes[idxFacebook];
      const igSize = btnSizes[idxInstagram];
      const liSize = btnSizes[idxLinkedIn];
      if (!(fbSize && igSize && liSize && centerSize)) return;

      const fb_xC = Math.cos(aRad[idxFacebook]) * R[idxFacebook];
      const li_xC = Math.cos(aRad[idxLinkedIn]) * R[idxLinkedIn];
      const ig_yC = Math.sin(aRad[idxInstagram]) * R[idxInstagram];

      const left = fb_xC - fbSize / 2;
      const right = li_xC + liSize / 2;
      const top = ig_yC - igSize / 2;
      const bottom = centerSize / 2; // center button bottom (origin at center)

      const boxW = right - left;
      const boxH = bottom - top;
      if (boxW <= 0 || boxH <= 0 || !Number.isFinite(boxW) || !Number.isFinite(boxH)) return;

      const wPx = Math.round(boxW);
      const hPx = Math.round(boxH);
      const prevW = this.radialEl.style.getPropertyValue('--radial-box-w');
      const prevH = this.radialEl.style.getPropertyValue('--radial-box-h');
      if (prevW !== `${wPx}px`) this.radialEl.style.setProperty('--radial-box-w', `${wPx}px`);
      if (prevH !== `${hPx}px`) this.radialEl.style.setProperty('--radial-box-h', `${hPx}px`);
    } catch {
      /* swallow */
    }
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
    this.originalMinSizes = { center: 146, buttons: [42, 64, 106, 64, 106, 42] };
    this.lastScaleRatio = -1;

    this.scaleConfig = {
      MIN_W: 480,
      MAX_W: 1920,
      EASE_EXP: 2,
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
