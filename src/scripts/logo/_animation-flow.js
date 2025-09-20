/*
=============================================================================
 Module: _animation-flow.js
 Purpose: Orchestrate the preloader (wiggle → pose3 → pose4 → anchor settle)
          and provide reusable tween utilities that respect translation state
          while keeping the trail in sync.
 Design:
   - All tweens operate in pixel space using percent targets converted each
     time to avoid stale viewport assumptions.
   - settleAfterStep performs a two-frame wait to ensure style & layout have
     fully flushed before proceeding (robust against batching by the browser).
   - Reduced motion path skips intermediate poses and jumps directly to the
     final anchored arrangement.
=============================================================================
*/
import { animateTranslate, getTranslate, incTranslate, sleep } from './_animation-engine.js';
import { POSE3, POSE4, SAFE_AREA_PADDING, TO_POSE, WIGGLE } from './_constants.js';

export function installAnimationFlow(cls) {
  Object.assign(cls.prototype, {
    /**
     * Wait for the viewport height (visualViewport.height or innerHeight) to be stable
     * for a few consecutive frames (helps iOS pull-to-refresh where the URL bar collapse
     * changes available height shortly after load). Fails open after maxWait.
     */
    waitForViewportStability(opts = {}) {
      const cfg = { framesStable: 25, epsilon: 1, minWait: 50, maxWait: 1000, ...opts };
      const vv = window.visualViewport;
      let lastH;
      let stable = 0;
      const start = performance.now();
      return new Promise((resolve) => {
        const loop = () => {
          const now = performance.now();
          const h = vv?.height ?? window.innerHeight;
          if (lastH != null && Math.abs(h - lastH) <= cfg.epsilon) stable++;
          else stable = 0;
          lastH = h;
          const elapsed = now - start;
          if ((stable >= cfg.framesStable && elapsed >= cfg.minWait) || elapsed >= cfg.maxWait) return resolve();
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      });
    },
    async fadeInIfNeeded() {
      if (!document.body.classList.contains('logo-fade-in-start')) {
        // Maintain previous small delay before wiggle if no fade sequence.
        await sleep(200);
        return;
      }
      // Kick off fade-in on next frame to allow styles to apply
      await this.nextFrame();
      document.body.classList.add('logo-fade-in-active');

      document.body.addEventListener(
        'transitionend',
        () => {
          document.body.classList.add('logo-faded');
        },
        { once: true }
      );
    },
    nextFrame() {
      return new Promise((res) => requestAnimationFrame(() => res()));
    },
    flushLayout() {
      this.groups.forEach(({ node }) => {
        node.getBoundingClientRect();
      });
    },
    async settleAfterStep() {
      await this.nextFrame();
      this.flushLayout();
      await this.nextFrame();
    },
    tweenTo(node, refEl, [tx, ty], opts = {}) {
      const base = this.baseCenters.get(refEl) ?? this.centerOf(refEl);
      const t = getTranslate(node);
      const current = { x: base.x + t.x, y: base.y + t.y };
      const dx = tx - current.x;
      const dy = ty - current.y;

      return animateTranslate(node, dx, dy, {
        duration: opts.duration ?? opts.dur ?? 0.5,
        ease: opts.ease ?? 'power3.inOut',
        onUpdate: () => {
          this.updateTrail();
        },
        onComplete: opts.onComplete,
      });
    },
    percentToPx([px, py]) {
      const r = this.svgRect();

      return [r.left + px * r.width, r.top + py * r.height];
    },
    currentPercents() {
      const rect = this.svgRect();

      const toPct = (el) => {
        const rc = el.getBoundingClientRect();
        return [(rc.left + rc.width / 2 - rect.left) / rect.width, (rc.top + rc.height / 2 - rect.top) / rect.height];
      };

      return { v1: toPct(this.groups[0].node), v2: toPct(this.groups[1].node), v3: toPct(this.groups[2].node) };
    },
    async runPreloader() {
      this.setDragEnabled(false);

      const [g1, g2, g3] = this.groups;

      // 0. Viewport stability gate (avoid starting from transient height on iOS pull-to-refresh)
      try {
        await this.waitForViewportStability();
      } catch {}

      // Ensure compact scaling is applied up-front on mobile so the first
      // visible animation (wiggle) starts from the correct scaled layout.
      try {
        if (this.logoCompact && this.currentGroupScale !== 0.5) {
          this.applyGroupScaleTransform();
          this.updateTrail();
          this.flushLayout();
        }
      } catch {}

      // Step 1 (initial state): center vertically + pack horizontally (v1|v2|v3) before any visible motion.
      try {
        const r = this.svgRect();
        const b1 = g1.node.getBoundingClientRect();
        const b2 = g2.node.getBoundingClientRect();
        const b3 = g3.node.getBoundingClientRect();
        // Vertical centering: shift all three groups so their average Y aligns to viewport center
        const c1v = this.centerOf(g1.node);
        const c2v = this.centerOf(g2.node);
        const c3v = this.centerOf(g3.node);
        const avgY = (c1v.y + c2v.y + c3v.y) / 3;
        const targetCy = r.top + r.height / 2;
        const dy = targetCy - avgY;
        if (Math.abs(dy) > 0.5) {
          incTranslate(g1.node, 0, dy);
          incTranslate(g2.node, 0, dy);
          incTranslate(g3.node, 0, dy);
        }
        const totalW = b1.width + b2.width + b3.width;
        const left = r.left + (r.width - totalW) / 2;
        const t1x = left + b1.width / 2;
        const t2x = t1x + b1.width / 2 + b2.width / 2; // v1 right edge meets v2 left edge
        const t3x = t2x + b2.width / 2 + b3.width / 2; // v2 right edge meets v3 left edge

        const c1 = this.centerOf(g1.node);
        const c2 = this.centerOf(g2.node);
        const c3 = this.centerOf(g3.node);

        // Horizontal packing (after optional vertical shift)
        incTranslate(g1.node, t1x - c1.x, 0);
        incTranslate(g2.node, t2x - c2.x, 0);
        incTranslate(g3.node, t3x - c3.x, 0);

        this.updateTrail();
        // Flush to ensure subsequent measurements reflect the packed state
        this.flushLayout();
      } catch {}

      const cur = this.currentPercents();
      await this.fadeInIfNeeded();
      const step2 = { v1: [cur.v1[0] + WIGGLE.dxV1, cur.v1[1]], v2: cur.v2, v3: [cur.v3[0] + WIGGLE.dxV3, cur.v3[1]] };

      if (this.prefersReducedMotion()) {
        const target = this.anchorTargetsPx();
        const keys = ['v1', 'v2', 'v3'];

        this.groups.forEach((g, idx) => {
          const [tx, ty] = target[keys[idx]];
          const c = this.centerOf(g.node);

          incTranslate(g.node, tx - c.x, ty - c.y);
          this.clampGroupBox(g.node);
        });

        this.updateTrail();
        document.body.classList.add('loader-done');
        this.setDragEnabled(this.dragOptIn);

        return;
      }

      if (this.isMobile()) {
        // Expand horizontally up to 320px total (or viewport-safe-area if smaller), without exceeding boundaries
        const r = this.svgRect();
        const pad = SAFE_AREA_PADDING.mobile ?? 0;
        const fullLeft = r.left + pad;
        const fullRight = r.right - pad;
        const fullWidth = Math.max(0, fullRight - fullLeft);
        const allowedW = Math.min(fullWidth, 320);
        const slack = fullWidth - allowedW;
        const L = fullLeft + Math.max(0, slack / 2);
        const R = L + allowedW;

        const b1 = g1.node.getBoundingClientRect();
        const b2 = g2.node.getBoundingClientRect();
        const b3 = g3.node.getBoundingClientRect();
        const c1 = this.centerOf(g1.node);
        const c2 = this.centerOf(g2.node);
        const c3 = this.centerOf(g3.node);

        // Targets: v1 flush to left, v3 flush to right, v2 centered in the gap
        const t1x = L + b1.width / 2;
        const t3x = R - b3.width / 2;
        const v1Right = t1x + b1.width / 2;
        const v3Left = t3x - b3.width / 2;
        const midCenter = (v1Right + v3Left) / 2;
        // Ensure v2 stays within [L..R]
        const min2 = L + b2.width / 2;
        const max2 = R - b2.width / 2;
        const t2x = Math.max(min2, Math.min(max2, midCenter));

        await Promise.all([
          this.tweenTo(g1.node, g1.node, [t1x, c1.y], { duration: WIGGLE.dur, ease: WIGGLE.ease }),
          this.tweenTo(g2.node, g2.node, [t2x, c2.y], { duration: WIGGLE.dur, ease: WIGGLE.ease }),
          this.tweenTo(g3.node, g3.node, [t3x, c3.y], { duration: WIGGLE.dur, ease: WIGGLE.ease }),
        ]);
      } else {
        await Promise.all([
          this.tweenTo(g1.node, g1.node, this.percentToPx(step2.v1), { duration: WIGGLE.dur, ease: WIGGLE.ease }),
          this.tweenTo(g2.node, g2.node, this.percentToPx(step2.v2), { duration: WIGGLE.dur, ease: WIGGLE.ease }),
          this.tweenTo(g3.node, g3.node, this.percentToPx(step2.v3), { duration: WIGGLE.dur, ease: WIGGLE.ease }),
        ]);
      }

      await this.settleAfterStep();

      await sleep(WIGGLE.hold * 1000);

      {
        // Tween to POSE3 with reduced vertical gap on mobile (compress v2.y towards avg(v1.y, v3.y))
        const p1 = this.percentToPx(POSE3.v1);
        const p2 = this.percentToPx(POSE3.v2);
        const p3 = this.percentToPx(POSE3.v3);

        if (this.isMobile()) {
          const yAvg = (p1[1] + p3[1]) / 2;
          const K = 0.6; // compression factor (0=no gap, 1=original gap)
          p2[1] = yAvg + (p2[1] - yAvg) * K;
        }

        await Promise.all([
          this.tweenTo(g1.node, g1.node, p1, { duration: TO_POSE.dur, ease: TO_POSE.ease }),
          this.tweenTo(g2.node, g2.node, p2, { duration: TO_POSE.dur, ease: TO_POSE.ease }),
          this.tweenTo(g3.node, g3.node, p3, { duration: TO_POSE.dur, ease: TO_POSE.ease }),
        ]);

        // Midway signal: after first pose transition completes
        window.dispatchEvent(new CustomEvent('logo:midway'));
      }

      await this.settleAfterStep();

      await sleep(TO_POSE.hold * 1000);

      {
        // Tween to POSE4 with reduced vertical gap on mobile
        const p1 = this.percentToPx(POSE4.v1);
        const p2 = this.percentToPx(POSE4.v2);
        const p3 = this.percentToPx(POSE4.v3);

        if (this.isMobile()) {
          const yAvg = (p1[1] + p3[1]) / 2;
          const K = 0.6;
          p2[1] = yAvg + (p2[1] - yAvg) * K;
        }

        await Promise.all([
          this.tweenTo(g1.node, g1.node, p1, { duration: TO_POSE.dur, ease: TO_POSE.ease }),
          this.tweenTo(g2.node, g2.node, p2, { duration: TO_POSE.dur, ease: TO_POSE.ease }),
          this.tweenTo(g3.node, g3.node, p3, { duration: TO_POSE.dur, ease: TO_POSE.ease }),
        ]);
      }

      await this.settleAfterStep();

      await sleep(TO_POSE.hold * 1000);

      const target = this.anchorTargetsPx();
      const revealMs = Math.max(0, TO_POSE.dur * 1000 - 500);
      const revealTimer = setTimeout(() => {
        document.body.classList.add('loader-done');
      }, revealMs);

      await Promise.all([
        this.tweenTo(g1.node, g1.node, target.v1, { duration: TO_POSE.dur, ease: TO_POSE.ease }),
        this.tweenTo(g2.node, g2.node, target.v2, { duration: TO_POSE.dur, ease: TO_POSE.ease }),
        this.tweenTo(g3.node, g3.node, target.v3, { duration: TO_POSE.dur, ease: TO_POSE.ease }),
      ]);

      clearTimeout(revealTimer);
      document.body.classList.add('loader-done');
      this.updateTrail();
      this.setDragEnabled(this.dragOptIn);
    },
    async animateLayoutTransition() {
      this.setDragEnabled(false);

      const target = this.anchorTargetsPx();
      const keys = ['v1', 'v2', 'v3'];

      await Promise.all(
        this.groups.map((g, idx) => {
          const [tx, ty] = target[keys[idx]];

          return this.tweenTo(g.node, g.node, [tx, ty], { duration: 0.8, ease: 'power2.inOut' });
        })
      );

      this.setDragEnabled(this.dragOptIn);
    },
  });
}
