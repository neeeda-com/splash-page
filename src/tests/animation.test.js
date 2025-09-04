import { beforeEach, describe, expect, it } from 'vitest';
import {
  Easing,
  animateTranslate,
  getTranslate,
  incTranslate,
  setTranslate,
} from '../scripts/logo/_animation-engine.js';

describe('animation runtime', () => {
  let el;
  beforeEach(() => {
    el = document.createElement('div');
    document.body.appendChild(el);
    el.style.transform = '';
  });

  it('getTranslate returns {0,0} when no transform is set', () => {
    expect(getTranslate(el)).toEqual({ x: 0, y: 0 });
  });

  it('setTranslate sets translate correctly', () => {
    setTranslate(el, 10, -5);
    expect(getTranslate(el)).toEqual({ x: 10, y: -5 });
  });

  it('incTranslate increments current translate', () => {
    setTranslate(el, 3, 4);
    incTranslate(el, 2, -1);
    expect(getTranslate(el)).toEqual({ x: 5, y: 3 });
  });

  it('Easing functions are within [0,1] and monotonic', () => {
    const samples = Array.from({ length: 11 }, (_, i) => i / 10);
    const check = (fn) => {
      let prev = -Infinity;
      for (const t of samples) {
        const v = fn(t);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
        expect(v).toBeGreaterThanOrEqual(prev);
        prev = v;
      }
    };
    check(Easing.power2InOut);
    check(Easing.power3InOut);
  });

  it('animateTranslate moves element by dx,dy over duration', async () => {
    setTranslate(el, 0, 0);
    const p = animateTranslate(el, 20, -10, { duration: 0.01 });
    await p;
    expect(getTranslate(el)).toEqual({ x: 20, y: -10 });
  });
});
