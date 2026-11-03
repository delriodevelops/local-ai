"""Prepara, a partir de lo que devuelve ElevenLabs, las pistas que usa la mezcla de Soundtrack.tsx.

- public/audio/vo-mix.wav: la voz nivelada para la mezcla (vo.mp3 queda intacto: la imagen lo lee para el espectro)
- public/audio/fx/<efecto>.wav: cada efecto con el pico a -1 dBFS, para que las ganancias de la mezcla se lean igual
- public/audio/fx/tick.wav: un tic de 40 ms sintetizado (el de ElevenLabs era un pitido de 340 ms a 6 kHz)
- public/audio/music-mix.wav: la música con menos graves y 2 dB más, para que se oiga bajo la voz también en un móvil
- public/audio/outro.wav: tres compases de la música desde su entrada fuerte, filtrados, para la tarjeta final

  python tools/stems.py
"""
import json
import pathlib
import re
import subprocess
import tempfile

AUDIO = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'audio'
DROP = 3.94  # segundos: el primer tiempo fuerte de la música, después de la subida
BAR = 4 * 60 / 122

# La voz: un compresor suave (3:1 desde -20 dB, ataque 5 ms, recuperación 100 ms; no tiene anticipación, así que no
# retrasa nada) iguala las sílabas, y después las palabras finales que la locución deja caer suben lo que les falta, con
# rampas de 30 ms en los huecos de alrededor. Cada muestra queda en su sitio: la imagen sigue a la voz igual que antes.
# El último volume deja la mediana de las palabras 0,5 dB por encima de la de vo.mp3
COMPRESSOR = 'acompressor=threshold=-20dB:ratio=3:attack=5:release=100:knee=2'
MAKEUP = 2.7
LIFT = [  # palabra, cuál (0 = la primera), dB, dónde empieza a sonar cuando la alineación de ElevenLabs se adelanta
    ('server.', 0, 3.5, 2.075),
    ('Not', 0, -1.3, None),  # «Not» cae en el vacío, sin música: un poco más bajo para que «anymore.» y el golpe destaquen
    ('anymore.', 0, 2.8, None),
    ('MeshMind.', 0, 1.5, None),
    ('flows,', 0, 1.5, None),
    ('think.', 0, 1.5, None),
    ('card.', 0, 4.5, 13.605),
    ('account.', 0, 1.8, None),
    ('key.', 0, 6.0, 16.53),
    ('server.', 2, 3.2, 18.24),
    ('MeshMind.', 1, 1.2, None),
]

# El golpe de «anymore.» era casi todo subgrave (el 99 % por debajo de 150 Hz): en un móvil no sonaba y en unos cascos
# tapaba la voz. Pierde lo que hay por debajo de 35 Hz, se acorta y gana cuerpo entre 110 y 450 Hz con los armónicos de
# una saturación suave
BOOM = ('[0:a]aresample=48000,aformat=sample_fmts=flt,highpass=f=35:p=2,afade=t=out:st=0.3:d=0.9,asplit=2[dry][wet];'
        '[wet]lowpass=f=100,volume=30dB,asoftclip=type=tanh:oversample=4,highpass=f=110:p=2,highpass=f=110:p=2,lowpass=f=450:p=2,'
        'afade=t=out:st=0.05:d=0.4,volume=-2dB[body];[dry][body]amix=inputs=2:normalize=0:duration=first')
# El tic: un golpecito seco de papel, con cuerpo a 520 Hz y un clic a 1,25 kHz, que se apaga en 40 ms
TICK = ("aevalsrc='0.8*sin(2*PI*1250*t)*exp(-t*260)+0.6*sin(2*PI*520*t)*exp(-t*140)+0.5*(2*random(0)-1)*exp(-t*1800)':s=48000:d=0.04,"
        'highpass=f=200,lowpass=f=5000,afade=t=out:st=0.028:d=0.012,pan=stereo|c0=c0|c1=c0')
# El outro: un paso bajo de 12 dB/oct a 3 kHz lo aleja sin apagarlo (el doble paso bajo a 800 Hz de antes lo dejaba en
# graves, que un móvil no reproduce), y los graves bajo 120 Hz bajan 4 dB: al nivel de la voz, en un móvil se oye más
OUTRO = 'lowshelf=f=120:g=-4,lowpass=f=3000'


def run(*args):
    return subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-y', *args], check=True, capture_output=True, text=True).stderr


def peak(path):
    # En coma flotante y ya a 48 kHz; sin aformat, ffmpeg pasaría a 16 bits antes de medir y lo que pasa de 0 dBFS no se vería
    err = run('-i', str(path), '-af', 'aresample=48000,aformat=sample_fmts=flt,astats=measure_perchannel=none:measure_overall=Peak_level', '-f', 'null', '-')
    return float(re.findall(r'Peak level dB: (-?[\d.]+)', err)[-1])


def normalise(src, dst):
    gain = -1 - peak(src)
    run('-i', str(src), '-af', f'aresample=48000,aformat=sample_fmts=flt,volume={gain:.2f}dB', str(dst))
    return gain


def lifts():
    words = [w for w in json.loads((AUDIO / 'vo.json').read_text(encoding='utf-8')) if not w['word'].startswith('<') and not w['word'].startswith('time=') and w['word'] != '/>']
    terms = []
    for word, k, db, onset in LIFT:
        i = [j for j, w in enumerate(words) if w['word'] == word][k]
        start = onset if onset is not None else words[i]['start']
        nxt = words[i + 1]['start'] if i + 1 < len(words) else words[i]['end'] + 1
        hold = min(words[i]['end'] + 0.02, nxt - 0.03)
        a, b, c, d = start - 0.03, start, hold, hold + 0.03
        terms.append(f'{10 ** (db / 20) - 1:.4f}*clip(min((t-{a:.3f})/{b - a:.3f},({d:.3f}-t)/{d - c:.3f}),0,1)')
    # Bloques de 64 muestras: volume evalúa la expresión una vez por bloque, así la rampa no hace escalones
    return f"asetnsamples=n=64:p=0,volume='1+{'+'.join(terms)}':eval=frame"


run('-i', str(AUDIO / 'vo.mp3'), '-af', f'{COMPRESSOR},{lifts()},volume={MAKEUP}dB', '-c:a', 'pcm_s16le', str(AUDIO / 'vo-mix.wav'))
print('vo-mix  leveled')

(AUDIO / 'fx').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory() as temp:
    shaped = pathlib.Path(temp) / 'shaped.wav'
    for src in sorted((AUDIO / 'sfx').glob('*.mp3')):
        if src.stem == 'tick':
            continue
        if src.stem == 'boom':
            run('-i', str(src), '-filter_complex', BOOM, '-c:a', 'pcm_f32le', str(shaped))
            gain = normalise(shaped, AUDIO / 'fx' / 'boom.wav')
        else:
            gain = normalise(src, AUDIO / 'fx' / f'{src.stem}.wav')
        print(f'{src.stem:7s} {gain:+5.1f} dB')
    run('-f', 'lavfi', '-i', TICK, '-c:a', 'pcm_f32le', str(shaped))
    print(f'tick    {normalise(shaped, AUDIO / "fx" / "tick.wav"):+5.1f} dB')

# La música para la mezcla: el 85 % de su energía está por debajo de 250 Hz, que un móvil no reproduce. Un estante
# de -3,5 dB bajo 120 Hz y 2 dB más la dejan igual de alta en unos buenos altavoces y más presente en uno pequeño
run('-i', str(AUDIO / 'music.mp3'), '-af', 'bass=g=-3.5:f=120:w=0.6,volume=2dB', '-c:a', 'pcm_s16le', str(AUDIO / 'music-mix.wav'))
print('music   shelved')

length = 3 * BAR
fade = 1.6
run('-i', str(AUDIO / 'music.mp3'),
    '-af', f'aformat=sample_fmts=flt,atrim=start={DROP}:duration={length:.3f},asetpts=PTS-STARTPTS,{OUTRO},'
           f'afade=t=in:d=0.02,afade=t=out:st={length - fade:.3f}:d={fade}',
    '-ar', '48000', str(AUDIO / 'outro.wav'))
print(f'outro   {length:.2f} s')
