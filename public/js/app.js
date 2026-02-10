document.addEventListener('DOMContentLoaded', () => {
  // Text scramble effect for elements with data-scramble attribute
  document.querySelectorAll('[data-scramble]').forEach(el => {
    const final = el.textContent;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?/\\';
    let iterations = 0;
    const interval = setInterval(() => {
      el.textContent = final.split('').map((char, i) => {
        if (i < iterations) return final[i];
        return chars[Math.floor(Math.random() * chars.length)];
      }).join('');
      iterations += 1/2;
      if (iterations >= final.length) clearInterval(interval);
    }, 30);
  });

  // Character counter
  const ta = document.getElementById('content');
  const cc = document.getElementById('char-count');
  if (ta && cc) {
    ta.addEventListener('input', () => {
      const l = ta.value.length;
      cc.textContent = l > 1000 ? `${(l/1000).toFixed(1)}K` : l;
    });
  }

  // Prevent double-submit
  const cf = document.getElementById('create-form');
  if (cf) {
    cf.addEventListener('submit', () => {
      const b = cf.querySelector('button[type=submit]');
      if (b) { b.disabled = true; b.textContent = 'ENCRYPTING...'; }
    });
  }

  // Copy to clipboard
  window.copyUrl = function() {
    const input = document.getElementById('drop-url');
    navigator.clipboard.writeText(input.value).then(() => {
      const btn = document.getElementById('copy-btn');
      btn.textContent = 'COPIED';
      setTimeout(() => btn.textContent = 'COPY', 2000);
    });
  };

  window.copyContent = function() {
    const el = document.getElementById('secret-content');
    navigator.clipboard.writeText(el.textContent).then(() => {
      const btn = document.getElementById('copy-content-btn');
      const orig = btn.textContent;
      btn.textContent = 'COPIED';
      setTimeout(() => btn.textContent = orig, 2000);
    });
  };

  // Auto-dismiss flash
  const flash = document.querySelector('.flash');
  if (flash) {
    setTimeout(() => { flash.style.opacity = '0'; flash.style.transition = 'opacity .3s'; setTimeout(() => flash.remove(), 300); }, 5000);
  }

  // Countdown timer
  const cd = document.getElementById('countdown');
  if (cd) {
    const exp = new Date(cd.dataset.expires).getTime();
    const tick = () => {
      const diff = exp - Date.now();
      if (diff <= 0) { cd.textContent = 'EXPIRED'; return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      cd.textContent = `${h}h ${m}m ${s}s`;
      requestAnimationFrame(tick);
    };
    tick();
  }

  // ─── FIRE EFFECTS ───

  /**
   * Starts a fire-timer countdown bar attached to an element.
   * When it reaches 0, triggers fire-destroy on the parent content area.
   * @param {HTMLElement} element - The element to attach the timer bar to
   * @param {number} durationMs - Duration in milliseconds
   */
  window.startBurnTimer = function(element, durationMs) {
    if (!element) return;

    const bar = document.createElement('div');
    bar.className = 'fire-timer';
    bar.style.width = '100%';
    bar.style.transition = 'none';
    element.appendChild(bar);

    // Force reflow so the browser registers the initial width
    bar.offsetWidth;

    // Set the transition to match the duration and shrink to 0
    bar.style.transition = 'width ' + durationMs + 'ms linear';
    bar.style.width = '0%';

    // When the timer completes, trigger burn on the parent content area
    setTimeout(function() {
      var contentArea = element.closest('.reveal-wrap')
        ? element.closest('.reveal-wrap').querySelector('.reveal-content, #content-card')
        : element.parentElement;
      if (contentArea) {
        window.triggerBurn(contentArea);
      }
    }, durationMs);
  };

  /**
   * Manually triggers the fire-destroy animation on an element.
   * After the animation completes, replaces content with "Burned" text.
   * @param {HTMLElement} element - The element to burn
   */
  window.triggerBurn = function(element) {
    if (!element || element.classList.contains('fire-destroy')) return;

    element.classList.remove('fire-reveal');
    element.classList.add('fire-destroy');

    element.addEventListener('animationend', function handler() {
      element.removeEventListener('animationend', handler);
      element.className = 'fire-burned';
      element.style = '';
      element.innerHTML = '\uD83D\uDD25 Burned';
    }, { once: true });
  };

  /**
   * Adds fire-burst class to an element, removes it after animation ends.
   * @param {HTMLElement} element - The element to apply the burst to
   */
  window.triggerFireBurst = function(element) {
    if (!element) return;

    element.classList.add('fire-burst');

    element.addEventListener('animationend', function handler() {
      element.removeEventListener('animationend', handler);
      element.classList.remove('fire-burst');
    }, { once: true });
  };
});
