// film.js: the film. A stage of layers, nodes whose transforms are the sum of every move registered on
// them, a camera, and the timeline data the scripts read (marks, sound cues, cuts, smears, rests).
// seek(t) recomputes every frame from scratch, so frames render in any order and in parallel.
import { clamp, lerp, ez, tw, el, css, E } from './core.js';

const MUL = new Set(['s', 'sx', 'sy', 'o']);
const f3 = n => +n.toFixed(3);

// A node is one element the film moves. Moves add contributions: x, y, z, rx, ry, rz, skx, sky and blur
// add up; s, sx, sy and o (opacity) multiply; `css` sets any other style (last one wins).
// x, y place the element's anchor point (default its centre) in its parent.
export class Node {
  constructor(film, e, o = {}) {
    this.f = film;
    this.el = e;
    this.inner = o.inner || null;     // a preserve-3d child that takes the rotations (devices)
    // place: false keeps the element where the layout put it (scrolling content, list rows) and moves
    // it from there; otherwise it is positioned absolutely by its anchor at (x, y)
    this.anchor = o.anchor || (o.place === false ? [0, 0] : [.5, .5]);
    this.persp = o.persp ?? 2200;
    this.base = { x: o.x ?? 0, y: o.y ?? 0, z: 0, s: o.s ?? 1, sx: 1, sy: 1, rx: o.rx ?? 0, ry: o.ry ?? 0, rz: o.rz ?? 0, skx: 0, sky: 0, o: o.o ?? 1, blur: 0 };
    this.mods = [];
    if (o.place !== false) css(e, { position: 'absolute', left: '0px', top: '0px', transformOrigin: `${this.anchor[0] * 100}% ${this.anchor[1] * 100}%` });
    if (this.inner) css(this.inner, { transformStyle: 'preserve-3d', transformOrigin: '50% 50%' });
  }
  mod(fn) { this.mods.push(fn); return this; }
  set(o) { Object.assign(this.base, o); return this; }
  values(t) {
    const v = { ...this.base };
    let style = null;
    for (const fn of this.mods) {
      const r = fn(t);
      if (!r) continue;
      for (const k in r) {
        if (k === 'css') style = Object.assign(style || {}, r.css);
        else if (MUL.has(k)) v[k] *= r[k];
        else v[k] = (v[k] || 0) + r[k];
      }
    }
    v.css = style;
    return v;
  }
  apply(t) {
    const v = this.values(t);
    this.v = v;
    const [ax, ay] = this.anchor;
    const pos = `translate3d(${f3(v.x)}px,${f3(v.y)}px,${f3(v.z)}px) translate(${-ax * 100}%,${-ay * 100}%)`;
    const rot = v.rx || v.ry ? ` perspective(${this.persp}px) rotateX(${f3(v.rx)}deg) rotateY(${f3(v.ry)}deg)` : '';
    const rz = v.rz ? ` rotate(${f3(v.rz)}deg)` : '';
    const sk = v.skx || v.sky ? ` skew(${f3(v.skx)}deg,${f3(v.sky)}deg)` : '';
    const sx = v.s * v.sx, sy = v.s * v.sy;
    const sc = sx !== 1 || sy !== 1 ? ` scale(${f3(sx)},${f3(sy)})` : '';
    if (this.inner) {
      css(this.el, { transform: pos + sc });
      css(this.inner, { transform: (rot + rz + sk).trim() || 'none' });
    } else css(this.el, { transform: pos + rot + rz + sk + sc });
    const o = clamp(v.o);
    // visibility '' (inherit) rather than 'visible': a visible child would show through a hidden parent
    css(this.el, { opacity: String(f3(o)), visibility: o < .002 ? 'hidden' : '', filter: v.blur > .05 ? `blur(${f3(v.blur)}px)` : '' });
    if (v.css) css(this.el, v.css);
  }
}

// The camera looks at a point of the world with a zoom; moves between framings ease, and zoom is
// interpolated in log space so a 1x -> 4x push feels even. Targets: {x, y, zoom}, an element or node
// (framed with padding, measured live so it follows a moving device), or 'home'.
export class Camera {
  constructor(f) {
    this.f = f;
    const home = () => ({ x: f.W / 2, y: f.H / 2, zoom: 1, rot: 0 });
    this.home = home;
    this.ks = [{ t: 0, s: home, e: E.cam }];
    this.mods = [];
    this.parallax = f.cfg.parallax ?? .15;
    this.cache = new Map();
  }
  resolve(target, o = {}) {
    const f = this.f;
    if (target == null || target === 'home') return this.home;
    if (typeof target === 'function') return target;
    if (Array.isArray(target)) { const [x, y, zoom = 1, rot = 0] = target; return () => ({ x, y, zoom, rot }); }
    const elm = target.el instanceof Element ? target.el : target instanceof Element ? target : null;
    if (!elm) { const s = { x: f.W / 2, y: f.H / 2, zoom: 1, rot: 0, ...target }; return () => s; }
    const pad = o.pad ?? .12;
    return () => {
      const r = this.measure(elm);
      const zoom = o.zoom ?? clamp(Math.min(f.W * (1 - 2 * pad) / r.w, f.H * (1 - 2 * pad) / r.h), o.min ?? .25, o.max ?? 5);
      return { x: r.x + r.w / 2 + (o.dx || 0) / zoom, y: r.y + r.h / 2 + (o.dy || 0) / zoom, zoom, rot: o.rot || 0 };
    };
  }
  // on-screen rect of an element in world coordinates (the camera is reset while measuring)
  measure(elm) {
    const c = this.cache.get(elm);
    if (c && c.t === this.f.t) return c.r;
    const f = this.f, rr = f.root.getBoundingClientRect(), k = rr.width / f.W, b = elm.getBoundingClientRect();
    const r = { x: (b.left - rr.left) / k, y: (b.top - rr.top) / k, w: b.width / k, h: b.height / k };
    this.cache.set(elm, { t: f.t, r });
    return r;
  }
  stateAt(t) { // the keyed state at t, before mods
    const ks = this.ks;
    let i = 0;
    while (i + 1 < ks.length && ks[i + 1].t <= t) i++;
    const a = ks[i], b = ks[i + 1];
    if (!b) return a.s(t);
    const u = b.e(clamp((t - a.t) / (b.t - a.t))), A = a.s(t), B = b.s(t);
    return { x: lerp(A.x, B.x, u), y: lerp(A.y, B.y, u), zoom: Math.exp(lerp(Math.log(A.zoom), Math.log(B.zoom), u)), rot: lerp(A.rot || 0, B.rot || 0, u) };
  }
  // hold the current framing until t0, arrive on `target` at t1. Add moves in time order.
  move(t0, t1, target, o = {}) {
    const prev = this.ks.filter(k => k.t <= t0).pop() || this.ks[0];
    if (t0 > prev.t) this.ks.push({ t: t0, s: prev.s, e: prev.e });
    this.ks.push({ t: t1, s: this.resolve(target, o), e: ez(o.ease || 'cam') });
    this.ks.sort((a, b) => a.t - b.t);
    return this;
  }
  cut(t, target, o = {}) { // jump: a hard cut to a new framing
    this.ks.push({ t: t - 1e-4, s: (this.ks.filter(k => k.t <= t).pop() || this.ks[0]).s, e: E.lin });
    this.ks.push({ t, s: this.resolve(target, o), e: () => 1 });
    this.ks.sort((a, b) => a.t - b.t);
    this.f.cut(t);
    return this;
  }
  // a fast move between two framings: long-shutter smear and a whoosh, for big changes of place
  whip(t, target, o = {}) {
    const d = o.dur ?? .42;
    this.move(t - d / 2, t + d / 2, target, { ...o, ease: o.ease || 'inOut' });
    this.f.smear(t - d / 2, t + d / 2, o.smear ?? 3);
    if (o.cue !== false) this.f.cue(t - d * .3, 'whoosh', { gain: o.gain ?? .7 });
    return this;
  }
  mod(fn) { this.mods.push(fn); return this; }
  // slow continuous push so a held shot never parks: zoom grows by `amount` across [t0, t1], then
  // gives the push back over `release` seconds (overlap it with the next move, or end it on a cut)
  drift(t0, t1, amount = .05, o = {}) {
    const rel = o.release ?? .5;
    return this.mod(t => {
      if (t < t0 || t > t1 + rel) return null;
      const u = tw(t, t0, t1, o.ease || 'lin') * (1 - (rel ? tw(t, t1, t1 + rel, 'inOut') : t >= t1 ? 1 : 0));
      return { zoom: 1 + amount * u, rot: (o.roll || 0) * u };
    });
  }
  // a quick zoom pulse on a hit
  bump(t0, amount = .03, dur = .35) {
    return this.mod(t => (t < t0 || t > t0 + dur ? null : { zoom: 1 + amount * Math.sin(Math.PI * clamp((t - t0) / dur)) ** 2 }));
  }
  state(t) {
    const s = this.stateAt(t);
    for (const fn of this.mods) {
      const r = fn(t);
      if (!r) continue;
      if (r.x) s.x += r.x;
      if (r.y) s.y += r.y;
      if (r.zoom) s.zoom *= r.zoom;
      if (r.rot) s.rot += r.rot;
    }
    return s;
  }
  apply(t) {
    const f = this.f;
    css(f.world, { transform: 'none' });
    const s = this.state(t);
    this.s = s;
    css(f.world, { transform: `translate(${f3(f.W / 2)}px,${f3(f.H / 2)}px) rotate(${f3(s.rot)}deg) scale(${+s.zoom.toFixed(5)}) translate(${f3(-s.x)}px,${f3(-s.y)}px)` });
    const p = this.parallax, z = 1 + (s.zoom - 1) * p;
    css(f.back, { transform: `translate(${f3(f.W / 2)}px,${f3(f.H / 2)}px) scale(${+z.toFixed(5)}) translate(${f3(-(f.W / 2 + (s.x - f.W / 2) * p))}px,${f3(-(f.H / 2 + (s.y - f.H / 2) * p))}px)` });
  }
}

export class Film {
  constructor(cfg = {}, mount = document.body) {
    this.cfg = cfg;
    [this.W, this.H] = cfg.size || [1080, 1920];
    this.fps = cfg.fps || 60;
    this.duration = cfg.duration || 10;
    this.bpm = cfg.bpm || 0;
    this.beat0 = cfg.beat0 || 0;
    this.palette = cfg.palette || {};
    this.root = el('div', mount, 'film', { width: this.W + 'px', height: this.H + 'px', background: cfg.background || this.palette.bg || '#0E0E10' });
    for (const [k, v] of Object.entries(this.palette)) this.root.style.setProperty('--' + k, v);
    this.back = el('div', this.root, 'layer back');
    this.world = el('div', this.root, 'layer world');
    this.top = el('div', this.root, 'layer top');
    this.nodes = [];
    this.pre = [];
    this.post = [];
    this.cues = [];
    this.cuts = [];
    this.smears = [];
    this.rests = (cfg.rests || []).map(r => r.slice());
    this.markMap = {};
    this.pending = [];
    this.t = 0;
    this.cam = new Camera(this);
  }
  // beats to seconds, when the film runs on a music grid (bpm, beat0 = film time of beat 0)
  B(k) { return this.bpm ? this.beat0 + k * 60 / this.bpm : k; }
  // one node per element: asking again returns the same node, so moves registered anywhere add up
  // instead of two nodes fighting over one transform (options apply only the first time)
  node(e, o) {
    if (e.__amNode) return e.__amNode;
    const n = new Node(this, e, o);
    this.nodes.push(n);
    e.__amNode = n;
    return n;
  }
  // run fn(t) every frame: before the nodes (text, widths, canvas) or after the camera ({ after: true })
  add(fn, o = {}) { (o.after ? this.post : this.pre).push(fn); return fn; }
  // named times: the review sheet shows a still at each, the sound and QA scripts read them
  marks(obj) { Object.assign(this.markMap, obj); return obj; }
  cue(t, name, o = {}) {
    if (t >= 0 && t <= this.duration) this.cues.push({ ...o, t: +t.toFixed(4), name, gain: o.gain ?? 1, pan: o.pan ?? 0 });
    return t;
  }
  cut(t) { this.cuts.push(+t.toFixed(4)); }
  smear(a, b, k = 3) { this.smears.push([a, b, k]); }
  rest(a, b) { this.rests.push([a, b]); }
  shutter(t) {
    let k = 1;
    for (const [a, b, m] of this.smears) if (t >= a && t <= b) k = Math.max(k, m);
    return k;
  }
  wait(p) { this.pending.push(p); }
  async seek(t) {
    this.t = t;
    for (const fn of this.pre) fn(t);
    for (const n of this.nodes) n.apply(t);
    this.cam.apply(t);
    for (const fn of this.post) fn(t);
    if (this.pending.length) {
      const p = this.pending;
      this.pending = [];
      await Promise.all(p);
    }
  }
  info() {
    return {
      title: this.cfg.title || 'film', w: this.W, h: this.H, fps: this.fps, duration: this.duration,
      frames: Math.round(this.duration * this.fps), bpm: this.bpm, beat0: this.beat0,
      cues: [...this.cues].sort((a, b) => a.t - b.t), cuts: [...new Set(this.cuts)].sort((a, b) => a - b),
      smears: this.smears, rests: this.rests, marks: this.markMap, music: this.cfg.music || null,
      sound: this.cfg.sound || null, safe: this.cfg.safe || null, format: this.cfg.format || null,
    };
  }
}

// Boot a film module ({ config, build }) into `mount`, and expose the hooks the scripts drive.
export async function boot(mod, mount) {
  const cfg = mod.config || {};
  await Promise.all(['700 40px Archivo', '500 40px Inst', '500 20px JBM', ...(cfg.fonts || [])].map(s => document.fonts.load(s).catch(() => {})));
  const f = new Film(cfg, mount);
  await mod.build(f);
  await document.fonts.ready;
  // every image the film uses is decoded before the first frame, or early frames capture it blank
  await Promise.all([...f.root.querySelectorAll('img')].map(i => (i.complete && i.naturalWidth ? i.decode().catch(() => {}) : new Promise(r => { i.onload = i.onerror = r; }))));
  window.__filmObj = f;
  window.__film = f.info();
  window.__seek = t => f.seek(t);
  window.__shutter = t => f.shutter(t);
  await f.seek(0);
  window.__ready = true;
  return f;
}
