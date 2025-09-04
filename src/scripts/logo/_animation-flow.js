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
import { POSE3, POSE4, TO_POSE, WIGGLE } from './_constants.js';

export function installAnimationFlow(cls) {
  Object.assign(cls.prototype, {
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
      const cur = this.currentPercents();
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

      await Promise.all([
        this.tweenTo(g1.node, g1.node, this.percentToPx(step2.v1), { duration: WIGGLE.dur, ease: WIGGLE.ease }),
        this.tweenTo(g2.node, g2.node, this.percentToPx(step2.v2), { duration: WIGGLE.dur, ease: WIGGLE.ease }),
        this.tweenTo(g3.node, g3.node, this.percentToPx(step2.v3), { duration: WIGGLE.dur, ease: WIGGLE.ease }),
      ]);

      await this.settleAfterStep();

      await sleep(WIGGLE.hold * 1000);

      await Promise.all([
        this.tweenTo(g1.node, g1.node, this.percentToPx(POSE3.v1), { duration: TO_POSE.dur, ease: TO_POSE.ease }),
        this.tweenTo(g2.node, g2.node, this.percentToPx(POSE3.v2), { duration: TO_POSE.dur, ease: TO_POSE.ease }),
        this.tweenTo(g3.node, g3.node, this.percentToPx(POSE3.v3), { duration: TO_POSE.dur, ease: TO_POSE.ease }),
      ]);

      await this.settleAfterStep();

      await sleep(TO_POSE.hold * 1000);

      await Promise.all([
        this.tweenTo(g1.node, g1.node, this.percentToPx(POSE4.v1), { duration: TO_POSE.dur, ease: TO_POSE.ease }),
        this.tweenTo(g2.node, g2.node, this.percentToPx(POSE4.v2), { duration: TO_POSE.dur, ease: TO_POSE.ease }),
        this.tweenTo(g3.node, g3.node, this.percentToPx(POSE4.v3), { duration: TO_POSE.dur, ease: TO_POSE.ease }),
      ]);

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
