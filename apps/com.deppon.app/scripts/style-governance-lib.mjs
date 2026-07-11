import fs from 'node:fs'
import path from 'node:path'

export const DEFAULT_STYLE_LIMITS = Object.freeze({
  pageScssLines: 300,
  componentScssLines: 180
})

const STYLE_DEBT_FIELDS = [
  ['rawColors', '颜色字面量'],
  ['rawFontSizes', 'font-size 字面量'],
  ['rawLineHeights', 'line-height 字面量'],
  ['rawRadii', 'border-radius 字面量'],
  ['rawFontWeights', 'font-weight 字面量']
]

const CSS_NAMED_COLORS = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black
  blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse
  chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan
  darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta
  darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen
  darkslateblue darkslategray darkslategrey darkturquoise darkviolet
  deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite
  forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green
  greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender
  lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan
  lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon
  lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue
  lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue
  mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen
  mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin
  navajowhite navy oldlace olive olivedrab orange orangered orchid
  palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff
  peru pink plum powderblue purple rebeccapurple red rosybrown royalblue
  saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue
  slateblue slategray slategrey snow springgreen steelblue tan teal thistle
  tomato transparent turquoise violet wheat white whitesmoke yellow
  yellowgreen currentcolor`
    .split(/\s+/)
    .filter(Boolean)
)

const COLOR_FUNCTION_PATTERN =
  /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|linear-gradient|radial-gradient)\s*\(/gi
const HEX_COLOR_PATTERN = /#[0-9a-f]{3,8}\b/gi
const TOKEN_USE_PATTERN =
  /@use\s+['"](?:tokens|[^'"]*styles(?:\/(?:index|_?tokens)(?:\.scss)?)?)['"]/

const normalizePath = value =>
  value.replaceAll(path.sep, '/').replace(/^\.\//, '')

const relativePath = (root, filePath) =>
  normalizePath(path.relative(root, filePath))

export const stripStyleComments = content =>
  content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')

const getLineCount = content => {
  if (!content) return 0
  const lines = content.split(/\r?\n/).length
  return /\r?\n$/.test(content) ? lines - 1 : lines
}

const getDeclarations = content => {
  const declarations = []
  const source = stripStyleComments(content)
  const pattern = /(?:^|[;{}]\s*|\n\s*)(\$?[a-z][a-z0-9-]*)\s*:\s*([^;{}]+);/gi

  for (const match of source.matchAll(pattern)) {
    declarations.push({
      property: match[1].toLowerCase(),
      value: match[2].trim()
    })
  }

  return declarations
}

const isColorProperty = property =>
  property === 'color' ||
  property.endsWith('-color') ||
  property === 'background' ||
  property.startsWith('border') ||
  property === 'fill' ||
  property === 'stroke' ||
  property.includes('shadow')

const extractColorsFromValue = value => {
  const colors = []

  for (const match of value.matchAll(HEX_COLOR_PATTERN)) {
    colors.push(match[0].toLowerCase())
  }
  for (const match of value.matchAll(COLOR_FUNCTION_PATTERN)) {
    colors.push(match[0].slice(0, -1).trim().toLowerCase())
  }

  const withoutFunctionsAndHex = value
    .replace(HEX_COLOR_PATTERN, ' ')
    .replace(
      /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|linear-gradient|radial-gradient)\s*\([^;]*?\)/gi,
      ' '
    )

  for (const word of withoutFunctionsAndHex.match(/[a-z][a-z0-9-]*/gi) ?? []) {
    const normalized = word.toLowerCase()
    if (CSS_NAMED_COLORS.has(normalized)) colors.push(normalized)
  }

  return colors
}

const hasNumericLiteral = value =>
  /(^|[^a-z0-9_$-])-?(?:\d*\.)?\d+(?:[a-z%]+)?\b/i.test(value)

const hasFontWeightLiteral = value =>
  hasNumericLiteral(value) ||
  (!value.includes('$') &&
    /^\s*(?:normal|bold|bolder|lighter)\s*$/i.test(value))

export const analyzeStyleContent = content => {
  const source = stripStyleComments(content)
  const declarations = getDeclarations(source)
  let rawColors = 0
  let rawFontSizes = 0
  let rawLineHeights = 0
  let rawRadii = 0
  let rawFontWeights = 0

  for (const { property, value } of declarations) {
    if (isColorProperty(property) || property.startsWith('$')) {
      rawColors += extractColorsFromValue(value).length
    }
    if (property === 'font-size' && hasNumericLiteral(value)) rawFontSizes += 1
    if (property === 'line-height' && hasNumericLiteral(value)) {
      rawLineHeights += 1
    }
    if (
      /^border(?:-(?:top|right|bottom|left))?(?:-(?:left|right))?-radius$/.test(
        property
      ) &&
      hasNumericLiteral(value)
    ) {
      rawRadii += 1
    }
    if (property === 'font-weight' && hasFontWeightLiteral(value)) {
      rawFontWeights += 1
    }
  }

  return {
    rawColors,
    rawFontSizes,
    rawLineHeights,
    rawRadii,
    rawFontWeights,
    usesTokens: TOKEN_USE_PATTERN.test(source),
    lines: getLineCount(content)
  }
}

export const analyzeNativeContent = content => {
  const source = stripStyleComments(content)
  let rawColors = [...source.matchAll(HEX_COLOR_PATTERN)].length
  rawColors += [...source.matchAll(COLOR_FUNCTION_PATTERN)].length

  for (const match of source.matchAll(/(['"`])([^'"`\r\n]+)\1/g)) {
    if (CSS_NAMED_COLORS.has(match[2].trim().toLowerCase())) rawColors += 1
  }

  return { rawColors }
}

const walk = directory => {
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(filePath))
    else files.push(filePath)
  }
  return files
}

const sortedObject = entries =>
  Object.fromEntries(
    [...entries].sort(([left], [right]) => left.localeCompare(right))
  )

const getParentStyleImports = (appRoot, nativeFiles) => {
  const imports = []
  const pattern =
    /(?:import\s+(?:[^'"\r\n]+\s+from\s+)?|require\(\s*)['"]((?:\.\.\/)+index\.scss)['"]/g

  for (const filePath of nativeFiles) {
    const content = fs.readFileSync(filePath, 'utf8')
    for (const match of content.matchAll(pattern)) {
      imports.push({
        file: relativePath(appRoot, filePath),
        importPath: match[1]
      })
    }
  }

  return imports.sort((left, right) =>
    `${left.file}:${left.importPath}`.localeCompare(
      `${right.file}:${right.importPath}`
    )
  )
}

export const collectProjectSnapshot = appRoot => {
  const srcRoot = path.join(appRoot, 'src')
  const allFiles = walk(srcRoot)
  const scssFiles = allFiles.filter(filePath => filePath.endsWith('.scss'))
  const unsupportedStyleFiles = allFiles.filter(filePath =>
    /\.(?:css|sass|less)$/.test(filePath)
  )
  const businessScssFiles = scssFiles.filter(filePath => {
    const file = relativePath(appRoot, filePath)
    return file !== 'src/app.scss' && !file.startsWith('src/styles/')
  })
  const systemScssFiles = scssFiles.filter(filePath =>
    relativePath(appRoot, filePath).startsWith('src/styles/')
  )
  const nativeFiles = allFiles.filter(filePath =>
    /\.(?:ts|tsx)$/.test(filePath)
  )
  const styleEntries = businessScssFiles.map(filePath => [
    relativePath(appRoot, filePath),
    analyzeStyleContent(fs.readFileSync(filePath, 'utf8'))
  ])
  const nativeEntries = nativeFiles
    .filter(
      filePath =>
        relativePath(appRoot, filePath) !== 'src/styles/nativeTokens.ts'
    )
    .map(filePath => [
      relativePath(appRoot, filePath),
      analyzeNativeContent(fs.readFileSync(filePath, 'utf8'))
    ])
    .filter(([, metrics]) => metrics.rawColors > 0)
  const systemFailures = []

  for (const filePath of unsupportedStyleFiles) {
    systemFailures.push(
      `${relativePath(appRoot, filePath)} 使用了未纳入治理的样式扩展名`
    )
  }

  for (const filePath of scssFiles) {
    const file = relativePath(appRoot, filePath)
    const content = stripStyleComments(fs.readFileSync(filePath, 'utf8'))
    if (/@import\s+/.test(content)) {
      systemFailures.push(`${file} 仍使用 @import，请改用 @use`)
    }
  }

  for (const filePath of systemScssFiles) {
    const file = relativePath(appRoot, filePath)
    if (file === 'src/styles/_tokens.scss') continue
    const metrics = analyzeStyleContent(fs.readFileSync(filePath, 'utf8'))
    for (const [field, label] of STYLE_DEBT_FIELDS) {
      if (metrics[field] > 0) {
        systemFailures.push(`${file} 不能持有 ${label}`)
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
  for (const color of nativeTokenSource.match(HEX_COLOR_PATTERN) ?? []) {
    if (!tokenSource.includes(color.toLowerCase())) {
      systemFailures.push(
        `nativeTokens.ts 的 ${color} 未在 _tokens.scss 中登记`
      )
    }
  }

  const legacyGlobalClassFiles = scssFiles
    .filter(filePath =>
      /(^|,)\s*\.dp-[a-z0-9_-]+/im.test(
        stripStyleComments(fs.readFileSync(filePath, 'utf8'))
      )
    )
    .map(filePath => relativePath(appRoot, filePath))
    .sort()

  return {
    scss: { files: sortedObject(styleEntries) },
    native: { files: sortedObject(nativeEntries) },
    architecture: {
      parentStyleImports: getParentStyleImports(appRoot, nativeFiles),
      legacyGlobalClassFiles
    },
    systemFailures
  }
}

const getLineLimit = (file, limits) =>
  file.startsWith('src/shared/components/') || file.includes('/components/')
    ? limits.componentScssLines
    : limits.pageScssLines

const isStrictStyle = (file, metrics, limits) =>
  metrics.usesTokens &&
  STYLE_DEBT_FIELDS.every(([field]) => metrics[field] === 0) &&
  metrics.lines <= getLineLimit(file, limits)

const itemKey = item =>
  typeof item === 'string' ? item : `${item.file}:${item.importPath}`

const compareLists = (current, allowed, label, failures) => {
  const currentKeys = new Set(current.map(itemKey))
  const allowedKeys = new Set(allowed.map(itemKey))

  for (const key of currentKeys) {
    if (!allowedKeys.has(key)) failures.push(`${label}新增：${key}`)
  }
  for (const key of allowedKeys) {
    if (!currentKeys.has(key)) {
      failures.push(`${label}已减少，请更新基线：${key}`)
    }
  }
}

const validateBaseline = baseline => {
  const failures = []
  if (!baseline || baseline.version !== 2) {
    return ['样式基线版本必须为 2']
  }
  if (!baseline.scss?.files || !baseline.native?.files) {
    return ['样式基线缺少逐文件数据']
  }
  if (
    !Number.isInteger(baseline.limits?.pageScssLines) ||
    !Number.isInteger(baseline.limits?.componentScssLines)
  ) {
    return ['样式基线缺少有效的文件行数上限']
  }

  for (const [file, metrics] of Object.entries(baseline.scss.files)) {
    for (const [field, label] of STYLE_DEBT_FIELDS) {
      if (!Number.isInteger(metrics[field]) || metrics[field] < 0) {
        failures.push(`${file} 的 ${label} 基线无效`)
      }
    }
    if (!Number.isInteger(metrics.lines) || metrics.lines < 0) {
      failures.push(`${file} 的行数基线无效`)
    }
    if (typeof metrics.usesTokens !== 'boolean') {
      failures.push(`${file} 的 token 状态基线无效`)
    }
  }
  for (const [file, metrics] of Object.entries(baseline.native.files)) {
    if (!Number.isInteger(metrics.rawColors) || metrics.rawColors <= 0) {
      failures.push(`${file} 的 TS/TSX 颜色基线无效`)
    }
  }
  if (
    !Array.isArray(baseline.architecture?.parentStyleImports) ||
    !Array.isArray(baseline.architecture?.legacyGlobalClassFiles)
  ) {
    failures.push('样式基线缺少架构债务清单')
  }

  return failures
}

const compareMetric = ({
  file,
  label,
  current,
  allowed,
  failures,
  stale = true
}) => {
  if (!Number.isInteger(allowed) || allowed < 0) {
    failures.push(`${file} 的 ${label} 基线无效`)
  } else if (current > allowed) {
    failures.push(`${file} 的 ${label} 从 ${allowed} 增加到 ${current}`)
  } else if (stale && current < allowed) {
    failures.push(
      `${file} 的 ${label} 基线可从 ${allowed} 收紧到 ${current}，请运行 update:styles-baseline`
    )
  }
}

const compareDailySnapshot = (current, baseline, failures) => {
  const limits = baseline.limits
  const currentStyles = current.scss.files
  const baselineStyles = baseline.scss.files

  for (const [file, metrics] of Object.entries(currentStyles)) {
    const allowed = baselineStyles[file]
    if (!allowed) {
      if (!isStrictStyle(file, metrics, limits)) {
        failures.push(`${file} 是新增样式文件，必须满足严格零债务规则`)
      } else {
        failures.push(`${file} 尚未登记，请运行 update:styles-baseline`)
      }
      continue
    }

    for (const [field, label] of STYLE_DEBT_FIELDS) {
      compareMetric({
        file,
        label,
        current: metrics[field],
        allowed: allowed[field],
        failures
      })
    }
    compareMetric({
      file,
      label: '行数',
      current: metrics.lines,
      allowed: allowed.lines,
      failures
    })

    if (allowed.usesTokens && !metrics.usesTokens) {
      failures.push(`${file} 移除了 token 引入`)
    } else if (!allowed.usesTokens && metrics.usesTokens) {
      failures.push(`${file} 已接入 token，请运行 update:styles-baseline`)
    }
  }

  for (const file of Object.keys(baselineStyles)) {
    if (!currentStyles[file]) {
      failures.push(`${file} 已删除，请运行 update:styles-baseline`)
    }
  }

  const currentNative = current.native.files
  const baselineNative = baseline.native.files
  for (const [file, metrics] of Object.entries(currentNative)) {
    if (!baselineNative[file]) {
      failures.push(`${file} 新增了 TS/TSX 静态颜色`)
      continue
    }
    compareMetric({
      file,
      label: 'TS/TSX 静态颜色',
      current: metrics.rawColors,
      allowed: baselineNative[file].rawColors,
      failures
    })
  }
  for (const file of Object.keys(baselineNative)) {
    if (!currentNative[file]) {
      failures.push(`${file} 已清除静态颜色，请运行 update:styles-baseline`)
    }
  }

  compareLists(
    current.architecture.parentStyleImports,
    baseline.architecture.parentStyleImports,
    '父级 index.scss 导入',
    failures
  )
  compareLists(
    current.architecture.legacyGlobalClassFiles,
    baseline.architecture.legacyGlobalClassFiles,
    'legacy 全局类文件',
    failures
  )
}

const compareStrictSnapshot = (current, baseline, failures) => {
  for (const [file, metrics] of Object.entries(current.scss.files)) {
    if (!metrics.usesTokens) failures.push(`${file} 必须引入 styles token`)
    for (const [field, label] of STYLE_DEBT_FIELDS) {
      if (metrics[field] > 0) failures.push(`${file} 的 ${label}必须归零`)
    }
    const limit = getLineLimit(file, baseline.limits)
    if (metrics.lines > limit) {
      const kind =
        limit === baseline.limits.componentScssLines ? '组件' : '页面'
      failures.push(
        `${file} 有 ${metrics.lines} 行，超过${kind}上限 ${limit} 行`
      )
    }
  }

  for (const [file, metrics] of Object.entries(current.native.files)) {
    if (metrics.rawColors > 0) {
      failures.push(`${file} 的 TS/TSX 静态颜色必须归零`)
    }
  }
  for (const item of current.architecture.parentStyleImports) {
    failures.push(`${item.file} 不能导入父级 index.scss：${item.importPath}`)
  }
  for (const file of current.architecture.legacyGlobalClassFiles) {
    failures.push(`${file} 仍包含 legacy 全局类`)
  }
}

export const compareSnapshot = (current, baseline, { strict = false } = {}) => {
  const failures = [...validateBaseline(baseline), ...current.systemFailures]

  if (failures.length === 0) {
    if (strict) compareStrictSnapshot(current, baseline, failures)
    else compareDailySnapshot(current, baseline, failures)
  }

  return { ok: failures.length === 0, failures }
}

export const compareBaselineEvolution = (current, previous) => {
  if (previous?.version === 1 && current?.version === 2) {
    return { ok: true, failures: [], migratedFromV1: true }
  }

  const failures = [...validateBaseline(current), ...validateBaseline(previous)]
  if (failures.length > 0) return { ok: false, failures }

  for (const limit of ['pageScssLines', 'componentScssLines']) {
    if (current.limits[limit] > previous.limits[limit]) {
      failures.push(
        `${limit} 从 ${previous.limits[limit]} 放宽到 ${current.limits[limit]}`
      )
    }
  }

  for (const [file, metrics] of Object.entries(current.scss.files)) {
    const previousMetrics = previous.scss.files[file]
    if (!previousMetrics) {
      if (!isStrictStyle(file, metrics, current.limits)) {
        failures.push(`${file} 是新增基线文件，但不满足严格零债务规则`)
      }
      continue
    }
    for (const [field, label] of STYLE_DEBT_FIELDS) {
      if (metrics[field] > previousMetrics[field]) {
        failures.push(
          `${file} 的 ${label}上限从 ${previousMetrics[field]} 放宽到 ${metrics[field]}`
        )
      }
    }
    if (
      metrics.lines > previousMetrics.lines &&
      !isStrictStyle(file, metrics, current.limits)
    ) {
      failures.push(
        `${file} 的行数上限从 ${previousMetrics.lines} 放宽到 ${metrics.lines}`
      )
    }
    if (previousMetrics.usesTokens && !metrics.usesTokens) {
      failures.push(`${file} 的 token 要求被移除`)
    }
  }

  for (const [file, metrics] of Object.entries(current.native.files)) {
    const previousMetrics = previous.native.files[file]
    if (!previousMetrics) {
      failures.push(`${file} 被新增到 TS/TSX 颜色基线`)
    } else if (metrics.rawColors > previousMetrics.rawColors) {
      failures.push(
        `${file} 的 TS/TSX 颜色上限从 ${previousMetrics.rawColors} 放宽到 ${metrics.rawColors}`
      )
    }
  }

  const previousParentImports = new Set(
    previous.architecture.parentStyleImports.map(itemKey)
  )
  for (const item of current.architecture.parentStyleImports) {
    if (!previousParentImports.has(itemKey(item))) {
      failures.push(`基线新增父级 index.scss 导入：${itemKey(item)}`)
    }
  }
  const previousLegacyFiles = new Set(
    previous.architecture.legacyGlobalClassFiles
  )
  for (const file of current.architecture.legacyGlobalClassFiles) {
    if (!previousLegacyFiles.has(file)) {
      failures.push(`基线新增 legacy 全局类文件：${file}`)
    }
  }

  return { ok: failures.length === 0, failures, migratedFromV1: false }
}

const canIncreaseLinesAfterMigration = (file, metrics, limits) =>
  isStrictStyle(file, metrics, limits)

export const createNextBaseline = (current, previousBaseline) => {
  const failures = [
    ...validateBaseline(previousBaseline),
    ...current.systemFailures
  ]
  if (failures.length > 0) return { ok: false, failures }

  const limits = previousBaseline.limits
  for (const [file, metrics] of Object.entries(current.scss.files)) {
    const previous = previousBaseline.scss.files[file]
    if (!previous) {
      if (!isStrictStyle(file, metrics, limits)) {
        failures.push(`${file} 是新增文件，但尚未满足严格零债务规则`)
      }
      continue
    }
    for (const [field, label] of STYLE_DEBT_FIELDS) {
      if (metrics[field] > previous[field]) {
        failures.push(
          `${file} 的 ${label} 从 ${previous[field]} 增加到 ${metrics[field]}`
        )
      }
    }
    if (previous.usesTokens && !metrics.usesTokens) {
      failures.push(`${file} 移除了 token 引入`)
    }
    if (
      metrics.lines > previous.lines &&
      !canIncreaseLinesAfterMigration(file, metrics, limits)
    ) {
      failures.push(
        `${file} 的行数从 ${previous.lines} 增加到 ${metrics.lines}`
      )
    }
  }

  for (const [file, metrics] of Object.entries(current.native.files)) {
    const previous = previousBaseline.native.files[file]
    if (!previous) {
      failures.push(`${file} 新增了 TS/TSX 静态颜色`)
    } else if (metrics.rawColors > previous.rawColors) {
      failures.push(
        `${file} 的 TS/TSX 静态颜色从 ${previous.rawColors} 增加到 ${metrics.rawColors}`
      )
    }
  }

  const previousParentImports = new Set(
    previousBaseline.architecture.parentStyleImports.map(itemKey)
  )
  for (const item of current.architecture.parentStyleImports) {
    if (!previousParentImports.has(itemKey(item))) {
      failures.push(`新增父级 index.scss 导入：${itemKey(item)}`)
    }
  }
  const previousLegacyFiles = new Set(
    previousBaseline.architecture.legacyGlobalClassFiles
  )
  for (const file of current.architecture.legacyGlobalClassFiles) {
    if (!previousLegacyFiles.has(file)) {
      failures.push(`新增 legacy 全局类文件：${file}`)
    }
  }

  if (failures.length > 0) return { ok: false, failures }

  return {
    ok: true,
    failures: [],
    baseline: {
      version: 2,
      limits: { ...limits },
      scss: { files: sortedObject(Object.entries(current.scss.files)) },
      native: { files: sortedObject(Object.entries(current.native.files)) },
      architecture: {
        parentStyleImports: [...current.architecture.parentStyleImports],
        legacyGlobalClassFiles: [...current.architecture.legacyGlobalClassFiles]
      }
    }
  }
}

export const createInitialBaseline = (
  current,
  limits = DEFAULT_STYLE_LIMITS
) => ({
  version: 2,
  limits: { ...limits },
  scss: { files: sortedObject(Object.entries(current.scss.files)) },
  native: { files: sortedObject(Object.entries(current.native.files)) },
  architecture: {
    parentStyleImports: [...current.architecture.parentStyleImports],
    legacyGlobalClassFiles: [...current.architecture.legacyGlobalClassFiles]
  }
})

export const getSnapshotSummary = snapshot => {
  const styles = Object.values(snapshot.scss.files)
  const totals = styles.reduce(
    (result, metrics) => {
      for (const [field] of STYLE_DEBT_FIELDS) result[field] += metrics[field]
      result.lines += metrics.lines
      if (metrics.usesTokens) result.tokenFiles += 1
      return result
    },
    {
      rawColors: 0,
      rawFontSizes: 0,
      rawLineHeights: 0,
      rawRadii: 0,
      rawFontWeights: 0,
      lines: 0,
      tokenFiles: 0
    }
  )
  const nativeColors = Object.values(snapshot.native.files).reduce(
    (total, metrics) => total + metrics.rawColors,
    0
  )

  return {
    scssFiles: styles.length,
    ...totals,
    nativeColors,
    parentStyleImports: snapshot.architecture.parentStyleImports.length,
    legacyGlobalClassFiles: snapshot.architecture.legacyGlobalClassFiles.length
  }
}
