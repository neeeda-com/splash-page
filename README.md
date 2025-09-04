# neeeda-splash-page

Interactive splash page for Neeeda using Vite 7, Biome, Prettier, Vitest, and a tiny custom animation runtime (no GSAP). The radial icon layout is computed at runtime with CSS-only trigonometry (no JavaScript geometry).

## Quick start

- Dev server: pnpm dev
- Build: pnpm build (outputs to dist/)
- Preview build: pnpm preview
- Lint: pnpm lint
- Format: pnpm format (Biome + Prettier for html/css/json)
- Tests: pnpm test or pnpm test:watch

Notes
- Package manager is pnpm-only (see `.github/COPILOT_RULES.md`).
- After any code change, keep `pnpm dev` running for HMR.

## Architecture

- Vite 7: root in `src`, production output in `dist`.
- PostCSS: uses `postcss-combine-media-query` via `.postcssrc`.
- Biome 2 + Prettier 3: Biome for JS linting, Prettier for HTML/CSS/JSON.
- Vitest + happy-dom: unit tests for the animation runtime.
- JS config: `jsconfig.json` sets ESNext libs and alias `@/*` → `src/*`.

### Source layout

- `src/index.html` – page markup and SVG logo.
- `src/styles/index.css` – layout, theming, and dynamic radial geometry (CSS-only trig).
- `src/styles/neeeda-icons/` – local icon font CSS used by the radial buttons.
- `src/scripts/index.js` – `InteractiveNeeedaLogo` controller: drag, trail, preloader, resize.
- `src/scripts/animation.js` – minimal animation helpers: translate parsing, easing, rAF tween.
- `src/tests/*.test.js` – unit tests for interaction and animation helpers.

## CSS-only radial geometry

The positions of the six radial icons are derived with CSS custom properties and trigonometric functions. Everything updates live when variables change—no JS math.

Inputs (set on `.radial` or a parent)
- `--center` (px): diameter of the center button (e.g., 288).
- `--touch` (px): the tangency “kiss” between touching circles (usually `1px`).
- `--s0..--s5` (px): diameters of i:0..i:5 buttons.
- `--a0` (deg): base angle for i:0. Changing this rotates the entire chain.

Derived (computed by CSS)
- `bN = sN / 2`, `cr = center / 2`, `RN = cr + bN − touch`.
- Neighbor distances: `Dxy = b_x + b_y − touch`.
- Angle deltas by law of cosines: `Δxy = acos((R_x^2 + R_y^2 − Dxy^2) / (2·R_x·R_y))`.
- Cumulative angles: `a1 = a0 + Δ01`, `a2 = a1 + Δ12`, `a3 = a2 + Δ23`, `a4 = a3 + Δ34`, `a5 = a4 + Δ45`.

Example usage
```css
.radial {
	/* Inputs */
	--center: 288px;
	--touch: 1px;
	--s0: 96px;  --s1: 144px; --s2: 216px;
	--s3: 144px; --s4: 216px; --s5: 96px;
	--a0: 175deg; /* rotate the whole ring by editing this */
}
```

Tips
- Change any `--sN` or `--touch` and the layout reflows automatically.
- Use class-based variants or media queries to adapt sizes/angles per breakpoint.

## Development

- pnpm/pnpx only, per `.github/COPILOT_RULES.md` and `.github/copilot-instructions.md`.
- Keep the dev server running to benefit from HMR while editing.
- Lint and format regularly to keep diffs small and consistent.
- Tests run in happy-dom and cover the animation utilities and basic interactions.

### Modules and public APIs

The JS surface has been modularized. This section explains the important runtime pieces and the public APIs you may call from page-level code or tests.

- `src/scripts/_radial-box.js` (RadialBox)
	- Purpose: standalone runtime that computes CSS custom properties used by the radial layout (`--center-base`, `--btn-size-*-base`, `--radial-box`, etc.).
	- Loading: included as a module script in `index.html` so it runs at page runtime and keeps the logo/layout CSS variables in sync on resize.
	- Test-friendly: the file exports `RadialBox` and guards automatic instantiation when a test runner is detected. Tests can import and instantiate the class directly.

- `src/scripts/logo/_scale.js`
	- Purpose: group scaling helpers and the animated tween used to scale the logo group while preserving the visual center.
	- Methods installed on the controller (via the mixin installer):
		- `applyGroupScaleTransform(scale)` — apply scale immediately (center-preserving).
		- `animateGroupScaleTransform(targetScale, {duration, easing})` — returns a Promise that resolves when the animation completes; uses rAF.
	- Note: animations previously lived inline in the controller; they've been extracted to make unit-testing and cancellation easier.

- `src/scripts/logo/_compact.js`
	- Purpose: compact mode toggle and trail-stroke-width helpers.
	- Methods installed on the controller:
		- `setLogoCompact(on, {animate})` — toggles compact mode (updates body attribute, trail stroke widths, and triggers scale change).
		- `applyTrailStrokeWidth()` — writes stroke widths to the trail paths depending on compact state.

- `src/scripts/logo/logo.js` (InteractiveNeeedaLogo)
	- Purpose: main controller. Uses multiple mixins to add behavior (geometry helpers, drag, trail, layout breakpoints, animation flow, scale and compact).
	- Public API surface (high level):
		- `setLogoCompact(on, options)` — toggle compact mode programmatically.
		- `applyGroupScaleTransform(scale)` — immediate scale application (center preserved).
		- `animateGroupScaleTransform(...)` — animated scale; returns a Promise.
		- `applyTrailStrokeWidth()` — recompute trail stroke widths after size changes.

### How radial is loaded

The radial geometry is implemented in `src/scripts/_radial-box.js` and is intended to run in the browser as a standalone module. `index.html` includes it with a module script tag so CSS variables are kept in sync when the viewport changes. For tests, the class is exported and the file avoids auto-instantiating when run inside the test runner.

### Tests and test-friendly guards

- The project uses Vitest (happy-dom) for unit tests. Run them with:

```
pnpm test
pnpm test:watch
```

- Important implementation detail: several runtime-only scripts (notably `_radial-box.js`) are guarded so they don't auto-run during tests. This keeps tests deterministic and lets unit tests import classes and call lifecycle methods explicitly.

### Animation cancellation / debounce (notes & plan)

Current behavior: animated scaling uses requestAnimationFrame and resolves a Promise when the tween completes. Rapid toggles or repeated calls can start overlapping animations which currently run to completion.

Planned improvement (next step): add an explicit cancellation/token mechanism so that starting a new `animateGroupScaleTransform` cancels any in-flight scale animation and cleanly resolves/rejects the previous Promise. The approach will be:

- store an animation handle on the controller instance (e.g. `this._scaleAnim`) that contains a `cancel()` method and an id used by the rAF loop;
- `animateGroupScaleTransform` will cancel any existing animation before starting a new one and return a Promise that resolves when the new animation finishes;
- tests will assert cancellation behavior and that immediate (non-animated) transitions stop any pending rAF loops.

If you want me to implement cancellation now, I can add the minimal animation-handle logic to `_scale.js`, update `setLogoCompact` to cancel previous animations before starting a new one, and add unit tests that verify cancellation and that the final transform equals the latest requested scale.


## Browser support

This layout uses modern CSS features:
- CSS trigonometric functions: `sin()`, `cos()`, `acos()`.
- Relational selector `:has()` for per-icon styling blocks.

These features are supported in current evergreen browsers. For legacy browsers that lack support, consider a static fallback (fixed angles) or a progressive enhancement approach where geometry is precomputed and inlined.

## Notes

- 1 CSS pixel is kept equal to 1 SVG unit by syncing the viewBox and disabling aspect ratio.
- Motion is applied via CSS `translate(...)` to keep the math simple and performant.
- Trails are recomputed based on the centers of invisible handle rects for each group.

## License

MIT
