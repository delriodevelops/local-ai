// Runs a Python 3 script with whichever launcher this machine has: python3 on macOS and Linux, python or py -3 on
// Windows (where python3 is often only the Microsoft Store shortcut)
import { spawnSync } from 'node:child_process'

for (const [command, ...prefix] of [['python3'], ['python'], ['py', '-3']]) {
  const probe = spawnSync(command, [...prefix, '--version'], { encoding: 'utf8' })
  if (probe.status === 0 && /Python 3/.test(`${probe.stdout}${probe.stderr}`)) {
    const run = spawnSync(command, [...prefix, ...process.argv.slice(2)], { stdio: 'inherit' })
    process.exit(run.status ?? 1)
  }
}
console.error('Python 3 not found: install it and put python3, python or py on the PATH')
process.exit(1)
