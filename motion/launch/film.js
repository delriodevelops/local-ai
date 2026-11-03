// film.js: la película de lanzamiento de MeshMind (v7), hecha con la skill app-motion y llevada por la locución:
// cada plano cae en una palabra (timing.js lee sus tiempos de assets/audio/vo.json). La app está reconstruida en HTML
// con sus medidas, textos y colores reales dentro de una ventana de navegador que gira en 3D, y la cámara la recorre.
//   1 «Every prompt you type»: macro de un chat cualquiera, con desenfoque de fondo
//   2 «goes to someone else's server»: el mensaje se hace punto rojo y un barrido lo sigue hasta un armario de servidores
//   3 «Not anymore»: el golpe de la música, NOT a toda pantalla, y el punto de ANYMORE inunda de rojo
//   4 «This is MeshMind»: MESH y MIND llegan desde el fondo con el disco, y la cámara atraviesa la M
//   5 «Wire AI models into flows»: vuelo rasante sobre el lienzo, persiguiendo la señal
//   6 «right in your browser»: la cámara sale hasta la ventana de tres cuartos
//   7 «They think. They see. They listen. They speak.»: un corte por cada «They», un nodo por sentido
//   8 «All on your own graphics card»: el monitor Resources con cada GPU en rojo
//   9 «No server. No account. No API key.»: tres golpes
//  10 «Your machine is the server»: la ventana en órbita, la señal en bucle
//  11 «MeshMind. Free, in your browser.»: el punto de «server.» se hace el rojo del final
import { browser, shine } from './engine/device.js';
import * as M from './engine/moves.js';
import * as UI from './engine/ui.js';
import * as TY from './engine/type.js';
import { h, $, $$, el, css, text, tw, sp, clamp, lerp, keys, noise, rectIn, E } from './engine/core.js';
import { icon } from './icons.js';
import { timing, VO_AT } from './timing.js';

export const config = {
  title: 'MeshMind launch',
  size: [1920, 1080], fps: 60, duration: 25,
  palette: { bg: '#f2f2ef', ink: '#111111', accent: '#ff3a1f' },
  safe: { top: 60, bottom: 60, left: 96, right: 96 },
  // La música ya va agachada bajo la voz y arranca donde su drop cae en «Not» (prep-audio.mjs)
  music: { file: 'assets/audio/bed.wav', start: 0, gain: 0, fadeOut: .6 },
  sound: { duck: -4 },
  fonts: ['500 20px Plex', '500 20px "Instrument Sans"'],
  parallax: .15,
};

const PAPER = '#f2f2ef', INK = '#111111', RED = '#ff3a1f', NIGHT = '#0b0b0b';
const PORT = { text: '#f2f2ef', image: '#ff3a1f', audio: '#d98e00', any: '#8a8a83' };
const portText = c => `color-mix(in oklab, ${c} 65%, #f2f2ef)`;
const J = () => 1;   // un tramo que salta al valor nuevo nada más empezar: un corte

// La ventana: 1840 x 1000 px de página bajo la barra de 52, a escala 0,95 en el centro del mundo
const WIN = { w: 1840, h: 1000, s: .95 };

// La plantilla «Panel of experts» (flow/presets.ts) con sus nombres, colores e instrucciones
const FLOW = {
  in: { x: 0, y: 300, w: 224, h: 150 },
  r: { x: 440, y: 0, w: 288, h: 196, label: 'Researcher', color: '#60a5fa', text: 'Investigate the request. List the key facts, user needs and open questions. Be concise.' },
  d: { x: 440, y: 300, w: 288, h: 196, label: 'Designer', color: '#f472b6', text: 'Turn the input into a clear product or UX proposal: screens, flows and the main decisions.' },
  c: { x: 440, y: 600, w: 288, h: 196, label: 'Critic', color: '#f87171', text: 'Find the weaknesses, risks and missing pieces in the input. Be direct and specific.' },
  s: { x: 900, y: 300, w: 288, h: 196, label: 'Summarizer', color: '#ff3a1f', text: 'Combine everything you receive into one clear, well-structured answer. Keep what matters, drop repetition.' },
  out: { x: 1360, y: 334, w: 240, h: 128 },
};
const portOut = id => [FLOW[id].x + FLOW[id].w, FLOW[id].y + FLOW[id].h * (id === 'in' ? .38 : .5)];
const portIn = id => [FLOW[id].x, FLOW[id].y + FLOW[id].h * .5];
const EDGES = [['in', 'r'], ['in', 'd'], ['in', 'c'], ['r', 's'], ['d', 's'], ['c', 's'], ['s', 'out']];

// Un nodo por sentido, con lo que la app pone en cada uno (flow/nodes/index.tsx) y lo que sale de él
const SENSES = [
  { id: 'think', x: 0, y: 830, w: 288, kind: 'Assistant', ic: 'sparkles', in: 'any', out: 'text', word: 'Think.', wdth: 125,
    body: `<div class="ttl"><span class="sw" style="background:#60a5fa"></span>Researcher</div><div class="fld">Investigate the request. List the key facts, user needs and open questions. Be concise.</div>`,
    say: 'Key facts: opens before dawn, sourdough by seven, a place to sit.' },
  { id: 'see', x: 380, y: 830, w: 256, kind: 'See image', ic: 'eye', in: 'image', out: 'text', word: 'See.', wdth: 62,
    body: `<div class="ttl">See image</div><div class="fl">What to look for<div class="fld">Describe this image in detail.</div></div>`,
    say: 'A fox in an apron behind a counter of round loaves.' },
  { id: 'listen', x: 720, y: 830, w: 240, kind: 'Transcribe', ic: 'mic', in: 'audio', out: 'text', word: 'Listen.', wdth: 100,
    body: `<div class="ttl">Transcribe</div><p class="help">Turns speech into text with Whisper.</p>`,
    say: '“A bakery run by a fox.”' },
  { id: 'speak', x: 1040, y: 830, w: 240, kind: 'Speak', ic: 'audioLines', in: 'text', out: 'audio', word: 'Speak.', wdth: 62,
    body: `<div class="ttl">Speak</div><div class="two"><div class="fl">Language<div class="sel">English</div></div><div class="fl">Voice<div class="sel">Heart (US, female)</div></div></div>`,
    audio: true },
];

// Un cable con la curva de la app (sale y entra en horizontal) y su punto en u
function wire(a, b) {
  const [x1, y1] = a, [x2, y2] = b, k = Math.max(40, Math.abs(x2 - x1) / 2);
  const P = [[x1, y1], [x1 + k, y1], [x2 - k, y2], [x2, y2]];
  const at = u => [0, 1].map(j => (1 - u) ** 3 * P[0][j] + 3 * (1 - u) ** 2 * u * P[1][j] + 3 * (1 - u) * u * u * P[2][j] + u ** 3 * P[3][j]);
  return { d: `M${x1} ${y1}C${x1 + k} ${y1} ${x2 - k} ${y2} ${x2} ${y2}`, at };
}

const PROMPT = 'explain my blood test results';
const ANSWER = 'Foxglove & Crumb opens before dawn. The Researcher found what neighbours want: sourdough by seven and a place to sit. The Designer drew a counter shaped like a den; the Critic asked for a gluten-free shelf. Together: a small bakery with one long table, a fox on the sign and bread that sells out by noon.';
const MESSAGE = 'A bakery run by a fox';

// El monitor Resources con los modelos de la app (engine/resources.ts) en su orden y sus tamaños; los cuatro de los
// sentidos acaban de trabajar
const ROWS = [
  { name: 'Qwen3.5 4B', dev: 'GPU', dd: 'ready', on: true },
  { name: 'Janus-Pro 1B', dev: 'GPU', dd: 'not loaded · 2.4 GB' },
  { name: 'LFM2.5-VL 450M', dev: 'GPU', dd: 'ready', on: true },
  { name: 'Whisper base', dev: 'GPU', dd: 'ready', on: true },
  { name: 'Kokoro 82M', dev: 'GPU', dd: 'ready · 0.33 GB', on: true },
  { name: 'Supertonic 2', dev: 'CPU', dd: 'not loaded · 0.26 GB' },
  { name: 'FLUX.2 klein 4B', dev: 'GPU', dd: 'loads while painting · 6.5 GB' },
];

// El icono de la app (public/favicon.svg): la M en tinta delante del disco rojo, sobre papel
const MARK = `<svg viewBox="0 0 64 64" width="100%" height="100%"><rect width="64" height="64" fill="#f2f2ef"/><circle cx="43" cy="21" r="17" fill="#ff3a1f"/><path d="M6 58V26H18L28 43L38 26H50V58H40V42L31 57H25L16 42V58Z" fill="#111"/></svg>`;

const port = (side, top, type) => `<span class="port ${side}" style="top:${top};border-color:${PORT[type]}"></span>`;
function nodeHtml(id) {
  const n = FLOW[id], box = `style="left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px"`;
  const head = (ic, kind) => `<div class="nh">${icon(ic, 12)}<span class="lbl">${kind}</span><span class="st"></span></div>`;
  if (id === 'in') {
    const ports = ['text', 'image', 'audio'].map((ty, i) => `<span class="pl" style="top:${38 + i * 20}%;color:${portText(PORT[ty])}">${ty}</span>${port('r', `${38 + i * 20}%`, ty)}`).join('');
    return `<div class="node" data-id="in" ${box}>${head('logIn', 'Message')}<div class="nb"><div class="ttl">Your message</div><p class="msg">What you type, the photo you attach and your voice note start here.</p></div>${ports}<i class="bar"></i></div>`;
  }
  if (id === 'out') return `<div class="node ink" data-id="out" ${box}>${head('logOut', 'Answer')}<div class="nb"><div class="ttl">Answer</div><p class="msg">What reaches here is shown as the answer.</p></div>${port('l', '50%', 'any')}<i class="bar"></i></div>`;
  return `<div class="node" data-id="${id}" ${box}>${head('sparkles', 'Assistant')}<div class="nb"><div class="ttl"><span class="sw" style="background:${n.color}"></span>${n.label}</div><div class="fld">${n.text}</div><span class="tt">→ text</span></div>${port('l', '50%', 'any')}${port('r', '50%', 'text')}<i class="bar"></i></div>`;
}
const senseHtml = s => `<div class="node sense" data-s="${s.id}" style="left:${s.x}px;top:${s.y}px;width:${s.w}px">
  <div class="nh">${icon(s.ic, 12)}<span class="lbl">${s.kind}</span><span class="st"></span></div>
  <div class="nb">${s.body}${s.audio ? `<div class="pv au"><span class="play">${icon('arrowRight', 12)}</span><div class="wave amber">${'<i></i>'.repeat(26)}</div></div>` : '<p class="pv"><span class="txt"></span><i class="cur"></i></p>'}<span class="tt" style="color:${portText(PORT[s.out])}">→ ${s.out}</span></div>
  ${port('l', '40px', s.in)}${port('r', '40px', s.out)}<i class="bar"></i></div>`;

export async function build(f) {
  const T = timing(await (await fetch('assets/audio/vo.json')).json(), f.fps);
  f.duration = T.duration;
  const W = T.W;
  const t = f.marks({
    open: 0, send: W('goes'), server: W('server'), not: W('not'), anymore: W('anymore'), title: W('this'), name: W('meshmind'),
    wire: W('wire'), into: W('into'), flows: W('flows'), browser: W('right'), think: W('they', 0), see: W('they', 1), listen: W('they', 2),
    speak: W('they', 3), gpu: W('all'), card: W('graphics'), noServer: W('no', 0), noAccount: W('no', 1), noKey: W('no', 2),
    machine: W('your', 2), isThe: W('is', 1), end: W('meshmind', 1), free: W('free'), url: W('browser', 1),
  });
  const VERB = [W('think'), W('see'), W('listen'), W('speak')], SENSE_AT = [t.think, t.see, t.listen, t.speak];
  // La voz: sound.mjs la coloca entera desde aquí (assets/sfx/vo.wav, preparada por prep-audio.mjs)
  f.cue(VO_AT, 'vo', { gain: 1, peak: 0 });

  // ---------- el suelo: de noche hasta que la cámara sale a la ventana; luego el papel de la landing ----------
  const lines = el('div', f.back, 'hairlines');
  f.add(tt => {
    const day = tt >= t.browser;
    css(f.root, { background: day ? PAPER : NIGHT });
    css(lines, { visibility: day ? '' : 'hidden' });
  });

  // ---------- 1. un chat cualquiera, de cerca; detrás, desenfocadas, las cajas de otra gente ----------
  const ask = h(f.world, `<div class="ask">
    ${['draft my resignation letter', 'is this contract fair to me?', 'summarize my bank statements'].map(s => `<div class="ask-box far"><span class="ask-t">${s}</span><span class="ask-send">${icon('arrowUp', 30)}</span></div>`).join('')}
    <div class="ask-box mine"><span class="ask-ph">Ask anything</span><span class="ask-t"><span class="typed"></span></span><span class="ask-send">${icon('arrowUp', 30)}</span></div>
  </div>`);
  const askN = f.node(ask, { x: -2600, y: 560, rx: 12, ry: -18, persp: 2200 });
  askN.mod(tt => ({ ry: 6 * tw(tt, 0, t.send + .4, 'lin'), rx: -3 * tw(tt, 0, t.send + .4, 'lin') }));
  const far = $$(ask, '.far');
  [[-380, -330, .78], [520, 300, .66], [-760, 360, .58]].forEach(([x, y, s], i) => f.node(far[i], { place: false }).set({ x, y, s }).mod(tt => ({ y: 10 * Math.sin(tt * .8 + i * 2) })));
  const main = $(ask, '.mine'), typed = $(main, '.typed'), ph = $(main, '.ask-ph'), askSend = $(main, '.ask-send');
  const typedEnd = UI.typeText(f, typed, -.55, PROMPT, { cps: 19, caretFrom: -1, caretUntil: t.send });
  if (typedEnd > t.send - .1) throw new Error(`the prompt finishes typing at ${typedEnd.toFixed(2)} s, after "goes"`);
  css(ph, { visibility: 'hidden' });
  // Al enviar, el texto se recoge hacia el botón y se apaga: se convierte en el punto
  const typedBox = $(main, '.ask-t');
  f.node(typedBox, { place: false }).mod(tt => {
    const u = tw(tt, t.send, t.send + .2, 'in');
    return { css: { transformOrigin: '100% 50%' }, sx: 1 - u, o: 1 - u };
  });
  f.add(tt => css(askSend, { background: tt >= t.send - .02 && tt < t.send + .16 ? RED : PAPER, color: tt >= t.send - .02 && tt < t.send + .16 ? PAPER : INK }));
  M.press(f.node(askSend, { place: false }), t.send);
  f.cue(t.send, 'send', { gain: .6 });

  // ---------- 2. el servidor de otro ----------
  const UNITS = 13, HIT = 6;
  const srv = h(f.world, `<div class="srv"><div class="rack">${Array.from({ length: UNITS }, (_, i) => `<div class="unit${i === HIT ? ' hit' : ''}"><span class="tag">R04-U${String(i + 1).padStart(2, '0')}</span><span class="led"></span><span class="led"></span><span class="vent"></span><span class="slot"></span></div>`).join('')}</div>
    <div class="log"><div class="lh">inference-api · request log</div>
      <div class="ln">POST /v1/chat/completions <span class="ok">200</span></div>
      <div class="ln">user&nbsp;&nbsp;&nbsp;<b>u_7f3a…c91</b></div>
      <div class="ln">prompt <span class="me">"${PROMPT}"</span></div>
      <div class="ln">stored <b>30 days</b></div></div></div>`);
  M.hideAt(f.node(srv, { x: 600, y: 600, rx: 4, ry: -24, persp: 2600 }), t.not);
  M.hideAt(askN, t.not);
  const leds = $$(srv, '.led'), slot = $(srv, '.unit.hit .slot'), logLines = $$(srv, '.ln');
  f.add(tt => leds.forEach((l, i) => l.classList.toggle('on', noise(tt * 3 + i * 1.7, i) > -.1)));
  logLines.forEach((ln, i) => M.showAt(f.node(ln, { place: false }), t.server + .12 + i * .16));
  logLines.forEach((_, i) => f.cue(t.server + .12 + i * .16, 'tick', { gain: .22 }));
  f.add(tt => css(slot, { background: tt >= t.server ? `rgba(255,58,31,${(.9 * (1 - tw(tt, t.server, t.server + .8, 'out')) + .25).toFixed(3)})` : '', boxShadow: tt >= t.server ? `0 0 ${(40 * (1 - tw(tt, t.server, t.server + .9, 'out'))).toFixed(1)}px rgba(255,58,31,.8)` : '' }));
  f.cue(t.server, 'thump', { gain: .5 });

  // El punto rojo vive en pantalla: sale del botón, el barrido lo acompaña y entra en la ranura (las dos posiciones se
  // miden al final, cuando la cámara ya está puesta)
  const dot = el('div', f.top, 'flydot');
  const fly = { a: [0, 0], b: [0, 0] };
  f.add(tt => {
    if (tt < t.send + .05 || tt > t.server + .05) return css(dot, { visibility: 'hidden' });
    const u = clamp((tt - t.send - .05) / (t.server - t.send - .05)), e = E.inOut(u);
    const mid = [960, 520], x = lerp(lerp(fly.a[0], mid[0], e), lerp(mid[0], fly.b[0], e), e), y = lerp(lerp(fly.a[1], mid[1], e), lerp(mid[1], fly.b[1], e), e);
    const s = 1 - .75 * tw(tt, t.server - .12, t.server, 'in');
    css(dot, { visibility: '', transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${s.toFixed(3)})` });
  });

  // ---------- 3. NOT / ANYMORE., y el punto de ANYMORE inunda de rojo ----------
  const night = el('div', f.top, 'ground', { background: NIGHT });
  f.node(night, { place: false }).mod(tt => ({ o: tt >= t.not && tt < t.wire ? 1 : 0 }));
  const notW = el('div', f.top, 'big', { fontSize: '560px', color: PAPER, fontVariationSettings: "'wdth' 125", fontStretch: '125%' });
  notW.textContent = 'Not';
  const notN = f.node(notW, { x: 960, y: 430 });
  notN.mod(tt => ({ o: tt >= t.not && tt < t.title ? 1 : 0, s: lerp(1.22, 1, tw(tt, t.not, t.not + .22, 'out')) * (1 + .025 * clamp(tt - t.not)) }));
  const anyW = el('div', f.top, 'big', { fontSize: '200px', color: PAPER, fontVariationSettings: "'wdth' 62", fontStretch: '62%' });
  anyW.innerHTML = 'Anymore<span class="r">.</span>';
  const anyN = f.node(anyW, { x: 960, y: 820 });
  anyN.mod(tt => ({ o: tt >= t.anymore && tt < t.title ? 1 : 0, y: 60 * (1 - tw(tt, t.anymore, t.anymore + .3, 'out')) }));
  f.cue(t.not, 'hit', { gain: .7, duck: true });
  f.cue(t.anymore, 'swish', { gain: .35 });
  const pr = rectIn($(anyW, '.r'), anyW);
  const anyDot = [960 - anyW.offsetWidth / 2 + pr.cx, 820 - anyW.offsetHeight / 2 + pr.cy + pr.h * .2];
  const red = M.flood(f, f.top, Math.min(t.anymore + .38, t.title - .42), { x: anyDot[0], y: anyDot[1], color: RED, dur: .38 });
  M.hideAt(red, t.wire);

  // ---------- 4. MESH MIND llega desde el fondo con el disco de papel; la cámara atraviesa la M ----------
  const title = h(f.top, `<div class="title"><div class="disc"></div><div class="big mesh" style="font-size:380px;font-variation-settings:'wdth' 125;font-stretch:125%">${[...'Mesh'].map(c => `<span>${c}</span>`).join('')}</div><div class="big mind" style="font-size:380px;font-variation-settings:'wdth' 62;font-stretch:62%">${[...'Mind'].map(c => `<span>${c}</span>`).join('')}</div></div>`);
  css(title, { position: 'absolute', left: '0px', top: '0px', width: '1920px', height: '1080px' });
  const disc = $(title, '.disc'), mesh = $(title, '.mesh'), mind = $(title, '.mind');
  css(disc, { width: '700px', height: '700px', left: '1010px', top: '120px' });
  css(mesh, { left: '150px', top: '180px', color: INK });
  css(mind, { left: '930px', top: '560px', color: INK });
  f.node(disc, { place: false }).mod(tt => ({ s: Math.max(1e-3, sp(tt, t.title - .05, 'soft')), o: tt >= t.title - .05 ? 1 : 0 }));
  $$(title, '.big span').forEach((s, i) => {
    css(s, { display: 'inline-block' });
    const a = t.title + .02 + i * .05;
    f.node(s, { place: false }).mod(tt => ({ s: lerp(2.4, 1, tw(tt, a, a + .5, 'out')), o: tw(tt, a, a + .12, 'lin'), y: -60 * (1 - tw(tt, a, a + .5, 'out')) }));
  });
  f.cue(t.title, 'swish', { gain: .4 });
  f.cue(t.name + .1, 'thump', { gain: .55, duck: true });
  // El empujón: todo el título crece hacia el palo izquierdo de la M hasta que la tinta llena el cuadro
  // (medido en la M: su palo izquierdo ocupa más o menos su primer sexto, a media altura de la mayúscula)
  const mBox = rectIn(mesh.children[0], title), mStem = [mBox.x + mBox.w * .13, mBox.y + mBox.h * .56];
  const titleN = f.node(title, { place: false });
  titleN.mod(tt => {
    const u = tw(tt, t.wire - .42, t.wire, 'in');
    return { css: { transformOrigin: `${mStem[0].toFixed(1)}px ${mStem[1].toFixed(1)}px` }, s: Math.exp(Math.log(220) * u), o: tt >= t.title - .05 && tt < t.wire ? 1 : 0 };
  });
  // Poco obturador de más: el borde de la M va tan rápido que uno largo deja ver cada submuestra
  f.smear(t.wire - .3, t.wire, 1.5);
  f.cue(t.wire - .32, 'whoosh', { gain: .6 });

  // ---------- la ventana y la app ----------
  const d = browser(f, f.world, { w: WIN.w, h: WIN.h, url: 'delriodevelops.github.io/meshmind/app/', theme: 'dark', radius: 10, width: WIN.w * WIN.s });
  $(d.el, '.am-lock').innerHTML = icon('lock', 13);
  M.showAt(d.node, t.wire);
  const paths = EDGES.map(([a, b]) => wire(portOut(a), portIn(b)));
  const sensePaths = SENSES.map(s => wire([s.x - 340, s.y - 30], [s.x, s.y + 40]));
  const app = h(d.screen, `<div class="app">
    <div class="side">
      <div class="side-top"><div class="brand"><b>MeshMind</b><span>Local AI flows</span></div><span class="sq">${icon('squarePen', 16)}</span><span class="sq">${icon('panelLeftClose', 16)}</span></div>
      <div class="lbl h">History</div>
      <div class="hist on">${MESSAGE}</div>
      <div class="hist">Plan a trip to Lisbon</div>
      <div class="hist">Name for a coffee cart</div>
      <div class="lbl side-foot">Everything stays in this browser</div>
    </div>
    <div class="main">
      <div class="hdr">
        <div class="model">${icon('cpu', 16)}<span class="lbl">Model</span><span class="mono">Qwen3.5 4B</span><span class="chev">${icon('chevronDown', 16)}</span></div>
        <div class="tabs"><span class="tab"><span>01</span>Chat</span><span class="tab on"><span>02</span>Both</span><span class="tab"><span>03</span>Flow</span></div>
        <div class="hbtns"><span class="hbtn act">${icon('activity', 16)}<i class="live"></i></span><span class="hbtn">${icon('settings2', 16)}</span></div>
      </div>
      <div class="body">
        <div class="chat">
          <div class="thread">
            <div class="turn-h"><span class="turn-n">01</span><span class="turn-t">${MESSAGE}</span></div>
            <div class="lbl turn-l">Panel of experts · 4 assistants</div>
            <div class="answer"><span class="txt"></span><i class="cur"></i></div>
          </div>
          <div class="compose">
            <div class="box"><span class="sq">${icon('imagePlus', 20)}</span><span class="sq">${icon('mic', 20)}</span><div class="field"><span class="ph">Message the flow · 4 assistants</span></div><span class="send">${icon('arrowUp', 20)}</span></div>
            <div class="lbl note">Runs locally · answers may be inaccurate</div>
          </div>
        </div>
        <div class="canvas">
          <div class="tools"><span class="tool add">${icon('plus', 16)}Add node</span><span class="tool tpl">${icon('layoutTemplate', 16)}Templates</span></div>
          <div class="graph">
            <svg class="wires" width="1600" height="796" viewBox="0 0 1600 796">
              <defs><radialGradient id="halo"><stop offset="0" stop-color="#fff4ef"/><stop offset=".2" stop-color="#ffb4a2" stop-opacity=".9"/><stop offset=".4" stop-color="#ff3a1f" stop-opacity=".45"/><stop offset="1" stop-color="#ff3a1f" stop-opacity="0"/></radialGradient></defs>
              ${paths.map(p => `<path class="w" pathLength="1" d="${p.d}"/><path class="tr" pathLength="1" d="${p.d}"/>`).join('')}
              ${sensePaths.map((p, i) => `<path class="w sw-in" pathLength="1" d="${p.d}" style="stroke:${PORT[SENSES[i].in]}"/>`).join('')}
              ${[...paths, ...sensePaths].map(() => '<g class="sig"><circle r="26" fill="url(#halo)" opacity=".8"/><circle class="dot" r="5"/></g>').join('')}
            </svg>
            ${Object.keys(FLOW).map(nodeHtml).join('')}
            ${SENSES.map(senseHtml).join('')}
          </div>
          <div class="ctrls"><span>${icon('plus', 12)}</span><span>${icon('minus', 12)}</span><span>${icon('maximize', 12)}</span></div>
          <div class="lbl legend">${['text', 'list', 'image', 'audio', 'video'].map((n, i) => `<span><i style="background:${['#f2f2ef', '#2f5bff', '#ff3a1f', '#d98e00', '#7c4dff'][i]}"></i>${n}</span>`).join('')}</div>
          <div class="mini">${Object.values(FLOW).map(n => `<i style="left:${14 + n.x / 1600 * 150}px;top:${22 + n.y / 796 * 72}px;width:${n.w / 1600 * 150}px;height:${n.h / 796 * 72}px"></i>`).join('')}</div>
        </div>
      </div>
    </div>
    <div class="dim"></div>
    <div class="res">
      <div class="rt">Resources</div>
      <div class="lbl sec">Models</div>
      <ul>${ROWS.map(r => `<li><span class="s ${r.on ? 'ready' : ''}"></span><span><span class="nm">${r.name}</span><span class="dt"><span class="dev">${r.dev}</span> · ${r.dd}</span></span></li>`).join('')}</ul>
      <div class="del">${icon('trash', 14)}Delete downloaded models</div>
    </div>
  </div>`);

  // La ventana gira en 3D con cada plano: en cada corte salta a su ángulo y dentro del plano deriva despacio
  d.node.persp = 1500;
  const ROT = [
    [t.wire, [54, 0, -9]], [t.browser, [49, 4, -11], 'lin'], [t.browser + 1.1, [7, -22, 0], 'inOut'],
    [t.think - 1e-3, [7, -24, 0], 'lin'], [t.think, [12, 21, 0], J], [t.see - 1e-3, [11, 25, 0], 'lin'],
    [t.see, [8, -19, 0], J], [t.listen - 1e-3, [8, -23, 0], 'lin'], [t.listen, [14, 17, 0], J], [t.speak - 1e-3, [13, 21, 0], 'lin'],
    [t.speak, [8, -21, 0], J], [t.gpu - 1e-3, [8, -25, 0], 'lin'], [t.gpu, [10, -20, 0], J], [t.noServer, [7, -13, 0], 'lin'],
    [t.machine - 1e-3, [7, -13, 0]], [t.machine, [7, -36, 0], J], [t.end, [4, -14, 0], 'inOut'],
  ];
  d.node.mod(tt => { const [rx, ry, rz] = keys(tt, ROT); return { rx, ry, rz }; });

  // ---------- 5 y 6. el flujo: los nodos caen, los cables se tienden, la señal corre ----------
  const nodes = Object.fromEntries($$(app, '.node:not(.sense)').map(e => [e.dataset.id, e]));
  ['in', 'r', 'd', 'c', 's', 'out'].forEach((id, i) => {
    const t0 = t.wire + .04 + i * .1, n = f.node(nodes[id], { place: false });
    M.drop(n, t0, { dist: 60, spring: 'ui', fade: .08 });
    n.mod(tt => ({ s: lerp(1.08, 1, sp(tt, t0, 'ui')) }));
    f.cue(t0 + .08, 'pop', { gain: .32, pan: (FLOW[id].x / 1600 - .3) * .8 });
  });
  const f0 = t.flows;
  const DRAW = EDGES.map((_, i) => t.into - .15 + i * .07);
  DRAW.forEach(tt => f.cue(tt, 'tick', { gain: .22 }));
  // La señal cruza el flujo en 1,6 s: la respuesta llega mientras la cámara sale a la ventana
  const RUN = [[f0, f0 + .3], [f0, f0 + .3], [f0, f0 + .3], [f0 + .62, f0 + .87], [f0 + .67, f0 + .92], [f0 + .72, f0 + .97], [f0 + 1.12, f0 + 1.37]];
  const WORK = { in: [f0 - .2, f0], r: [f0 + .3, f0 + .62], d: [f0 + .3, f0 + .67], c: [f0 + .3, f0 + .72], s: [f0 + .97, f0 + 1.12], out: [f0 + 1.37, f0 + 1.62] };
  const ANSWER_AT = f0 + 1.37;
  f.cue(f0, 'swish', { gain: .4 });
  f.cue(ANSWER_AT, 'success', { gain: .35 });
  // Los sentidos: a cada uno le llega la señal por su cable y trabaja hasta el corte siguiente
  const SRUN = SENSE_AT.map(a => [a + .02, a + .3]);
  const SWORK = SENSE_AT.map((a, i) => [a + .3, i < 3 ? SENSE_AT[i + 1] : t.gpu]);
  // En el plano de la ventana como servidor la señal vuelve a pasar en bucle
  const LOOP = 2.4, loopRun = i => (i < 3 ? [0, .55] : i < 6 ? [.7, 1.25] : [1.4, 1.95]);
  const signalAt = (i, tt) => {
    if (i >= 7) {
      const [a, b] = SRUN[i - 7];
      return { u: tt > a && tt < b ? E.inOut((tt - a) / (b - a)) : -1, trail: 0 };
    }
    if (tt >= t.machine) {
      const p = (tt - t.machine) % LOOP, [a, b] = loopRun(i);
      return { u: p > a && p < b ? E.inOut((p - a) / (b - a)) : -1, trail: 0 };
    }
    const [a, b] = RUN[i], u = clamp((tt - a) / (b - a));
    return { u: tt > a && tt < b ? E.inOut(u) : -1, trail: (tt > a ? E.inOut(u) : 0) * (1 - tw(tt, t.think - .3, t.think, 'lin')) };
  };
  const svg = $(app, '.wires'), wPaths = $$(svg, 'path.w:not(.sw-in)'), inPaths = $$(svg, 'path.sw-in'), trPaths = $$(svg, 'path.tr'), sigs = $$(svg, '.sig');
  const allPaths = [...paths, ...sensePaths];
  const senses = $$(app, '.node.sense');
  senses.forEach((e, i) => M.showAt(f.node(e, { place: false }), SENSE_AT[i]));
  f.add(tt => {
    paths.forEach((p, i) => {
      const u = tw(tt, DRAW[i], DRAW[i] + .2, 'out');
      css(wPaths[i], { strokeDasharray: `${u.toFixed(4)} 2`, visibility: u > 0 ? '' : 'hidden' });
      const s = signalAt(i, tt);
      css(trPaths[i], { strokeDasharray: `${s.trail.toFixed(4)} 2`, visibility: s.trail > .001 ? '' : 'hidden' });
    });
    inPaths.forEach((p, i) => css(p, { visibility: tt >= SENSE_AT[i] ? '' : 'hidden' }));
    // El punto queda puesto aunque no se vea, al principio o al final de su cable: la cámara lo persigue y no debe saltar
    allPaths.forEach((p, i) => {
      const s = signalAt(i, tt), home = i < 7 ? (tt < RUN[i][0] ? 0 : 1) : (tt < SRUN[i - 7][0] ? 0 : 1);
      const [x, y] = p.at(s.u < 0 ? home : s.u);
      css(sigs[i], { visibility: s.u < 0 ? 'hidden' : '', transform: `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)` });
    });
    const state = (e, a, b, looping) => {
      const working = !looping && tt >= a && tt < b, done = looping || tt >= b;
      const k = working ? clamp((tt - a) / .1) * (.82 + .18 * Math.sin((tt - a) * 7)) : 0;
      css(e, { borderColor: working ? RED : '', boxShadow: k > 0 ? `0 0 ${(30 * k).toFixed(1)}px ${(5 * k).toFixed(1)}px rgba(255,58,31,${(.42 * k).toFixed(3)}), inset 0 0 ${(18 * k).toFixed(1)}px rgba(255,58,31,${(.16 * k).toFixed(3)})` : '' });
      const st = $(e, '.st'), mode = working ? 'run' : done ? 'done' : '';
      if (st.__mode !== mode) { st.__mode = mode; st.innerHTML = mode === 'run' ? icon('loaderCircle', 14, 'style="color:#ff6b52"') : mode === 'done' ? icon('check', 14) : ''; }
      if (working) css($(st, 'svg'), { transform: `rotate(${((tt - a) * 360).toFixed(1)}deg)` });
      // La barra roja del pie crece y se recoge mientras trabaja, como el cue del hero
      const bar = $(e, '.bar');
      if (!working) css(bar, { transform: 'scaleX(0)' });
      else {
        const ph = (tt - a) % 1, grow = ph < .5;
        css(bar, { transformOrigin: grow ? '0 50%' : '100% 50%', transform: `scaleX(${(grow ? E.inOut(ph / .5) : 1 - E.inOut((ph - .5) / .5)).toFixed(4)})` });
      }
    };
    for (const [id, e] of Object.entries(nodes)) {
      state(e, ...WORK[id], tt >= t.machine);
      const lit = $(e, '.port.l');
      if (!lit) continue;
      let k = 0;
      if (tt >= t.machine) {
        const p = (tt - t.machine) % LOOP, at = id === 'out' ? 1.95 : id === 's' ? 1.25 : .55;
        k = p >= at ? 1 - clamp((p - at) / .45) : 0;
      } else EDGES.forEach(([, b], i) => { if (b === id && tt >= RUN[i][1]) k = Math.max(k, 1 - clamp((tt - RUN[i][1]) / .45)); });
      css(lit, { background: k > 0 ? RED : '', boxShadow: k > 0 ? `0 0 ${(16 * k).toFixed(1)}px ${(4 * k).toFixed(1)}px rgba(255,58,31,${(.6 * k).toFixed(3)})` : '' });
    }
    senses.forEach((e, i) => {
      state(e, ...SWORK[i], false);
      // Lo que sale del nodo: el texto va saliendo letra a letra; la voz, una onda que late
      const s = SENSES[i], a = SWORK[i][0];
      if (s.audio) $$(e, '.wave i').forEach((b, j) => css(b, { height: `${(tt < a ? 8 : 20 + 70 * Math.abs(noise(tt * 6 + j * .9, j))).toFixed(1)}%` }));
      else {
        const n = Math.round(clamp((tt - a) * 48, 0, s.say.length));
        text($(e, '.txt'), s.say.slice(0, n));
        css($(e, '.cur'), { visibility: n > 0 && n < s.say.length ? '' : 'hidden' });
      }
    });
  });
  // El chat: la respuesta llega palabra a palabra cuando la señal alcanza el nodo Answer
  const answer = $(app, '.answer'), ans = $(answer, '.txt'), cur = $(answer, '.cur');
  f.add(tt => {
    const n = Math.round(clamp((tt - ANSWER_AT) * 80, 0, ANSWER.length));
    text(ans, ANSWER.slice(0, n));
    css(cur, { visibility: n > 0 && n < ANSWER.length ? '' : 'hidden' });
  });
  const live = $(app, '.live');
  f.add(tt => {
    const on = tt >= f0 && tt < f0 + 1.62;
    css(live, { visibility: on ? '' : 'hidden', opacity: on ? (.625 + .375 * Math.cos(2 * Math.PI * (tt - f0) / 1.6)).toFixed(3) : '0' });
  });
  shine(f, d, t.browser + .6, { dur: 1.2, strength: .12 });
  f.cue(t.browser, 'whoosh', { gain: .45 });

  // ---------- 7. los sentidos: la palabra grande en el lado libre, sobre una sombra ----------
  SENSES.forEach((s, i) => {
    const a = SENSE_AT[i], b = i < 3 ? SENSE_AT[i + 1] : t.gpu, left = i % 2 === 0;
    const scrim = el('div', f.top, 'scrim', { background: `linear-gradient(${left ? 90 : 270}deg, rgba(11,11,11,.94) 0%, rgba(11,11,11,.86) 36%, rgba(11,11,11,0) 62%)` });
    f.node(scrim, { place: false }).mod(tt => ({ o: tt >= a && tt < b ? 1 : 0 }));
    const w = TY.headline(f, f.top, s.word.toUpperCase(), { size: 210, weight: 900, color: PAPER, wdth: s.wdth, ls: -.04, lh: .9, align: left ? 'left' : 'right', anchor: [left ? 0 : 1, .5], x: left ? 110 : 1810, y: 540 });
    const word = w.words[0];
    word.innerHTML = word.textContent.slice(0, -1) + '<span class="hl-dot">.</span>';
    TY.reveal(f, w, VERB[i] - .04, { step: .05, dur: .5, gain: .3 });
    M.hideAt(w.node, b);
    f.cue(a, 'swipe', { gain: .5 });
  });

  // ---------- 8. la gráfica: el monitor Resources, cada GPU en rojo ----------
  const res = $(app, '.res'), dim = $(app, '.dim'), act = $(app, '.hbtn.act');
  const resN = f.node(res, { place: false });
  resN.mod(tt => ({ o: tt >= t.gpu && tt < t.noServer ? 1 : 0 }));
  f.node(dim, { place: false }).mod(tt => ({ o: tt >= t.gpu && tt < t.noServer ? .82 : 0 }));
  f.add(tt => act.classList.toggle('on', tt >= t.gpu && tt < t.noServer));
  $$(res, '.dev').forEach((g, i) => {
    if (ROWS[i].dev !== 'GPU') return;
    const a = t.card + i * .07;
    f.add(tt => css(g, { color: tt >= a ? '#ff6b52' : '' }));
    f.cue(a, 'tick', { gain: .2 });
  });
  const scrimG = el('div', f.top, 'scrim', { background: 'linear-gradient(90deg, rgba(11,11,11,.94) 0%, rgba(11,11,11,.84) 40%, rgba(11,11,11,0) 64%)' });
  f.node(scrimG, { place: false }).mod(tt => ({ o: tt >= t.gpu && tt < t.noServer ? 1 : 0 }));
  const hG = TY.headline(f, f.top, 'ON YOUR OWN\nGRAPHICS CARD.', { size: 118, weight: 900, color: PAPER, wdth: 80, ls: -.04, lh: .92, align: 'left', anchor: [0, .5], x: 110, y: 540, accent: ['GRAPHICS', 'CARD.'], accentColor: RED });
  TY.reveal(f, hG, t.gpu + .05, { step: .06, dur: .55, gain: .3 });
  M.hideAt(hG.node, t.noServer);

  // ---------- 9. No server. No account. No API key. ----------
  const nos = TY.kinetic(f, f.top, [
    { t: t.noServer, text: 'No server.', bg: RED, color: INK, wdth: 125, gain: .6 },
    { t: t.noAccount, text: 'No account.', bg: INK, color: PAPER, wdth: 62, gain: .6 },
    { t: t.noKey, text: 'No API key.', bg: PAPER, color: INK, wdth: 100, gain: .6 },
  ], { size: 330, weight: 900, until: t.machine, style: 'cut' });
  // Cada golpe entra barrido desde un lado distinto, con el obturador abierto
  [t.noServer, t.noAccount, t.noKey].forEach((a, i) => {
    const dir = i % 2 ? -1 : 1;
    nos[i].mod(tt => ({ x: dir * 700 * (1 - tw(tt, a, a + .16, 'out')) }));
    f.smear(a, a + .16, 3);
  });

  // ---------- 10. Your machine is the server ----------
  const hM = TY.headline(f, f.top, 'Your machine\nis the server.', { size: 100, color: INK, align: 'left', anchor: [0, .5], x: 110, y: 540 });
  const last = hM.words[hM.words.length - 1];
  last.innerHTML = 'server<span class="hl-dot">.</span>';
  TY.reveal(f, { nodes: hM.nodes.slice(0, 2), words: hM.words.slice(0, 2) }, t.machine + .02, { gain: .3 });
  TY.reveal(f, { nodes: hM.nodes.slice(2), words: hM.words.slice(2) }, t.isThe - .04, { gain: .3 });
  f.cue(t.machine, 'swoosh', { gain: .35 });

  // ---------- 11. el punto de «server.» se hace el rojo del final: el icono, MESHMIND, gratis, la dirección ----------
  const box = rectIn($(last, '.hl-dot'), hM.el);
  M.flood(f, f.top, t.end - .3, { x: 110 + box.cx, y: 540 - hM.el.offsetHeight / 2 + box.cy + box.h * .18, color: RED, dur: .32 });
  M.hideAt(hM.node, t.end);
  // Los golpes del final van en el hueco antes del nombre, para no taparlo; la campanilla, cuando ya se ha dicho
  f.cue(t.end - .3, 'riser', { gain: .22 });
  f.cue(t.end - .3, 'thump', { gain: .5, duck: true });
  f.cue(T.end('meshmind', 1) + .05, 'chime', { gain: .28 });
  const endDisc = el('div', f.top, 'disc', { width: '640px', height: '640px' });
  f.node(endDisc, { x: 1720, y: 120 }).mod(tt => ({ s: Math.max(1e-3, sp(tt, t.end - .05, 'soft')), y: 10 * Math.sin((tt - t.end) * .7), o: tt >= t.end - .05 ? 1 : 0 }));
  const end = h(f.top, `<div class="endc">
    <div class="mark">${MARK}</div>
    <div class="word"><span class="m"><span class="a">Mesh</span></span><span class="m"><span class="b">Mind</span></span></div>
    <div class="tag">Free, in your browser.</div>
    <div class="url">delriodevelops.github.io/meshmind</div>
  </div>`);
  const endN = f.node(end, { x: 960, y: 590 });
  M.push(endN, t.end, f.duration, { amount: .03 });
  M.pop(f.node($(end, '.mark'), { place: false }), t.end, { spring: 'pop' });
  $$(end, '.word .m > span').forEach((s, i) => {
    const a = t.end + .06 + i * .09, H = s.offsetHeight * 1.1;
    f.node(s, { place: false }).mod(tt => ({ y: (1 - tw(tt, a, a + .7, 'out')) * H, o: tt >= a ? 1 : 0 }));
  });
  M.rise(f.node($(end, '.tag'), { place: false }), t.free - .05, { dist: 30, spring: 'ui', fade: .2 });
  M.rise(f.node($(end, '.url'), { place: false }), t.url - .05, { dist: 24, spring: 'ui', fade: .12 });
  f.rest(t.url + 1, f.duration);

  // ---------- la cámara ----------
  const cam = f.cam;
  cam.ks[0].s = cam.resolve(main, { zoom: 1.5, dy: 40 });
  cam.drift(0, t.send + .1, .06);
  cam.whip(t.send + .5, slot, { dur: .85, zoom: 1.3, dx: 120, cue: false });
  f.cue(t.send + .2, 'whoosh', { gain: .65 });
  cam.drift(t.send + .9, t.not, .08);
  // Rasante y de cerca: con la ventana tumbada, el lienzo se ve en escorzo y hace falta más zoom
  cam.cut(t.wire, nodes.in, { zoom: 3.3, dx: 520, dy: 60 });
  cam.move(f0 - .1, Math.min(f0 + .4, t.browser - .02), sigs[1], { zoom: 3.1 });
  cam.move(t.browser, t.browser + 1.1, d.el, { pad: .06 });
  SENSES.forEach((s, i) => cam.cut(SENSE_AT[i], senses[i], { zoom: 3.5, dx: i % 2 === 0 ? -430 : 430 }));
  SENSE_AT.forEach((a, i) => cam.drift(a, (i < 3 ? SENSE_AT[i + 1] : t.gpu) - .02, .05, { release: 0 }));
  cam.cut(t.gpu, res, { zoom: 1.85, dx: -420 });
  cam.drift(t.gpu, t.noServer - .02, .04, { release: 0 });
  cam.cut(t.machine, d.el, { zoom: .6, dx: -440 });
  cam.drift(t.machine, f.duration, .05);

  // ---------- las dos puntas del viaje del punto, medidas con la cámara ya puesta ----------
  const at = async (tt, e) => {
    await f.seek(tt);
    const rr = f.root.getBoundingClientRect(), k = rr.width / f.W, r = e.getBoundingClientRect();
    return [(r.left + r.width / 2 - rr.left) / k, (r.top + r.height / 2 - rr.top) / k];
  };
  fly.a = await at(t.send + .02, askSend);
  fly.b = await at(t.server, slot);
}
