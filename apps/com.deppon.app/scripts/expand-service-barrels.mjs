import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

// 把 `services/<domain>/index.ts` 里的运行时 `export *` 展开成显式再导出。
// 纯类型模块（types / *.types）保持 `export *`：类型在运行时被擦除，展开它们只有噪音没有收益。
// 用法：node scripts/expand-service-barrels.mjs --domains=a,b [--dry-run]

const appRoot = process.cwd()
const servicesRoot = path.join(appRoot, 'src', 'services')
const MAX_INLINE_LENGTH = 120

const VALUE_PATTERNS = [
  /^export (?:const|let|var) ([A-Za-z0-9_$]+)/gm,
  /^export (?:async )?function ([A-Za-z0-9_$]+)/gm,
  /^export class ([A-Za-z0-9_$]+)/gm,
  /^export enum ([A-Za-z0-9_$]+)/gm
]
const TYPE_PATTERNS = [/^export interface ([A-Za-z0-9_$]+)/gm, /^export type ([A-Za-z0-9_$]+)/gm]
const BARE_REEXPORT_PATTERN = /^export \{([^}]+)\}/gm
const TYPE_REEXPORT_PATTERN = /^export type \{([^}]+)\}/gm

const args = new Map(
  process.argv
    .slice(2)
    .filter(argument => argument.startsWith('--'))
    .map(argument => {
      const [key, value = 'true'] = argument.replace(/^--/, '').split('=')

      return [key, value]
    })
)
const domains = (args.get('domains') ?? '')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean)
const dryRun = args.get('dry-run') === 'true'

if (!domains.length) {
  console.error('用法：node scripts/expand-service-barrels.mjs --domains=a,b,c [--dry-run]')
  process.exit(1)
}

const isTypeTarget = target => /(?:^|\/)(?:types|[^/]*\.types)$/.test(target)

function resolveModule(fromFile, target) {
  const base = path.resolve(path.dirname(fromFile), target)
  const candidates = [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]

  return candidates.find(candidate => existsSync(candidate))
}

function collectExports(filePath) {
  const source = readFileSync(filePath, 'utf8')

  if (/^export \* from/m.test(source)) {
    return null
  }

  const values = new Set()
  const types = new Set()

  for (const pattern of VALUE_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      values.add(match[1])
    }
  }

  for (const pattern of TYPE_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      types.add(match[1])
    }
  }

  for (const match of source.matchAll(TYPE_REEXPORT_PATTERN)) {
    for (const raw of match[1].split(',')) {
      const name = raw.trim().replace(/^type\s+/, '')

      if (name) {
        types.add(name)
      }
    }
  }

  for (const match of source.matchAll(BARE_REEXPORT_PATTERN)) {
    for (const raw of match[1].split(',')) {
      const name = raw.trim().replace(/^type\s+/, '')

      if (!name || name.includes(' as ')) {
        continue
      }

      values.add(name)
    }
  }

  for (const name of types) {
    values.delete(name)
  }

  return { types: [...types], values: [...values] }
}

function renderExport(names, target, isType) {
  const keyword = isType ? 'export type' : 'export'
  const inline = `${keyword} { ${names.join(', ')} } from '${target}'`

  if (inline.length <= MAX_INLINE_LENGTH) {
    return [inline]
  }

  return [`${keyword} {`, ...names.map((name, index) => `  ${name}${index === names.length - 1 ? '' : ','}`), `} from '${target}'`]
}

let rewritten = 0
let skipped = 0

for (const domain of domains) {
  const indexPath = path.join(servicesRoot, domain, 'index.ts')

  if (!existsSync(indexPath)) {
    console.warn(`- ${domain}: 缺少 index.ts，跳过`)
    skipped += 1
    continue
  }

  const lines = readFileSync(indexPath, 'utf8').split(/\r?\n/)
  const output = []
  let expanded = 0

  for (const line of lines) {
    const match = line.match(/^export \* from '([^']+)'/)

    if (!match) {
      output.push(line)
      continue
    }

    const target = match[1]

    if (isTypeTarget(target)) {
      output.push(line)
      continue
    }

    const modulePath = resolveModule(indexPath, target)

    if (!modulePath) {
      console.warn(`- ${domain}: 无法解析 ${target}，整条保留`)
      output.push(line)
      continue
    }

    const found = collectExports(modulePath)

    if (!found) {
      console.warn(`- ${domain}: ${target} 自身还有 export *，整条保留`)
      output.push(line)
      continue
    }

    if (!found.values.length && !found.types.length) {
      console.warn(`- ${domain}: ${target} 没解析到导出名，整条保留`)
      output.push(line)
      continue
    }

    if (found.values.length) {
      output.push(...renderExport(found.values, target, false))
    }

    if (found.types.length) {
      output.push(...renderExport(found.types, target, true))
    }

    expanded += 1
  }

  if (!expanded) {
    console.warn(`- ${domain}: 没有可展开的运行时 export *，跳过`)
    skipped += 1
    continue
  }

  const nextContent = `${output
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`

  if (dryRun) {
    console.log(`- ${domain}: 将展开 ${expanded} 条`)
  } else {
    writeFileSync(indexPath, nextContent)
    console.log(`- ${domain}: 已展开 ${expanded} 条`)
  }

  rewritten += 1
}

console.log(`${dryRun ? '试运行' : '完成'}：处理 ${rewritten} 个领域，跳过 ${skipped} 个`)
