import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const appRoot = process.cwd()
const srcRoot = path.join(appRoot, 'src')
const baselinePath = path.join(
  appRoot,
  'scripts',
  'style-governance-baseline.json'
)
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))

const normalize = value => value.replaceAll(path.sep, '/').replace(/^\.\//, '')
const relative = filePath => normalize(path.relative(appRoot, filePath))
const stripComments = content =>
  content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')

const walk = directory => {
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(filePath))
    else files.push(filePath)
  }
  return files
}

const countMatches = (content, pattern) => [...content.matchAll(pattern)].length
const styleMetrics = content => {
  const source = stripComments(content)
  return {
    colors: countMatches(source, /#[0-9a-f]{3,8}\b/gi),
    fontSizes: countMatches(source, /\bfont-size\s*:\s*-?(?:\d*\.)?\d+px\b/gi),
    lineHeights: countMatches(
      source,
      /\bline-height\s*:\s*-?(?:\d*\.)?\d+px\b/gi
    ),
    radii: countMatches(source, /\bborder-radius\s*:\s*-?(?:\d*\.)?\d+px\b/gi),
    imports: countMatches(source, /@import\s+/g),
    usesTokens:
      /@use\s+['"](?:tokens|[^'"]*styles\/(?:_)?tokens(?:\.scss)?)['"]/.test(
        source
      ),
    lines: content.split(/\r?\n/).length
  }
}

const allFiles = walk(srcRoot)
const scssFiles = allFiles.filter(filePath => filePath.endsWith('.scss'))
const businessScssFiles = scssFiles.filter(filePath => {
  const file = relative(filePath)
  return file !== 'src/app.scss' && !file.startsWith('src/styles/')
})
const systemScssFiles = scssFiles.filter(filePath =>
  relative(filePath).startsWith('src/styles/')
)
const nativeFiles = allFiles.filter(filePath => /\.(ts|tsx)$/.test(filePath))

const businessMetrics = businessScssFiles.map(filePath => ({
  file: relative(filePath),
  ...styleMetrics(fs.readFileSync(filePath, 'utf8'))
}))
const nativeColorFiles = nativeFiles
  .filter(
    filePath => !relative(filePath).endsWith('src/styles/nativeTokens.ts')
  )
  .map(filePath => ({
    file: relative(filePath),
    colors: countMatches(
      stripComments(fs.readFileSync(filePath, 'utf8')),
      /#[0-9a-f]{3,8}\b/gi
    )
  }))
  .filter(({ colors }) => colors > 0)

const scssTotals = businessMetrics.reduce(
  (totals, item) => ({
    colors: totals.colors + item.colors,
    fontSizes: totals.fontSizes + item.fontSizes,
    lineHeights: totals.lineHeights + item.lineHeights,
    radii: totals.radii + item.radii
  }),
  { colors: 0, fontSizes: 0, lineHeights: 0, radii: 0 }
)
const nativeColors = nativeColorFiles.reduce(
  (total, item) => total + item.colors,
  0
)
const knownScssFiles = new Set(baseline.scss.knownFiles)
const managedScssFiles = new Set(baseline.scss.managedFiles)
const knownNativeFiles = new Set(baseline.native.knownColorFiles)
const failures = []

const assertDebt = (label, actual, allowed) => {
  if (actual > allowed) failures.push(`${label} 从 ${allowed} 增加到 ${actual}`)
}

assertDebt('SCSS 颜色字面量', scssTotals.colors, baseline.scss.rawColorLiterals)
assertDebt(
  'SCSS font-size 字面量',
  scssTotals.fontSizes,
  baseline.scss.rawFontSizeLiterals
)
assertDebt(
  'SCSS line-height 字面量',
  scssTotals.lineHeights,
  baseline.scss.rawLineHeightLiterals
)
assertDebt(
  'SCSS border-radius 字面量',
  scssTotals.radii,
  baseline.scss.rawRadiusLiterals
)
assertDebt('TS/TSX 颜色字面量', nativeColors, baseline.native.rawColorLiterals)

for (const filePath of scssFiles) {
  const file = relative(filePath)
  const metrics = styleMetrics(fs.readFileSync(filePath, 'utf8'))
  if (metrics.imports > 0) failures.push(`${file} 仍使用 @import，请改用 @use`)
}

for (const item of businessMetrics) {
  if (!knownScssFiles.has(item.file)) {
    if (!item.usesTokens)
      failures.push(`${item.file} 是新增样式文件，必须引入 styles/tokens`)
    if (item.colors > 0)
      failures.push(`${item.file} 含新增颜色字面量，请使用语义 token`)
    if (item.fontSizes > 0)
      failures.push(
        `${item.file} 含新增 font-size 字面量，请使用 typography token`
      )
    if (item.lineHeights > 0)
      failures.push(
        `${item.file} 含新增 line-height 字面量，请使用 typography token`
      )
    if (item.radii > 0)
      failures.push(
        `${item.file} 含新增 border-radius 字面量，请使用 radius token`
      )
  }
  if (managedScssFiles.has(item.file) && !item.usesTokens) {
    failures.push(`${item.file} 已进入 managed 样式清单，但缺少 token 引入`)
  }
}

for (const filePath of systemScssFiles) {
  const file = relative(filePath)
  const metrics = styleMetrics(fs.readFileSync(filePath, 'utf8'))
  if (file !== 'src/styles/_tokens.scss') {
    if (metrics.colors > 0)
      failures.push(`${file} 只能通过 _tokens.scss 持有颜色字面量`)
    if (metrics.fontSizes > 0 || metrics.lineHeights > 0) {
      failures.push(`${file} 只能通过 _tokens.scss 持有字号或行高字面量`)
    }
    if (metrics.radii > 0) {
      failures.push(`${file} 只能通过 _tokens.scss 持有圆角字面量`)
    }
  }
}

const tokenSource = fs
  .readFileSync(path.join(srcRoot, 'styles', '_tokens.scss'), 'utf8')
  .toLowerCase()
const nativeTokenSource = fs.readFileSync(
  path.join(srcRoot, 'styles', 'nativeTokens.ts'),
  'utf8'
)
for (const color of nativeTokenSource.match(/#[0-9a-f]{3,8}\b/gi) ?? []) {
  if (!tokenSource.includes(color.toLowerCase())) {
    failures.push(`nativeTokens.ts 的 ${color} 未在 _tokens.scss 中登记`)
  }
}

for (const item of nativeColorFiles) {
  if (!knownNativeFiles.has(item.file) && item.file !== 'src/app.config.ts') {
    failures.push(
      `${item.file} 是新增原生颜色入口，请使用 styles/nativeTokens.ts`
    )
  }
}

console.log(
  `[style-governance] SCSS 文件 ${businessMetrics.length} 个，token 接入 ${businessMetrics.filter(item => item.usesTokens).length} 个`
)
console.log(
  `[style-governance] 存量债务：颜色 ${scssTotals.colors}，字号 ${scssTotals.fontSizes}，行高 ${scssTotals.lineHeights}，圆角 ${scssTotals.radii}`
)
console.log(`[style-governance] 原生颜色字面量 ${nativeColors}`)

if (failures.length > 0) {
  console.error('[style-governance] 检查失败：')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log('[style-governance] 检查通过（存量冻结，增量收紧）')
}
