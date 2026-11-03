import words from '../public/audio/vo.json'

// El montaje cuelga de la voz y de la música. Los tiempos de cada palabra salen de vo.json (la alineación que devuelve
// ElevenLabs, en segundos) y se pasan a fotogramas del vídeo
export const FPS = 30
export const VO_START = 12

// La pausa antes de la firma se acorta: desde TAIL (en pleno silencio entre «server.» y «MeshMind.») la voz entra
// SHIFT fotogramas antes, para que «MeshMind.» caiga en el primer tiempo del compás que la música deja en silencio
export const TAIL = 19
export const SHIFT = 8
export const at = (seconds: number) => VO_START + Math.round(seconds * FPS) - (seconds >= TAIL ? SHIFT : 0)

type Word = { word: string; start: number; end: number }
const SPOKEN = (words as Word[]).filter(w => !w.word.startsWith('<') && !w.word.startsWith('time=') && w.word !== '/>')

// El fotograma en que empieza (o acaba) una palabra; k es cuál, si se repite
const word = (text: string, k = 0, edge: 'start' | 'end' = 'start') => {
  const found = SPOKEN.filter(w => w.word === text)[k]
  if (!found) throw new Error(`The voice-over has no word "${text}" (${k})`)
  return at(found[edge])
}

// La música va a 122 BPM y tiene su entrada fuerte a 3,94 s; empieza 11 fotogramas dentro del archivo para que esa
// entrada caiga en «anymore.». Tras la firma vuelve, filtrada, en el primer tiempo del compás siguiente (OUTRO)
export const MUSIC_TRIM = 11
export const OUTRO = 639
export const DROP = 107
// Un tiempo de la música en fotogramas. Los golpes secos (el bombo) caen medio tiempo después de cada tiempo
export const BEAT = (FPS * 60) / 122
export const beat = (k: number) => DROP + k * BEAT
export const kick = (k: number) => DROP + (k + 0.5) * BEAT

// Dónde empieza cada palabra que mueve la imagen
export const V = {
  every: word('Every'),
  type: word('type'),
  goes: word('goes'),
  someone: word('someone'),
  server: word('server.'),
  serverEnd: word('server.', 0, 'end'),
  not: word('Not'),
  anymore: word('anymore.'),
  this: word('This'),
  meshmind: word('MeshMind.'),
  wire: word('Wire'),
  ai: word('AI'),
  models: word('models'),
  into: word('into'),
  flows: word('flows,'),
  right: word('right'),
  browser: word('browser.'),
  they: [word('They'), word('They', 1), word('They', 2), word('They', 3)],
  think: word('think.'),
  see: word('see.'),
  listen: word('listen.'),
  speak: word('speak.'),
  speakEnd: word('speak.', 0, 'end'),
  all: word('All'),
  own: word('own'),
  graphics: word('graphics'),
  card: word('card.'),
  no: [word('No'), word('No', 1), word('No', 2)],
  noServer: word('server.', 1),
  account: word('account.'),
  api: word('API'),
  key: word('key.'),
  keyEnd: word('key.', 0, 'end'),
  your: word('Your'),
  machine: word('machine'),
  is: word('is', 1),
  the: word('the'),
  theServer: word('server.', 2),
  sign: word('MeshMind.', 1),
  signEnd: word('MeshMind.', 1, 'end'),
  free: word('Free,'),
  in: word('in', 1),
  yourBrowser: word('your', 2),
  lastBrowser: word('browser.', 1),
  end: word('browser.', 1, 'end'),
}

// La película dura lo que la voz más dos segundos de cierre vivo, no seis de tarjeta quieta
export const TOTAL = V.end + 62

// Los tramos en los que habla la voz, en fotogramas del vídeo: la música baja debajo de ellos
export const SPEECH = SPOKEN.map(w => [at(w.start), at(w.end)] as const)
