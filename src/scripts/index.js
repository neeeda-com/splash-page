import { bootstrapInjection } from './_bootstrap-inject.js';
import './_color-scheme.js';
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
    const zoomCodes = new Set(['NumpadAdd', 'NumpadSubtract', 'Equal', 'Minus', 'Digit0', 'Key0']);

    const key = e.key || '';
    const zoomKeys = new Set(['+', '-', '=', '_', '0']);

    const keyCode = e.keyCode || e.which || 0;
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
  window.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  window.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });

    // Remove focus on pointer interactions so the outline doesn't appear on click/tap
    window.addEventListener(
      'pointerdown',
      (e) => {
        const target = e.target && (/** @type {Element} */ (e.target)).closest?.('button, [data-btn]');
        if (!target) return;
        // Defer to next frame to not interfere with click handlers
        requestAnimationFrame(() => {
          try {
            /** @type {HTMLElement} */ (target).blur();
          } catch {}
        });
      },
      { capture: true }
    );

  // Inject external logo SVG and setup midway content injection
  try {
    bootstrapInjection();
  } catch {}

  // =========================
  // LINK HANDLERS (Play, Social, CTA)
  // =========================
  const LINKS = {
    // YouTube distinti
    youtubePlay: 'https://www.youtube.com/watch?v=8hz2kKqV3Bw',   // TODO: URL per il BOTTONE PLAY (grande)
    youtubeIcon: 'https://www.youtube.com/@NeeedaSystem',               // TODO: URL per l’ICONA YouTube nel radiale

    // CTA hero -> Telegram
    chatbot: 'https://t.me/Neeeda_bot',

    // Social ring + mail
    mail: 'mailto:hello@neeeda.com',
    facebook: 'https://www.facebook.com/neeedasystem',
    instagram: 'https://www.instagram.com/neeedasystem/',
    'linked-in': 'https://www.linkedin.com/company/neeeda/?viewAsMember=true'
  };

  document.addEventListener('click', (event) => {
    const target = /** @type {Element} */ (event.target);

    // 1) PLAY (bottone centrale radiale) -> YouTube (link dedicato)
    const playBtn = target.closest?.('button[data-role="center"]');
    if (playBtn) {
      event.preventDefault();
      event.stopPropagation();
      window.open(LINKS.youtubePlay, '_blank', 'noopener');
      return;
    }

    // 2) BOLLE SOCIAL -> link esterni (escluso toggle tema)
    const socialBtn = target.closest?.('button[data-btn][data-icon]');
    if (socialBtn) {
      const icon = socialBtn.getAttribute('data-icon');
      if (icon === 'color-scheme-dark') return; // lascia il toggle tema

      // YouTube icona usa il link dedicato (diverso dal play)
      const url =
        icon === 'youtube' ? LINKS.youtubeIcon :
        icon ? LINKS[icon] : null;

      if (!url) return;

      event.preventDefault();
      event.stopPropagation();
      if (icon === 'mail') window.location.href = url;   // mailto nella stessa tab
      else window.open(url, '_blank', 'noopener');
      return;
    }

    // 3) CTA HERO "Racconta il tuo Need" -> Telegram
    const heroCta = target.closest?.('article > button');
    if (heroCta) {
      event.preventDefault();
      event.stopPropagation();
      window.open(LINKS.chatbot, '_blank', 'noopener');
      return;
    }
  });

});
