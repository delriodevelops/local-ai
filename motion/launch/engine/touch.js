// touch.js: a finger or a cursor that drives the UI with real taps, holds, drags and swipes, and
// scrolling with momentum. Every gesture is scheduled at build time, so the pointer's position and
// press state are pure functions of time that other things can read (a slider follows the finger).
import { clamp, lerp, ez, tw, sp, keys, springs, el, css, rectIn } from './core.js';

const QUICK = { duration: .14 };
const RELEASE = { duration: .3, bounce: .1 };

// root: the box whose coordinates targets are in (d.screen of a device, a page, film.world).
// layer: where the pointer is drawn (default root); use d.frame so it is not clipped by the screen.
export function pointer(f, root, o = {}) {
  const kind = o.kind || 'finger', layer = o.layer || root;
  const off = layer === root ? { x: 0, y: 0 } : rectIn(root, layer);
  const elm = el('div', layer, 'am-pointer am-' + kind);
  if (kind === 'cursor') elm.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M5 2.5v16.8l4.3-4.1 2.8 6.4 3-1.3-2.8-6.3h6z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const size = o.size ?? (kind === 'finger' ? 52 : 1);
  if (kind === 'cursor' && o.size) elm.style.transform = `scale(${o.size})`;
  const P = { f, root, layer, kind, el: elm, segs: [], presses: [], vis: [], start: null, size };

  const resolve = (target, dx = 0, dy = 0) => {
    if (Array.isArray(target)) return [target[0] + dx, target[1] + dy];
    const e = typeof target === 'string' ? root.querySelector(target) : target;
    if (!e) throw new Error('pointer target not found: ' + target);
    const r = rectIn(e, root);
    return [r.cx + dx, r.cy + dy];
  };
  P.resolve = resolve;
  P.from = (target, o2 = {}) => { P.start = resolve(target, o2.dx, o2.dy); return P; };
  P.show = (t, d = .25) => { P.vis.push([t, 1, d]); return P; };
  P.hide = (t, d = .25) => { P.vis.push([t, 0, d]); return P; };
  // move to a target, arriving at t1 (or t0 + a duration that grows with distance)
  P.move = (t0, target, o2 = {}) => {
    const to = resolve(target, o2.dx, o2.dy), from = P.posAt(t0), dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const t1 = o2.t1 ?? t0 + (o2.dur ?? clamp(.28 + dist / 1600, .25, .9));
    P.segs.push({ t0, t1, from, to, ease: ez(o2.ease || 'inOut'), curve: o2.curve ?? .14 });
    P.segs.sort((a, b) => a.t0 - b.t0);
    return t1;
  };
  // tap at time t (the finger arrives just before and lifts after ~.1 s): ripple, press, sound
  P.tap = (t, target, o2 = {}) => {
    if (target != null) {
      const to = resolve(target, o2.dx, o2.dy), here = P.posAt(t - .08);
      if (Math.hypot(to[0] - here[0], to[1] - here[1]) > 1) {
        const dur = o2.travel ?? clamp(.3 + Math.hypot(to[0] - here[0], to[1] - here[1]) / 1600, .28, .8);
        P.move(t - .07 - dur, to, { dur, ease: o2.ease, curve: o2.curve });
      }
    }
    P.presses.push([t, t + (o2.hold ?? .1)]);
    ripple(P, t, P.posAt(t + .001));
    if (o2.cue !== false) f.cue(t, o2.cue || (kind === 'cursor' ? 'click' : 'tap'), { gain: o2.gain ?? .8, pan: o2.pan ?? 0 });
    return t;
  };
  P.doubleTap = (t, target, o2 = {}) => {
    P.tap(t, target, o2);
    P.tap(t + .16, null, o2);
    return t + .16;
  };
  // press and hold from t0 to t1: a ring fills while held (context menus, long-press previews)
  P.hold = (t0, t1, target, o2 = {}) => {
    if (target != null) {
      const to = resolve(target, o2.dx, o2.dy), here = P.posAt(t0 - .08);
      if (Math.hypot(to[0] - here[0], to[1] - here[1]) > 1) P.move(t0 - .5, to, { dur: .42 });
    }
    P.presses.push([t0, t1]);
    holdRing(P, t0, t1);
    f.cue(t0, 'tap', { gain: .5 });
    if (o2.cue !== false) f.cue(t1, o2.cue || 'pop', { gain: .7 });
    return t1;
  };
  // press at `from` at t0, move to `to` by t1 while held, release: direct manipulation
  P.drag = (t0, t1, from, to, o2 = {}) => {
    const a = resolve(from, o2.dx, o2.dy), here = P.posAt(t0 - .1);
    if (Math.hypot(a[0] - here[0], a[1] - here[1]) > 1) P.move(t0 - .45, a, { dur: .38 });
    P.segs.push({ t0, t1, from: a, to: resolve(to, o2.tdx, o2.tdy), ease: ez(o2.ease || 'inOut'), curve: o2.curve ?? 0 });
    P.segs.sort((x, y) => x.t0 - y.t0);
    P.presses.push([t0 - .02, t1 + (o2.release ?? 0)]);
    if (o2.cue !== false) f.cue(t0, 'tick', { gain: .5 });
    return t1;
  };
  // a quick flick: short, fast, released while still moving (cards, carousels, scroll)
  P.swipe = (t0, from, to, o2 = {}) => {
    const d = o2.dur ?? .26;
    P.drag(t0, t0 + d, from, to, { ...o2, ease: o2.ease || 'accel', cue: false });
    if (o2.cue !== false) f.cue(t0 + d * .4, 'swipe', { gain: o2.gain ?? .55 });
    return t0 + d;
  };

  P.posAt = t => {
    let p = P.start || (P.segs[0] ? P.segs[0].from : [f.W / 2, f.H / 2]);
    for (const s of P.segs) {
      if (t < s.t0) break;
      if (t >= s.t1) { p = s.to; continue; }
      const u = s.ease(clamp((t - s.t0) / (s.t1 - s.t0)));
      // a slight arc, like a hand: the control point sits off the straight line
      const mx = (s.from[0] + s.to[0]) / 2, my = (s.from[1] + s.to[1]) / 2, dx = s.to[0] - s.from[0], dy = s.to[1] - s.from[1];
      const cx = mx - dy * s.curve, cy = my + dx * s.curve;
      return [lerp(lerp(s.from[0], cx, u), lerp(cx, s.to[0], u), u), lerp(lerp(s.from[1], cy, u), lerp(cy, s.to[1], u), u)];
    }
    return p;
  };
  P.downAt = t => {
    let d = 0;
    for (const [a, b] of P.presses) d += sp(t, a, QUICK) - sp(t, b, RELEASE);
    return clamp(d, -.3, 1);
  };
  P.visAt = t => {
    if (!P.vis.length) return 1;
    let v = P.vis[0][1] ? 0 : 1;
    for (const [t0, to, d] of [...P.vis].sort((a, b) => a[0] - b[0])) if (t >= t0) v = lerp(v, to, tw(t, t0, t0 + d, 'out'));
    return v;
  };
  f.add(t => {
    const [x, y] = P.posAt(t), d = P.downAt(t), v = P.visAt(t);
    if (kind === 'finger') {
      const s = 1 - .16 * clamp(d, 0, 1);
      css(elm, { width: size + 'px', height: size + 'px', transform: `translate(${(x + off.x).toFixed(2)}px,${(y + off.y).toFixed(2)}px) translate(-50%,-50%) scale(${s.toFixed(3)})`, opacity: (v * (.6 + .3 * clamp(d, 0, 1))).toFixed(3), visibility: v < .01 ? 'hidden' : '' });
    } else {
      const s = (o.size || 1) * (1 - .12 * clamp(d, 0, 1));
      css(elm, { transform: `translate(${(x + off.x).toFixed(2)}px,${(y + off.y).toFixed(2)}px) translate(-5px,-2px) scale(${s.toFixed(3)})`, opacity: v.toFixed(3), visibility: v < .01 ? 'hidden' : '' });
    }
  });
  return P;
}

// expanding ring where a tap lands
function ripple(P, t0, [x, y]) {
  const { f, layer } = P;
  const off = layer === P.root ? { x: 0, y: 0 } : rectIn(P.root, layer);
  const r = el('div', layer, 'am-ripple' + (P.kind === 'cursor' ? ' cursor' : ''));
  const base = P.kind === 'cursor' ? 34 : P.size * 1.1;
  f.add(t => {
    const u = clamp((t - t0) / .5);
    if (t < t0 || u >= 1) return css(r, { visibility: 'hidden' });
    css(r, { visibility: '', width: base + 'px', height: base + 'px', transform: `translate(${(x + off.x).toFixed(2)}px,${(y + off.y).toFixed(2)}px) translate(-50%,-50%) scale(${(.5 + 1.4 * tw(t, t0, t0 + .5, 'out')).toFixed(3)})`, opacity: (.55 * (1 - u)).toFixed(3) });
  });
}
function holdRing(P, t0, t1) {
  const { f, layer } = P;
  const r = el('div', layer, 'am-holdring');
  const off = layer === P.root ? { x: 0, y: 0 } : rectIn(P.root, layer);
  f.add(t => {
    if (t < t0 || t > t1 + .3) return css(r, { visibility: 'hidden' });
    const [x, y] = P.posAt(t), u = clamp((t - t0) / (t1 - t0));
    css(r, { visibility: '', width: P.size * 1.5 + 'px', height: P.size * 1.5 + 'px', transform: `translate(${(x + off.x).toFixed(2)}px,${(y + off.y).toFixed(2)}px) translate(-50%,-50%)`, background: `conic-gradient(rgba(255,255,255,.9) ${(u * 360).toFixed(1)}deg, rgba(255,255,255,0) 0)`, opacity: (1 - clamp((t - t1) / .3)).toFixed(3) });
  });
}

// Scroll a content element (laid out inside a screen) by keyframes: [[t, y, ease], ...], y in points,
// positive scrolls down. Flings use 'decel' by default (momentum). o.spring rides springs instead.
// o.bar shows a thin indicator while it moves.
export function scroll(f, content, ks, o = {}) {
  const n = f.node(content, { place: false });
  const Y = o.spring ? t => springs(t, ks, o.spring) : t => keys(t, ks.map(([t, y, e], i) => [t, y, i ? e || 'decel' : e]));
  n.mod(t => ({ y: -Y(t) }));
  if (o.bar) {
    const view = content.parentElement, bar = el('div', view, 'am-scrollbar');
    const H = o.height || content.offsetHeight, vh = view.offsetHeight;
    f.add(t => {
      let v = 0;
      for (let k = 0; k < 12; k++) v = Math.max(v, Math.abs(Y(t - k * .05) - Y(t - (k + 1) * .05)));
      const len = Math.max(36, vh * vh / Math.max(H, vh + 1)), y = (Y(t) / Math.max(1, H - vh)) * (vh - len - 12);
      css(bar, { height: len.toFixed(1) + 'px', transform: `translateY(${(6 + clamp(y, 0, vh - len - 12)).toFixed(2)}px)`, opacity: clamp(v / 2).toFixed(3) });
    });
  }
  n.scrollAt = Y;
  return n;
}
