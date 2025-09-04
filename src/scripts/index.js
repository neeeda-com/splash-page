import './_color-scheme.js';
import './logo/logo.js';
import './_countdown.js';
import './_radial-box.js';
// svg background sync is handled by the logo mixin now

addEventListener('DOMContentLoaded', () => {
  // Prevent zooming across browsers:
  // - keyboard combos (Ctrl / Meta + + - = 0 / Numpad add/subtract)
  // - wheel with Ctrl / Meta pressed
  // - touch pinch (two-finger touchmove)
  // - Safari gesture events
  const preventZoomKey = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;

    const code = e.code || '';
    const key = e.key || '';
    const keyCode = e.keyCode || e.which || 0;

    const zoomCodes = new Set([
      'NumpadAdd',
      'NumpadSubtract',
      'Equal',
      'Minus',
      'Digit0',
      'Key0',
    ]);

    const zoomKeys = new Set(['+', '-', '=', '_', '0']);

    const zoomKeyCodes = new Set([107, 109, 187, 189, 48]);

    if (zoomCodes.has(code) || zoomKeys.has(key) || zoomKeyCodes.has(keyCode)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const preventZoomWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const preventPinch = (e) => {
    // two-finger touch indicates pinch-zoom
    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
    }
  };

  // Keyboard: catch zoom key combinations
  window.addEventListener('keydown', preventZoomKey, { passive: false });

  // Wheel/trackpad: modern 'wheel' plus fallback 'mousewheel' for older browsers
  window.addEventListener('wheel', preventZoomWheel, { passive: false, capture: true });
  window.addEventListener('mousewheel', preventZoomWheel, { passive: false, capture: true });

  // Touch: prevent pinch-to-zoom
  window.addEventListener('touchmove', preventPinch, { passive: false, capture: true });

  // Safari gesture events
  window.addEventListener('gesturestart', (e) => { e.preventDefault(); }, { passive: false });
  window.addEventListener('gesturechange', (e) => { e.preventDefault(); }, { passive: false });
});
