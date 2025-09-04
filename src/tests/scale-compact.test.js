import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InteractiveNeeedaLogo } from '../scripts/logo/logo.js';

describe('Scale & Compact mixins', () => {
  let container;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 800 600');
    const segA = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    segA.id = 'segA';
    segA.setAttribute('stroke-width', '47');
    segA.setAttribute('vector-effect', 'non-scaling-stroke');
    const segB = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    segB.id = 'segB';
    segB.setAttribute('stroke-width', '47');
    segB.setAttribute('vector-effect', 'non-scaling-stroke');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradA = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradA.id = 'gradA';
    const gradB = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradB.id = 'gradB';
    defs.appendChild(gradA);
    defs.appendChild(gradB);
    svg.appendChild(defs);
    svg.appendChild(segA);
    svg.appendChild(segB);
    const logo = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    logo.id = 'neeeda-logo';
    const mkGroup = (id) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.id = id;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '100');
      rect.setAttribute('height', '64');
      g.appendChild(rect);
      const handle = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      handle.id = 'handle-' + id;
      const hr = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      hr.setAttribute('width', '48');
      hr.setAttribute('height', '48');
      handle.appendChild(hr);
      g.appendChild(handle);
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      label.id = 'label-' + id;
      g.appendChild(label);
      return g;
    };
    logo.appendChild(mkGroup('v1'));
    logo.appendChild(mkGroup('v2'));
    logo.appendChild(mkGroup('v3'));
    svg.appendChild(logo);
    document.body.appendChild(svg);
    // Mock geometry helpers
    svg.createSVGPoint = () => ({ x: 0, y: 0, matrixTransform: () => ({ x: 0, y: 0 }) });
    svg.getScreenCTM = () => ({ inverse: () => ({ e: 0, f: 0 }) });
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('applyTrailStrokeWidth sets stroke widths according to compact flag', () => {
    const app = new InteractiveNeeedaLogo();
    app.logoCompact = false;
    app.applyTrailStrokeWidth();
    expect(document.getElementById('segA').getAttribute('stroke-width')).toBe(String(app.MAX_TRAIL_SW));
    app.logoCompact = true;
    app.applyTrailStrokeWidth();
    expect(document.getElementById('segA').getAttribute('stroke-width')).toBe(String(app.MIN_TRAIL_SW));
  });

  it('setLogoCompact toggles scale and preserves transform', async () => {
    const app = new InteractiveNeeedaLogo();
    const g1 = document.getElementById('v1');
    g1.style.transform = 'translate(10px, 5px) scale(1)';
    await app.setLogoCompact(true, { animate: false });
    expect(g1.style.transform).toMatch(/scale\(0.5\)/);
    await app.setLogoCompact(false, { animate: false });
    expect(g1.style.transform).toMatch(/scale\(1\)/);
  });
});
