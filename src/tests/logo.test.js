import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InteractiveNeeedaLogo } from '../scripts/logo/logo.js';

// Minimal tests for geometry conversions and clamping behavior using DOM mocks.

describe('InteractiveNeeedaLogo geometry and clamp', () => {
  let container;
  let svg;
  let v1, v2, v3;
  let handle1, handle2, handle3;
  let trailA, trailB, gradA, gradB, logo;

  beforeEach(() => {
    // Build DOM skeleton
    container = document.createElement('div');
    Object.assign(container.style, { width: '800px', height: '600px' });
    document.body.appendChild(container);

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 800 600');
    container.appendChild(svg);

    // Trails and gradients
    trailA = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    trailA.setAttribute('id', 'segA');
    trailA.setAttribute('stroke-width', '47');
    trailA.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(trailA);

    trailB = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    trailB.setAttribute('id', 'segB');
    trailB.setAttribute('stroke-width', '47');
    trailB.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(trailB);

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    gradA = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradA.setAttribute('id', 'gradA');
    gradB = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradB.setAttribute('id', 'gradB');
    defs.appendChild(gradA);
    defs.appendChild(gradB);
    svg.appendChild(defs);

    logo = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    logo.setAttribute('id', 'neeeda-logo');
    svg.appendChild(logo);

    // Groups and handles
    v1 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    v1.setAttribute('id', 'v1');
    handle1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    handle1.setAttribute('id', 'handle-v1');
    v1.appendChild(handle1);

    v2 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    v2.setAttribute('id', 'v2');
    handle2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    handle2.setAttribute('id', 'handle-v2');
    v2.appendChild(handle2);

    v3 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    v3.setAttribute('id', 'v3');
    handle3 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    handle3.setAttribute('id', 'handle-v3');
    v3.appendChild(handle3);

    // Label nodes required by code but not used here
    const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    l1.setAttribute('id', 'label-v1');
    v1.appendChild(l1);

    const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    l2.setAttribute('id', 'label-v2');
    v2.appendChild(l2);

    const l3 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    l3.setAttribute('id', 'label-v3');
    v3.appendChild(l3);

    svg.appendChild(v1);
    svg.appendChild(v2);
    svg.appendChild(v3);

    // Query selectors expect elements in the document
    document.body.appendChild(svg);

    // Mock client rects for geometry math
    const baseSvgRect = { left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 };
    svg.getBoundingClientRect = () => ({ ...baseSvgRect });

    // Handles are 40x40, placed initially at (100,100), (400,300), (700,500)
    const mockRect = (x, y) => ({ left: x - 20, top: y - 20, width: 40, height: 40, right: x + 20, bottom: y + 20 });
    handle1.getBoundingClientRect = () => mockRect(100, 100);
    handle2.getBoundingClientRect = () => mockRect(400, 300);
    handle3.getBoundingClientRect = () => mockRect(700, 500);

    v1.getBoundingClientRect = () => mockRect(100, 100);
    v2.getBoundingClientRect = () => mockRect(400, 300);
    v3.getBoundingClientRect = () => mockRect(700, 500);

    // screenToSvg uses getScreenCTM; with 1:1 mapping identity is fine
    svg.createSVGPoint = () => ({ x: 0, y: 0, matrixTransform: (m) => ({ x: m.e ?? 0, y: m.f ?? 0 }) });
    svg.getScreenCTM = () => ({ inverse: () => ({ e: 0, f: 0 }) });

    // getBBox used by placeLogoAtHeight
    logo.getBBox = () => ({ x: 0, y: 0, width: 361, height: 65 });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('percentToPx and currentPercents are consistent', () => {
    const app = new InteractiveNeeedaLogo();
    // bypass preloader and drag init to focus on geometry
    app.layout();

    const pct = app.currentPercents();
    // Given mocked rects, centers are (100,100), (400,300), (700,500)
    expect(pct.v1).toEqual([100 / 800, 100 / 600]);
    expect(pct.v2).toEqual([400 / 800, 300 / 600]);
    expect(pct.v3).toEqual([700 / 800, 500 / 600]);

    const backToPx = app.percentToPx(pct.v2);
    expect(backToPx).toEqual([400, 300]);
  });

  it('clampGroupBox does not move nodes inside safe area and clamps those outside', () => {
    const app = new InteractiveNeeedaLogo();
    app.layout();

    // Inside: no movement expected
    const before1 = v1.style.transform || '';
    app.clampGroupBox(v1);
    const after1 = v1.style.transform || '';
    expect(after1).toBe(before1);

    // Outside: simulate node partially out of bounds on the right/bottom
    v3.getBoundingClientRect = () => ({ left: 780, top: 590, width: 40, height: 40, right: 820, bottom: 630 });
    app.clampGroupBox(v3);
    // Should have applied a translate to bring it back in (any non-empty transform is ok)
    expect(v3.style.transform).toMatch(/translate\(/);
  });
});
