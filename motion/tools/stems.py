"""Prepara, a partir de lo que devuelve ElevenLabs, las pistas que usa la mezcla de Soundtrack.tsx.

- public/audio/fx/<efecto>.wav: cada efecto con el pico a -1 dBFS, para que las ganancias de la mezcla se lean igual
- public/audio/outro.wav: tres compases de la música desde su entrada fuerte, filtrados, para la tarjeta final

  python tools/stems.py
"""
import pathlib
import re
import subprocess

AUDIO = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'audio'
DROP = 3.94  # segundos: el primer tiempo fuerte de la música, después de la subida
BAR = 4 * 60 / 122


def run(*args):
    return subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-y', *args], check=True, capture_output=True, text=True).stderr


def peak(path):
    # En coma flotante y ya a 48 kHz; sin aformat, ffmpeg pasaría a 16 bits antes de medir y lo que pasa de 0 dBFS no se vería
    err = run('-i', str(path), '-af', 'aresample=48000,aformat=sample_fmts=flt,astats=measure_perchannel=none:measure_overall=Peak_level', '-f', 'null', '-')
    return float(re.findall(r'Peak level dB: (-?[\d.]+)', err)[-1])


(AUDIO / 'fx').mkdir(exist_ok=True)
for src in sorted((AUDIO / 'sfx').glob('*.mp3')):
    gain = -1 - peak(src)
    run('-i', str(src), '-af', f'aresample=48000,aformat=sample_fmts=flt,volume={gain:.2f}dB', str(AUDIO / 'fx' / f'{src.stem}.wav'))
    print(f'{src.stem:7s} {gain:+5.1f} dB')

length = 3 * BAR
fade = 1.6
run('-i', str(AUDIO / 'music.mp3'),
    '-af', f'aformat=sample_fmts=flt,atrim=start={DROP}:duration={length:.3f},asetpts=PTS-STARTPTS,lowpass=f=800,lowpass=f=800,'
           f'afade=t=in:d=0.02,afade=t=out:st={length - fade:.3f}:d={fade}',
    '-ar', '48000', str(AUDIO / 'outro.wav'))
print(f'outro   {length:.2f} s')
