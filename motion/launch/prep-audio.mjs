// prep-audio.mjs: prepara el sonido a partir de la locución (assets/audio/vo.mp3 y sus tiempos, vo.json) y de la
// música de la película de Remotion (../public/audio/music.mp3). Los tres archivos que escribe se pueden rehacer, y
// git los ignora:
//   assets/audio/music-film.wav  la música con los compases 25-32 dos veces, para que dure lo que la locución
//   assets/sfx/vo.wav            la voz nivelada; sound.mjs de la skill la coloca entera con la señal «vo»
//   assets/audio/bed.wav         la música desde donde su drop cae en «Not», agachada bajo la voz y apagándose al final
//
//   node prep-audio.mjs [voz.mp3]
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { timing, VO_AT } from './timing.js';

const src = process.argv[2] || 'assets/audio/vo.mp3';
const T = timing(JSON.parse(fs.readFileSync('assets/audio/vo.json', 'utf8')));
const ff = args => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
};
fs.mkdirSync('assets/sfx', { recursive: true });

// La música: el compás 33 (16,005 s) empalma con el 25 (12,070 s) en un fundido de 20 ms, así la rejilla no se mueve
ff(['-i', '../public/audio/music.mp3', '-filter_complex', '[0:a]atrim=0:16.0146,asetpts=PTS-STARTPTS[a];[0:a]atrim=start=12.0602,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=0.02:c1=qsin:c2=qsin,aresample=48000',
  '-c:a', 'pcm_s16le', 'assets/audio/music-film.wav']);

// La voz: sin el retumbe del micro y a -16 LUFS, con el pico por debajo de -2 dBTP
ff(['-i', src, '-af', 'highpass=f=80,loudnorm=I=-16:TP=-2:LRA=9', '-ar', '48000', '-ac', '2', 'assets/sfx/vo.wav']);

// La música: arranca donde su drop cae en «Not», baja bajo la voz (un compresor con la voz de llave) y se apaga
const D = T.duration, ms = Math.round(VO_AT * 1000);
ff(['-ss', T.musicStart.toFixed(3), '-i', 'assets/audio/music-film.wav', '-i', 'assets/sfx/vo.wav', '-filter_complex',
  `[1:a]adelay=${ms}|${ms},apad=whole_dur=${D + 1}[key];[0:a]volume=-8.5dB,apad=whole_dur=${D + 1}[m];` +
  `[m][key]sidechaincompress=threshold=0.03:ratio=9:attack=18:release=380[d];[d]atrim=0:${D.toFixed(3)},afade=t=out:st=${(D - 1.4).toFixed(2)}:d=1.4`,
  '-ar', '48000', '-ac', '2', 'assets/audio/bed.wav']);

console.log(`voice from ${src}; the music starts ${T.musicStart.toFixed(2)} s into the track so its drop lands on "Not" at ${T.W('not').toFixed(2)} s; ${D.toFixed(2)} s in all`);
