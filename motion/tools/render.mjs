// El render final, por tramos: cada fotograma se pinta hasta 32 veces para el desenfoque de movimiento y, con todas
// las pestañas de Chrome a la vez, los tramos más pesados lo dejaban sin memoria. Cada tramo va con las pestañas que
// aguanta; luego se unen sin recodificar. La mezcla sale aparte, en borrador (el sonido no depende del desenfoque)
//
//   node tools/render.mjs [vídeo.mp4] [mezcla.wav]
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// La CLI de Remotion se llama con node y no con npx: así no pasa por la shell de Windows, que rompe las comillas de
// --props
const remotion = fileURLToPath(new URL('../node_modules/@remotion/cli/remotion-cli.js', import.meta.url))

const [video = 'out/meshmind.mp4', mix = 'out/meshmind.wav'] = process.argv.slice(2)
// [fotogramas, pestañas]. Los cortes caen entre tomas: el título acaba en 178, el lienzo en 273, los sentidos en 386 y
// la película en 734 (src/timing.ts, TOTAL - 1)
const CHUNKS = [
  ['0-178', 6],
  ['179-273', 4],
  ['274-386', 3],
  ['387-734', 4],
]

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const dir = join('out', `chunks-${Date.now()}`)
mkdirSync(dir, { recursive: true })
for (const [frames, tabs] of CHUNKS) {
  const file = join(dir, `${frames}.mp4`)
  console.log(`Frames ${frames}, ${tabs} tabs`)
  run(process.execPath, [remotion, 'render', 'MeshMind', file, `--frames=${frames}`, `--concurrency=${tabs}`, '--codec=h264', '--crf=14', '--timeout=180000'])
  if (!existsSync(file)) process.exit(1)
}
writeFileSync(join(dir, 'list.txt'), CHUNKS.map(([frames]) => `file '${frames}.mp4'`).join('\n'))
run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'), '-c', 'copy', video])
run(process.execPath, [remotion, 'render', 'MeshMind', mix, '--codec=wav', '--props={"draft":true}', '--timeout=180000'])
