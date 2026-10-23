import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

// 注释只描述当前代码的行为、尺寸与约束；对照基准和差异取证记录留在 docs/parity/**。
// 源码注释出现外部基准词（对照别的 App 的说法）时，读者无法从代码本身验证，也会随对照结论过时。
const BANNED_TERMS = ['生产端']
const SCAN_ROOTS = ['src', 'test', 'config', 'scripts', 'types']
const COMMENT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.scss', '.css'])
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', '.swc'])

const appRoot = process.cwd()

/** @description 逐个字符扫描源码，返回注释文本与起始行号，字符串里的内容不算注释。 */
function extractComments(source) {
  const comments = []
  let current = null
  let line = 1
  let index = 0
  let state = 'code'

  while (index < source.length) {
    const char = source[index]
    const next = source[index + 1]

    if (char === '\n') {
      if (state === 'line') {
        comments.push(current)
        current = null
        state = 'code'
      } else if (state === 'block') {
        current.text += '\n'
      }

      line += 1
      index += 1
      continue
    }

    if (state === 'line' || state === 'block') {
      current.text += char
    }

    if (state === 'code') {
      if (char === '/' && next === '/') {
        current = { line, text: '' }
        state = 'line'
        index += 2
        continue
      }

      if (char === '/' && next === '*') {
        current = { line, text: '' }
        state = 'block'
        index += 2
        continue
      }

      if (char === "'") {
        state = 'single'
      } else if (char === '"') {
        state = 'double'
      } else if (char === '`') {
        state = 'template'
      }

      index += 1
      continue
    }

    if (state === 'block') {
      if (char === '*' && next === '/') {
        comments.push(current)
        current = null
        state = 'code'
        index += 2
        continue
      }

      index += 1
      continue
    }

    const quote = state === 'single' ? "'" : state === 'double' ? '"' : '`'

    if (char === '\\') {
      index += 2
      continue
    }

    if (char === quote) {
      state = 'code'
    }

    index += 1
  }

  if (current) {
    comments.push(current)
  }

  return comments
}

function collectFiles(directory) {
  if (!statSafeIsDirectory(directory)) {
    return []
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (SKIP_DIRS.has(entry.name)) {
      return []
    }

    const target = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      return collectFiles(target)
    }

    return COMMENT_EXTENSIONS.has(path.extname(entry.name)) ? [target] : []
  })
}

function statSafeIsDirectory(target) {
  try {
    return statSync(target).isDirectory()
  } catch {
    return false
  }
}

const violations = []
let commentCount = 0

for (const root of SCAN_ROOTS) {
  for (const file of collectFiles(path.join(appRoot, root))) {
    const relative = path.relative(appRoot, file).replaceAll('\\', '/')

    for (const comment of extractComments(readFileSync(file, 'utf8'))) {
      commentCount += 1
      const compact = comment.text.replace(/\s+/g, '')
      const hit = BANNED_TERMS.find(term => compact.includes(term))

      if (hit) {
        violations.push({ file: relative, line: comment.line, term: hit, text: comment.text.trim().replace(/\s+/g, ' ') })
      }
    }
  }
}

if (violations.length) {
  console.error(`[comments] 注释里出现外部基准词，请改成只描述当前行为与约束（共 ${violations.length} 处）：`)

  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line}  「${violation.term}」  ${violation.text}`)
  }

  console.error('对照过程和基准结论请写进 docs/parity/**，规则见 apps/com.deppon.app/readme.md 的「代码注释规则」。')
  process.exit(1)
}

console.log(`[comments] 已扫描 ${commentCount} 条注释，未出现外部基准词（${BANNED_TERMS.join(' / ')}）`)
