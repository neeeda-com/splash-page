/*
=============================================================================
 Module: _constants.js
 Purpose: Central definition of timing presets, target poses and numeric
					constants shared by the InteractiveNeeedaLogo mixin modules.
 Rationale:
	 - Keeping these values in one place avoids circular imports between
		 behavior modules and makes tuning animation timings trivial.
	 - Constants are plain objects so tests can import & assert them directly.
 Guidelines:
	 - Only put serializable data here (no functions) to preserve tree-shaking.
	 - When adding a new timing preset prefer consistent key names: dur, ease,
		 hold (seconds) and domain‑specific deltas (e.g. dxV1, dxV3).
	 - See .github/copilot-instructions.md for authoring rules.
=============================================================================
*/

/** Wiggle micro-step before entering pose sequence. */
export const WIGGLE = { dxV1: -0.07, dxV3: +0.07, dur: 0.55, ease: 'power2.inOut', hold: 0.2 };

/** Third pose (percent targets inside the SVG bounding box). */
export const POSE3 = { v1: [0.32, 0.56], v2: [0.64, 0.24], v3: [0.64, 0.64] };

/** Fourth pose. */
export const POSE4 = { v1: [0.4, 0.32], v2: [0.4, 0.66], v3: [0.7, 0.32] };

/** Generic timing spec for pose transitions. */
export const TO_POSE = { dur: 0.85, ease: 'power3.inOut', hold: 0.15 };

/**
 * Safe area padding (px) split by breakpoint so callers can choose the
 * appropriate desktop/mobile value.
 */
export const SAFE_AREA_PADDING = { desktop: 24, mobile: 24 };

/** Epsilon for float comparisons (kept at 0: pixel snapping logic handles thresholds). */
export const EPS = 0;
