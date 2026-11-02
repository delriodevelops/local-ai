import words from '../public/audio/vo.json'

// El montaje cuelga de la voz: cada corte cae donde empieza una frase (tiempos de ElevenLabs, en segundos)
export const FPS = 30
export const VO_START = 12

// La pausa antes de la firma se acorta: desde TAIL (en pleno silencio entre «server.» y «MeshMind.») la voz entra
// SHIFT fotogramas antes, para que «MeshMind.» caiga en el primer tiempo del compás que la música deja en silencio
export const TAIL = 19
export const SHIFT = 8
export const at = (seconds: number) => VO_START + Math.round(seconds * FPS) - (seconds >= TAIL ? SHIFT : 0)

// La música va a 122 BPM y tiene su entrada fuerte a 3,94 s; empieza 11 fotogramas dentro del archivo para que esa
// entrada caiga en «anymore.». Tras la firma vuelve, filtrada, en el primer tiempo del compás siguiente (OUTRO)
export const MUSIC_TRIM = 11
export const OUTRO = 639

export const T = {
  not: at(2.94),
  title: at(4.08),
  flow: at(5.57),
  browser: at(7.4),
  think: at(8.72),
  see: at(9.51),
  listen: at(10.39),
  speak: at(11.29),
  local: at(12.52),
  noServer: at(14.29),
  noAccount: at(15.05),
  noKey: at(15.88),
  iris: at(17.4),
  end: at(19.19),
  free: at(20.61),
  total: 810,
}

// Los tramos en los que habla la voz, en fotogramas del vídeo: la música baja debajo de ellos
export const SPEECH = (words as { word: string; start: number; end: number }[])
  .filter(w => !w.word.startsWith('<') && !w.word.startsWith('time=') && w.word !== '/>')
  .map(w => [at(w.start), at(w.end)] as const)
