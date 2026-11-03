// screens.js: navigation inside a device. Screens are full-size children of the screen box; transitions
// are scheduled at build time (push, pop, sheet, dismiss, zoom from an element, iris, tab slide, fade)
// and the visible stack at any time is derived from them, so any frame can be drawn on its own.
import { clamp, lerp, ez, sp, settleTime, el, css, rectIn } from './core.js';

const CUES = { push: 'swoosh', pop: 'swoosh', sheet: 'swoosh', dismiss: 'swoosh', zoom: 'whoosh', iris: 'whoosh', slide: 'tick', fade: null };

export function nav(f, d, screens, o = {}) {
  const root = d.screen, W = root.offsetWidth, H = root.offsetHeight;
  const names = Object.keys(screens);
  const S = {};
  names.forEach((k, i) => {
    const e = screens[k];
    if (e.parentElement !== root) root.appendChild(e);
    css(e, { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px', overflow: 'hidden', zIndex: String(i + 1) });
    S[k] = { e, dim: el('div', e, 'am-dim'), z: i + 1 };
  });
  const N = { f, d, S, trans: [], states: [[{ name: o.start || names[0], kind: 'page' }]] };
  const top = st => st[st.length - 1];
  const add = (type, t, name, opts = {}) => {
    const prev = N.states[N.states.length - 1];
    let next;
    if (type === 'pop') next = prev.slice(0, Math.max(1, prev.findLastIndex(s => s.kind === 'page')));
    else if (type === 'dismiss') next = prev.slice(0, -1);
    else if (type === 'sheet') {
      // a sheet rests in the layout where it is shown (top = the part of the screen it leaves free),
      // so pointer targets inside it measure where the finger has to go; it slides from below
      const hh = opts.height ?? .9;
      css(S[name].e, { top: (H * (1 - hh)).toFixed(2) + 'px', height: (H * hh).toFixed(2) + 'px', borderRadius: '38px 38px 0 0' });
      next = [...prev, { name, kind: 'sheet', height: hh }];
    } else next = [...prev.filter(s => s.kind === 'page'), { name, kind: 'page' }];
    // a spring-driven transition lasts until the spring settles, or it would snap at the end
    const dur = opts.dur ?? (opts.spring ? settleTime(opts.spring) : type === 'sheet' || type === 'dismiss' ? .55 : type === 'zoom' ? .6 : .48);
    const tr = { type, t, name, opts, before: prev, after: next, dur };
    if (opts.from != null) tr.from = typeof opts.from === 'object' && 'w' in opts.from ? opts.from : rectIn(typeof opts.from === 'string' ? root.querySelector(opts.from) : opts.from, root);
    if (opts.at != null) tr.at = Array.isArray(opts.at) ? opts.at : (r => [r.cx, r.cy])(rectIn(typeof opts.at === 'string' ? root.querySelector(opts.at) : opts.at, root));
    N.trans.push(tr);
    N.states.push(next);
    const c = opts.cue ?? CUES[type];
    if (c) f.cue(t, c, { gain: opts.gain ?? .35 });
    return t + tr.dur;
  };
  N.push = (t, name, o2) => add('push', t, name, o2);
  N.pop = (t, o2) => add('pop', t, null, o2);
  N.sheet = (t, name, o2) => add('sheet', t, name, o2);
  N.dismiss = (t, o2) => add('dismiss', t, null, o2);
  N.zoom = (t, name, o2) => add('zoom', t, name, o2);     // o2.from: element / selector / rect it grows out of
  N.iris = (t, name, o2) => add('iris', t, name, o2);     // o2.at: point or element it opens from
  N.slide = (t, name, o2) => add('slide', t, name, o2);   // o2.dir: 1 (next tab, from the right) or -1
  N.fade = (t, name, o2) => add('fade', t, name, o2);

  // a static stack: the top page, the sheets over it, and the page under the first sheet pushed back
  const drawStack = (st, out, k = 1) => {
    const p = st.findLastIndex(s => s.kind === 'page');
    const page = st[p];
    out[page.name] = { x: 0, y: 0, s: 1, dim: 0, r: 0 };
    const sheets = st.slice(p + 1);
    if (sheets.length) {
      out[page.name] = { x: 0, y: 0, s: lerp(1, .92, k), dim: .32 * k, r: 38 * k };
      sheets.forEach((s, i) => { out[s.name] = { x: 0, y: 0, s: 1, dim: i < sheets.length - 1 ? .2 : 0, r: 38, z: 100 + i, sheet: true }; });
    }
    return out;
  };
  const ease = (tr, u) => (tr.opts.spring ? sp(tr.t + u * tr.dur, tr.t, tr.opts.spring) : ez(tr.opts.ease || (tr.type === 'sheet' || tr.type === 'dismiss' ? 'decel' : tr.type === 'fade' ? 'inOut' : 'ui'))(u));

  f.add(t => {
    let k = -1;
    for (let i = 0; i < N.trans.length; i++) if (t >= N.trans[i].t) k = i;
    const out = {};
    const tr = k >= 0 ? N.trans[k] : null;
    const raw = tr ? clamp((t - tr.t) / tr.dur) : 1;
    if (!tr || raw >= 1) drawStack(tr ? tr.after : N.states[0], out);
    else {
      const u = ease(tr, raw), A = top(tr.before).name, B = tr.name;
      switch (tr.type) {
        case 'push':
          drawStack(tr.before, out);
          Object.assign(out[A], { x: -.3 * W * u, dim: .14 * u });
          out[B] = { x: W * (1 - u), y: 0, s: 1, dim: 0, shadow: true, z: 200 };
          break;
        case 'pop': {
          const to = top(tr.after).name;
          out[to] = { x: -.3 * W * (1 - u), y: 0, s: 1, dim: .14 * (1 - u) };
          out[A] = { x: W * u, y: 0, s: 1, dim: 0, shadow: true, z: 200 };
          break;
        }
        case 'sheet':
          drawStack(tr.before, out, 0);
          drawStack(tr.after, out, u);
          out[B].y = lerp(H * (tr.opts.height ?? .9), 0, u);
          break;
        case 'dismiss': {
          drawStack(tr.after, out, 0);
          drawStack(tr.before, out, 1 - u);
          const sh = tr.before[tr.before.length - 1];
          out[A].y = lerp(0, H * (sh.height ?? .9) + 20, u);
          break;
        }
        case 'slide': {
          const dir = tr.opts.dir ?? 1;
          drawStack(tr.before, out);
          out[A].x = -dir * W * u;
          out[B] = { x: dir * W * (1 - u), y: 0, s: 1, dim: 0, z: 200 };
          break;
        }
        case 'fade':
          drawStack(tr.before, out);
          out[B] = { x: 0, y: 0, s: 1, dim: 0, o: u, z: 200 };
          break;
        case 'zoom': {
          drawStack(tr.before, out);
          Object.assign(out[A], { s: lerp(1, .94, u), dim: .25 * u });
          const r = tr.from || { x: W / 2 - 40, y: H / 2 - 40, w: 80, h: 80 }, rad = tr.opts.radius ?? 18;
          const ins = [r.y * (1 - u), (W - r.x - r.w) * (1 - u), (H - r.y - r.h) * (1 - u), r.x * (1 - u)];
          out[B] = { x: 0, y: 0, s: 1, dim: 0, z: 200, clip: `inset(${ins.map(v => v.toFixed(2) + 'px').join(' ')} round ${(rad * (1 - u) + 54 * u).toFixed(2)}px)` };
          break;
        }
        case 'iris': {
          drawStack(tr.before, out);
          const [x, y] = tr.at || [W / 2, H / 2], R = Math.hypot(Math.max(x, W - x), Math.max(y, H - y));
          out[B] = { x: 0, y: 0, s: 1, dim: 0, z: 200, clip: `circle(${(R * u).toFixed(2)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px)` };
          break;
        }
      }
    }
    for (const name of names) {
      const s = S[name], v = out[name];
      if (!v) { css(s.e, { visibility: 'hidden' }); continue; }
      css(s.e, {
        visibility: '', zIndex: String(v.z ?? s.z), opacity: (v.o ?? 1).toFixed(3), clipPath: v.clip || '',
        transform: `translate(${v.x.toFixed(2)}px,${v.y.toFixed(2)}px) scale(${v.s.toFixed(4)})`,
        borderRadius: v.sheet ? '38px 38px 0 0' : (v.r || 0).toFixed(2) + 'px', boxShadow: v.shadow ? '-12px 0 40px rgba(0,0,0,.16)' : v.sheet ? '0 -10px 40px rgba(0,0,0,.12)' : '',
      });
      css(s.dim, { opacity: v.dim.toFixed(3) });
    }
  });
  return N;
}
