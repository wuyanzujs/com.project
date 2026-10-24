import { spawn } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

// 快速结构门禁先串行跑完（秒级，快速失败），重型门禁随后并行，互不依赖；
// 全绿时输出各门禁耗时，失败时汇总失败门禁的完整输出。
const FAST_GATES = [
  'check:styles',
  'check:styles:strict',
  'check:rn-boundaries',
  'check:comments',
  'check:routes',
  'check:module-size',
  'check:barrels',
  'check:runtime-config',
  'check:business-test-structure',
  'check:platform-build',
  'check:bundle-size'
]

const HEAVY_GATES = ['typecheck', 'lint', 'lint:styles', 'test:unit', 'test:style-governance', 'test:business-rules']

const appRoot = fileURLToPath(new URL('..', import.meta.url))

function runGate(name) {
  return new Promise(resolve => {
    const startedAt = Date.now()
    const child = spawn('pnpm', ['run', name], {
      cwd: appRoot,
      shell: process.platform === 'win32',
      env: process.env
    })
    let output = ''

    child.stdout.on('data', chunk => {
      output += chunk
    })
    child.stderr.on('data', chunk => {
      output += chunk
    })
    child.on('error', error => {
      resolve({ name, ok: false, seconds: (Date.now() - startedAt) / 1000, output: String(error) })
    })
    child.on('close', code => {
      resolve({ name, ok: code === 0, seconds: (Date.now() - startedAt) / 1000, output: output.trimEnd() })
    })
  })
}

async function main() {
  const wallStartedAt = Date.now()

  for (const name of FAST_GATES) {
    const gate = await runGate(name)

    console.log(`[${name}] ${gate.ok ? '✓' : '✗'} ${gate.seconds.toFixed(1)}s`)
    if (!gate.ok) {
      console.error(gate.output)
      console.error(`[verify:static] 快速门禁 ${name} 失败，跳过重型门禁。`)
      process.exitCode = 1
      return
    }
  }

  const heavy = await Promise.all(HEAVY_GATES.map(runGate))

  for (const gate of heavy) {
    console.log(`[${gate.name}] ${gate.ok ? '✓' : '✗'} ${gate.seconds.toFixed(1)}s`)
  }

  const failures = heavy.filter(gate => !gate.ok)

  if (failures.length) {
    for (const gate of failures) {
      console.error(`\n===== [${gate.name}] 失败输出 =====`)
      console.error(gate.output || '(无输出)')
    }
    console.error(`[verify:static] ${failures.length} 个重型门禁失败：${failures.map(gate => gate.name).join(', ')}`)
    process.exitCode = 1
  } else {
    console.log(`[verify:static] 全部门禁通过（墙钟 ${((Date.now() - wallStartedAt) / 1000).toFixed(1)}s）。`)
  }
}

await main()
