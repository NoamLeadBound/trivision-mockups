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
