// Direction B only, on top of site.js.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const inFrame = window.self !== window.top; // the gallery preview
  const clamp = (v) => Math.min(1, Math.max(0, v));

  // The Zoom screen's video starts only once that screen has slid out from behind the lid,
  // so a visitor who bounces from the first view never downloads it.
  const dev = document.querySelector('[data-unfold-dev]');
  const vid = dev && dev.querySelector('video');

  // The scroll hint under the film belongs to its start.
  const hint = document.querySelector('.film__hint');
  const track = document.querySelector('.film__track');

  let ticking = false;
  const frame = () => {
    ticking = false;
    if (vid && !reduce && !inFrame) {
      const out = parseFloat(dev.style.getPropertyValue('--on')) > 0.05;
      const r = vid.getBoundingClientRect();
      const seen = r.bottom > 0 && r.top < innerHeight;
      if (out && seen) { if (vid.paused) vid.play().catch(() => {}); } else if (!vid.paused) vid.pause();
    }
    if (hint && track) {
      const r = track.getBoundingClientRect();
      hint.style.opacity = 1 - clamp((-r.top / Math.max(1, r.height - innerHeight)) / 0.1);
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  frame();
})();

// Form without a server: builds a WhatsApp Business message (name, company, employees, source page) and opens
// wa.me. Nothing is sent from here; the visitor presses send in WhatsApp.
(() => {
  const NL = '\n';
  const build = (f) => {
    const v = (n) => ((f.elements[n] && f.elements[n].value) || '').trim();
    const lines = ['שלום, אשמח לתאם הדגמה של TriVision.', 'שם: ' + v('name')];
    if (v('role')) lines.push('תפקיד: ' + v('role'));
    lines.push('חברה: ' + v('company'), 'מספר עובדים: ' + v('size'), 'דף מקור: ' + (f.dataset.source || ''));
    return 'https://wa.me/' + f.dataset.wa + '?text=' + encodeURIComponent(lines.join(NL));
  };
  document.querySelectorAll('form[data-wa]').forEach((f) => {
    const go = f.querySelector('.form__go');
    const sync = () => { if (go) go.href = build(f); };
    f.addEventListener('input', sync);
    f.addEventListener('change', sync);
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const href = build(f);
      if (go) go.href = href;
      f.classList.add('is-sent');
      window.open(href, '_blank', 'noopener');
    });
    sync();
  });
})();
