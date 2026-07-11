import { spawnSync } from 'node:child_process'
import process from 'node:process'

const supportedPlatforms = new Set(['android', 'ios'])
const platform = process.argv[2]

if (!supportedPlatforms.has(platform)) {
  console.error('Usage: node scripts/build-production-bundle.mjs <android|ios>')
  process.exit(1)
}

const packageManagerCli = process.env.npm_execpath
const env = {
  ...process.env,
  APP_ENV: 'production'
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit'
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (!packageManagerCli) {
  console.error('Unable to locate the current pnpm CLI.')
  process.exit(1)
}

run(process.execPath, [packageManagerCli, 'run', `bundle:${platform}`])
run(process.execPath, [
  'scripts/check-runtime-bundle.mjs',
  platform,
  '--require-production'
])
