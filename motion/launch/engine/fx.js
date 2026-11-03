// fx.js: grounds and finishing. Backgrounds that keep a frame alive (dot grid drift, soft gradient
// blobs), an iridescent glow for AI inputs, a small sparkle burst, grain and vignette. Use effects
// with a job: a glow marks the thing that thinks, a burst marks a success, nothing decorates.
import { clamp, lerp, tw, rng, noise, el, css, rgba } from './core.js';

// a dot grid drifting a few px per second: the default ground for UI films
export function dots(f, o = {}) {
  const { layer = f.back, gap = 34, size = 2, color = 'rgba(0,0,0,.09)', vx = 0, vy = -6 } = o;
  const g = el('div', layer, 'am-dots', { backgroundImage: `radial-gradient(${color} ${size}px, transparent ${size + .6}px)`, backgroundSize: `${gap}px ${gap}px`, inset: `-${gap * 2}px` });
  f.add(t => css(g, { backgroundPosition: `${((t * vx) % gap).toFixed(2)}px ${((t * vy) % gap).toFixed(2)}px` }));
  return g;
}
// big soft colour fields that wander slowly (noise-driven, so they never loop visibly)
export function blobs(f, o = {}) {
  const { layer = f.back, colors = ['#7C6CFF', '#FF7A59', '#38D6C9'], size = Math.max(f.W, f.H) * .7, alpha = .35, speed = .05, blur = 80 } = o;
  const items = colors.map((c, i) => {
    const b = el('div', layer, 'am-blob', { width: size + 'px', height: size + 'px', background: `radial-gradient(circle, ${rgba(c, alpha)} 0%, ${rgba(c, 0)} 70%)`, filter: blur ? `blur(${blur}px)` : '' });
    return { b, i };
  });
  f.add(t => items.forEach(({ b, i }) => {
    const x = f.W * (.5 + .38 * noise(t * speed + i * 3.1, i + 1)), y = f.H * (.5 + .38 * noise(t * speed + i * 7.7, i + 9));
    css(b, { transform: `translate(${(x - size / 2).toFixed(1)}px,${(y - size / 2).toFixed(1)}px)` });
  }));
  return items.map(i => i.b);
}
// An iridescent glow behind an element (the "this is the AI" signal): a blurred conic gradient that
// turns slowly. Put it in the element's parent, before the element.
export function glow(f, target, o = {}) {
  const { colors = ['#FF6AD5', '#FF9B5C', '#C8F25A', '#4FD8FF', '#9C7BFF', '#FF6AD5'], spread = 18, blur = 22, speed = 50, t0 = 0, t1 = Infinity, strength = .9 } = o;
  const g = el('div', target.parentElement, 'am-glow');
  target.parentElement.insertBefore(g, target);
  const r = getComputedStyle(target).borderRadius;
  f.add(t => {
    const x = target.offsetLeft - spread, y = target.offsetTop - spread, a = (t * speed) % 360;
    const on = tw(t, t0, t0 + .5, 'out') * (1 - tw(t, t1, t1 + .4, 'in'));
    css(g, { left: x + 'px', top: y + 'px', width: target.offsetWidth + 2 * spread + 'px', height: target.offsetHeight + 2 * spread + 'px', borderRadius: `calc(${r} + ${spread}px)`, background: `conic-gradient(from ${a.toFixed(1)}deg, ${colors.join(',')})`, filter: `blur(${blur}px)`, opacity: (on * strength).toFixed(3), visibility: on < .001 ? 'hidden' : '' });
  });
  return g;
}
// a few short rays from a point: a like, a success, a badge landing (keep it small)
export function burst(f, parent, t0, o = {}) {
  const { x = 0, y = 0, n = 10, color = '#FFC83D', r0 = 30, r1 = 90, width = 4, life = .5, seed = 4 } = o;
  const W = parent.offsetWidth || f.W, H = parent.offsetHeight || f.H, dpr = 2;
  const c = el('canvas', parent, 'am-canvas');
  c.width = W * dpr;
  c.height = H * dpr;
  const g = c.getContext('2d'), r = rng(seed), rays = Array.from({ length: n }, (_, i) => ({ a: i / n * Math.PI * 2 + (r() - .5) * .3, k: .7 + .5 * r() }));
  f.add(t => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    const u = (t - t0) / life;
    if (u < 0 || u > 1) return css(c, { visibility: 'hidden' });
    css(c, { visibility: '' });
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.strokeStyle = color;
    g.lineCap = 'round';
    for (const ray of rays) {
      const h = lerp(r0, r1 * ray.k, tw(u, 0, .6, 'out')), tl = lerp(r0, r1 * ray.k, tw(u, .25, 1, 'out'));
      g.lineWidth = width * (1 - u * .6);
      g.beginPath();
      g.moveTo(x + Math.cos(ray.a) * tl, y + Math.sin(ray.a) * tl);
      g.lineTo(x + Math.cos(ray.a) * h, y + Math.sin(ray.a) * h);
      g.stroke();
    }
  });
  return c;
}
// Film grain, changing on twos. Subtle by default: grain costs bitrate and social re-encodes smear it.
export function grain(f, o = {}) {
  const { opacity = .05, size = 256, frames = 6, seed = 5, blend = 'overlay' } = o;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d'), r = rng(seed), urls = [];
  for (let k = 0; k < frames; k++) {
    const img = x.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0);
    urls.push(`url(${c.toDataURL('image/png')})`);
  }
  const g = el('div', f.top, 'am-grain', { opacity: String(opacity), mixBlendMode: blend });
  f.add(t => css(g, { backgroundImage: urls[Math.floor(t * f.fps / 2 + 1e-6) % frames] }));
  return g;
}
export function vignette(f, o = {}) {
  const { strength = .35, layer = f.top } = o;
  return el('div', layer, 'am-vignette', { background: `radial-gradient(ellipse 85% 80% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,${strength}) 100%)` });
}
export { clamp };
