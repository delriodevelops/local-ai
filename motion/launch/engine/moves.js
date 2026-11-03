// moves.js: the motion catalog. Every move registers a contribution on a node (film.node(el)) and is
// a pure function of time, so moves stack: rise + float + turn on one phone simply add up.
// Before its start a move holds its first state (an entrance keeps the node hidden), after its end
// the last one. Times are seconds; use film.B(k) for beats. Catalog with timings: references/moves.md
import { clamp, lerp, ez, tw, sp, springs, noise, keys, mixc, el, css, E } from './core.js';

const dirVec = (d, dist) => (Array.isArray(d) ? d : { left: [-dist, 0], right: [dist, 0], up: [0, -dist], top: [0, -dist], down: [0, dist], bottom: [0, dist] }[d] || [0, dist]);
const fadeIn = (t, t0, d) => (d <= 0 ? (t >= t0 ? 1 : 0) : clamp((t - t0) / d));

// ---------- entrances ----------
// Rise into place from below on a spring. The default device and card entrance.
export function rise(n, t0, o = {}) {
  const { dist = 240, spring = 'soft', fade = .25, tilt = 0, from = 1, roll = 0 } = o;
  return n.mod(t => {
    const s = sp(t, t0, spring);
    return { y: (1 - s) * dist, o: fadeIn(t, t0, fade), rx: (1 - s) * tilt, s: lerp(from, 1, s), rz: (1 - s) * roll };
  });
}
export const drop = (n, t0, o = {}) => rise(n, t0, { ...o, dist: -(o.dist ?? 240) });
// Slide in from a side: 'left' | 'right' | 'up' | 'down' or [dx, dy]
export function slide(n, t0, o = {}) {
  const { from = 'right', dist = 300, spring = 'ui', fade = .2 } = o, [dx, dy] = dirVec(from, dist);
  return n.mod(t => {
    const s = 1 - sp(t, t0, spring);
    return { x: dx * s, y: dy * s, o: fadeIn(t, t0, fade) };
  });
}
// Pop from a point on a spring with a little overshoot: icons, badges, chips, pins
export function pop(n, t0, o = {}) {
  const { spring = 'pop', from = 0, fade = .08 } = o;
  return n.mod(t => ({ s: lerp(from, 1, sp(t, t0, spring)), o: fadeIn(t, t0, fade) }));
}
// Settle from a perspective tilt toward a frontal view: a product surface arriving
export function tiltIn(n, t0, o = {}) {
  const { rx = 24, ry = -14, dist = 140, spring = 'soft', fade = .3, from = .94 } = o;
  return n.mod(t => {
    const s = sp(t, t0, spring), k = 1 - s;
    return { rx: rx * k, ry: ry * k, y: dist * k, s: lerp(from, 1, s), o: fadeIn(t, t0, fade) };
  });
}
// Flip in around an axis: a card turning over (opacity stays on the wrapper, see craft.md)
export function flipIn(n, t0, o = {}) {
  const { axis = 'y', from = 90, spring = 'ui' } = o;
  return n.mod(t => {
    const a = from * (1 - sp(t, t0, spring));
    return { [axis === 'y' ? 'ry' : 'rx']: a, o: t >= t0 ? 1 : 0 };
  });
}
// Arrive large and settle (optionally from a blur, which premium briefs usually ban)
export function zoomIn(n, t0, o = {}) {
  const { from = 1.5, dur = .7, ease = 'out', blur = 0, fade = .2 } = o;
  return n.mod(t => {
    const u = tw(t, t0, t0 + dur, ease);
    return { s: lerp(from, 1, u), blur: blur * (1 - u), o: fadeIn(t, t0, fade) };
  });
}
export function fade(n, t0, o = {}) {
  const { dur = .3, ease = 'out' } = o;
  return n.mod(t => ({ o: tw(t, t0, t0 + dur, ease) }));
}
// Reveal with a moving clip edge: 'up' reveals from the bottom edge upward
export function wipe(n, t0, o = {}) {
  const { dir = 'up', dur = .6, ease = 'out' } = o;
  return n.mod(t => {
    const k = (1 - tw(t, t0, t0 + dur, ease)) * 100;
    const ins = { up: `${k}% 0 0 0`, down: `0 0 ${k}% 0`, left: `0 0 0 ${k}%`, right: `0 ${k}% 0 0` }[dir];
    return { css: { clipPath: k > .01 ? `inset(${ins})` : '' } };
  });
}
// Grow along one axis from the anchor: bars, dividers, progress lines (set the node's anchor)
export function grow(n, t0, o = {}) {
  const { axis = 'x', dur = .6, ease = 'out', spring } = o;
  return n.mod(t => {
    const u = spring ? sp(t, t0, spring) : tw(t, t0, t0 + dur, ease);
    return axis === 'x' ? { sx: Math.max(u, 0), o: t >= t0 ? 1 : 0 } : { sy: Math.max(u, 0), o: t >= t0 ? 1 : 0 };
  });
}

// ---------- exits: about half an entrance, eased in, so they leave without lingering ----------
export function sink(n, t0, o = {}) {
  const { dist = 180, dur = .35, ease = 'in' } = o;
  return n.mod(t => {
    const u = tw(t, t0, t0 + dur, ease);
    return { y: u * dist, o: 1 - tw(t, t0 + dur * .3, t0 + dur, 'lin') };
  });
}
export const lift = (n, t0, o = {}) => sink(n, t0, { ...o, dist: -(o.dist ?? 180) });
export function slideOut(n, t0, o = {}) {
  const { to = 'left', dist = 300, dur = .35, ease = 'in', keep = false } = o, [dx, dy] = dirVec(to, dist);
  return n.mod(t => {
    const u = tw(t, t0, t0 + dur, ease);
    return { x: dx * u, y: dy * u, o: keep ? 1 : 1 - tw(t, t0 + dur * .5, t0 + dur, 'lin') };
  });
}
export function popOut(n, t0, o = {}) {
  const { dur = .24, to = 0 } = o;
  return n.mod(t => {
    const u = tw(t, t0, t0 + dur, 'in');
    return { s: lerp(1, to, u), o: 1 - tw(t, t0 + dur * .6, t0 + dur, 'lin') };
  });
}
export function fadeOut(n, t0, o = {}) {
  const { dur = .25 } = o;
  return n.mod(t => ({ o: 1 - tw(t, t0, t0 + dur, 'lin') }));
}
// hide or show instantly at a time (a hard cut)
export const hideAt = (n, t0) => n.mod(t => (t >= t0 ? { o: 0 } : null));
export const showAt = (n, t0) => n.mod(t => (t < t0 ? { o: 0 } : null));

// ---------- never park: idle life while the viewer reads ----------
const ramp = (t, t0, t1, r) => Math.min(clamp((t - t0) / r), clamp((t1 - t) / r));
export function float(n, t0, t1, o = {}) {
  const { amp = 12, period = 3.4, rot = .5, seed = 1, ramp: r = .8 } = o;
  return n.mod(t => {
    if (t < t0 || t > t1) return null;
    const k = ramp(t, t0, t1, r), s = t - t0;
    return { y: Math.sin(2 * Math.PI * s / period) * amp * k, rz: noise(s * .45, seed) * rot * k };
  });
}
export function breathe(n, t0, t1, o = {}) {
  const { amount = .012, period = 2.8 } = o;
  return n.mod(t => (t < t0 || t > t1 ? null : { s: 1 + amount * Math.sin(2 * Math.PI * (t - t0) / period) * ramp(t, t0, t1, .6) }));
}
// slow 3D sway: keeps a phone alive without pulling focus
export function sway(n, t0, t1, o = {}) {
  const { ry = 7, rx = 3, period = 6, seed = 2 } = o;
  return n.mod(t => {
    if (t < t0 || t > t1) return null;
    const k = ramp(t, t0, t1, 1), s = t - t0;
    return { ry: Math.sin(2 * Math.PI * s / period) * ry * k, rx: noise(s * .3, seed) * rx * k };
  });
}
// slow push of a node (when the camera is busy elsewhere)
export function push(n, t0, t1, o = {}) {
  const { amount = .05, ease = 'lin' } = o;
  return n.mod(t => ({ s: 1 + amount * tw(t, t0, t1, ease) }));
}

// ---------- 3D and devices ----------
// Turn BY an angle on a spring (relative: two turns add up). { ry: -20 } shows the right side.
export function turn(n, t0, o = {}) {
  const { rx = 0, ry = 0, rz = 0, spring = 'soft' } = o;
  return n.mod(t => {
    const s = sp(t, t0, spring);
    return { rx: rx * s, ry: ry * s, rz: rz * s };
  });
}
export function spin(n, t0, o = {}) {
  const { turns = 1, dur = 1.2, axis = 'ry', ease = 'inOut' } = o;
  return n.mod(t => ({ [axis]: 360 * turns * tw(t, t0, t0 + dur, ease) }));
}
export function orbit(n, t0, t1, o = {}) {
  const { ry = 14, rx = 4, period = 7 } = o;
  return n.mod(t => {
    if (t < t0 || t > t1) return null;
    const k = ramp(t, t0, t1, 1.2), a = 2 * Math.PI * (t - t0) / period;
    return { ry: Math.sin(a) * ry * k, rx: Math.cos(a) * rx * k };
  });
}
// Exploded view: layers (nodes inside a preserve-3d parent) separate in depth while the parent tilts
// to an isometric angle, hold, then reassemble. The parent gets `iso`, each layer `z = i * gap`.
export function explode(parent, layers, t0, t1, o = {}) {
  const { gap = 70, rx = 52, rz = -32, spring = 'soft', back = true } = o;
  const k = t => sp(t, t0, spring) - (back ? sp(t, t1, spring) : 0);
  // the parent must keep its children in 3D; never fade it (opacity flattens it), fade a wrapper
  css(parent.inner || parent.el, { transformStyle: 'preserve-3d' });
  parent.mod(t => ({ rx: rx * k(t), rz: rz * k(t) }));
  layers.forEach((l, i) => l.mod(t => ({ z: i * gap * k(t) })));
  return parent;
}

// ---------- UI reactions ----------
// a button pressed by a finger or cursor: dips and springs back
export function press(n, t0, o = {}) {
  const { depth = .94, hold = .1 } = o;
  return n.mod(t => {
    if (t < t0 - .01) return null;
    const down = sp(t, t0, { duration: .16 }) - sp(t, t0 + hold, { duration: .4, bounce: .2 });
    return { s: 1 - (1 - depth) * down };
  });
}
// a decaying horizontal shake: wrong password, invalid field
export function shake(n, t0, o = {}) {
  const { amp = 14, dur = .45, freq = 7 } = o;
  return n.mod(t => {
    if (t < t0 || t > t0 + dur) return null;
    const s = t - t0;
    return { x: amp * Math.sin(2 * Math.PI * freq * s) * (1 - s / dur) ** 2 };
  });
}
export function pulse(n, t0, o = {}) {
  const { amount = .09, dur = .4 } = o;
  return n.mod(t => (t < t0 || t > t0 + dur ? null : { s: 1 + amount * Math.sin(Math.PI * (t - t0) / dur) }));
}
// follow a moving point with a lag (pure: it reads the leader's position `lag` seconds ago)
export function follow(n, fn, o = {}) {
  const { lag = .08 } = o;
  return n.mod(t => {
    const [x, y] = fn(t - lag);
    return { x, y };
  });
}

// ---------- morphing boxes ----------
// The workhorse of "every scene is made out of the previous one": one element changes size, radius,
// colour and position across states. ks: [[t, { w, h, r, bg, x, y, s }], ...]; geometry rides springs
// (each change is one step response), colour cross-mixes over `colorDur`.
export function morph(n, ks, o = {}) {
  const { spring = 'ui', colorDur = .3 } = o;
  const track = k => {
    const pts = ks.filter(([, s]) => s[k] != null).map(([t, s, c]) => [t, s[k], c]);
    return pts.length ? t => springs(t, pts, spring) : null;
  };
  const W = track('w'), H = track('h'), R = track('r'), X = track('x'), Y = track('y'), S = track('s');
  const cols = ks.filter(([, s]) => s.bg);
  return n.mod(t => {
    const c = {};
    if (W) c.width = W(t).toFixed(2) + 'px';
    if (H) c.height = H(t).toFixed(2) + 'px';
    if (R) c.borderRadius = Math.max(0, R(t)).toFixed(2) + 'px';
    if (cols.length) {
      let bg = cols[0][1].bg;
      for (let i = 1; i < cols.length; i++) bg = mixc(bg, cols[i][1].bg, tw(t, cols[i][0], cols[i][0] + colorDur, 'inOut'));
      c.background = bg;
    }
    const r = { css: c };
    if (X) r.x = X(t);
    if (Y) r.y = Y(t);
    if (S) r.s = S(t);
    return r;
  });
}

// ---------- choreography ----------
// run the same move on several nodes, `step` seconds apart (lists ~.06, chips ~.2, words ~.08)
export function stagger(nodes, t0, step, move, opts = {}, order = 'start') {
  const N = nodes.length, idx = i => (order === 'end' ? N - 1 - i : order === 'center' ? Math.abs(i - (N - 1) / 2) : i);
  nodes.forEach((n, i) => move(n, t0 + idx(i) * step, opts));
  return t0 + (order === 'center' ? (N - 1) / 2 : N - 1) * step;
}

// ---------- scene handoffs ----------
// A colour flood: a circle grows from a point until it covers the farthest corner (in about .35 s; any
// faster and half the frame changes in one frame), then optionally contracts into another point.
// Returns the circle's node. parent: a layer (film.top for screen space, film.world, a screen).
export function flood(f, parent, t0, o = {}) {
  const { x = f.W / 2, y = f.H / 2, color = '#000', dur = .36, ease = 'inOut', out } = o;
  const pw = parent.offsetWidth || f.W, ph = parent.offsetHeight || f.H;
  const R = Math.hypot(Math.max(x, pw - x), Math.max(y, ph - y)) * 1.06;
  const c = el('div', parent, 'am-flood', { width: 2 * R + 'px', height: 2 * R + 'px', borderRadius: '50%', background: color, pointerEvents: 'none' });
  const n = f.node(c, { x, y });
  n.mod(t => {
    let s = tw(t, t0, t0 + dur, ease), dx = 0, dy = 0;
    if (out) {
      const u = tw(t, out.t, out.t + (out.dur ?? .4), out.ease || 'inOut');
      s = lerp(s, (out.r ?? 0) / R, u);
      dx = ((out.x ?? x) - x) * u;
      dy = ((out.y ?? y) - y) * u;
    }
    return { s: Math.max(s, 1e-4), x: dx, y: dy, o: t >= t0 && s > 1e-3 ? 1 : 0 };
  });
  if (o.cue !== false) f.cue(t0, o.cue || 'swoosh', { gain: .6 });
  return n;
}
// Circular reveal of a node's element from a point in its own box (an iris opening onto a new scene)
export function iris(n, t0, o = {}) {
  const { x = '50%', y = '50%', dur = .5, ease = 'inOut', close } = o;
  // circle() percentages are of the box diagonal / sqrt 2: 72 % reaches the corners from the centre,
  // 142 % from anywhere in the box
  const max = o.max ?? (x === '50%' && y === '50%' ? 72 : 142);
  return n.mod(t => {
    let u = tw(t, t0, t0 + dur, ease);
    if (close) u *= 1 - tw(t, close.t, close.t + (close.dur ?? dur), ease);
    return { css: { clipPath: u >= .999 ? '' : `circle(${(u * max).toFixed(3)}% at ${x} ${y})` }, o: u > 0 ? 1 : 0 };
  });
}
// Shared element: move and scale a node so it sits exactly on rect A at t0 and rect B at t1.
// Rects from rectIn() in the node's parent coordinates; the node's own size is its base box.
export function match(n, a, b, t0, t1, o = {}) {
  const { spring, ease = 'inOut' } = o, w0 = n.el.offsetWidth || 1, h0 = n.el.offsetHeight || 1;
  return n.mod(t => {
    const u = spring ? springs(t, [[t0, 0], [t0, 1]], spring) : tw(t, t0, t1, ease);
    const cx = lerp(a.cx ?? a.x + a.w / 2, b.cx ?? b.x + b.w / 2, u), cy = lerp(a.cy ?? a.y + a.h / 2, b.cy ?? b.y + b.h / 2, u);
    return { x: cx, y: cy, sx: lerp(a.w, b.w, u) / w0, sy: lerp(a.h, b.h, u) / h0 };
  });
}
// keyframed channels when nothing above fits: track(n, 'x', [[0, 0], [1, 300, 'out']])
export const track = (n, ch, ks) => n.mod(t => ({ [ch]: keys(t, ks) }));
export const springTrack = (n, ch, ks, cfg) => n.mod(t => ({ [ch]: springs(t, ks, cfg) }));
export { E };
