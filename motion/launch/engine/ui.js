// ui.js: animated UI pieces that recur in app films. Each one is scheduled at build time and drawn as
// a pure function of time: typing (with a keyboard), toggles, sliders, counters and odometers,
// notifications, toasts, chat bubbles, charts that draw themselves, checkmarks, skeleton shimmer,
// confetti, and real footage from an image sequence. Styles: ui.css (classes am-*).
import { clamp, lerp, ez, tw, sp, springs, rng, el, css, text, mixc, rectIn, SPRING } from './core.js';

// ---------- typing ----------
// Types `str` into element `e` from t0 with a human rhythm (seeded, so every render matches). Returns
// the time the last character lands. o.keyboard: a keyboard() whose keys light up as they are hit.
export function typeText(f, e, t0, str, o = {}) {
  const { cps = 15, jitter = .35, seed = 7, caret = true, cue = 'key', keyboard, gain = .32 } = o;
  const r = rng(seed), times = [];
  let t = t0;
  for (const ch of str) {
    times.push(t);
    t += (1 + (r() - .5) * 2 * jitter) / cps * (ch === ' ' ? 1.3 : /[.,!?]/.test(ch) ? 2 : 1);
  }
  times.forEach((tt, i) => {
    if (cue) f.cue(tt, cue, { gain: gain * (.75 + .5 * r()), pitch: .9 + .2 * r() });
    if (keyboard) keyboard.press(tt, str[i]);
  });
  const typed = el('span', e, 'am-typed'), car = caret ? el('span', e, 'am-caret') : null;
  const from = o.caretFrom ?? t0 - .5, until = o.caretUntil ?? Infinity;
  f.add(tt => {
    let n = 0;
    while (n < times.length && times[n] <= tt) n++;
    text(typed, str.slice(0, n));
    if (car) {
      const busy = n > 0 && n < times.length && tt - times[n - 1] < .45;
      const on = busy || Math.floor((tt - t0) * 4.8) % 2 === 0;   // blinks at 2.4 Hz while idle
      css(car, { opacity: tt < from || tt > until || !on ? '0' : '1' });
    }
  });
  return times.length ? times[times.length - 1] : t0;
}

// A generic phone keyboard that rises like a sheet; keys light up when typeText presses them.
export function keyboard(f, parent, o = {}) {
  const { width = 393, dark = false } = o;
  const k = el('div', parent, 'am-kb' + (dark ? ' dark' : ''), { width: width + 'px' });
  const keys = {};
  ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].forEach((row, i) => {
    const r = el('div', k, 'am-kb-row');
    if (i === 2) el('div', r, 'am-key mod wide').textContent = '⇧';
    for (const ch of row) (keys[ch] = el('div', r, 'am-key')).textContent = ch;
    if (i === 2) el('div', r, 'am-key mod wide').textContent = '⌫';
  });
  const last = el('div', k, 'am-kb-row');
  el('div', last, 'am-key mod wide2').textContent = '123';
  keys[' '] = el('div', last, 'am-key space');
  keys[' '].textContent = 'space';
  keys['\n'] = el('div', last, 'am-key mod wide2 ret');
  keys['\n'].textContent = o.returnLabel || 'return';
  const presses = [], shows = [];
  const K = {
    el: k, keys,
    press: (t, ch) => { const key = keys[(ch || '').toLowerCase()]; if (key) presses.push([t, key]); },
    show: (t, d = .42) => { shows.push([t, 1, d]); return t + d; },
    hide: (t, d = .3) => { shows.push([t, 0, d]); return t + d; },
  };
  const H = () => k.offsetHeight || 290;
  f.add(t => {
    let v = shows.length ? (shows[0][1] ? 0 : 1) : 1;
    for (const [t0, to, d] of shows) if (t >= t0) v = lerp(v, to, tw(t, t0, t0 + d, to ? 'decel' : 'accel'));
    css(k, { transform: `translateY(${((1 - v) * (H() + 20)).toFixed(2)}px)`, visibility: v < .001 ? 'hidden' : '' });
    for (const key of Object.values(keys)) {
      const on = presses.some(([pt, kk]) => kk === key && t >= pt && t < pt + .11);
      if (key.__on !== on) { key.__on = on; key.classList.toggle('down', on); }
    }
  });
  return K;
}

// ---------- controls ----------
// A switch. ks: [[t, on], ...] (the first entry is the initial state). The knob's two edges ride
// different springs, so it stretches toward where it is going and catches up.
export function toggle(f, parent, ks, o = {}) {
  const { on = '#34C759', off = '#E3E3E8', size = 1 } = o;
  const tg = el('div', parent, 'am-toggle', { transform: size !== 1 ? `scale(${size})` : '' });
  const knob = el('div', tg, 'am-knob');
  const travel = 20, fast = { duration: .26, bounce: .05 }, slow = { duration: .42, bounce: 0 };
  const L = [[ks[0][0], ks[0][1] ? travel : 0]], R = [[ks[0][0], ks[0][1] ? travel : 0]];
  for (let i = 1; i < ks.length; i++) {
    const [t, v] = ks[i], right = !!v;
    L.push([t, v ? travel : 0, right ? slow : fast]);
    R.push([t, v ? travel : 0, right ? fast : slow]);
    if (o.cue !== false) f.cue(t, 'toggle', { gain: .55 });
  }
  f.add(t => {
    const a = springs(t, L), b = springs(t, R), x = Math.min(a, b), w = 27 + Math.abs(b - a);
    let st = ks[0][1] ? 1 : 0;
    for (const [tk, v] of ks) if (t >= tk) st = lerp(st, v ? 1 : 0, tw(t, tk, tk + .25, 'inOut'));
    css(knob, { transform: `translateX(${x.toFixed(2)}px)`, width: w.toFixed(2) + 'px' });
    css(tg, { background: mixc(off, on, st) });
  });
  return tg;
}

// A slider whose value (0..1) is a function of time: springs over keys [[t, v], ...] or o.value(t)
// (for example from a pointer while it drags). Fill, knob and an optional value bubble follow it.
export function slider(f, parent, ks, o = {}) {
  const { width = 300, color = '#0A84FF', fmt = v => Math.round(v * 100), bubble = false } = o;
  const s = el('div', parent, 'am-slider', { width: width + 'px' });
  const fill = el('div', s, 'am-fill', { background: color });
  const knob = el('div', s, 'am-sknob');
  const bub = bubble ? el('div', s, 'am-bubble') : null;
  const V = o.value || (t => springs(t, ks, o.spring || 'ui'));
  f.add(t => {
    const v = clamp(V(t)), x = v * width;
    css(fill, { width: x.toFixed(2) + 'px' });
    css(knob, { transform: `translateX(${(x - 14).toFixed(2)}px)` });
    if (bub) { css(bub, { transform: `translateX(${(x - 24).toFixed(2)}px)` }); text(bub, String(fmt(v))); }
  });
  s.valueAt = V;
  return s;
}
// value of a slider track driven by a pointer: the finger's x across the track while [t0, t1]
export const fromPointer = (P, track, t0, t1, v0 = 0) => {
  const r = track.x != null ? track : rectIn(track, P.root);
  const at = t => clamp((P.posAt(t)[0] - r.x) / r.w);
  return t => (t < t0 ? v0 : at(Math.min(t, t1)));
};

// ---------- numbers ----------
// A number that counts: ks [[t, value, ease], ...]; fmt formats it (keep the font tabular-nums).
export function counter(f, e, ks, o = {}) {
  const fmt = o.fmt || (v => Math.round(v).toLocaleString('en-US'));
  const ease = o.ease || 'out';
  f.add(t => {
    let v = ks[0][1];
    for (let i = 1; i < ks.length; i++) {
      const [t1, v1, e1] = ks[i], t0 = ks[i - 1][0];
      if (t >= t0) v = lerp(ks[i - 1][1], v1, tw(t, t0, t1, e1 || ease));
    }
    text(e, fmt(v));
  });
  return e;
}
// Rolling digits, like a mechanical counter: each column scrolls a strip of 0-9; higher columns only
// turn while the column below wraps.
export function odometer(f, parent, ks, o = {}) {
  const { digits = 4, prefix = '', suffix = '', ease = 'out' } = o;
  const box = el('div', parent, 'am-odo');
  if (prefix) el('span', box, 'am-odo-fix').textContent = prefix;
  const cols = [];
  for (let i = digits - 1; i >= 0; i--) {
    const c = el('span', box, 'am-odo-col'), strip = el('span', c, 'am-odo-strip');
    for (let d = 0; d <= 10; d++) el('span', strip, '').textContent = String(d % 10);
    cols.push({ p: i, strip, c });
  }
  if (suffix) el('span', box, 'am-odo-fix').textContent = suffix;
  f.add(t => {
    let v = ks[0][1];
    for (let i = 1; i < ks.length; i++) if (t >= ks[i - 1][0]) v = lerp(ks[i - 1][1], ks[i][1], tw(t, ks[i - 1][0], ks[i][0], ks[i][2] || ease));
    for (const { p, strip, c } of cols) {
      const unit = 10 ** p, low = v % unit, base = Math.floor(v / unit) % 10;
      const pos = p === 0 ? v % 10 : base + clamp(low - (unit - 1));
      css(strip, { transform: `translateY(${(-pos * 100 / 11).toFixed(4)}%)` });   // 11 cells: 0-9 and 0 again
      css(c, { opacity: o.lead === false || v >= unit || p === 0 ? '1' : '.18' });
    }
  });
  return box;
}

// ---------- system surfaces ----------
// A notification banner that drops from the top on a spring and leaves at o.until.
// o: { app, title, body, time, icon (css background or <img> url), until, top }
export function notify(f, parent, t0, o = {}) {
  const n = el('div', parent, 'am-notif' + (o.dark ? ' dark' : ''));
  const ic = el('div', n, 'am-notif-icon');
  if (o.icon && /\.(png|jpe?g|svg|webp)$/i.test(o.icon)) ic.style.backgroundImage = `url(${o.icon})`;
  else ic.style.background = o.icon || '#0A84FF';
  if (o.glyph) ic.textContent = o.glyph;
  const b = el('div', n, 'am-notif-body');
  b.innerHTML = `<div class="am-notif-top"><b>${o.app || 'App'}</b><span>${o.time || 'now'}</span></div><div class="am-notif-title">${o.title || ''}</div><div class="am-notif-text">${o.body || ''}</div>`;
  const top = o.top ?? 58, until = o.until ?? Infinity, shift = o.shift || [];   // shift: [[t, dy], ...] when newer ones arrive
  f.add(t => {
    const s = sp(t, t0, { duration: .55, bounce: .14 }), out = tw(t, until, until + .35, 'in');
    let dy = 0;
    for (const [ts, d] of shift) dy += d * sp(t, ts, 'ui');
    const y = lerp(-150, top, s) + dy - out * 190;
    css(n, { transform: `translateY(${y.toFixed(2)}px) scale(${lerp(.94, 1, clamp(s)).toFixed(4)})`, visibility: t < t0 || out >= 1 ? 'hidden' : '' });
  });
  if (o.cue !== false) f.cue(t0, 'notify', { gain: .6 });
  return n;
}
// Several notifications: each new one arrives on top and pushes the older ones down.
export function notifyStack(f, parent, list, o = {}) {
  const gap = o.gap ?? 10, shifts = list.map(() => []);
  const els = list.map((n, i) => notify(f, parent, n.t, { ...o, ...n, shift: shifts[i] }));
  list.forEach((n, i) => { for (let j = i + 1; j < list.length; j++) shifts[i].push([list[j].t, els[j].offsetHeight + gap]); });
  return els;
}
export function toast(f, parent, t0, o = {}) {
  const n = el('div', parent, 'am-toast' + (o.dark === false ? ' light' : ''));
  n.innerHTML = (o.icon ? `<span class="am-toast-icon">${o.icon}</span>` : '') + `<span>${o.text || 'Saved'}</span>`;
  const until = o.until ?? t0 + 2, bottom = o.bottom ?? 110;
  f.add(t => {
    const s = sp(t, t0, { duration: .5, bounce: .18 }), out = tw(t, until, until + .3, 'in');
    css(n, { transform: `translate(-50%, ${(lerp(140, -bottom, s) + out * 160).toFixed(2)}px) scale(${lerp(.9, 1, clamp(s)).toFixed(4)})`, opacity: (clamp(s * 3) * (1 - out)).toFixed(3), visibility: t < t0 || out >= 1 ? 'hidden' : '' });
  });
  if (o.cue !== false) f.cue(t0, 'pop', { gain: .45 });
  return n;
}

// Chat thread. msgs: [{ t, me, text, typing }] (typing: seconds of the "..." bubble before a reply).
// New bubbles pop in at the bottom and push the thread up on a spring.
export function chat(f, parent, msgs, o = {}) {
  const gap = o.gap ?? 8, col = el('div', parent, 'am-chat');
  const items = msgs.map(m => {
    const b = el('div', col, 'am-bubble-msg ' + (m.me ? 'me' : 'them'));
    b.innerHTML = m.html || m.text;
    return { ...m, b };
  });
  const dots = el('div', col, 'am-bubble-msg them am-typing');
  dots.innerHTML = '<i></i><i></i><i></i>';
  const hs = items.map(i => i.b.offsetHeight);
  f.add(t => {
    let shown = 0;
    items.forEach(it => { if (t >= it.t) shown++; });
    items.forEach((it, i) => {
      let lift = 0;
      for (let j = i + 1; j < items.length; j++) lift += (hs[j] + gap) * sp(t, items[j].t, 'ui');
      const s = sp(t, it.t, { duration: .42, bounce: .18 });
      css(it.b, { transform: `translateY(${(-lift).toFixed(2)}px) scale(${lerp(.55, 1, clamp(s, 0, 1.2)).toFixed(4)})`, opacity: clamp(s * 2.5).toFixed(3), visibility: t < it.t ? 'hidden' : '' });
    });
    const next = items.find(it => !it.me && it.typing && t >= it.t - it.typing && t < it.t);
    css(dots, { visibility: next ? '' : 'hidden', opacity: next ? '1' : '0' });
    if (next) [...dots.children].forEach((d, k) => css(d, { transform: `translateY(${(-3 * Math.max(0, Math.sin((t * 2.2 - k * .18) * Math.PI * 2))).toFixed(2)}px)` }));
    void shown;
  });
  items.forEach(it => f.cue(it.t, it.me ? 'send' : 'receive', { gain: .5 }));
  return col;
}

// ---------- charts ----------
// Bars grow from their base, staggered. els: bar elements (any layout); values scale their heights.
export function bars(f, els, t0, o = {}) {
  const { step = .06, spring = { duration: .6, bounce: .1 } } = o;
  els.forEach((b, i) => {
    css(b, { transformOrigin: o.origin || '50% 100%' });
    f.add(t => css(b, { transform: `scaleY(${Math.max(0, sp(t, t0 + i * step, spring)).toFixed(4)})`, visibility: t < t0 + i * step ? 'hidden' : '' }));
  });
  return t0 + (els.length - 1) * step;
}
// An SVG path that draws itself (lines, checkmarks, signatures, routes). o.dot rides the tip.
export function draw(f, path, t0, o = {}) {
  const { dur = .9, ease = 'inOut', dot } = o;
  const L = path.getTotalLength();
  css(path, { strokeDasharray: `${L} ${L}` });
  f.add(t => {
    const u = tw(t, t0, t0 + dur, ease);
    css(path, { strokeDashoffset: (L * (1 - u)).toFixed(2), visibility: u <= 0 ? 'hidden' : '' });
    if (dot) {
      const p = path.getPointAtLength(L * u);
      css(dot, { transform: `translate(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px)`, visibility: u <= 0 ? 'hidden' : '' });
    }
  });
  return t0 + dur;
}
// A ring that fills to `pct` (0..1): an SVG <circle> with a stroke
export function ring(f, circle, ks, o = {}) {
  const r = +circle.getAttribute('r'), C = 2 * Math.PI * r;
  css(circle, { strokeDasharray: `${C} ${C}` });
  f.add(t => css(circle, { strokeDashoffset: (C * (1 - clamp(springs(t, ks, o.spring || 'soft')))).toFixed(2) }));
  return circle;
}
// Skeleton placeholders with a light sweeping across them until t1
export function shimmer(f, els, t0, t1, o = {}) {
  const { period = 1.1 } = o;
  els.forEach(e => e.classList.add('am-skel'));
  f.add(t => els.forEach(e => css(e, { backgroundPosition: `${(((t - t0) / period) % 1 * -200 + 100).toFixed(2)}% 0`, opacity: (1 - tw(t, t1, t1 + .25, 'lin')).toFixed(3) })));
}

// ---------- celebration ----------
// Confetti from a point (closed-form physics with drag, so any frame can be drawn alone)
export function confetti(f, parent, t0, o = {}) {
  const { x = parent.offsetWidth / 2, y = parent.offsetHeight / 2, n = 90, colors = ['#FF5A5F', '#FFC93C', '#3DDC97', '#4C8DFF', '#B36BFF'], power = 1100, spread = Math.PI * .9, angle = -Math.PI / 2, gravity = 1400, life = 2.2, size = 9, seed = 3 } = o;
  const W = parent.offsetWidth || f.W, H = parent.offsetHeight || f.H, dpr = o.dpr || 2;
  const c = el('canvas', parent, 'am-canvas');
  c.width = W * dpr;
  c.height = H * dpr;
  const x2 = c.getContext('2d'), r = rng(seed), k = 2.2;
  const P = Array.from({ length: n }, () => ({ a: angle + (r() - .5) * spread, v: power * (.45 + .55 * r()), rot: r() * 6.28, w: (r() - .5) * 18, col: colors[Math.floor(r() * colors.length)], s: size * (.6 + .8 * r()), ph: r() * 6.28, sh: r() < .3 }));
  f.add(t => {
    x2.setTransform(1, 0, 0, 1, 0, 0);
    x2.clearRect(0, 0, c.width, c.height);
    const s = t - t0;
    if (s < 0 || s > life) return css(c, { visibility: 'hidden' });
    css(c, { visibility: '' });
    x2.setTransform(dpr, 0, 0, dpr, 0, 0);
    const drag = (1 - Math.exp(-k * s)) / k;
    for (const p of P) {
      const px = x + Math.cos(p.a) * p.v * drag + Math.sin(s * 3 + p.ph) * 14;
      const py = y + Math.sin(p.a) * p.v * drag + gravity * (s - drag) / k;
      x2.save();
      x2.translate(px, py);
      x2.rotate(p.rot + p.w * s);
      x2.globalAlpha = 1 - clamp((s - life * .7) / (life * .3));
      x2.fillStyle = p.col;
      const sq = Math.abs(Math.cos(s * 6 + p.ph));
      if (p.sh) { x2.beginPath(); x2.arc(0, 0, p.s * .4, 0, 7); x2.fill(); } else x2.fillRect(-p.s / 2, -p.s * .3 * sq, p.s, p.s * .6 * sq + .5);
      x2.restore();
    }
  });
  if (o.cue !== false) f.cue(t0, 'success', { gain: .55 });
  return c;
}

// ---------- footage ----------
// Real screen recordings, as an image sequence made by `scripts/prep.mjs footage` (frames swap per
// film frame and every seek waits for the decode, which a <video> element cannot promise).
export async function footage(f, parent, o = {}) {
  const { dir, t0 = 0, speed = 1, loop = false, fit = 'cover' } = o;
  const meta = o.meta || (await fetch(dir + '/meta.json').then(r => r.json()));
  const img = el('img', parent, 'am-footage', { objectFit: fit });
  const name = i => `${dir}/${String(i + 1).padStart(5, '0')}.${meta.ext || 'jpg'}`;
  img.src = name(0);
  await img.decode().catch(() => {});
  let cur = 0;
  f.add(t => {
    let i = Math.floor(Math.max(0, t - t0) * meta.fps * speed + 1e-6);
    i = loop ? i % meta.count : Math.min(i, meta.count - 1);
    if (i !== cur) {
      cur = i;
      img.src = name(i);
      f.wait(img.decode().catch(() => {}));
    }
  });
  img.duration = meta.count / meta.fps / speed;
  return img;
}
export { SPRING };
