"""Máster del vídeo: la imagen pasa a yuv420p de rango TV (lo que esperan los reproductores y las redes) y el audio
queda a -14 LUFS con el pico real por debajo de -1 dBTP.

  python tools/master.py out/meshmind-v3.mp4 out/meshmind-v3.wav out/MeshMind-motion-v3.mp4
"""
import json
import pathlib
import subprocess
import sys
import tempfile

TARGET = -14.0
CEILING = 0.74  # -2,6 dBFS de pico de muestra: deja sitio al pico real y a lo que sube el codificador AAC


def ffmpeg(*args):
    return subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-y', *args], check=True, capture_output=True, text=True).stderr


def loudness(path):
    err = ffmpeg('-i', str(path), '-af', 'loudnorm=print_format=json', '-f', 'null', '-')
    data = json.loads(err[err.rindex('{'):err.rindex('}') + 1])
    return float(data['input_i']), float(data['input_tp'])


def full_range(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=pix_fmt,color_range', '-of', 'json', str(path)], capture_output=True, text=True).stdout
    stream = json.loads(out)['streams'][0]
    return stream.get('pix_fmt') == 'yuvj420p' or stream.get('color_range') == 'pc'


video, mix, out = map(pathlib.Path, sys.argv[1:4])
temp = tempfile.TemporaryDirectory()
work = pathlib.Path(temp.name)

# Un compresor suave pega voz, música y golpes y acerca los picos a la media; luego ganancia y limitador hasta el objetivo
glue = work / 'glue.wav'
ffmpeg('-i', str(mix), '-af', 'acompressor=threshold=0.1:ratio=2.5:attack=8:release=180', '-c:a', 'pcm_s24le', str(glue))
master = work / 'master.wav'
gain = TARGET - loudness(glue)[0]
for _ in range(3):
    ffmpeg('-i', str(glue), '-af', f'volume={gain:.2f}dB,alimiter=limit={CEILING}:attack=2:release=60:level=0:latency=1', '-c:a', 'pcm_s24le', str(master))
    level, peak = loudness(master)
    print(f'gain {gain:+.2f} dB -> {level:.1f} LUFS, {peak:.1f} dBTP')
    if abs(level - TARGET) < 0.3:
        break
    gain += TARGET - level

source = 'pc' if full_range(video) else 'tv'
ffmpeg('-i', str(video), '-i', str(master), '-map', '0:v:0', '-map', '1:a:0',
       '-vf', f'scale=in_range={source}:out_range=tv:out_color_matrix=bt709,format=yuv420p,'
              'setparams=range=tv:colorspace=bt709:color_primaries=bt709:color_trc=bt709',
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
       '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
       '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', '-shortest', str(out))
temp.cleanup()
level, peak = loudness(out)
print(f'{out.name}: video from {source} range, audio {level:.1f} LUFS, {peak:.1f} dBTP')
