// type.js: the words around the app. Headlines whose words rise out of mask lines, a word that rolls
// through alternatives, a glyph scramble that resolves, one-word-per-beat kinetic shots, captions
// and an end card. Every word is a node, so entrances and exits simply add up.
import { clamp, lerp, tw, sp, rng, el, css, text, readableOn } from './core.js';
import * as M from './moves.js';

// headline(f, parent, 'Plan less.\nDo more.', { size, weight, font, color, accent: ['more.'], x, y })
// Lines split on \n. accent: words (or indexes) drawn in o.accentColor (or var(--accent)).
export function headline(f, parent, str, o = {}) {
  const { size = 96, weight = 800, font = 'Archivo', color = 'currentColor', lh = 1.04, ls = -.025, align = 'center', width, wdth = 100 } = o;
  const box = el('div', parent, 'am-hl', { fontSize: size + 'px', fontFamily: font, fontWeight: weight, color, lineHeight: lh, letterSpacing: ls + 'em', textAlign: align, fontVariationSettings: font === 'Archivo' ? `'wdth' ${wdth}` : '' });
  if (width) box.style.width = width + 'px';
  const words = [];
  str.split('\n').forEach(line => {
    const L = el('div', box, 'am-line');
    line.split(' ').forEach((w, i, arr) => {
      const m = el('span', L, 'am-mask'), s = el('span', m, 'am-word');
      s.textContent = w;
      const k = words.length;
      if ((o.accent || []).some(a => a === w || a === k)) { s.style.color = o.accentColor || 'var(--accent)'; if (o.accentItalic) s.style.fontStyle = 'italic'; }
      if (i < arr.length - 1) L.appendChild(document.createTextNode(' '));
      words.push(s);
    });
  });
  // place: false leaves the headline in its parent's layout (inside a card, an end card)
  const node = o.place === false ? f.node(box, { place: false }) : f.node(box, { x: o.x ?? f.W / 2, y: o.y ?? f.H / 2, anchor: o.anchor });
  const nodes = words.map(w => f.node(w, { place: false }));
  if (o.safe !== false) box.dataset.safe = '1';
  return { el: box, node, words, nodes };
}
// Words rise out of their masks one after another (~.07 s apart, .8 s each): the house entrance
export function reveal(f, h, t0, o = {}) {
  const { step = .07, dur = .8, ease = 'out', rot = 3, from = 'below' } = o, dir = from === 'above' ? -1 : 1;
  h.nodes.forEach((n, i) => {
    const a = t0 + i * step, H = h.words[i].offsetHeight * 1.08;
    n.mod(t => {
      const u = tw(t, a, a + dur, ease);
      return { y: dir * (1 - u) * H, rz: (1 - u) * rot, o: t >= a ? 1 : 0 };
    });
  });
  if (o.cue !== false) f.cue(t0, o.cue || 'swish', { gain: o.gain ?? .35 });
  return t0 + (h.nodes.length - 1) * step + dur;
}
// ...and leave the same way, about twice as fast
export function conceal(f, h, t0, o = {}) {
  const { step = .035, dur = .4, ease = 'in', to = 'above' } = o, dir = to === 'above' ? -1 : 1;
  h.nodes.forEach((n, i) => {
    const a = t0 + i * step, H = h.words[i].offsetHeight * 1.1;
    n.mod(t => ({ y: dir * tw(t, a, a + dur, ease) * H, o: t >= a + dur ? 0 : 1 }));
  });
  return t0 + (h.nodes.length - 1) * step + dur;
}

// A word that rolls through alternatives inside a mask: roll(f, parent, ['faster.', 'simpler.'], [2, 3.2])
// The box's width follows the current word on a spring so a centred line stays centred.
export function roll(f, parent, words, times, o = {}) {
  const box = el('span', parent, 'am-roll');
  // an invisible copy in the flow gives the box the line's baseline and height
  el('span', box, 'am-roll-strut').textContent = words[0];
  const items = words.map(w => { const s = el('span', box, 'am-roll-w'); s.textContent = w; if (o.color) s.style.color = o.color; return s; });
  const ws = items.map(s => s.offsetWidth), H = box.offsetHeight;
  const cfg = o.spring || { duration: .55, bounce: .08 };
  f.add(t => {
    let w = ws[0];
    for (let i = 1; i < times.length; i++) w += (ws[i] - ws[i - 1]) * sp(t, times[i], cfg);
    css(box, { width: w.toFixed(2) + 'px' });
    items.forEach((s, i) => {
      const enter = i === 0 ? 1 : sp(t, times[i], cfg), leave = i + 1 < times.length ? sp(t, times[i + 1], cfg) : 0;
      css(s, { transform: `translateY(${((1 - enter) * H - leave * H).toFixed(2)}px)`, visibility: (i > 0 && t < times[i]) || leave > .999 ? 'hidden' : '' });
    });
  });
  times.slice(1).forEach(t => f.cue(t, 'tick', { gain: .4 }));
  return box;
}

// Glyphs scramble, then each character settles on the final text (left to right) between t0 and t1
export function scramble(f, e, t0, t1, final, o = {}) {
  const glyphs = o.glyphs || 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=?';
  const n = final.length;
  f.add(t => {
    if (t >= t1) return text(e, final);
    if (t < t0) return text(e, o.before ?? '');
    const r = rng(Math.floor(t * 30) + 11);   // reseeded 30 times a second: random-looking, still pure
    let s = '';
    for (let i = 0; i < n; i++) s += final[i] === ' ' || t >= lerp(t0, t1, (i + 1) / n) ? final[i] : glyphs[Math.floor(r() * glyphs.length)];
    text(e, s);
  });
  return e;
}

// One big word per beat (hooks, openers): shots [{ t, text, size, color, bg, style: 'slam'|'up'|'cut', fit }]
// Each shot holds until the next. bg flips the ground; a shot with a bg that matches the accent
// makes a good drop.
export function kinetic(f, parent, shots, o = {}) {
  const ground = el('div', parent, 'am-ground');
  const nodes = shots.map((s, i) => {
    const w = el('div', parent, 'am-kin', { fontSize: (s.size || o.size || 220) + 'px', fontFamily: s.font || o.font || 'Archivo', fontWeight: s.weight || o.weight || 900, color: s.color || o.color || 'currentColor', fontVariationSettings: `'wdth' ${s.wdth || o.wdth || 100}` });
    w.textContent = s.text;
    const maxW = (o.maxWidth || f.W * .86);
    if (w.offsetWidth > maxW) w.style.fontSize = (parseFloat(w.style.fontSize) * maxW / w.offsetWidth).toFixed(1) + 'px';
    const n = f.node(w, { x: o.x ?? f.W / 2, y: s.y ?? o.y ?? f.H / 2 });
    const t0 = s.t, t1 = shots[i + 1] ? shots[i + 1].t : (o.until ?? f.duration);
    const style = s.style || o.style || 'slam';
    n.mod(t => {
      if (t < t0 || t >= t1) return { o: 0 };
      const u = t - t0;
      if (style === 'slam') return { s: lerp(1.35, 1, tw(t, t0, t0 + .22, 'out')) * (1 + .02 * u) };
      if (style === 'up') return { y: (1 - tw(t, t0, t0 + .3, 'out')) * 120, s: 1 + .02 * u };
      return { s: 1 + .025 * u };
    });
    f.cut(t0);
    if (o.cue !== false) f.cue(t0, s.cue || 'hit', { gain: s.gain ?? .5 });
    return n;
  });
  f.add(t => {
    let bg = o.bg || 'transparent', col = null;
    for (const s of shots) if (t >= s.t && s.bg) { bg = s.bg; col = s.color; }
    css(ground, { background: bg, visibility: t < shots[0].t || t >= (o.until ?? f.duration) ? 'hidden' : '' });
    void col;
  });
  return nodes;
}

// Captions for sound-off viewing, inside the safe area: items [[t0, t1, 'text'], ...]
export function captions(f, parent, items, o = {}) {
  const { y = f.H - (f.cfg.safe?.bottom ?? f.H * .25) - 40, size = 46, color = '#fff', bg = 'rgba(0,0,0,.55)' } = o;
  const box = el('div', parent, 'am-captions', { top: y + 'px', fontSize: size + 'px' });
  box.dataset.safe = '1';
  const lines = items.map(([, , s]) => { const l = el('div', box, 'am-cap', { color, background: bg }); l.textContent = s; return l; });
  f.add(t => items.forEach(([a, b], i) => {
    const on = tw(t, a, a + .25, 'out') * (1 - tw(t, b - .15, b, 'in'));
    css(lines[i], { opacity: on.toFixed(3), transform: `translate(-50%, ${((1 - on) * 18).toFixed(2)}px)`, visibility: on < .001 ? 'hidden' : '' });
  }));
  return box;
}

// End card: app icon pops, name rises, tagline and call to action follow. The only place a film may
// rest: it registers a rest window so the QA script allows the stillness, and still pushes in slowly.
export function endCard(f, parent, t0, o = {}) {
  const { name = 'App', tagline = '', cta = '', icon, color = 'currentColor', y = f.H / 2, accent = 'var(--accent)' } = o;
  const box = el('div', parent, 'am-end', { color });
  let ic = null;
  if (icon) {
    ic = el('div', box, 'am-end-icon');
    if (/\.(png|jpe?g|svg|webp)$/i.test(icon)) ic.style.backgroundImage = `url(${icon})`;
    else ic.style.background = icon;
    if (o.glyph) ic.innerHTML = o.glyph;
  }
  const h = headline(f, box, name, { size: o.size || 120, color, font: o.font, weight: o.weight, place: false });
  const tag = tagline ? el('div', box, 'am-end-tag') : null;
  if (tag) tag.textContent = tagline;
  const btn = cta ? el('div', box, 'am-end-cta', { background: accent, color: readableOn(o.accentHex || '#000000') }) : null;
  if (btn) btn.textContent = cta;
  const n = f.node(box, { x: f.W / 2, y });
  M.push(n, t0, f.duration, { amount: .04 });
  if (ic) M.pop(f.node(ic, { place: false }), t0, { spring: 'pop' });
  reveal(f, h, t0 + .18, { step: .06 });
  if (tag) M.rise(f.node(tag, { place: false }), t0 + .5, { dist: 40, spring: 'ui' });
  if (btn) M.pop(f.node(btn, { place: false }), t0 + .7, { spring: 'pop' });
  f.rest(t0 + 1.2, f.duration);
  f.cue(t0, 'chime', { gain: .5 });
  return { el: box, node: n, icon: ic, title: h, tagline: tag, cta: btn };
}
