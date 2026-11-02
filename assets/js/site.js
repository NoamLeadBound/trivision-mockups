// TriVision B2B landing: interactions shared by both directions.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const inFrame = window.self !== window.top; // the gallery preview
  const vh = () => window.innerHeight;

  // ---- header hairline ----
  const hdr = $('.hdr');

  // ---- reveal on enter ----
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    $$('[data-reveal]').forEach((el) => {
      const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
      if (sibs.length > 1) el.style.setProperty('--d', `${sibs.indexOf(el) * 0.08}s`);
      io.observe(el);
    });
  } else {
    $$('[data-reveal]').forEach((el) => el.classList.add('in'));
  }

  // ---- pitch video: muted autoplay with burned-in captions, click = restart with sound ----
  $$('[data-pitch]').forEach((card) => {
    const v = $('video', card);
    const btn = $('.pitch__play', card);
    if (!reduce && !inFrame) {
      new IntersectionObserver(([e]) => {
        if (card.classList.contains('is-sound')) { if (!e.isIntersecting) v.pause(); return; }
        if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
      }, { threshold: 0.3 }).observe(v);
    }
    btn.addEventListener('click', () => {
      card.classList.add('is-sound');
      v.muted = false; v.loop = false; v.controls = true; v.currentTime = 0;
      v.play().catch(() => {});
    });
  });
  $$('[data-play-pitch]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const card = $('[data-pitch]');
    card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    $('.pitch__play', card).click();
  }));

  // ---- night hero: the wings unfold once, like the product ----
  const tri = $('[data-tri]');
  if (tri) {
    if (reduce || inFrame) tri.style.setProperty('--open', 1);
    else requestAnimationFrame(() => setTimeout(() => tri.style.setProperty('--open', 1), 250));
  }

  // ---- 01 statement: words light up with the scroll ----
  const st = $('[data-words]');
  let words = [];
  if (st) {
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((t) => {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.append(t); return; }
          const s = document.createElement('span'); s.className = 'w'; s.textContent = t; frag.append(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(st);
    words = $$('.w', st);
    if (reduce || inFrame) words.forEach((w) => w.classList.add('on'));
  }

  // ---- 03 offer line ----
  const offer = $('[data-offer]');

  // ---- 02 film: scroll-scrubbed frames from the client's own footage ----
  const film = $('[data-film]');
  const F = {};
  if (film) {
    F.n = +film.dataset.frames;
    F.base = film.dataset.src;
    F.ch = film.dataset.chapters.split(',').map((r) => r.split('-').map(Number));
    F.track = $('.film__track', film);
    F.canvas = $('canvas', film);
    F.ctx = F.canvas.getContext('2d');
    F.items = $$('.film__chapters li', film);
    F.bars = F.items.map((li) => $('.film__bar i', li));
    F.img = new Array(F.n);
    F.shown = -1;
    F.want = 0;
    if (reduce) {
      film.classList.add('is-static');
    } else {
      const url = (i) => `${F.base}${String(i).padStart(3, '0')}.webp`;
      const load = (i) => {
        if (F.img[i]) return;
        const im = new Image();
        im.decoding = 'async';
        im.onload = () => { im.ok = true; if (Math.abs(i - F.want) < 4) F.dirty = true; };
        im.src = url(i);
        F.img[i] = im;
      };
      // coarse pass first (every 8th, then 4th, 2nd, all) so scrubbing works before everything lands
      const order = [];
      for (const step of [8, 4, 2, 1]) for (let i = 0; i < F.n; i += step) if (!order.includes(i)) order.push(i);
      let started = false;
      const start = () => {
        if (started) return; started = true;
        let k = 0;
        const pump = () => { for (let j = 0; j < 6 && k < order.length; j++) load(order[k++]); if (k < order.length) setTimeout(pump, 40); };
        pump();
      };
      new IntersectionObserver(([e]) => { if (e.isIntersecting) start(); }, { rootMargin: '1200px 0px' }).observe(film);
      F.size = () => {
        const r = F.canvas.getBoundingClientRect();
        const d = Math.min(window.devicePixelRatio || 1, 2);
        F.canvas.width = Math.round(r.width * d); F.canvas.height = Math.round(r.height * d);
        F.shown = -1; F.dirty = true;
      };
      F.draw = () => {
        // nearest loaded frame to the one we want
        let pick = -1;
        for (let o = 0; o < F.n; o++) {
          const a = F.want - o, b = F.want + o;
          if (a >= 0 && F.img[a] && F.img[a].ok) { pick = a; break; }
          if (b < F.n && F.img[b] && F.img[b].ok) { pick = b; break; }
        }
        if (pick < 0 || pick === F.shown) return;
        const im = F.img[pick], cw = F.canvas.width, ch = F.canvas.height;
        const s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
        const w = im.naturalWidth * s, h = im.naturalHeight * s;
        F.ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
        F.shown = pick;
      };
      addEventListener('resize', F.size);
      F.size();
    }
  }

  // ---- hero: the laptop's screens slide out as you scroll ----
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => t * t * (3 - 2 * t);
  const unf = $('[data-unfold]');
  const U = unf ? { track: $('.hero3__track', unf), dev: $('[data-unfold-dev]', unf), count: $('[data-count]', unf), three: null } : null;
  const unfoldAt = (p) => {
    const s = U.dev.style;
    s.setProperty('--slide', ease(seg(p, 0.04, 0.42)).toFixed(3));
    s.setProperty('--on', seg(p, 0.26, 0.52).toFixed(3));
    s.setProperty('--tilt', ease(seg(p, 0.4, 0.68)).toFixed(3));
    s.setProperty('--lbl', seg(p, 0.62, 0.82).toFixed(3));
    unf.style.setProperty('--hint', seg(p, 0.02, 0.18).toFixed(3));
    const three = p > 0.3;
    if (U.count && three !== U.three) { U.three = three; U.count.textContent = three ? 'שלושה מסכים' : 'מסך אחד'; }
  };
  if (U && (reduce || inFrame)) unfoldAt(1);

  // ---- ambient video inside the drawn screens ----
  if (!reduce && !inFrame) {
    $$('video[data-ambient]').forEach((v) => new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
    }, { threshold: 0.2 }).observe(v));
  }

  // ---- product cards drive the drawn device (2 / 3 / 4 screens) ----
  const prod = $('[data-prod]');
  if (prod) {
    const dev = $('[data-prod-dev]', prod);
    const cards = $$('.pcard', prod);
    let auto = !reduce && !inFrame, idx = cards.findIndex((c) => c.getAttribute('aria-selected') === 'true'), timer = null;
    const pick = (n) => {
      dev.dataset.n = n;
      prod.dataset.n = n;
      cards.forEach((c) => c.setAttribute('aria-selected', String(c.dataset.n === n)));
    };
    cards.forEach((c) => c.addEventListener('click', () => { auto = false; clearInterval(timer); pick(c.dataset.n); }));
    if (auto) {
      new IntersectionObserver(([e]) => {
        clearInterval(timer);
        if (e.isIntersecting && auto) timer = setInterval(() => { idx = (idx + 1) % cards.length; pick(cards[idx].dataset.n); }, 3400);
      }, { threshold: 0.35 }).observe(dev);
    }
  }

  // ---- offer stepper: advances by itself while in view, a click takes over ----
  const stepper = $('[data-stepper]');
  if (stepper) {
    const items = $$('li', stepper);
    const imgs = $$('[data-step-imgs] img');
    const go = (i) => {
      items.forEach((li, k) => { li.classList.toggle('is-on', k === i); $('button', li).setAttribute('aria-expanded', String(k === i)); });
      imgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
    };
    items.forEach((li, k) => {
      $('button', li).addEventListener('click', () => { stepper.classList.remove('is-running'); stepper.dataset.manual = '1'; go(k); });
      $('.stepper__bar i', li).addEventListener('animationend', () => { if (stepper.classList.contains('is-running')) go((k + 1) % items.length); });
    });
    if (!reduce && !inFrame) {
      new IntersectionObserver(([e]) => { if (!stepper.dataset.manual) stepper.classList.toggle('is-running', e.isIntersecting); }, { threshold: 0.4 }).observe(stepper);
    }
  }

  // ---- mobile sticky CTA ----
  const sticky = $('.sticky-cta');
  const heroEl = $('[data-hero]');
  const demoEl = $('#demo');

  // ---- one scroll loop for everything scroll-linked ----
  let ticking = false;
  const frame = () => {
    ticking = false;
    const H = vh();
    if (hdr) hdr.classList.toggle('is-scrolled', scrollY > 8);

    if (words.length && !reduce && !inFrame) {
      const r = st.getBoundingClientRect();
      const p = clamp((H * 0.82 - r.top) / (r.height + H * 0.3));
      const on = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < on));
    }

    if (U && !reduce && !inFrame) {
      const r = U.track.getBoundingClientRect();
      unfoldAt(clamp(-r.top / Math.max(1, r.height - H)));
    }

    if (offer) {
      const r = offer.getBoundingClientRect();
      offer.style.setProperty('--p', clamp((H * 0.75 - r.top) / (r.height * 0.6)).toFixed(3));
    }

    if (film && !reduce) {
      const r = F.track.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - H));
      const n = F.ch.length;
      const c = Math.min(n - 1, Math.floor(p * n));
      const local = clamp((p * n - c - 0.06) / 0.82); // short hold at each chapter's start and end
      const [a, b] = F.ch[c];
      F.want = Math.round(a + local * (b - a));
      F.items.forEach((li, i) => li.classList.toggle('is-on', i === c));
      F.bars.forEach((bar, i) => bar && bar.style.setProperty('--t', i < c ? 1 : i === c ? local.toFixed(3) : 0));
      if (F.want !== F.shown || F.dirty) { F.dirty = false; F.draw(); }
    }

    if (sticky && heroEl) {
      const past = heroEl.getBoundingClientRect().bottom < 0;
      const atForm = demoEl && demoEl.getBoundingClientRect().top < H * 0.9;
      sticky.classList.toggle('is-on', past && !atForm);
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  // frames that finish loading while the page sits still
  if (film && !reduce) setInterval(() => { if (F.dirty) onScroll(); }, 120);
  frame();

  // ---- mockup form ----
  $$('form[data-mock]').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault();
    f.classList.add('is-sent');
  }));
})();
