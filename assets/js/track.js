/* TriVision landing pages: per-lead tracking (Noam 2026-11-12). Built from the client-landing-pages skill's
 * track.js, without Calendly: TriVision's action is the WhatsApp form.
 * Configure on <html>: data-page="<root|hitech|welfare|pro|eng>", data-endpoint="<n8n webhook>".
 * The link carries ?t=<opaque token> (never a name or an email).
 * The page does NOT decide who is human (17.11, the Corz lesson: Microsoft / Oracle / AWS link scanners open
 * every link in a real browser, scroll to the bottom and click buttons). Every event carries the facts and n8n
 * decides with the visitor's IP owner (skill client-landing-pages, references/tracking-alerts.md §2b):
 *   tz/lang  browser time zone + language      wd  navigator.webdriver      inp  first REAL input
 *   (trusted pointer move / wheel / touch / key; scroll alone is not input)    jump  scripted scroll-to-bottom
 * Active seconds count only after real input.
 * Every event carries the visit's running totals (active seconds, deepest scroll %), so the last event
 * of a visit is its summary. Events:
 *   visit · scroll_30/60/90 · time_20/60/180 (active seconds) · video_play/50/90 · form_seen ·
 *   form_started · wa_click (+ what was typed) · tel_click · leave (tab hidden; at most every 30 s)
 * Tracking never breaks the page: every send is a fire-and-forget beacon inside try/catch.
 */
(function () {
  var H = document.documentElement;
  var ENDPOINT = H.getAttribute('data-endpoint') || null;
  var PAGE = H.getAttribute('data-page') || 'root';
  var token = (new URLSearchParams(location.search).get('t') || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24) || null;
  var sid = Math.random().toString(36).slice(2, 10);   // one page load = one visit
  var sent = {};
  var human = false;
  var active = 0;            // seconds visible with an interaction in the last 60 s
  var lastMove = 0;
  var maxScroll = 0;         // deepest point reached, % of the page
  var lastLeave = 0;
  var ctx = { tz: '', lang: navigator.language || '', wd: !!navigator.webdriver, inp: '', jump: false };
  try { ctx.tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* old browser */ }
  var firstScroll = 0;

  // Send gate (26.11.2026): an n8n execution is spent only on a page load that could be a person.
  // Mail-link scanners (Microsoft Defender / Safe Links above all) fake a mouse move and even scroll, so input
  // proves nothing, but they run in the time zone America/Los_Angeles and the browser knows its own zone.
  // Measured 12-26.11 on Trivision + Corz: this gate holds back 185 of 194 scanner loads and 0 of 31 people.
  // A load outside the zone still goes through once it reaches the alert's own bar (20 active seconds, 30%
  // scroll), and then everything it held back is sent with the visit's current totals. A load without a token
  // sends only wa_click, tel_click (n8n drops the rest anyway). n8n still classifies whatever arrives:
  // the gate saves executions, it is not the verdict. data-human-tz="off" turns it off (a campaign abroad).
  var gateTz = ctx.tz;
  var ALWAYS = { wa_click: 1, tel_click: 1 };
  var ZONES = H.getAttribute('data-human-tz') || 'Asia/Jerusalem,Asia/Tel_Aviv';
  var open = ZONES === 'off' || ZONES.split(',').indexOf(gateTz) >= 0;
  var held = [];
  var lastLeaveState = '';
  function beacon(body) {
    try { navigator.sendBeacon(ENDPOINT, new URLSearchParams({ d: JSON.stringify(body) })); } catch (e) { /* never break the page */ }
  }
  function gate() {
    if (open || active < 20 || maxScroll < 30) return;
    open = true;
    held.splice(0).forEach(function (b) { b.active_s = active; b.scroll = maxScroll; beacon(b); });
  }

  function post(name, extra) {
    var x = {};
    for (var k in ctx) x[k] = ctx[k];
    for (var j in (extra || {})) x[j] = extra[j];
    var body = { event: name, t: token, page: PAGE, sid: sid, active_s: active, scroll: maxScroll, extra: x };
    if (!ENDPOINT) { console.info('[lp-track]', body); return; }
    if (!token && !ALWAYS[name]) return;
    if (!open && !ALWAYS[name]) { if (name !== 'leave') held.push(body); return; }
    beacon(body);
  }
  function once(name, extra) {
    if (sent[name]) return;
    sent[name] = true;
    post(name, extra);
  }

  function scrollPct() {
    var h = document.documentElement;
    return Math.min(100, Math.round((h.scrollTop + innerHeight) / h.scrollHeight * 100));
  }
  // Every load says so at once; whether it was a person is decided in n8n.
  once('visit');
  function moved(e) {
    if (e && e.isTrusted === false) return;
    if (e && e.type === 'pointermove' && !(e.movementX || e.movementY)) return;
    lastMove = Date.now();
    if (!human) { human = true; ctx.inp = e ? e.type : 'click'; maxScroll = scrollPct(); once('engaged'); }
  }
  ['pointerdown', 'pointermove', 'wheel', 'touchstart', 'keydown'].forEach(function (ev) {
    addEventListener(ev, moved, { passive: true });
  });

  addEventListener('scroll', function () {
    var p = scrollPct();
    if (!firstScroll) firstScroll = Date.now();
    if (p > maxScroll) maxScroll = p;
    if (p >= 90 && !human && Date.now() - firstScroll < 800) ctx.jump = true;
    if (maxScroll >= 30) once('scroll_30');
    if (maxScroll >= 60) once('scroll_60');
    if (maxScroll >= 90) once('scroll_90');
    gate();
  }, { passive: true });

  setInterval(function () {
    if (!human || document.visibilityState !== 'visible' || Date.now() - lastMove > 60000) return;
    active += 1;
    if (active === 20) once('time_20');
    if (active === 60) once('time_60');
    if (active === 180) once('time_180');
    gate();
  }, 1000);

  addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'hidden' || !human || Date.now() - lastLeave < 30000) return;
    if (lastLeaveState === active + ':' + maxScroll) return;   // nothing new since the last leave
    lastLeaveState = active + ':' + maxScroll;
    lastLeave = Date.now();
    post('leave');
  });

  // The pitch video (and any other tracked video).
  document.querySelectorAll('[data-pitch] video, video[data-track]').forEach(function (v) {
    v.addEventListener('play', function () { once('video_play'); });
    v.addEventListener('timeupdate', function () {
      var p = v.currentTime / (v.duration || 1);
      if (p > 0.5) once('video_50');
      if (p > 0.9) once('video_90');
    });
  });

  // The form: seen, started, sent to WhatsApp. What was typed travels only with wa_click.
  document.querySelectorAll('form[data-wa]').forEach(function (f) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en, io) {
        if (en.some(function (x) { return x.isIntersecting; })) { once('form_seen'); if (sent.form_seen) io.disconnect(); }
      }, { threshold: 0.4 }).observe(f);
    }
    f.addEventListener('input', function () { once('form_started'); });
    function typed() {
      var v = function (n) { return ((f.elements[n] && f.elements[n].value) || '').trim().slice(0, 80); };
      return { name: v('name'), role: v('role'), company: v('company'), size: v('size') };
    }
    f.addEventListener('submit', function (e) { moved(e); once('wa_click', typed()); });
    var go = f.querySelector('.form__go');
    if (go) go.addEventListener('click', function (e) { moved(e); once('wa_click', typed()); });
  });

  document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
    a.addEventListener('click', function (e) { moved(e); once('tel_click'); });
  });
})();
