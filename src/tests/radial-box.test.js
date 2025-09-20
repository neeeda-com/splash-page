import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RadialBox } from '../scripts/_radial-box.js';

describe('RadialBox sizing', () => {
  let container;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const section = document.createElement('section');
    section.setAttribute('data-radial', '');
    container.appendChild(section);
    // Provide predictable width
    Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('writes CSS custom properties on init', () => {
    new RadialBox();
    const el = document.querySelector('[data-radial]');
    expect(el.style.getPropertyValue('--center-base')).not.toBe('');
    expect(el.style.getPropertyValue('--btn-size-0-base')).not.toBe('');
    expect(el.style.getPropertyValue('--radial-box-w')).not.toBe('');
    expect(el.style.getPropertyValue('--radial-box-h')).not.toBe('');
  });

  it('is idempotent for same viewport', () => {
    const rb = new RadialBox();
    const before = document.querySelector('[data-radial]').style.getPropertyValue('--center-base');
    rb.updateRadialScale();
    const after = document.querySelector('[data-radial]').style.getPropertyValue('--center-base');
    expect(after).toBe(before);
  });
});
