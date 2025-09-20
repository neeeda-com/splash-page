// Minimal countdown <dialog> controller with zero dependencies
// Usage:
//  - In HTML, include: <dialog id="countdown-dialog" data-countdown data-target="2025-12-31T23:59:59+01:00"></dialog>
//  - Open programmatically: window.NeeedaCountdown.open()
//  - Close programmatically: window.NeeedaCountdown.close()
//  - Update target date at runtime (optional): window.NeeedaCountdown.setTarget('2025-12-31T23:59:59+01:00')

const pad2 = (n) => String(Math.max(0, Math.floor(n))).padStart(2, '0');

function parseTarget(el) {
  const attr = el.getAttribute('data-target');

  // Accept ISO-like strings; if invalid, default to +1 day
  const d = attr ? new Date(attr) : new Date(Date.now() + 24 * 3600 * 1000);

  return Number.isNaN(d.getTime()) ? new Date(Date.now() + 24 * 3600 * 1000) : d;
}

function fmtTarget(d) {
  try {
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return d.toISOString();
  }
}

class CountdownDialog {
  constructor(dialog) {
    this.dialog = dialog;
    // Make dialog itself focusable so we can place focus on the modal container
    try {
      this.dialog.setAttribute('tabindex', '-1');
    } catch {}

    this.dd = dialog.querySelector('[data-dd]');
    this.hh = dialog.querySelector('[data-hh]');
    this.mm = dialog.querySelector('[data-mm]');
    this.ss = dialog.querySelector('[data-ss]');
    this.targetText = dialog.querySelector('[data-target-text]');

    this.target = parseTarget(dialog);
    this.targetText && (this.targetText.textContent = fmtTarget(this.target));

    this.timer = null;

    // Close on backdrop click
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();

      const inDialog =
        e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

      if (!inDialog) this.close();
    });

    // Keep running even if dialog closes
    // dialog.addEventListener('close', () => this.stop());

    // Kick first render and start ticking automatically
    this.tick();
    this.start();
  }

  setTarget(isoString) {
    const d = new Date(isoString);

    if (!Number.isNaN(d.getTime())) {
      this.target = d;
      this.targetText && (this.targetText.textContent = fmtTarget(this.target));
      this.tick(true);
    }
  }

  open() {
    if (!this.dialog.open) {
      this.dialog.showModal();

      // trigger enter animation on next frame
      requestAnimationFrame(() => {
        this.dialog.classList.add('is-visible');

        // After becoming visible, move focus to the dialog container
        try {
          this.dialog.focus({ preventScroll: true });
        } catch {}
      });
    }

    this.start();
  }

  close() {
    if (!this.dialog.open) return;

    // play exit animation then close
    this.dialog.classList.add('is-closing');
    this.dialog.classList.remove('is-visible');

    const onEnd = (e) => {
      if (e.target !== this.dialog) return;

      this.dialog.removeEventListener('transitionend', onEnd);

      try {
        this.dialog.close();
      } catch {}

      this.dialog.classList.remove('is-closing');
    };

    this.dialog.addEventListener('transitionend', onEnd);
    // Keep ticking in background per requirement
  }

  start() {
    if (this.timer) return;

    this.timer = setInterval(() => this.tick(), 1000);
    this.tick(true);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  tick(force = false) {
    const MS = {
      second: 1000,
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
    };

    const now = Date.now();
    let diff = Math.max(0, this.target.getTime() - now);

    const days = Math.floor(diff / MS.day);
    diff %= MS.day;

    const hours = Math.floor(diff / MS.hour);
    diff %= MS.hour;

    const minutes = Math.floor(diff / MS.minute);
    diff %= MS.minute;

    const seconds = Math.floor(diff / MS.second);

    this.dd && (this.dd.textContent = String(days));
    this.hh && (this.hh.textContent = pad2(hours));
    this.mm && (this.mm.textContent = pad2(minutes));
    this.ss && (this.ss.textContent = pad2(seconds));

    // Optional: when reaches zero, stop the timer
    !force && days === 0 && hours === 0 && minutes === 0 && seconds === 0 && this.stop();
  }
}

(function boot() {
  const dialog = document.querySelector('dialog[data-countdown]');

  if (!dialog) return;

  const controller = new CountdownDialog(dialog);

  // Expose tiny API for on-demand control
  window.NeeedaCountdown = {
    open: () => controller.open(),
    close: () => controller.close(),
    setTarget: (iso) => controller.setTarget(iso),
  };

  // Bind: open dialog on click of any page <button> except theme toggle and dialog internals
  const bindOpeners = () => {
    const btns = document.querySelectorAll('button');

    btns.forEach((btn) => {
      // if (btn.dataset.cdBound === '1') return; // idempotent

      // Skip buttons inside any dialog
      if (btn.closest('dialog')) return;

      // Skip theme toggle button (identified via data-icon="color-scheme-dark")
      if (btn.matches('[data-icon="color-scheme-dark"]')) return;

      // Bind
      // btn.dataset.cdBound = '1';

      btn.addEventListener('click', () => {
        try {
          controller.open();
        } catch {}
      });
    });
  };

  bindOpeners();

  // Intercept native close actions to run exit animation:
  // 1) ESC key
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    controller.close();
  });

  // 2) Header close button submits the form (method=dialog)
  dialog.querySelector('form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    controller.close();
  });
})();
