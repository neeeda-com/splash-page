import { describe, expect, it } from 'vitest';

// Minimal fake controller to test scale animations without full DOM.
class FakeCtrl {
  constructor() {
    this.groups = [];
    this.currentGroupScale = 1;
    this.logoCompact = false;
  }
}

describe('scale animation cancellation', () => {
  it('cancels previous animation when a new one starts', async () => {
    const ctrl = new FakeCtrl();
    // install scale mixin
    const { installScale } = await import('../../src/scripts/logo/_scale.js');
    installScale(FakeCtrl);

    // create fake nodes with getBoundingClientRect
    const makeNode = (w) => ({
      style: { transform: 'translate(0px, 0px) scale(1)' },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: w }),
    });

    ctrl.groups = [{ node: makeNode(100) }, { node: makeNode(100) }];

    // start a long animation
    const p1 = ctrl.animateGroupScaleTransform(0.5, { duration: 1000 });
    // shortly after, start a faster animation to 1.0 which should cancel the previous
    const p2 = ctrl.animateGroupScaleTransform(1.0, { duration: 10 });

    await p2;

    // p1 should have resolved (we resolve on cancel as well)
    await p1;

    // final scale should be 1.0
    expect(ctrl.currentGroupScale).toBe(1.0);
  });
});
