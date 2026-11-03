// core.js: math, easing, closed-form springs, deterministic noise, colour and DOM helpers.
// Everything here is a pure function: the film seeks to any time in any order, so nothing may
// depend on the previous frame, a timer, Date or Math.random.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const inv = (a, b, x) => (b === a ? (x >= b ? 1 : 0) : (x - a) / (b - a));
export const remap = (x, a, b, c, d, e) => lerp(c, d, (e || (u => u))(clamp(inv(a, b, x))));

// ---------- easing ----------
// cubic-bezier with the same maths as CSS: Newton steps, then bisection when the slope is flat.
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = s => ((ax * s + bx) * s + cx) * s, Y = s => ((ay * s + by) * s + cy) * s;
  const dX = s => (3 * ax * s + 2 * bx) * s + cx;
  return u => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    let s = u;
    for (let i = 0; i < 8; i++) {
      const e = X(s) - u;
      if (Math.abs(e) < 1e-7) return Y(s);
      const d = dX(s);
      if (Math.abs(d) < 1e-6) break;
      s -= e / d;
    }
    let lo = 0, hi = 1;
    s = u;
    for (let i = 0; i < 40; i++) {
      const v = X(s);
      if (Math.abs(v - u) < 1e-7) break;
      if (v < u) lo = s; else hi = s;
      s = (lo + hi) / 2;
    }
    return Y(s);
  };
}

// Named curves. Arrivals use `out`, departures `in`, A-to-B moves `inOut`, camera moves `cam`.
export const E = {
  lin: u => u,
  out: bezier(.16, 1, .3, 1),        // fast start, long soft landing: anything arriving
  in: bezier(.7, 0, .84, 0),         // leaves fast and doesn't linger: exits
  inOut: bezier(.65, 0, .35, 1),     // move between two states: flips, docks, morphs
  cam: bezier(.45, 0, .2, 1),        // camera: eases in gently, settles long
  ui: bezier(.2, 0, 0, 1),           // standard UI motion (push, tab switch)
  decel: bezier(.05, .7, .1, 1),     // momentum: scroll flings, sheets arriving
  accel: bezier(.3, 0, .8, .15),     // UI leaving the screen
  back: bezier(.34, 1.56, .64, 1),   // one small overshoot; prefer a spring with bounce .15
  outCubic: u => 1 - (1 - u) ** 3,
  inCubic: u => u * u * u,
  outQuint: u => 1 - (1 - u) ** 5,
  inOutSine: u => -(Math.cos(Math.PI * u) - 1) / 2,
};
export const ez = e => (typeof e === 'function' ? e : E[e] || E.out);

// progress 0..1 of [a, b] through an easing
export const tw = (t, a, b, e = E.out) => ez(e)(clamp(inv(a, b, t)));
// 0 -> 1 -> 0 envelope: rises over [a, a + r], holds, falls over [b - f, b]
export const env = (t, a, b, r = .2, f = .2) => Math.min(tw(t, a, a + r, E.out), 1 - tw(t, b - f, b, E.in));
export const within = (t, a, b) => t >= a && t < b;

// Piecewise keyframes: [[t, value, ease?], ...]. The ease of a key shapes the segment that ends on it.
// Values may be numbers or arrays of numbers. Holds the first value before and the last after.
export function keys(t, ks) {
  if (!ks.length) return 0;
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    const [t1, v1, e] = ks[i];
    if (t < t1) {
      const [t0, v0] = ks[i - 1], u = ez(e || 'inOut')(clamp(inv(t0, t1, t)));
      return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], u)) : lerp(v0, v1, u);
    }
  }
  return ks[ks.length - 1][1];
}

// ---------- springs ----------
// Closed-form step response of a damped spring (0 at s = 0, settling at 1), s = seconds since the step.
// Config like SwiftUI: { duration, bounce } (duration is the perceptual settle time, bounce 0 = no overshoot,
// .15 = a hint, .3 = playful), or physical { stiffness, damping, mass }.
const SPRING_CACHE = new Map();
export function springFn(cfg = {}) {
  const key = JSON.stringify(cfg);
  if (SPRING_CACHE.has(key)) return SPRING_CACHE.get(key);
  let w0, z;
  if (cfg.stiffness) {
    const m = cfg.mass ?? 1;
    w0 = Math.sqrt(cfg.stiffness / m);
    z = (cfg.damping ?? 10) / (2 * Math.sqrt(cfg.stiffness * m));
  } else {
    const d = cfg.duration ?? .5, b = cfg.bounce ?? 0;
    w0 = 2 * Math.PI / d;
    z = b >= 0 ? 1 - b : 1 / (1 + b);
  }
  let f;
  if (Math.abs(z - 1) < 1e-4) f = s => (s <= 0 ? 0 : 1 - Math.exp(-w0 * s) * (1 + w0 * s));
  else if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z), k = z * w0 / wd;
    f = s => (s <= 0 ? 0 : 1 - Math.exp(-z * w0 * s) * (Math.cos(wd * s) + k * Math.sin(wd * s)));
  } else {
    // overdamped, written with exponentials that cannot overflow
    const wd = w0 * Math.sqrt(z * z - 1), a = z * w0, k = a / wd;
    f = s => {
      if (s <= 0) return 0;
      const p = Math.exp((wd - a) * s), q = Math.exp(-(wd + a) * s);
      return 1 - ((p + q) / 2 + k * (p - q) / 2);
    };
  }
  SPRING_CACHE.set(key, f);
  return f;
}
export const SPRING = {
  ui: { duration: .5, bounce: 0 },         // default settle: UI entering, panels
  soft: { duration: .8, bounce: 0 },       // big, heavy, calm: devices, sheets of content
  snappy: { duration: .32, bounce: .05 },  // a control snapping: toggle knob, tab indicator
  pop: { duration: .45, bounce: .22 },     // badges, icons, callouts popping from zero
  hero: { duration: .6, bounce: .32 },     // one celebratory moment per film, not more
};
const spc = c => (typeof c === 'string' ? SPRING[c] : c || SPRING.ui);
// spring progress from t0: 0 before, then 0 -> 1 (with overshoot if the spring bounces)
export const sp = (t, t0, cfg) => springFn(spc(cfg))(t - t0);
// A value that changes target many times: [[t, value, cfg?], ...]. The sum of one step response per
// change (the spring is linear, so superposition is exact), so velocity carries across retargets and
// the value stays a pure function of time.
export function springs(t, ks, cfg) {
  if (!ks.length) return 0;
  const arr = Array.isArray(ks[0][1]);
  let v = arr ? ks[0][1].slice() : ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    const [ti, vi, c] = ks[i];
    if (t <= ti) break;
    const s = springFn(spc(c || cfg))(t - ti), prev = ks[i - 1][1];
    if (arr) for (let j = 0; j < v.length; j++) v[j] += (vi[j] - prev[j]) * s;
    else v += (vi - prev) * s;
  }
  return v;
}
// how long a spring takes to stay within 0.5 % of its target (for planning beats)
export function settleTime(cfg) {
  const f = springFn(spc(cfg));
  let last = 0;
  for (let s = 0; s < 6; s += 1 / 240) if (Math.abs(1 - f(s)) > .005) last = s;
  return last;
}

// ---------- deterministic randomness ----------
export function rng(seed = 1) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash = n => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
// smooth 1D value noise in [-1, 1]: organic drift without randomness between frames
export function noise(t, seed = 0) {
  const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 101.3), hash(i + 1 + seed * 101.3), u) * 2 - 1;
}

// ---------- colour ----------
const hexRGB = h => {
  if (h[0] === '#') {
    const s = h.length === 4 ? h.slice(1).split('').map(c => c + c).join('') : h.slice(1, 7);
    return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16));
  }
  return (h.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
};
export const mixc = (a, b, u) => {
  const A = hexRGB(a), B = hexRGB(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(u))).toString(16).padStart(2, '0')).join('');
};
export const rgba = (h, a) => `rgba(${hexRGB(h).join(',')},${a})`;
export const luminance = h => {
  const [r, g, b] = hexRGB(h).map(v => {
    v /= 255;
    return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  });
  return .2126 * r + .7152 * g + .0722 * b;
};
export const readableOn = (bg, dark = '#111111', light = '#FFFFFF') => (luminance(bg) > .4 ? dark : light);

// ---------- DOM ----------
export function el(tag, parent, cls, style) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (style) Object.assign(e.style, style);
  if (parent) parent.appendChild(e);
  return e;
}
// build from markup; returns the first element (or all of them with all = true)
export function h(parent, markup, all = false) {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup.trim();
  const nodes = [...tpl.content.children];
  if (parent) nodes.forEach(n => parent.appendChild(n));
  return all ? nodes : nodes[0];
}
export const $ = (root, sel) => (typeof sel === 'string' ? root.querySelector(sel) : sel);
export const $$ = (root, sel) => [...root.querySelectorAll(sel)];
// style writes are cached per element: unchanged values never touch the DOM
export function css(e, props) {
  const c = e.__css || (e.__css = {});
  for (const k in props) {
    const v = props[k];
    if (c[k] !== v) {
      c[k] = v;
      if (k.startsWith('--')) e.style.setProperty(k, v);
      else e.style[k] = v;
    }
  }
}
export function text(e, s) { if (e.__txt !== s) { e.__txt = s; e.textContent = s; } }
export const px = v => `${+v.toFixed(2)}px`;

// Layout rectangle of `e` relative to `root` (its padding box), from offsets, so transforms (camera,
// device tilt, preview scaling) never leak into it. Measure after fonts load, while the element is laid
// out: visibility: hidden is fine, display: none measures 0.
const absOffset = n => {
  let x = 0, y = 0;
  while (n) {
    x += n.offsetLeft;
    y += n.offsetTop;
    const p = n.offsetParent;
    if (p) { x += p.clientLeft; y += p.clientTop; }
    n = p;
  }
  return [x, y];
};
export function rectIn(e, root) {
  const [ex, ey] = absOffset(e), [rx, ry] = absOffset(root);
  const x = ex - rx - root.clientLeft, y = ey - ry - root.clientTop, w = e.offsetWidth, hh = e.offsetHeight;
  return { x, y, w, h: hh, cx: x + w / 2, cy: y + hh / 2 };
}
