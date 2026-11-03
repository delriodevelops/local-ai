// preview.js: live preview in a browser. The film is scaled to fit the window and plays in a loop.
// space play/pause · ←/→ one frame (shift: one second) · ↑/↓ previous/next mark · 0-9 jump to tenths
// · ?t=4.2 starts at 4.2 s · ?pause starts paused
import { el, css } from './core.js';

export function preview(f) {
  const mount = f.root.parentElement, q = new URLSearchParams(location.search);
  let t = +(q.get('t') || 0), playing = !q.has('pause'), last = performance.now(), busy = false;
  css(document.body, { background: '#111214', overflow: 'hidden', fontFamily: "'Instrument Sans', system-ui", color: '#ddd' });
  const bar = el('div', document.body, '', { position: 'fixed', left: '0', right: '0', bottom: '0', height: '64px', display: 'flex', alignItems: 'center', gap: '14px', padding: '0 18px', background: '#1a1b1e', borderTop: '1px solid #2a2b2f', boxSizing: 'border-box', fontSize: '13px', zIndex: 10 });
  const btn = el('button', bar, '', { width: '64px', height: '32px', borderRadius: '8px', border: '0', background: '#2d2e33', color: '#fff', font: 'inherit', cursor: 'pointer' });
  const range = el('input', bar, '', { flex: '1' });
  Object.assign(range, { type: 'range', min: 0, max: f.duration, step: 1 / f.fps, value: t });
  const label = el('div', bar, '', { width: '210px', fontVariantNumeric: 'tabular-nums', textAlign: 'right' });
  const markBox = el('div', document.body, '', { position: 'fixed', left: '0', right: '0', bottom: '64px', display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '6px 18px', fontSize: '11px', zIndex: 10 });
  const marks = Object.entries(f.markMap).sort((a, b) => a[1] - b[1]);
  marks.forEach(([k, v]) => {
    const b = el('button', markBox, '', { border: '0', borderRadius: '6px', padding: '3px 7px', background: '#26272b', color: '#aaa', font: 'inherit', cursor: 'pointer' });
    b.textContent = `${k} ${v.toFixed(2)}`;
    b.onclick = () => { t = v; playing = false; show(); };
  });
  const fit = () => {
    const s = Math.min((innerWidth - 40) / f.W, (innerHeight - 64 - 40 - (marks.length ? 30 : 0)) / f.H);
    css(mount, { position: 'absolute', left: ((innerWidth - f.W * s) / 2).toFixed(1) + 'px', top: '16px', transform: `scale(${s.toFixed(5)})`, transformOrigin: '0 0' });
  };
  addEventListener('resize', fit);
  fit();
  const show = async () => {
    if (busy) return;
    busy = true;
    await f.seek(t);
    busy = false;
    range.value = t;
    btn.textContent = playing ? 'Pause' : 'Play';
    const beat = f.bpm ? `  ·  beat ${((t - f.beat0) * f.bpm / 60).toFixed(2)}` : '';
    label.textContent = `${t.toFixed(2)} s  ·  frame ${Math.round(t * f.fps)}${beat}`;
  };
  btn.onclick = () => { playing = !playing; last = performance.now(); show(); };
  range.oninput = () => { t = +range.value; playing = false; show(); };
  addEventListener('keydown', e => {
    const step = e.shiftKey ? 1 : 1 / f.fps;
    if (e.code === 'Space') { playing = !playing; last = performance.now(); }
    else if (e.code === 'ArrowRight') { t = Math.min(f.duration, t + step); playing = false; }
    else if (e.code === 'ArrowLeft') { t = Math.max(0, t - step); playing = false; }
    else if (e.code === 'ArrowDown') { const m = marks.find(([, v]) => v > t + 1e-3); if (m) t = m[1]; playing = false; }
    else if (e.code === 'ArrowUp') { const m = [...marks].reverse().find(([, v]) => v < t - 1e-3); t = m ? m[1] : 0; playing = false; }
    else if (/^Digit\d$/.test(e.code)) { t = f.duration * +e.code.slice(5) / 10; playing = false; }
    else return;
    e.preventDefault();
    show();
  });
  const loop = now => {
    if (playing && !busy) {
      t += (now - last) / 1000;
      if (t >= f.duration) t = 0;
      show();
    }
    last = now;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  show();
}
