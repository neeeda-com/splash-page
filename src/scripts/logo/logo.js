/*
==============================================================================
 File: logo.js
 Role: Main controller (InteractiveNeeedaLogo) wiring mixins: geometry, trail,
  drag, layout and animation flow.
 Overview:
   - Boots the logo: responsive sizing, trail width, layout, base center snap,
     preloader sequence, then exposes optional drag interactions.
   - Handles compact mode scaling (1 ↔ 0.5) with center-stable logic and
     promises allowing layout sequencing after animations.
 Flow (init()):
   1. applyTrailStrokeWidth → reflect compact flag (24 vs 48)
   2. layout() → sync viewBox, center/scale logo, initial trail
   3. snapshot baseCenters (untranslated reference positions)
   4. runPreloader() (async) → wiggle → pose3 → pose4 → anchors → enable drag
   5. applyGroupScaleTransform() immediate (no flash) for compact mode
   6. attachResize() → rAF debounced, handles breakpoint transitions
 Notes:
   - Keep constructor side-effect free except for reading DOM.
   - Do not initiate animations until init() to let tests instantiate safely.
   - All motion is applied via CSS translate on the group nodes.
==============================================================================
*/
// @ts-check
import { Easing } from './_animation-engine.js';
import { installAnimationFlow } from './_animation-flow.js';
import { installCompact } from './_compact.js';
import { EPS, POSE3, POSE4, SAFE_AREA_PADDING, TO_POSE, WIGGLE } from './_constants.js';
import { installCoverBg } from './_cover-bg.js';
import { installDrag } from './_drag.js';
import { installGeometry } from './_geometry.js';
import { installLayout } from './_layout.js';
import { installScale } from './_scale.js';
import { installTrail } from './_trail.js';

export class InteractiveNeeedaLogo {
  constructor() {
    // DOM refs
    this.svg = document.querySelector('svg');
    this.logo = document.getElementById('neeeda-logo');
    this.trailA = document.getElementById('segA');
    this.trailB = document.getElementById('segB');
    this.gradientA = document.getElementById('gradA');
    this.gradientB = document.getElementById('gradB');

    // Trail thickness configuration (boolean toggle 24px <-> 48px)
    this.MIN_TRAIL_SW = 24; // thin
    this.MAX_TRAIL_SW = 48; // thick (default)

    // Compact mode determination: absent attribute => derive from breakpoint.
    const attr = document.body?.getAttribute('data-logo-compact');

    if (attr == null) {
      // isMobile mixin installed earlier via mixin chain.
      this.logoCompact = this.isMobile();
      document.body?.setAttribute('data-logo-compact', String(this.logoCompact));
    } else {
      this.logoCompact = attr === 'true';
    }

    this.groups = [
      {
        node: document.getElementById('v1'),
        handle: document.getElementById('handle-v1'),
        label: document.getElementById('label-v1'),
      },
      {
        node: document.getElementById('v2'),
        handle: document.getElementById('handle-v2'),
        label: document.getElementById('label-v2'),
      },
      {
        node: document.getElementById('v3'),
        handle: document.getElementById('handle-v3'),
        label: document.getElementById('label-v3'),
      },
    ];

    // Drag registry per group
    this.dragRegistry = new Map();

    // RAF state for resize
    this.resizeRaf = 0;

    // Base centers snapshot (in CSS px) captured before animations
    this.baseCenters = new Map();

    // Track current scale applied to groups (1 or 0.5). Avoid cumulative drift.
    this.currentGroupScale = 1;

    // Track current layout mode to detect breakpoint transitions, will be updated in init after geometry install
    this.currentLayoutMode = 'desktop';

    // Animate breakpoint transitions? (data-logo-breakpoint-animate) default false.
    this.animateBreakpointTransitions = false;
  }

  static Easing = Easing;

  /** Public entry: activate drag, layout, preload animation and resize. */
  init() {
    requestAnimationFrame(() => {
      // Initial trail stroke width (layout independent).
      this.applyTrailStrokeWidth();

      // Setup drag handlers (will be disabled until preloader completes if not opted in).
      this.groups.forEach(({ node }) => {
        this.setupDrag(node);
      });

      // Initial layout + capture base centers.
      this.layout();

      // Snapshot un-translated centers once layout is established.
      this.baseCenters.clear();

      this.groups.forEach(({ node }) => {
        this.baseCenters.set(node, this.centerOf(node));
      });

      // Defer preloader until after boot + fade classes to allow fade gating logic.

      // Apply initial scale (no animation) consistent with compact flag.
      this.applyGroupScaleTransform();

      // Attach svg background sync so the rect covers the whole viewBox
      this.attachCoverBg?.();

      // Boot flash fix: show only when ready (double rAF ensures style flush).
      requestAnimationFrame(() => {
        document.body.classList.add('booted');
        if (!document.body.classList.contains('logo-faded')) {
          document.body.classList.add('logo-fade-in-start');
        }
        // Start the preloader after fade-in class is in place.
        this.runPreloader();
      });

      // Resize behavior installed last.
      this.attachResize();
    });
  }
}

// Install mixins & re-export constants
installGeometry(InteractiveNeeedaLogo);
installTrail(InteractiveNeeedaLogo);
installDrag(InteractiveNeeedaLogo);
installLayout(InteractiveNeeedaLogo);
installAnimationFlow(InteractiveNeeedaLogo);
installScale(InteractiveNeeedaLogo);
installCompact(InteractiveNeeedaLogo);
installCoverBg(InteractiveNeeedaLogo);

Object.assign(InteractiveNeeedaLogo, { WIGGLE, POSE3, POSE4, TO_POSE, SAFE_AREA_PADDING, EPS });

// (Scale & compact mode methods now mixed in via _scale.js and _compact.js)

// Utility: system preference for reduced motion
InteractiveNeeedaLogo.prototype.prefersReducedMotion = function prefersReducedMotion() {
  try {
    return !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

// Bootstrap on load (skip in tests or when DOM not ready/element missing)
// Auto-bootstrap only in browser contexts (skips during tests / SSR)
if (globalThis?.document?.getElementById('neeeda-logo') && !import.meta?.vitest) {
  new InteractiveNeeedaLogo().init();
}
