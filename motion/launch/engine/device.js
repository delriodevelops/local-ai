// device.js: generic device frames built in CSS (no maker's marks): a phone with real thickness when it
// turns, a tablet, and a browser window. The screen is authored in the device's own points (a phone
// screen is 393 x 852, like the phones people design for) and the whole device is scaled to `height`.
// Put the app's UI, screenshots or footage inside `d.screen`; touches and scrolls live there too.
import { el, mixc, rectIn, css, clamp } from './core.js';

const FINISH = {
  black: ['#3a3a3e', '#0f0f11', '#18181b'],
  silver: ['#f1f2f4', '#9fa2a8', '#c6c8cc'],
  natural: ['#d6d0c6', '#8b857c', '#aaa49a'],
  blue: ['#4c5a70', '#1e2632', '#2c3646'],
  white: ['#fbfbfb', '#d0d0d2', '#e4e4e6'],
};
const finish = c => FINISH[c] || [mixc(c, '#ffffff', .35), mixc(c, '#000000', .45), mixc(c, '#000000', .2)];

function deviceShell(f, parent, o) {
  const { sw, sh, bezel, radius, depth, layers, color } = o;
  const [hi, lo, side] = finish(color);
  const dw = sw + 2 * bezel, dh = sh + 2 * bezel;
  const wrap = el('div', parent, 'am-device ' + (o.cls || ''), { width: dw + 'px', height: dh + 'px' });
  const body = el('div', wrap, 'am-body', { width: dw + 'px', height: dh + 'px' });
  // the edge: copies of the outline stacked behind the face, so a turned device shows a solid side
  for (let i = layers; i >= 1; i--) {
    el('div', body, 'am-side', { borderRadius: radius + bezel + 'px', background: mixc(side, '#000000', .15 + .35 * i / layers), transform: `translateZ(${(-depth * i / layers).toFixed(2)}px)` });
  }
  const frame = el('div', body, 'am-frame', { borderRadius: radius + bezel + 'px', background: `linear-gradient(135deg, ${hi}, ${lo} 38%, ${side} 62%, ${hi})` });
  const bez = el('div', frame, 'am-bezel', { inset: Math.max(2, bezel * .22) + 'px', borderRadius: radius + bezel * .8 + 'px' });
  const screen = el('div', frame, 'am-screen', { left: bezel + 'px', top: bezel + 'px', width: sw + 'px', height: sh + 'px', borderRadius: radius + 'px', background: o.bg || '#ffffff' });
  const content = el('div', screen, 'am-content', { width: sw + 'px', height: sh + 'px' });
  const over = el('div', screen, 'am-over');
  const glare = el('div', screen, 'am-glare');
  if (o.shadow !== false) frame.style.boxShadow = o.shadow || `0 ${dh * .03}px ${dh * .06}px rgba(0,0,0,.28), 0 ${dh * .01}px ${dh * .015}px rgba(0,0,0,.2)`;
  void bez;
  return { wrap, body, frame, screen, content, over, glare, dw, dh, side };
}

function api(f, shell, o, extra = {}) {
  const { wrap, body, content, dw, dh } = shell;
  const height = o.height ?? (o.width ? o.width * dh / dw : f.H * .74);
  const s = height / dh;
  const node = f.node(wrap, { x: o.x ?? f.W / 2, y: o.y ?? f.H / 2, s, inner: body, persp: o.persp ?? dh * 3 });
  const d = {
    node, el: wrap, screen: content, over: shell.over, glare: shell.glare, frame: shell.frame,
    w: dw, h: dh, sw: o.sw, sh: o.sh, scale: s,
    // layout rect / centre of an element inside the screen, in screen points
    rect: target => rectIn(typeof target === 'string' ? content.querySelector(target) : target, content),
    at: (target, dx = 0, dy = 0) => {
      const r = d.rect(target);
      return [r.cx + dx, r.cy + dy];
    },
    ...extra,
  };
  return d;
}

// A phone. model: 'island' (pill cutout), 'punch' (hole camera, Android style), 'notch' or 'none'.
export function phone(f, parent, o = {}) {
  const model = o.model || 'island';
  const cfg = {
    sw: 393, sh: 852, bezel: model === 'punch' ? 10 : 12, radius: model === 'punch' ? 40 : 54,
    depth: 42, layers: 12, color: 'black', ...o,
  };
  if (o.screen) [cfg.sw, cfg.sh] = o.screen;
  const sh = deviceShell(f, parent, { ...cfg, cls: 'am-phone am-model-' + model });
  const { frame, screen, over } = sh;
  const [hi, lo] = finish(cfg.color);
  // side buttons, drawn outside the face so they read in a three-quarter view
  const btn = (side, y, h) => el('div', frame, 'am-btn', { [side]: '-3px', top: y + 'px', height: h + 'px', background: `linear-gradient(${side === 'left' ? 90 : 270}deg, ${lo}, ${hi})` });
  if (model !== 'none') {
    btn('left', 150, 32); btn('left', 214, 62); btn('left', 290, 62); btn('right', 250, 98);
    // a generic camera block on the back (seen when the phone spins), facing backward
    const cam = el('div', sh.body, 'am-backcam', { right: '22px', top: '22px', transform: `translateZ(${(-cfg.depth - .6).toFixed(1)}px) rotateY(180deg)`, background: mixc(sh.side, '#ffffff', .12) });
    for (const [x, y] of [[18, 18], [18, 88], [88, 53]]) el('i', cam, '', { left: x + 'px', top: y + 'px' });
  }
  let island = null;
  if (model === 'island') island = el('div', over, 'am-island', { width: '124px', height: '36px', left: (cfg.sw - 124) / 2 + 'px', top: '11px' });
  if (model === 'punch') island = el('div', over, 'am-punch', { left: cfg.sw / 2 - 7 + 'px', top: '14px' });
  if (model === 'notch') island = el('div', over, 'am-notch', { left: (cfg.sw - 160) / 2 + 'px' });
  if (o.homeBar !== false) el('div', over, 'am-homebar', { background: o.homeBarColor || 'rgba(0,0,0,.85)' });
  if (o.status !== false) statusBar(over, { width: cfg.sw, model, ...(o.status || {}) });
  void screen;
  return api(f, sh, cfg, { island, model });
}

export function tablet(f, parent, o = {}) {
  const cfg = { sw: 820, sh: 1180, bezel: 22, radius: 22, depth: 30, layers: 10, color: 'silver', ...o };
  if (o.screen) [cfg.sw, cfg.sh] = o.screen;
  const sh = deviceShell(f, parent, { ...cfg, cls: 'am-tablet' });
  if (o.status !== false) statusBar(sh.over, { width: cfg.sw, model: 'none', ...(o.status || {}) });
  return api(f, sh, cfg);
}

// A desktop browser window: title bar with window controls and an address bar. w x h is the page.
export function browser(f, parent, o = {}) {
  const { w = 1280, h = 800, url = 'yourapp.com', theme = 'light', radius = 14 } = o;
  const dark = theme === 'dark', barH = 52;
  const wrap = el('div', parent, 'am-device am-browser' + (dark ? ' dark' : ''), { width: w + 'px', height: h + barH + 'px', borderRadius: radius + 'px' });
  const body = el('div', wrap, 'am-body', { width: '100%', height: '100%', borderRadius: radius + 'px' });
  const bar = el('div', body, 'am-bar', { height: barH + 'px' });
  const dots = el('div', bar, 'am-dots');
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach(c => el('i', dots, '', { background: c }));
  const addr = el('div', bar, 'am-addr');
  el('span', addr, 'am-lock').textContent = '';
  const urlEl = el('span', addr, 'am-url');
  urlEl.textContent = url;
  const page = el('div', body, 'am-page', { top: barH + 'px', width: w + 'px', height: h + 'px', background: o.bg || (dark ? '#0f1012' : '#ffffff') });
  const content = el('div', page, 'am-content', { width: w + 'px', height: h + 'px' });
  const over = el('div', page, 'am-over');
  const glare = el('div', page, 'am-glare');
  if (o.shadow !== false) body.style.boxShadow = `0 ${h * .04}px ${h * .09}px rgba(0,0,0,.22), 0 2px 6px rgba(0,0,0,.12)`;
  return api(f, { wrap, body, content, over, glare, frame: body, dw: w, dh: h + barH }, { ...o, sw: w, sh: h }, { url: urlEl, bar });
}

// iOS-style status bar: time on the left, signal, wi-fi and battery on the right (generic glyphs)
export function statusBar(parent, o = {}) {
  const { time = '9:41', color = '#000000', width = 393, model = 'island' } = o;
  const s = el('div', parent, 'am-status', { width: width + 'px', color, height: model === 'island' ? '54px' : '44px' });
  const tm = el('div', s, 'am-time');
  tm.textContent = time;
  const ic = el('div', s, 'am-icons');
  ic.innerHTML = `<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg>
<svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.2-1.3C13.3 1.4 10.8.4 8 .4S2.7 1.4.8 3.3L2 4.6c1.6-1.5 3.7-2.4 6-2.4zm0 3.6c1.3 0 2.5.5 3.5 1.3l1.2-1.3C11.4 4.6 9.8 4 8 4s-3.4.6-4.7 1.8l1.2 1.3c1-.8 2.2-1.3 3.5-1.3zm0 3.6c.4 0 .8.1 1.1.4L8 11 6.9 9.8c.3-.3.7-.4 1.1-.4z" fill="currentColor"/></svg>
<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.5" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="currentColor" opacity=".45"/></svg>`;
  return s;
}

// Light sweeping across the glass of a device: a quiet way to make a held phone feel alive
export function shine(f, d, t0, o = {}) {
  const { dur = 1.1, strength = .16 } = o;
  if (!d.shines) {
    d.shines = [];
    // one updater per device evaluates every sweep, so the glare is a pure function of time
    f.add(t => {
      const s = d.shines.find(s => t >= s.t0 && t <= s.t0 + s.dur);
      if (!s) return css(d.glare, { opacity: '0' });
      const u = clamp((t - s.t0) / s.dur);
      css(d.glare, {
        background: `linear-gradient(115deg, rgba(255,255,255,0) 35%, rgba(255,255,255,${s.strength}) 50%, rgba(255,255,255,0) 65%)`,
        backgroundSize: '300% 100%', backgroundPosition: `${(100 - u * 100).toFixed(2)}% 0`, opacity: Math.sin(Math.PI * u).toFixed(3),
      });
    });
  }
  d.shines.push({ t0, dur, strength });
}
