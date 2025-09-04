import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InteractiveNeeedaLogo } from '../scripts/logo/logo.js';

describe('logo scale placeholder', () => {
  beforeEach(() => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 800 600');
    svg.id = 'svg-root-test';
    const makePath = (id) => {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.id = id;
      p.setAttribute('stroke-width', '47');
      p.setAttribute('vector-effect', 'non-scaling-stroke');
      return p;
    };
    svg.appendChild(makePath('segA'));
    svg.appendChild(makePath('segB'));
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradA = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradA.id = 'gradA';
    const gradB = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradB.id = 'gradB';
    defs.appendChild(gradA);
    defs.appendChild(gradB);
    svg.appendChild(defs);
    const logo = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    logo.id = 'neeeda-logo';
    svg.appendChild(logo);
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
    document.body.appendChild(svg);
    // Mock methods used by geometry
    svg.createSVGPoint = () => ({ x: 0, y: 0, matrixTransform: () => ({ x: 0, y: 0 }) });
    svg.getScreenCTM = () => ({ inverse: () => ({ e: 0, f: 0 }) });
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });
  it('can toggle compact without throwing', () => {
    const app = new InteractiveNeeedaLogo();
    app.setLogoCompact(false);
    app.setLogoCompact(true);
    expect(app.logoCompact).toBe(true);
  });
  it('preserves scale after translate and repeated toggles', () => {
    const app = new InteractiveNeeedaLogo();
    app.setLogoCompact(true);
    const g1 = document.getElementById('v1');
    // Simula una translate diretta (come animazione) mantenendo scale
    g1.style.transform = 'translate(10px, 5px) scale(0.5)';
    // Toggla avanti e indietro
    app.setLogoCompact(false);
    app.setLogoCompact(true);
    // Dovrebbe ancora avere scale(0.5)
    expect(g1.style.transform).toMatch(/scale\(0.5\)/);
  });
});
