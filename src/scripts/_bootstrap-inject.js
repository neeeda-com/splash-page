// Minimal injector: uses insertAdjacentHTML on <main> to insert the logo SVG first
// and, on the 'logo:midway' signal, the HTML content. No wrapper or extra nodes are created.

import logoSvg from '../assets/logo.svg?raw';
import contentHtml from '../assets/_content.html?raw';

export function bootstrapInjection() {
  const main = document.querySelector('main') || document.body;

  if (!main) return;

  // 1) Inject the inline logo SVG (if not already present)
  if (!document.getElementById('neeeda-logo')) {
    main.insertAdjacentHTML('beforeend', logoSvg);
    // Load the logo controller immediately after injection (auto-boot)
    import('./logo/logo.js').catch(() => {});
  }

  // 2) At midway through the animation, inject the HTML content
  const onMidway = () => {
    if (!document.getElementById('countdown-dialog')) {
      main.insertAdjacentHTML('beforeend', contentHtml);

      // Load controllers that operate on the injected markup
      import('./_radial-box.js').catch(() => {});
      import('./_countdown.js').catch(() => {});
    }
  };

  window.addEventListener('logo:midway', onMidway, { once: true });
}

// Bootstrap injector: loads external inline SVG logo and additional content
// using Vite raw imports, and coordinates injection with the animation flow.
