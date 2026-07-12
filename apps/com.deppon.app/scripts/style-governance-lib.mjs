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

const COLOR_FUNCTION_NAMES =
  'rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|(?:repeating-)?(?:linear|radial|conic)-gradient'
const COLOR_FUNCTION_PATTERN = new RegExp(
  `\\b(?:${COLOR_FUNCTION_NAMES})\\s*\\(`,
  'gi'
)
const COLOR_FUNCTION_VALUE_PATTERN = new RegExp(
  `\\b(?:${COLOR_FUNCTION_NAMES})\\s*\\([^;]*?\\)`,
  'gi'
)
const GRADIENT_FUNCTION_PATTERN =
  /\b(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/gi
const HEX_COLOR_PATTERN = /#[0-9a-f]{3,8}\b/gi
const TOKEN_USE_PATTERN =
  /@use\s+['"](?:tokens|[^'"]*styles(?:\/(?:index|_?tokens)(?:\.scss)?)?)['"]/
const RELIABLE_RN_STYLE_UNITS = new Set(['px', '%', 'deg'])
const STYLE_DIMENSION_PATTERN =
  /(^|[^#\w$-])-?(?:\d*\.)?\d+([a-z%]+)\b/gi
const PSEUDO_ELEMENT_PATTERN = /::[a-z][a-z0-9-]*/gi

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

const normalizeSassVariable = variable => variable.replaceAll('_', '-')

const getLexicalContexts = (source, offsets) => {
  const contexts = new Map()
  const pending = new Set(offsets)
  const scope = [{ id: 0, flowControl: false }]
  let nextScope = 0
  let statementStart = 0
  let quote = null
  let escaped = false
  let parentheses = 0
  let brackets = 0
  let interpolation = 0

  for (let index = 0; index <= source.length; index += 1) {
    if (pending.has(index)) {
      contexts.set(index, {
        scope: [...scope],
        ignored:
          Boolean(quote) || parentheses > 0 || brackets > 0 || interpolation > 0
      })
      pending.delete(index)
    }
    if (index === source.length) break

    const character = source[index]
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = null
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      continue
    }
    if (interpolation > 0) {
      if (character === '{') interpolation += 1
      else if (character === '}') interpolation -= 1
      continue
    }
    if (character === '#' && source[index + 1] === '{') {
      interpolation = 1
      index += 1
      continue
    }
    if (character === '(') parentheses += 1
    else if (character === ')') parentheses = Math.max(0, parentheses - 1)
    else if (character === '[') brackets += 1
    else if (character === ']') brackets = Math.max(0, brackets - 1)
    else if (character === '{' && parentheses === 0 && brackets === 0) {
      const header = source.slice(statementStart, index).trim()
      scope.push({
        id: (nextScope += 1),
        flowControl: /^@(?:if|else|for|each|while)\b/.test(header)
      })
      statementStart = index + 1
    } else if (
      character === '}' &&
      parentheses === 0 &&
      brackets === 0 &&
      scope.length > 1
    ) {
      scope.pop()
      statementStart = index + 1
    } else if (character === ';' && parentheses === 0 && brackets === 0) {
      statementStart = index + 1
    }
  }

  return contexts
}

const readDeclarationValue = (source, start) => {
  let quote = null
  let escaped = false
  let parentheses = 0
  let brackets = 0
  let interpolation = 0

  for (let index = start; index < source.length; index += 1) {
    const character = source[index]
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = null
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      continue
    }
    if (interpolation > 0) {
      if (character === '{') interpolation += 1
      else if (character === '}') interpolation -= 1
      continue
    }
    if (character === '#' && source[index + 1] === '{') {
      interpolation = 1
      index += 1
      continue
    }
    if (character === '(') parentheses += 1
    else if (character === ')') parentheses = Math.max(0, parentheses - 1)
    else if (character === '[') brackets += 1
    else if (character === ']') brackets = Math.max(0, brackets - 1)
    else if (
      parentheses === 0 &&
      brackets === 0 &&
      (character === ';' || character === '}')
    ) {
      return source.slice(start, index).trim()
    }
  }

  return source.slice(start).trim()
}

const getDeclarations = content => {
  const source = stripStyleComments(content)
  const pattern = /(?:^|[;{}\n])\s*(\$?[-_a-zA-Z][-_a-zA-Z0-9]*)\s*:/g
  const candidates = [...source.matchAll(pattern)].map(match => {
    const rawProperty = match[1]
    const index = match.index + match[0].lastIndexOf(rawProperty)
    return {
      rawProperty,
      index,
      valueStart: match.index + match[0].length
    }
  })
  const contexts = getLexicalContexts(
    source,
    candidates.map(({ index }) => index)
  )

  return candidates
    .filter(({ index }) => !contexts.get(index)?.ignored)
    .map(({ rawProperty, index, valueStart }) => ({
      property: rawProperty.startsWith('$')
        ? normalizeSassVariable(rawProperty)
        : rawProperty.toLowerCase(),
      value: readDeclarationValue(source, valueStart),
      index,
      scope: contexts.get(index)?.scope ?? [{ id: 0, flowControl: false }]
    }))
}

const getLocalVariables = declarations => {
  const variables = new Map()
  for (const declaration of declarations) {
    if (!declaration.property.startsWith('$')) continue
    const currentScope = declaration.scope.at(-1)
    const previous = currentScope?.flowControl
      ? findVisibleVariable(declaration.property, variables, declaration)
      : null
    declaration.bindingScope = previous?.bindingScope ?? declaration.scope
    const existing = variables.get(declaration.property) ?? []
    existing.push(declaration)
    variables.set(declaration.property, existing)
  }
  return variables
}

const isAncestorScope = (ancestor, descendant) =>
  ancestor.length <= descendant.length &&
  ancestor.every((scope, index) => scope.id === descendant[index].id)

function findVisibleVariable(variable, variables, context) {
  return (variables.get(normalizeSassVariable(variable)) ?? [])
    .filter(
      declaration =>
        declaration.index < context.index &&
        isAncestorScope(
          declaration.bindingScope ?? declaration.scope,
          context.scope
        )
    )
    .sort(
      (left, right) =>
        (right.bindingScope ?? right.scope).length -
          (left.bindingScope ?? left.scope).length || right.index - left.index
    )[0]
}

const resolveLocalVariables = (
  value,
  variables,
  context,
  resolving = new Set(),
  blockedVariables = new Set()
) =>
  value.replace(
    /(^|[^.])(\$[-_a-zA-Z][-_a-zA-Z0-9]*)/g,
    (match, prefix, variable) => {
      if (blockedVariables.has(normalizeSassVariable(variable))) return match
      const declaration = findVisibleVariable(variable, variables, context)
      if (!declaration) return match
      const key = `${declaration.property}:${declaration.index}`
      if (resolving.has(key)) return match

      const nextResolving = new Set(resolving)
      nextResolving.add(key)
      return `${prefix}${resolveLocalVariables(
        declaration.value,
        variables,
        declaration,
        nextResolving,
        blockedVariables
      )}`
    }
  )

const findMatchingDelimiter = (source, openIndex, open, close) => {
  let depth = 0
  let quote = null
  let escaped = false

  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index]
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = null
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      continue
    }
    if (character === open) depth += 1
    else if (character === close) {
      depth -= 1
      if (depth === 0) return index
    }
  }

  return -1
}

const splitTopLevel = (value, delimiter = ',') => {
  const parts = []
  let start = 0
  let quote = null
  let escaped = false
  let parentheses = 0
  let brackets = 0
  let braces = 0

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = null
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      continue
    }
    if (character === '(') parentheses += 1
    else if (character === ')') parentheses = Math.max(0, parentheses - 1)
    else if (character === '[') brackets += 1
    else if (character === ']') brackets = Math.max(0, brackets - 1)
    else if (character === '{') braces += 1
    else if (character === '}') braces = Math.max(0, braces - 1)
    else if (
      character === delimiter &&
      parentheses === 0 &&
      brackets === 0 &&
      braces === 0
    ) {
      parts.push(value.slice(start, index).trim())
      start = index + 1
    }
  }

  parts.push(value.slice(start).trim())
  return parts.filter(Boolean)
}

const findTopLevelCharacter = (value, target) => {
  let quote = null
  let escaped = false
  let parentheses = 0
  let brackets = 0
  let braces = 0

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = null
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      continue
    }
    if (character === '(') parentheses += 1
    else if (character === ')') parentheses = Math.max(0, parentheses - 1)
    else if (character === '[') brackets += 1
    else if (character === ']') brackets = Math.max(0, brackets - 1)
    else if (character === '{') braces += 1
    else if (character === '}') braces = Math.max(0, braces - 1)
    else if (
      character === target &&
      parentheses === 0 &&
      brackets === 0 &&
      braces === 0
    ) {
      return index
    }
  }

  return -1
}

const tokenizeStyleValue = value => {
  const tokens = []
  let current = ''
  let quote = null
  let escaped = false
  let parentheses = 0
  let brackets = 0
  let braces = 0

  const flush = () => {
    if (current.trim()) tokens.push(current.trim())
    current = ''
  }

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (quote) {
      current += character
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = null
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      current += character
      continue
    }
    if (character === '(') parentheses += 1
    else if (character === ')') parentheses = Math.max(0, parentheses - 1)
    else if (character === '[') brackets += 1
    else if (character === ']') brackets = Math.max(0, brackets - 1)
    else if (character === '{') braces += 1
    else if (character === '}') braces = Math.max(0, braces - 1)

    if (
      parentheses === 0 &&
      brackets === 0 &&
      braces === 0 &&
      (character === '/' || /\s/.test(character))
    ) {
      flush()
      if (character === '/') tokens.push('/')
    } else {
      current += character
    }
  }
  flush()
  return tokens
}

const isFontSizeSlot = value =>
  /(?:^|[^\w$-])-?(?:\d*\.)?\d+(?:[a-z%]+)\b/i.test(value) ||
  /^-?0(?:\.0+)?$/.test(value) ||
  /\$(?:[-_a-z0-9]*-)?font[-_]size\b/i.test(value) ||
  /\b(?:calc|min|max|clamp)\s*\(/i.test(value)

const getFontShorthandParts = value => {
  const tokens = tokenizeStyleValue(value)
  const slashIndex = tokens.indexOf('/')
  const sizeIndex =
    slashIndex > 0
      ? slashIndex - 1
      : tokens.findIndex(token => isFontSizeSlot(token))
  if (sizeIndex < 0) {
    return { fontSize: '', lineHeight: '', fontWeights: [] }
  }

  return {
    fontSize: tokens[sizeIndex],
    lineHeight:
      slashIndex >= 0 && slashIndex + 1 < tokens.length
        ? tokens[slashIndex + 1]
        : '',
    fontWeights: tokens.slice(0, sizeIndex)
  }
}

const scanSassAtRules = (source, keyword) => {
  const namePattern =
    keyword === 'include'
      ? '[-_a-zA-Z][-_a-zA-Z0-9]*(?:\\.[-_a-zA-Z][-_a-zA-Z0-9]*)?'
      : '[-_a-zA-Z][-_a-zA-Z0-9]*'
  const pattern = new RegExp(`@${keyword}\\s+(${namePattern})\\s*\\(`, 'g')
  const candidates = [...source.matchAll(pattern)].map(match => ({
    index: match.index,
    name: match[1],
    openIndex: match.index + match[0].lastIndexOf('(')
  }))
  const contexts = getLexicalContexts(
    source,
    candidates.map(({ index }) => index)
  )

  return candidates.flatMap(candidate => {
    const context = contexts.get(candidate.index)
    if (context?.ignored) return []
    const closeIndex = findMatchingDelimiter(
      source,
      candidate.openIndex,
      '(',
      ')'
    )
    if (closeIndex < 0) return []

    const result = {
      ...candidate,
      closeIndex,
      arguments: source.slice(candidate.openIndex + 1, closeIndex),
      scope: context?.scope ?? [{ id: 0, flowControl: false }]
    }
    if (keyword === 'mixin') {
      let bodyStart = closeIndex + 1
      while (/\s/.test(source[bodyStart] ?? '')) bodyStart += 1
      if (source[bodyStart] === '{') {
        const bodyEnd = findMatchingDelimiter(source, bodyStart, '{', '}')
        if (bodyEnd >= 0) Object.assign(result, { bodyStart, bodyEnd })
      }
    }
    return [result]
  })
}

const parseSassArgument = value => {
  const colonIndex = findTopLevelCharacter(value, ':')
  if (colonIndex < 0) return { name: null, value: value.trim() }
  const name = value.slice(0, colonIndex).trim()
  if (!/^\$[-_a-zA-Z][-_a-zA-Z0-9]*$/.test(name)) {
    return { name: null, value: value.trim() }
  }
  return {
    name: normalizeSassVariable(name),
    value: value.slice(colonIndex + 1).trim()
  }
}

const semanticFieldsForParameter = variable => {
  const name = normalizeSassVariable(variable).slice(1).toLowerCase()
  const fields = new Set()
  if (/(?:^|-)color$/.test(name)) fields.add('rawColors')
  if (/(?:^|-)font-size$/.test(name)) fields.add('rawFontSizes')
  if (/(?:^|-)line-height$/.test(name)) fields.add('rawLineHeights')
  if (/(?:^|-)(?:border-)?radius$/.test(name)) fields.add('rawRadii')
  if (/(?:^|-)font-weight$/.test(name)) fields.add('rawFontWeights')
  return fields
}

const variableReferences = value =>
  new Set(
    [...value.matchAll(/(^|[^.])(\$[-_a-zA-Z][-_a-zA-Z0-9]*)/g)].map(
      match => normalizeSassVariable(match[2])
    )
  )

const addParameterField = (contract, value, field) => {
  for (const variable of variableReferences(value)) {
    if (contract.has(variable)) contract.get(variable).add(field)
  }
}

const getMixinDefinitions = (source, declarations, localVariables) =>
  scanSassAtRules(source, 'mixin').map(definition => {
    const parameters = splitTopLevel(definition.arguments).flatMap(part => {
      const parsed = parseSassArgument(part)
      const rawName = parsed.name ?? part.trim().replace(/\.\.\.$/, '')
      if (!/^\$[-_a-zA-Z][-_a-zA-Z0-9]*$/.test(rawName)) return []
      return [
        {
          name: normalizeSassVariable(rawName),
          defaultValue: parsed.name ? parsed.value : null
        }
      ]
    })
    const contract = new Map(
      parameters.map(parameter => [
        parameter.name,
        semanticFieldsForParameter(parameter.name)
      ])
    )
    const blockedVariables = new Set(parameters.map(({ name }) => name))

    if (definition.bodyStart != null && definition.bodyEnd != null) {
      for (const declaration of declarations) {
        if (
          declaration.index <= definition.bodyStart ||
          declaration.index >= definition.bodyEnd
        ) {
          continue
        }
        const resolvedValue = resolveLocalVariables(
          declaration.value,
          localVariables,
          declaration,
          new Set(),
          blockedVariables
        )
        const { property } = declaration
        if (
          isColorProperty(property) &&
          !/^border(?:-(?:top|right|bottom|left))?(?:-(?:left|right))?-radius$/.test(
            property
          )
        ) {
          addParameterField(contract, resolvedValue, 'rawColors')
        } else if (property === 'font-size') {
          addParameterField(contract, resolvedValue, 'rawFontSizes')
        } else if (property === 'line-height') {
          addParameterField(contract, resolvedValue, 'rawLineHeights')
        } else if (
          /^border(?:-(?:top|right|bottom|left))?(?:-(?:left|right))?-radius$/.test(
            property
          )
        ) {
          addParameterField(contract, resolvedValue, 'rawRadii')
        } else if (property === 'font-weight') {
          addParameterField(contract, resolvedValue, 'rawFontWeights')
        } else if (property === 'font') {
          const shorthand = getFontShorthandParts(resolvedValue)
          addParameterField(contract, shorthand.fontSize, 'rawFontSizes')
          addParameterField(contract, shorthand.lineHeight, 'rawLineHeights')
          for (const weight of shorthand.fontWeights) {
            addParameterField(contract, weight, 'rawFontWeights')
          }
        }
      }
    }

    return { ...definition, parameters, contract, blockedVariables }
  })

const findContainingMixin = (definitions, index) =>
  definitions.find(
    definition =>
      definition.bodyStart != null &&
      definition.bodyEnd != null &&
      index > definition.bodyStart &&
      index < definition.bodyEnd
  )

const findVisibleMixin = (definitions, inclusion) => {
  if (inclusion.name.includes('.')) return null
  const normalizedName = inclusion.name.replaceAll('_', '-').toLowerCase()
  return definitions
    .filter(
      definition =>
        definition.name.replaceAll('_', '-').toLowerCase() ===
          normalizedName &&
        definition.index < inclusion.index &&
        isAncestorScope(definition.scope, inclusion.scope)
    )
    .sort(
      (left, right) =>
        right.scope.length - left.scope.length || right.index - left.index
    )[0]
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
    .replace(COLOR_FUNCTION_VALUE_PATTERN, ' ')

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

const countStaticMixinValue = (metrics, fields, value, context, variables) => {
  // A color alias is charged at its literal declaration, matching ordinary
  // Sass variable consumers. Direct colors in an at-rule argument are charged
  // here because getDeclarations intentionally skips parentheses.
  const directColors = extractColorsFromValue(value).length
  if (directColors > 0) metrics.rawColors += directColors

  const resolvedValue = resolveLocalVariables(value, variables, context)
  if (fields.has('rawFontSizes') && hasNumericLiteral(resolvedValue)) {
    metrics.rawFontSizes += 1
  }
  if (fields.has('rawLineHeights') && hasNumericLiteral(resolvedValue)) {
    metrics.rawLineHeights += 1
  }
  if (fields.has('rawRadii') && hasNumericLiteral(resolvedValue)) {
    metrics.rawRadii += 1
  }
  if (fields.has('rawFontWeights') && hasFontWeightLiteral(resolvedValue)) {
    metrics.rawFontWeights += 1
  }
}

export const analyzeStyleContent = content => {
  const source = stripStyleComments(content)
  const declarations = getDeclarations(source)
  const localVariables = getLocalVariables(declarations)
  const mixinDefinitions = getMixinDefinitions(
    source,
    declarations,
    localVariables
  )
  const mixinIncludes = scanSassAtRules(source, 'include')
  let rawColors = 0
  let rawFontSizes = 0
  let rawLineHeights = 0
  let rawRadii = 0
  let rawFontWeights = 0

  for (const declaration of declarations) {
    const { property, value } = declaration
    const containingMixin = findContainingMixin(
      mixinDefinitions,
      declaration.index
    )
    const resolvedValue = resolveLocalVariables(
      value,
      localVariables,
      declaration,
      new Set(),
      containingMixin?.blockedVariables ?? new Set()
    )
    if (isColorProperty(property) || property.startsWith('$')) {
      rawColors += extractColorsFromValue(value).length
    }
    if (property === 'font-size' && hasNumericLiteral(resolvedValue)) {
      rawFontSizes += 1
    }
    if (property === 'line-height' && hasNumericLiteral(resolvedValue)) {
      rawLineHeights += 1
    }
    if (
      /^border(?:-(?:top|right|bottom|left))?(?:-(?:left|right))?-radius$/.test(
        property
      ) &&
      hasNumericLiteral(resolvedValue)
    ) {
      rawRadii += 1
    }
    if (property === 'font-weight' && hasFontWeightLiteral(resolvedValue)) {
      rawFontWeights += 1
    }
    if (property === 'font') {
      const shorthand = getFontShorthandParts(resolvedValue)
      if (hasNumericLiteral(shorthand.fontSize)) rawFontSizes += 1
      if (hasNumericLiteral(shorthand.lineHeight)) rawLineHeights += 1
      if (shorthand.fontWeights.some(weight => hasFontWeightLiteral(weight))) {
        rawFontWeights += 1
      }
    }
  }

  const metrics = {
    rawColors,
    rawFontSizes,
    rawLineHeights,
    rawRadii,
    rawFontWeights
  }

  for (const definition of mixinDefinitions) {
    for (const parameter of definition.parameters) {
      if (parameter.defaultValue == null) continue
      const fields = definition.contract.get(parameter.name) ?? new Set()
      const context = {
        index: definition.index,
        scope: definition.scope
      }
      countStaticMixinValue(
        metrics,
        fields,
        parameter.defaultValue,
        context,
        localVariables
      )
    }
  }

  for (const inclusion of mixinIncludes) {
    const definition = findVisibleMixin(mixinDefinitions, inclusion)
    const parameters = definition?.parameters ?? []
    const contract = definition?.contract ?? new Map()
    const positionalIndex = { value: 0 }
    for (const rawArgument of splitTopLevel(inclusion.arguments)) {
      const argument = parseSassArgument(rawArgument)
      let parameter
      let fields
      if (argument.name) {
        parameter = parameters.find(item => item.name === argument.name)
        fields =
          contract.get(argument.name) ??
          semanticFieldsForParameter(argument.name)
      } else {
        parameter = parameters[positionalIndex.value]
        fields = parameter
          ? contract.get(parameter.name) ?? new Set()
          : new Set()
        positionalIndex.value += 1
      }
      countStaticMixinValue(
        metrics,
        fields,
        argument.value,
        {
          index: inclusion.index,
          scope: inclusion.scope
        },
        localVariables
      )
    }
  }

  return {
    ...metrics,
    usesTokens: TOKEN_USE_PATTERN.test(source),
    lines: getLineCount(content)
  }
}

const maskStyleStrings = content => {
  const characters = [...content]
  let quote = null
  let escaped = false

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index]
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = null
      if (character !== '\n') characters[index] = ' '
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      characters[index] = ' '
    }
  }

  return characters.join('')
}

const getUnsupportedStyleFailures = (content, file) => {
  const source = stripStyleComments(content)
  const failures = []
  const declarations = getDeclarations(source)

  for (const declaration of declarations) {
    const value = maskStyleStrings(declaration.value)
    GRADIENT_FUNCTION_PATTERN.lastIndex = 0
    if (GRADIENT_FUNCTION_PATTERN.test(value)) {
      failures.push(`${file} 禁止使用 gradient，请使用可跨端渲染的视觉资产`)
    }

    STYLE_DIMENSION_PATTERN.lastIndex = 0
    for (const match of value.matchAll(STYLE_DIMENSION_PATTERN)) {
      const unit = match[2].toLowerCase()
      if (!RELIABLE_RN_STYLE_UNITS.has(unit)) {
        failures.push(`${file} 使用了 RN 不可靠单位 ${unit}`)
      }
    }

    if (
      file.startsWith('src/pages/') &&
      declaration.property === 'elevation'
    ) {
      failures.push(`${file} 页面样式禁止直接使用 elevation`)
    }
  }

  const selectorSource = maskStyleStrings(source)
  PSEUDO_ELEMENT_PATTERN.lastIndex = 0
  for (const match of selectorSource.matchAll(PSEUDO_ELEMENT_PATTERN)) {
    failures.push(`${file} 使用了 RN 不支持的伪元素 ${match[0]}`)
  }

  return [...new Set(failures)]
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

// Taro's RN renderer does not provide a reliable hit target for event
// handlers attached to primitive elements. Keep the list explicit so custom
// PascalCase components (for example, Banner or OrderDetailEmpty) are not
// mistaken for native controls.
const TARO_NATIVE_ELEMENTS = new Set([
  'View',
  'Text',
  'Image',
  'ScrollView',
  'Input',
  'Textarea',
  'Button',
  'Icon',
  'RichText',
  'Progress',
  'Swiper',
  'SwiperItem',
  'Video',
  'Map',
  'Canvas',
  'CoverView',
  'CoverImage',
  'MovableArea',
  'MovableView',
  'Navigator',
  'Picker',
  'PickerView',
  'PickerViewColumn',
  'Slider',
  'Switch',
  'Radio',
  'RadioGroup',
  'Checkbox',
  'CheckboxGroup',
  'Form',
  'Label',
  'Camera',
  'LivePlayer',
  'LivePusher',
  'FunctionalPageNavigator',
  'MatchMedia',
  'OfficialAccount',
  'OpenData',
  'Ad',
  'Audio',
  'WebView',
  'RootPortal',
  'PageContainer'
])

const getTaroNativeAliases = source => {
  const aliases = new Set(TARO_NATIVE_ELEMENTS)
  const importPattern =
    /\bimport\s+((?:(?!\bimport\b)[\s\S])*?)\s+from\s+['"]@tarojs\/components['"]/g

  for (const match of source.matchAll(importPattern)) {
    const clause = match[1]
    const namespace = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/)?.[1]
    if (namespace) {
      for (const element of TARO_NATIVE_ELEMENTS) {
        aliases.add(`${namespace}.${element}`)
      }
    }
    const named = clause.match(/\{([\s\S]*?)\}/)?.[1] ?? ''
    for (const specifier of named.split(',')) {
      const parts = specifier
        .trim()
        .split(/\s+as\s+/i)
        .map(value => value.trim())
        .filter(Boolean)
      if (parts.length === 0) continue
      const imported = parts[0]
      const local = parts[1] ?? imported
      if (TARO_NATIVE_ELEMENTS.has(imported)) aliases.add(local)
    }
  }

  return aliases
}

const isScriptQuote = character =>
  character === "'" || character === '"' || character === '`'

const maskScriptTrivia = source => {
  const characters = [...source]
  let quote = null
  let escaped = false
  let lineComment = false
  let blockComment = false

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index]
    const next = characters[index + 1]

    if (lineComment) {
      if (character === '\n') lineComment = false
      else characters[index] = ' '
      continue
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        characters[index] = ' '
        characters[index + 1] = ' '
        index += 1
        blockComment = false
      } else if (character !== '\n') {
        characters[index] = ' '
      }
      continue
    }
    if (quote) {
      if (character === '\n') {
        quote = null
        continue
      }
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = null
      if (quote || character === quote) characters[index] = ' '
      continue
    }
    if (character === '/' && next === '/') {
      characters[index] = ' '
      characters[index + 1] = ' '
      index += 1
      lineComment = true
      continue
    }
    if (character === '/' && next === '*') {
      characters[index] = ' '
      characters[index + 1] = ' '
      index += 1
      blockComment = true
      continue
    }
    if (isScriptQuote(character)) {
      quote = character
      characters[index] = ' '
    }
  }

  return characters.join('')
}

const readJsxOpeningTag = (source, start) => {
  if (source[start] !== '<' || source[start + 1] === '/') return null
  let nameEnd = start + 1
  while (/[A-Za-z0-9_.:-]/.test(source[nameEnd] ?? '')) nameEnd += 1
  if (nameEnd === start + 1) return null

  let quote = null
  let escaped = false
  let braceDepth = 0
  let lineComment = false
  let blockComment = false

  for (let index = nameEnd; index < source.length; index += 1) {
    const character = source[index]
    const next = source[index + 1]

    if (lineComment) {
      if (character === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = null
      continue
    }
    if (isScriptQuote(character)) {
      quote = character
      continue
    }
    if (braceDepth > 0) {
      if (character === '/' && next === '/') {
        lineComment = true
        index += 1
      } else if (character === '/' && next === '*') {
        blockComment = true
        index += 1
      } else if (character === '{') braceDepth += 1
      else if (character === '}') braceDepth -= 1
      continue
    }
    if (character === '{') {
      braceDepth = 1
      continue
    }
    if (character === '>') {
      return {
        name: source.slice(start + 1, nameEnd),
        bodyStart: nameEnd,
        end: index + 1,
        body: source.slice(nameEnd, index)
      }
    }
  }

  return null
}

const getLineNumber = (source, offset) => {
  let line = 1
  for (let index = 0; index < offset; index += 1) {
    if (source[index] === '\n') line += 1
  }
  return line
}

/**
 * Find direct click/tap handlers on known Taro primitive elements. The
 * scanner intentionally works without a parser dependency because the CLI is
 * copied into release fixtures and must remain self-contained.
 */
export const scanNativeClickHandlers = source => {
  const nativeNames = getTaroNativeAliases(source)
  const maskedSource = maskScriptTrivia(source)
  const handlers = []

  for (let index = 0; index < maskedSource.length; index += 1) {
    if (maskedSource[index] !== '<') continue
    const tag = readJsxOpeningTag(maskedSource, index)
    if (!tag || !nativeNames.has(tag.name)) continue

    const maskedBody = maskScriptTrivia(tag.body)
    const eventPattern = /(?:^|\s)(onClick|onTap)(?=\s*(?:=|\/?$))/g
    for (const match of maskedBody.matchAll(eventPattern)) {
      const eventOffset =
        tag.bodyStart + match.index + match[0].indexOf(match[1])
      handlers.push({
        element: tag.name,
        prop: match[1],
        line: getLineNumber(source, eventOffset)
      })
    }
    const spreadPattern =
      /\{\s*\.\.\.\s*(?:\{[^}]*\}|[A-Za-z_$][\w$]*)/g
    for (const match of maskedBody.matchAll(spreadPattern)) {
      if (!/\bon(?:Click|Tap)\b/.test(match[0])) continue
      handlers.push({
        element: tag.name,
        prop: 'spread',
        line: getLineNumber(source, tag.bodyStart + match.index)
      })
    }

    index = tag.end - 1
  }

  return handlers
}

const REACT_NATIVE_PRESSABLES = new Set([
  'Pressable',
  'TouchableHighlight',
  'TouchableNativeFeedback',
  'TouchableOpacity',
  'TouchableWithoutFeedback'
])

const getReactNativePressableAliases = source => {
  const aliases = new Set()
  const importPattern =
    /\bimport\s+((?:(?!\bimport\b)[\s\S])*?)\s+from\s+['"]react-native['"]/g

  for (const match of source.matchAll(importPattern)) {
    const clause = match[1]
    const namespace = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/)?.[1]
    if (namespace) {
      for (const element of REACT_NATIVE_PRESSABLES) {
        aliases.add(`${namespace}.${element}`)
      }
    }

    const named = clause.match(/\{([\s\S]*?)\}/)?.[1] ?? ''
    for (const specifier of named.split(',')) {
      const parts = specifier
        .replace(/^\s*type\s+/, '')
        .trim()
        .split(/\s+as\s+/i)
        .map(value => value.trim())
        .filter(Boolean)
      if (parts.length === 0 || !REACT_NATIVE_PRESSABLES.has(parts[0])) continue
      aliases.add(parts[1] ?? parts[0])
    }
  }

  const requirePattern =
    /\b(?:const|let|var)\s*\{([\s\S]*?)\}\s*=\s*require\s*\(\s*['"]react-native['"]\s*\)/g
  for (const match of source.matchAll(requirePattern)) {
    for (const specifier of match[1].split(',')) {
      const [imported, local] = specifier
        .trim()
        .split(/\s*:\s*/)
        .map(value => value.trim())
      if (REACT_NATIVE_PRESSABLES.has(imported)) aliases.add(local ?? imported)
    }
  }

  return aliases
}

export const scanDirectReactNativePressables = source => {
  const pressableNames = getReactNativePressableAliases(source)
  if (pressableNames.size === 0) return []

  const maskedSource = maskScriptTrivia(source)
  const usages = []
  for (let index = 0; index < maskedSource.length; index += 1) {
    if (maskedSource[index] !== '<') continue
    const tag = readJsxOpeningTag(maskedSource, index)
    if (!tag || !pressableNames.has(tag.name)) continue
    usages.push({
      element: tag.name,
      line: getLineNumber(source, index)
    })
    index = tag.end - 1
  }

  for (const name of pressableNames) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const createElementPattern = new RegExp(
      `\\b(?:React\\s*\\.\\s*)?createElement\\s*\\(\\s*${escapedName}\\b`,
      'g'
    )
    for (const match of maskedSource.matchAll(createElementPattern)) {
      usages.push({
        element: name,
        line: getLineNumber(source, match.index)
      })
    }
  }

  return usages.sort((left, right) => left.line - right.line)
}

export const analyzeNativePressableContract = content => {
  const source = maskScriptTrivia(content)
  return {
    minWidth: /\bminWidth\s*:\s*APP_NATIVE_TOKENS\s*\.\s*touch\s*\.\s*minimum\b/.test(
      source
    ),
    minHeight:
      /\bminHeight\s*:\s*APP_NATIVE_TOKENS\s*\.\s*touch\s*\.\s*minimum\b/.test(
        source
      )
  }
}

export const getNativePressableContractFailures = (
  content,
  file = 'src/shared/native/AppNativePressable.tsx'
) => {
  const contract = analyzeNativePressableContract(content)
  if (contract.minWidth && contract.minHeight) return []
  const missing = [
    !contract.minWidth && 'minWidth',
    !contract.minHeight && 'minHeight'
  ].filter(Boolean)
  return [
    `${file} 必须使用 APP_NATIVE_TOKENS.touch.minimum 作为 ${missing.join('、')}`
  ]
}

const readBraceBlock = (source, openIndex) => {
  if (source[openIndex] !== '{') return null
  let depth = 0
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    else if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(openIndex + 1, index)
    }
  }
  return null
}

export const analyzeNativeTouchMinimum = content => {
  const source = maskScriptTrivia(content)
  const assignment = /\bAPP_NATIVE_TOKENS\s*=\s*\{/.exec(source)
  if (!assignment) return { minimum: null, isStatic44: false }

  const objectOpen = source.indexOf('{', assignment.index)
  const objectSource = readBraceBlock(source, objectOpen)
  if (objectSource === null) return { minimum: null, isStatic44: false }
  const touch = /\btouch\s*:\s*\{/.exec(objectSource)
  if (!touch) return { minimum: null, isStatic44: false }

  const touchOpen = objectSource.indexOf('{', touch.index)
  const touchSource = readBraceBlock(objectSource, touchOpen)
  if (touchSource === null) return { minimum: null, isStatic44: false }
  const minimum =
    /\bminimum\s*:\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\b/.exec(
      touchSource
    )?.[1] ?? null

  return {
    minimum: minimum === null ? null : Number(minimum),
    isStatic44: minimum !== null && Number(minimum) === 44
  }
}

export const getNativeTouchMinimumFailures = (
  content,
  file = 'src/styles/nativeTokens.ts'
) =>
  analyzeNativeTouchMinimum(content).isStatic44
    ? []
    : [
        `${file} 的 APP_NATIVE_TOKENS.touch.minimum 必须声明为静态数值 44`
      ]

const hasJsxMarkup = source => {
  const maskedSource = maskScriptTrivia(source)
  for (let index = 0; index < maskedSource.length; index += 1) {
    if (maskedSource[index] !== '<') continue
    const tag = readJsxOpeningTag(maskedSource, index)
    if (!tag) continue
    if (/\/\s*$/.test(tag.body)) return true
    const escapedName = tag.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const closingTag = new RegExp(`</${escapedName}\\s*>`)
    if (closingTag.test(source.slice(tag.end))) return true
    index = tag.end - 1
  }
  return false
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

const isScriptIdentifierStart = character => /[a-zA-Z_$]/.test(character ?? '')
const isScriptIdentifierPart = character =>
  /[a-zA-Z0-9_$]/.test(character ?? '')

const skipScriptTrivia = (source, start) => {
  let index = start
  while (index < source.length) {
    if (/\s/.test(source[index])) {
      index += 1
      continue
    }
    if (source[index] === '/' && source[index + 1] === '/') {
      const newline = source.indexOf('\n', index + 2)
      return newline === -1
        ? source.length
        : skipScriptTrivia(source, newline + 1)
    }
    if (source[index] === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2)
      index = end === -1 ? source.length : end + 2
      continue
    }
    break
  }
  return index
}

const readScriptLiteral = (source, start) => {
  const quote = source[start]
  if (quote !== "'" && quote !== '"' && quote !== '`') return null

  let value = ''
  let isStatic = true
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index]
    if (character === '\\') {
      if (index + 1 < source.length) {
        value += source[index + 1]
        index += 1
      }
      continue
    }
    if (quote === '`' && character === '$' && source[index + 1] === '{') {
      isStatic = false
    }
    if (character === quote) {
      return { value, end: index + 1, isStatic }
    }
    value += character
  }

  return { value, end: source.length, isStatic: false }
}

const readScriptIdentifier = (source, start) => {
  if (!isScriptIdentifierStart(source[start])) return null
  let end = start + 1
  while (isScriptIdentifierPart(source[end])) end += 1
  return { value: source.slice(start, end), end }
}

const readCallSpecifier = (source, start) => {
  let index = skipScriptTrivia(source, start)
  if (source[index] !== '(') return null
  index = skipScriptTrivia(source, index + 1)
  return readScriptLiteral(source, index)
}

const readFromSpecifier = (source, start, allowImmediateLiteral) => {
  let index = skipScriptTrivia(source, start)
  if (allowImmediateLiteral) {
    const immediate = readScriptLiteral(source, index)
    if (immediate) return immediate
  }

  while (index < source.length && source[index] !== ';') {
    index = skipScriptTrivia(source, index)
    const literal = readScriptLiteral(source, index)
    if (literal) {
      index = literal.end
      continue
    }
    const identifier = readScriptIdentifier(source, index)
    if (identifier) {
      if (identifier.value === 'from') {
        return readScriptLiteral(
          source,
          skipScriptTrivia(source, identifier.end)
        )
      }
      index = identifier.end
      continue
    }
    index += 1
  }
  return null
}

const getScriptStyleSpecifiers = source => {
  const specifiers = []

  for (let index = 0; index < source.length; index += 1) {
    const triviaEnd = skipScriptTrivia(source, index)
    if (triviaEnd !== index) {
      index = triviaEnd - 1
      continue
    }
    const literal = readScriptLiteral(source, index)
    if (literal) {
      index = literal.end - 1
      continue
    }
    const identifier = readScriptIdentifier(source, index)
    if (!identifier) continue
    index = identifier.end - 1

    let specifier = null
    if (identifier.value === 'import') {
      const afterImport = skipScriptTrivia(source, identifier.end)
      specifier =
        source[afterImport] === '('
          ? readCallSpecifier(source, afterImport)
          : source[afterImport] === '.'
            ? null
            : readFromSpecifier(source, afterImport, true)
    } else if (identifier.value === 'export') {
      specifier = readFromSpecifier(source, identifier.end, false)
    } else if (identifier.value === 'require') {
      let afterRequire = skipScriptTrivia(source, identifier.end)
      if (source[afterRequire] === '.') {
        const resolveIdentifier = readScriptIdentifier(
          source,
          skipScriptTrivia(source, afterRequire + 1)
        )
        if (resolveIdentifier?.value !== 'resolve') continue
        afterRequire = resolveIdentifier.end
      }
      specifier = readCallSpecifier(source, afterRequire)
    }

    if (specifier?.isStatic) specifiers.push(specifier.value)
    if (specifier) index = Math.max(index, specifier.end - 1)
  }

  return specifiers
}

const getSassStyleSpecifiers = content => {
  const specifiers = []
  const pattern = /@(?:use|forward|import)\s+['"]([^'"]+)['"]/g
  for (const match of stripStyleComments(content).matchAll(pattern)) {
    specifiers.push(match[1])
  }
  return specifiers
}

const resolveStyleSpecifier = (appRoot, sourceFile, specifier) => {
  const cleanSpecifier = specifier.replace(/[?#].*$/, '')
  const srcRoot = path.join(appRoot, 'src')
  let unresolved

  if (cleanSpecifier.startsWith('@/')) {
    unresolved = path.join(srcRoot, cleanSpecifier.slice(2))
  } else if (cleanSpecifier.startsWith('~@/')) {
    unresolved = path.join(srcRoot, cleanSpecifier.slice(3))
  } else if (cleanSpecifier.startsWith('/src/')) {
    unresolved = path.join(appRoot, cleanSpecifier.slice(1))
  } else if (cleanSpecifier.startsWith('.')) {
    unresolved = path.resolve(path.dirname(sourceFile), cleanSpecifier)
  } else {
    return null
  }

  const candidates = []
  const addCandidate = candidate => {
    if (!candidates.includes(candidate)) candidates.push(candidate)
  }
  const addScssFileVariants = candidate => {
    const directory = path.dirname(candidate)
    const basename = path.basename(candidate)
    addCandidate(candidate)
    if (basename.startsWith('_')) {
      addCandidate(path.join(directory, basename.slice(1)))
    } else {
      addCandidate(path.join(directory, `_${basename}`))
    }
  }

  if (path.extname(unresolved)) {
    addScssFileVariants(unresolved)
  } else {
    addScssFileVariants(`${unresolved}.scss`)
    addScssFileVariants(path.join(unresolved, 'index.scss'))
    addScssFileVariants(path.join(unresolved, '_index.scss'))
  }

  const existing = candidates.find(candidate => {
    try {
      return fs.statSync(candidate).isFile()
    } catch {
      return false
    }
  })
  return existing ?? candidates[0]
}

const isParentIndexStyle = (sourceFile, targetFile) => {
  if (!['index.scss', '_index.scss'].includes(path.basename(targetFile))) {
    return false
  }
  const relative = path.relative(
    path.dirname(targetFile),
    path.dirname(sourceFile)
  )
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  )
}

const getParentStyleImports = (appRoot, scriptFiles, scssFiles) => {
  const imports = []
  const sources = [
    ...scriptFiles.map(filePath => ({
      filePath,
      specifiers: getScriptStyleSpecifiers(fs.readFileSync(filePath, 'utf8'))
    })),
    ...scssFiles.map(filePath => ({
      filePath,
      specifiers: getSassStyleSpecifiers(fs.readFileSync(filePath, 'utf8'))
    }))
  ]

  for (const { filePath, specifiers } of sources) {
    for (const specifier of specifiers) {
      const targetFile = resolveStyleSpecifier(appRoot, filePath, specifier)
      if (!targetFile || !isParentIndexStyle(filePath, targetFile)) continue
      imports.push({
        file: relativePath(appRoot, filePath),
        importPath: specifier
      })
    }
  }

  return imports.sort((left, right) =>
    `${left.file}:${left.importPath}`.localeCompare(
      `${right.file}:${right.importPath}`
    )
  )
}

const splitTopLevelStatements = content => {
  const statements = []
  let current = ''
  let quote = null
  let escaped = false
  let depth = 0

  for (const character of stripStyleComments(content)) {
    if (quote) {
      current += character
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = null
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      current += character
      continue
    }
    if (character === '(' || character === '[') depth += 1
    else if (character === ')' || character === ']') depth -= 1
    if (character === ';' && depth === 0) {
      if (current.trim()) statements.push(current.trim())
      current = ''
    } else {
      current += character
    }
  }
  if (current.trim()) statements.push(current.trim())
  return statements
}

const getTokenSourceFailures = content => {
  const source = stripStyleComments(content)
  if (/[{}]/.test(source)) {
    return ['src/styles/_tokens.scss 只能声明 token，禁止输出选择器或规则块']
  }

  const invalidStatement = splitTopLevelStatements(source).find(
    statement =>
      !/^\$[a-z][a-z0-9-]*\s*:/i.test(statement) &&
      !/^@use\s+['"][^'"]+['"](?:\s+as\s+(?:\*|[a-z][a-z0-9_-]*))?$/i.test(
        statement
      )
  )
  return invalidStatement
    ? [
        `src/styles/_tokens.scss 只能声明 token，发现非法语句：${invalidStatement.split(/\r?\n/, 1)[0]}`
      ]
    : []
}

const getTopLevelScssSelectors = content => {
  const source = stripStyleComments(content)
  const selectors = []
  let quote = null
  let escaped = false
  let parentheses = 0
  let brackets = 0
  let braces = 0
  let statementStart = 0

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = null
      continue
    }
    if (character === "'" || character === '"') {
      quote = character
      continue
    }
    if (character === '(') parentheses += 1
    else if (character === ')') parentheses = Math.max(0, parentheses - 1)
    else if (character === '[') brackets += 1
    else if (character === ']') brackets = Math.max(0, brackets - 1)
    else if (character === '{' && parentheses === 0 && brackets === 0) {
      if (braces === 0) {
        const selector = source.slice(statementStart, index).trim()
        if (
          selector &&
          !selector.startsWith('@') &&
          !selector.startsWith('$')
        ) {
          selectors.push(selector)
        }
      }
      braces += 1
    } else if (character === '}' && parentheses === 0 && brackets === 0) {
      braces = Math.max(0, braces - 1)
      if (braces === 0) statementStart = index + 1
    } else if (braces === 0 && character === ';') {
      statementStart = index + 1
    }
  }

  return selectors
}

const getPageIndexOwnershipFailures = (appRoot, scssFiles) => {
  const failures = []
  for (const filePath of scssFiles) {
    const file = relativePath(appRoot, filePath)
    if (
      !file.startsWith('src/pages/') ||
      path.basename(file) !== 'index.scss' ||
      file.includes('/components/')
    ) {
      continue
    }

    const selectors = getTopLevelScssSelectors(
      fs.readFileSync(filePath, 'utf8')
    )
    if (selectors.length > 4) {
      failures.push(
        `${file} 页面 index.scss 顶级规则 ${selectors.length} 个，最多允许 4 个，请拆分页面子组件样式`
      )
    }
    for (const selector of selectors) {
      if (selector.includes('__')) {
        failures.push(
          `${file} 页面 index.scss 顶级选择器禁止 BEM（${selector}），请迁移到页面子组件样式`
        )
      }
    }
  }
  return failures
}

const getPageComponentOwnershipFailures = (appRoot, scriptFiles) => {
  const failures = []
  for (const filePath of scriptFiles) {
    const file = relativePath(appRoot, filePath)
    if (
      !file.startsWith('src/pages/') ||
      !file.includes('/components/') ||
      !/\.(?:tsx|jsx)$/.test(file)
    ) {
      continue
    }

    const source = fs.readFileSync(filePath, 'utf8')
    if (!hasJsxMarkup(source)) continue
    const hasLocalStyle = getScriptStyleSpecifiers(source).some(specifier => {
      const targetFile = resolveStyleSpecifier(appRoot, filePath, specifier)
      return (
        targetFile &&
        path.extname(targetFile) === '.scss' &&
        path.dirname(targetFile) === path.dirname(filePath)
      )
    })
    if (!hasLocalStyle) {
      failures.push(`${file} 含 JSX，但必须静态导入同目录 SCSS`)
    }
  }
  return failures
}

export const collectProjectSnapshot = appRoot => {
  appRoot = path.resolve(appRoot)
  const srcRoot = path.join(appRoot, 'src')
  const allFiles = walk(srcRoot)
  const scssFiles = allFiles.filter(filePath => filePath.endsWith('.scss'))
  const unsupportedStyleFiles = allFiles.filter(filePath =>
    /\.(?:css|sass|less)$/.test(filePath)
  )
  const governedScssFiles = scssFiles.filter(filePath => {
    const file = relativePath(appRoot, filePath)
    return !file.startsWith('src/styles/')
  })
  const systemScssFiles = scssFiles.filter(filePath =>
    relativePath(appRoot, filePath).startsWith('src/styles/')
  )
  const nativeFiles = allFiles.filter(filePath =>
    /\.(?:ts|tsx)$/.test(filePath)
  )
  const interactionFiles = allFiles.filter(filePath =>
    /\.(?:tsx|jsx)$/.test(filePath)
  )
  const scriptFiles = allFiles.filter(filePath =>
    /\.(?:[cm]?js|jsx|ts|tsx)$/.test(filePath)
  )
  const styleEntries = governedScssFiles.map(filePath => [
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

  systemFailures.push(...getPageIndexOwnershipFailures(appRoot, scssFiles))
  systemFailures.push(...getPageComponentOwnershipFailures(appRoot, scriptFiles))

  for (const filePath of scssFiles) {
    const file = relativePath(appRoot, filePath)
    systemFailures.push(
      ...getUnsupportedStyleFailures(fs.readFileSync(filePath, 'utf8'), file)
    )
  }

  for (const filePath of scriptFiles) {
    const file = relativePath(appRoot, filePath)
    const source = fs.readFileSync(filePath, 'utf8')
    if (file.startsWith('src/pages/') && /\belevation\s*:/.test(maskScriptTrivia(source))) {
      systemFailures.push(`${file} 页面原生样式禁止直接使用 elevation`)
    }
    if (file === 'src/shared/native/AppNativePressable.tsx') continue
    for (const usage of scanDirectReactNativePressables(source)) {
      systemFailures.push(
        `${file}:${usage.line} 不能直接使用 RN ${usage.element}，请统一使用 AppPressable/AppButton`
      )
    }
  }

  const pressablePath = path.join(
    srcRoot,
    'shared',
    'native',
    'AppNativePressable.tsx'
  )
  if (fs.existsSync(pressablePath)) {
    systemFailures.push(
      ...getNativePressableContractFailures(
        fs.readFileSync(pressablePath, 'utf8')
      )
    )
  }

  systemFailures.push(
    ...getTokenSourceFailures(
      fs.readFileSync(path.join(srcRoot, 'styles', '_tokens.scss'), 'utf8')
    )
  )

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
  systemFailures.push(...getNativeTouchMinimumFailures(nativeTokenSource))
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

  const nativeClickHandlers = interactionFiles
    .flatMap(filePath => {
      const file = relativePath(appRoot, filePath)
      return scanNativeClickHandlers(fs.readFileSync(filePath, 'utf8')).map(
        handler => ({ file, ...handler })
      )
    })
    .sort((left, right) =>
      `${left.file}:${left.line}:${left.element}:${left.prop}`.localeCompare(
        `${right.file}:${right.line}:${right.element}:${right.prop}`
      )
    )

  return {
    scss: { files: sortedObject(styleEntries) },
    native: { files: sortedObject(nativeEntries) },
    architecture: {
      parentStyleImports: getParentStyleImports(
        appRoot,
        scriptFiles,
        scssFiles
      ),
      legacyGlobalClassFiles,
      nativeClickHandlers
    },
    systemFailures
  }
}

const getLineLimit = (file, limits) =>
  file.startsWith('src/shared/components/') || file.includes('/components/')
    ? limits.componentScssLines
    : limits.pageScssLines

const requiresTokenUsage = file => file !== 'src/app.scss'

const isStrictStyle = (file, metrics, limits) =>
  (!requiresTokenUsage(file) || metrics.usesTokens) &&
  STYLE_DEBT_FIELDS.every(([field]) => metrics[field] === 0) &&
  metrics.lines <= getLineLimit(file, limits)

const itemKey = item =>
  typeof item === 'string'
    ? item
    : item?.importPath !== undefined
      ? `${item.file}:${item.importPath}`
      : item?.line !== undefined
        ? `${item.file}:${item.line}:${item.element}:${item.prop}`
        : JSON.stringify(item)

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
    !Array.isArray(baseline.architecture?.legacyGlobalClassFiles) ||
    (baseline.architecture?.nativeClickHandlers !== undefined &&
      !Array.isArray(baseline.architecture.nativeClickHandlers))
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
  compareLists(
    current.architecture.nativeClickHandlers ?? [],
    baseline.architecture.nativeClickHandlers ?? [],
    'Taro 原生点击控件',
    failures
  )
}

const compareStrictSnapshot = (current, baseline, failures) => {
  for (const [file, metrics] of Object.entries(current.scss.files)) {
    if (requiresTokenUsage(file) && !metrics.usesTokens) {
      failures.push(`${file} 必须引入 styles token`)
    }
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
  for (const handler of current.architecture.nativeClickHandlers ?? []) {
    const detail =
      handler.prop === 'spread'
        ? '使用了可能隐藏点击事件的 JSX spread props'
        : `不能直接绑定 ${handler.prop}`
    failures.push(
      `${handler.file}:${handler.line} 的 Taro 原生 ${handler.element} ${detail}，请使用 AppPressable/AppButton`
    )
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
    if (metrics.lines > previousMetrics.lines) {
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
  const previousNativeClickHandlers = new Set(
    (previous.architecture.nativeClickHandlers ?? []).map(itemKey)
  )
  for (const handler of current.architecture.nativeClickHandlers ?? []) {
    if (!previousNativeClickHandlers.has(itemKey(handler))) {
      failures.push(`基线新增 Taro 原生点击控件：${itemKey(handler)}`)
    }
  }

  return { ok: failures.length === 0, failures, migratedFromV1: false }
}

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
    if (metrics.lines > previous.lines) {
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
  const previousNativeClickHandlers = new Set(
    (previousBaseline.architecture.nativeClickHandlers ?? []).map(itemKey)
  )
  for (const handler of current.architecture.nativeClickHandlers ?? []) {
    if (!previousNativeClickHandlers.has(itemKey(handler))) {
      failures.push(`新增 Taro 原生点击控件：${itemKey(handler)}`)
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
        legacyGlobalClassFiles: [...current.architecture.legacyGlobalClassFiles],
        nativeClickHandlers: [...(current.architecture.nativeClickHandlers ?? [])]
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
    legacyGlobalClassFiles: [...current.architecture.legacyGlobalClassFiles],
    nativeClickHandlers: [...(current.architecture.nativeClickHandlers ?? [])]
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
    legacyGlobalClassFiles: snapshot.architecture.legacyGlobalClassFiles.length,
    nativeClickHandlers: (snapshot.architecture.nativeClickHandlers ?? []).length
  }
}
