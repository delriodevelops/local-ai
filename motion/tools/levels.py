"""Cómo suena cada pista de la mezcla: sonoridad integrada, pico real y la sonoridad momentánea (400 ms) por tramos.
Para equilibrar la mezcla con números: renderiza cada pista sola (Soundtrack, prop stem) y compáralas.

  python tools/levels.py out/stem-vo.wav out/stem-music.wav out/stem-fx.wav

Con numpy, scipy y soundfile instalados mide además, en el orden voz, música, efectos: el reparto por secciones, el
margen de la voz sobre música + efectos en cada palabra (debe ser de 6 LU o más) y el salto del golpe en «anymore.».
Todo con la ponderación K de BS.1770, a rango completo y en la banda de un móvil (250 Hz - 10 kHz)
"""
import json
import math
import pathlib
import re
import subprocess
import sys

VO_JSON = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'audio' / 'vo.json'
FPS = 30
DROP = 107
# Las mismas cuentas que src/timing.ts: la voz entra en el 12 y desde TAIL entra SHIFT fotogramas antes
VO_START, TAIL, SHIFT = 12, 19, 8
SECTIONS = [
    ('hook', 12, 88), ('vacuum', 88, 107), ('anymore.', 107, 119), ('drop', 119, 134), ('This is MeshMind.', 134, 179),
    ('Wire AI models...', 179, 274), ('They think...speak', 274, 375), ('section change', 375, 387), ('graphics card.', 387, 441),
    ('No server/account/key', 441, 522), ('section change', 522, 534), ('Your machine...', 534, 579), ('MeshMind.', 579, 602),
    ('signature, dot', 602, 622), ('Free, in your browser.', 622, 674), ('end card', 674, 735),
]
MARGIN = 6


def momentary(path):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=metadata=1,ametadata=print:key=lavfi.r128.M:file=-', '-f', 'null', '-'],
                         capture_output=True, text=True).stdout
    out, t = [], None
    for line in err.splitlines():
        m = re.search(r'pts_time:([0-9.]+)', line)
        if m:
            t = float(m.group(1))
            continue
        m = re.search(r'lavfi.r128.M=(-?[0-9.]+|-inf)', line)
        if m and t is not None:
            out.append((t, -99.0 if m.group(1) == '-inf' else float(m.group(1))))
    return out


def summary(path):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    data = json.loads(err[err.rindex('{'):err.rindex('}') + 1])
    return float(data['input_i']), float(data['input_tp'])


def at(seconds):
    return VO_START + math.floor(seconds * FPS + 0.5) - (SHIFT if seconds >= TAIL else 0)


def detail(paths):
    import numpy as np
    import soundfile as sf
    from scipy.signal import butter, lfilter, sosfilt

    def kweight(x, sr):
        # Los dos filtros de BS.1770 (estantería alta y paso alto), calculados para la frecuencia del archivo
        k = math.tan(math.pi * 1681.974450955533 / sr)
        vh, q = 10 ** (3.999843853973347 / 20), 0.7071752369554196
        vb = vh ** 0.4996667741545416
        a0 = 1 + k / q + k * k
        b1 = [(vh + vb * k / q + k * k) / a0, 2 * (k * k - vh) / a0, (vh - vb * k / q + k * k) / a0]
        a1 = [1, 2 * (k * k - 1) / a0, (1 - k / q + k * k) / a0]
        k, q = math.tan(math.pi * 38.13547087602444 / sr), 0.5003270373238773
        a2 = [1, 2 * (k * k - 1) / (1 + k / q + k * k), (1 - k / q + k * k) / (1 + k / q + k * k)]
        return lfilter([1, -2, 1], a2, lfilter(b1, a1, x, axis=0), axis=0)

    stems, sr = [], None
    for p in paths:
        x, sr = sf.read(p, always_2d=True)
        stems.append(x)
    n = min(len(x) for x in stems)
    stems = [x[:n] for x in stems]
    phone = butter(4, 250, 'highpass', fs=sr, output='sos'), butter(2, 10000, 'lowpass', fs=sr, output='sos')
    band = lambda x: sosfilt(phone[1], sosfilt(phone[0], x, axis=0), axis=0)
    power = lambda x: np.sum(kweight(x, sr) ** 2, axis=1)
    hop = sr / FPS
    frames = int(n // hop)
    edges = (np.arange(frames + 1) * hop).astype(int)
    # Potencia media por fotograma de vídeo: con ella se suman pistas y tramos sin volver a filtrar
    per_frame = lambda pc: np.add.reduceat(pc, edges[:-1]) / np.diff(edges)
    full = [per_frame(power(x)) for x in stems]
    tel = [per_frame(power(band(x))) for x in stems]
    lufs = lambda p: -0.691 + 10 * math.log10(max(float(p), 1e-20))
    vo, mu, fx = full
    vq, mq, fq = tel

    print('\nBy section (mean power over the span; where the voice speaks, only over the frames it sounds)')
    print('section                 frames     VO   music     fx  VO-music  VO-fx  VO-bed |  phone: VO   music     fx  VO-bed')
    top = 10 ** ((max(lufs(v) for v in vo) + 0.691 - 40) / 10)
    for name, a, b in SECTIONS:
        idx = np.arange(a, min(b, frames))
        talk = idx[vo[idx] > top] if np.any(vo[idx] > top) and name not in ('vacuum', 'drop', 'section change', 'end card', 'signature, dot') else idx
        row = [lufs(np.mean(s[talk])) for s in (vo, mu, fx)]
        bed = lufs(np.mean(mu[talk] + fx[talk]))
        rq = [lufs(np.mean(s[talk])) for s in (vq, mq, fq)]
        bq = lufs(np.mean(mq[talk] + fq[talk]))
        print(f'{name:22s} {a:3d}-{b - 1:3d}  {row[0]:6.1f} {row[1]:6.1f} {row[2]:6.1f}  {row[0] - row[1]:+6.1f} {row[0] - row[2]:+6.1f} {row[0] - bed:+6.1f}'
              f' | {rq[0]:6.1f} {rq[1]:6.1f} {rq[2]:6.1f} {rq[0] - bq:+6.1f}')

    print(f'\nWord by word: the core is the span within 20 dB of the loudest frame of the word; margin = voice - (music + effects), at least {MARGIN} LU')
    print('word        align     core     VO  music     fx    bed  margin | phone: VO    bed  margin')
    words = [w for w in json.loads(VO_JSON.read_text(encoding='utf-8')) if not w['word'].startswith('<') and not w['word'].startswith('time=') and w['word'] != '/>']
    worst, cores = [], []
    for w in words:
        a, b = at(w['start']), at(w['end'])
        span = np.arange(a, min(b, frames - 1) + 1)
        peak = vo[span].max()
        core = span[vo[span] > peak / 100]
        c = np.arange(core[0], core[-1] + 1)
        v, m, f = (lufs(np.mean(s[c])) for s in (vo, mu, fx))
        bed = lufs(np.mean(mu[c] + fx[c]))
        pv, pb = lufs(np.mean(vq[c])), lufs(np.mean(mq[c] + fq[c]))
        flag = '  <-- under 6 LU' if v - bed < MARGIN else ''
        print(f'{w["word"]:10s} {a:3d}-{b:3d}  {c[0]:3d}-{c[-1]:3d} {v:6.1f} {m:6.1f} {f:6.1f} {bed:6.1f}  {v - bed:+6.1f} | {pv:6.1f} {pb:6.1f}  {pv - pb:+6.1f}{flag}')
        worst.append((round(v - bed, 1), w['word'], a))
        if len(c) >= 3:
            cores.append(v)
    print(f'smallest margins: {sorted(worst)[:5]}')
    print(f'voice word cores: {min(cores):.1f} .. {max(cores):.1f} LUFS (spread {max(cores) - min(cores):.1f} LU, sd {np.std(cores):.1f})')

    print(f'\nThe drop on "anymore." (frame {DROP}): the mix before and after')
    win = lambda p, a, b: lufs(np.mean(p[a:b]))
    for label, pick in [('full mix', full), ('phone mix', tel)]:
        mix = pick[0] + pick[1] + pick[2]
        nofx = pick[0] + pick[1]
        print(f'{label:10s}: 400 ms before {win(mix, DROP - 12, DROP):6.1f}, after {win(mix, DROP, DROP + 12):6.1f}, step {win(mix, DROP, DROP + 12) - win(mix, DROP - 12, DROP):+5.1f} LU'
              f' | VO+music only {win(nofx, DROP, DROP + 12) - win(nofx, DROP - 12, DROP):+5.1f}'
              f' | 1 s each side {win(mix, DROP + 0, DROP + 30) - win(mix, DROP - 30, DROP):+5.1f}')
        print(f'{"":10s}  music alone: vacuum 96-106 {win(pick[1], 96, DROP):6.1f}, under anymore. 107-118 {win(pick[1], 107, 119):6.1f}, open 120-133 {win(pick[1], 120, 134):6.1f}'
              f' | fx 107-118 {win(pick[2], 107, 119):6.1f}, VO 107-118 {win(pick[0], 107, 119):6.1f}')


paths = sys.argv[1:]
curves = {p: momentary(p) for p in paths}
for p in paths:
    level, peak = summary(p)
    m = [v for _, v in curves[p] if v > -70]
    m.sort()
    p95 = m[int(len(m) * 0.95)] if m else -99
    print(f'{p}: integrated {level:.1f} LUFS, true peak {peak:.1f} dBTP, momentary p95 {p95:.1f}, max {max(m) if m else -99:.1f}')
# Por tramos de 0,5 s: el máximo momentáneo de cada pista, con el fotograma de inicio
print('\nframe  ' + '  '.join(p.split('stem-')[-1].replace('.wav', '').rjust(6) for p in paths))
step = 0.5
end = max(c[-1][0] for c in curves.values())
t = 0.0
while t < end:
    row = []
    for p in paths:
        vals = [v for (x, v) in curves[p] if t <= x < t + step]
        row.append(max(vals) if vals else -99)
    print(f'{int(t * 30):5d}  ' + '  '.join(f'{v:6.1f}' for v in row))
    t += step

if len(paths) == 3:
    try:
        detail(paths)
    except ImportError as error:
        print(f'\n(no {error.name}: pip install numpy scipy soundfile for the balance by section and by word)')
