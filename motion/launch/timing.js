// timing.js: los tiempos de la película salen de la locución. assets/audio/vo.json trae cada palabra con su inicio
// y su fin (ElevenLabs, con marcas de tiempo); cambiar la voz cambia ese archivo y la película se recoloca sola.
// Lo usan film.js (en el navegador) y prep-audio.mjs (en node)

// La locución empieza a sonar en este segundo de la película
export const VO_AT = .4;
// El drop de music.mp3 está a 4,201 s de la pista (tools de la skill: beats.mjs) y cae en «Not»
export const DROP_IN_TRACK = 4.201;
// El final se queda en pantalla esto tras la última palabra
export const TAIL = 2.4;

const norm = s => s.toLowerCase().replace(/[^a-z']/g, '');

export function timing(raw, fps = 60) {
  // Las etiquetas de pausa (<break time="..."/>) llegan como palabras sueltas: fuera
  const words = raw.filter(w => /^[A-Za-z]/.test(w.word) && !w.word.includes('='));
  const find = (word, k) => {
    const hits = words.filter(w => norm(w.word) === word);
    if (!hits[k]) throw new Error(`the voice-over has no "${word}" #${k + 1}`);
    return hits[k];
  };
  const W = (word, k = 0) => VO_AT + find(word, k).start;
  const end = (word, k = 0) => VO_AT + find(word, k).end;
  const voEnd = VO_AT + words[words.length - 1].end;
  const duration = Math.ceil((voEnd + TAIL) * fps) / fps;
  return { W, end, voEnd, duration, musicStart: Math.max(0, DROP_IN_TRACK - W('not')) };
}
