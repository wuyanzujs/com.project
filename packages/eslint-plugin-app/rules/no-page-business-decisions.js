const normalizeFilename = filename => filename.replace(/\\/g, '/')

// 只识别「决策型」命名：canXxx / shouldXxx / isXxx。
const DECISION_NAME = /^(?:can|should|is)[A-Z]/

const COMPARISON_OPERATORS = new Set(['===', '!==', '==', '!=', '<', '<=', '>', '>='])

const TRANSPARENT_CALLS = new Set(['Number', 'Boolean', 'String'])

const IGNORED_IDENTIFIERS = new Set(['true', 'false', 'null', 'undefined'])

function isMathCall(node) {
  return (
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'Math'
  )
}

function isTransparentCall(node) {
  return (node.callee.type === 'Identifier' && TRANSPARENT_CALLS.has(node.callee.name)) || isMathCall(node)
}

function isDecisionCall(node) {
  return node.callee.type === 'Identifier' && DECISION_NAME.test(node.callee.name)
}

/**
 * 判断函数体是否为「单表达式返回」。
 * 带 if / 多语句的函数直接按复杂决策处理。
 */
function getReturnExpression(functionNode) {
  const { body } = functionNode

  if (body.type !== 'BlockStatement') {
    return body
  }

  const statements = body.body.filter(statement => statement.type !== 'EmptyStatement')

  if (statements.length === 1 && statements[0].type === 'ReturnStatement') {
    return statements[0].argument
  }

  return null
}

/**
 * 统计决策表达式里读取的输入（标识符 / 成员访问 / 调用参数），
 * 并识别对其它决策函数的转发。
 */
function analyzeDecision(expression, sourceCode) {
  const inputs = new Set()
  const calls = new Set()

  const addSubject = subject => {
    let current = subject

    while (
      current &&
      (current.type === 'TSAsExpression' ||
        current.type === 'TSNonNullExpression' ||
        current.type === 'ChainExpression' ||
        current.type === 'ParenthesizedExpression')
    ) {
      current = current.expression
    }

    if (!current || current.type === 'Literal') {
      return
    }

    if (current.type === 'UnaryExpression') {
      addSubject(current.argument)
      return
    }

    if (current.type === 'CallExpression') {
      if (isTransparentCall(current)) {
        current.arguments.forEach(addSubject)
        return
      }

      inputs.add(sourceCode.getText(current))
      return
    }

    if (current.type === 'Identifier') {
      if (!IGNORED_IDENTIFIERS.has(current.name)) {
        inputs.add(current.name)
      }
      return
    }

    inputs.add(sourceCode.getText(current))
  }

  const walk = node => {
    if (!node) {
      return
    }

    switch (node.type) {
      case 'LogicalExpression':
        walk(node.left)
        walk(node.right)
        break
      case 'UnaryExpression':
        walk(node.argument)
        break
      case 'ConditionalExpression':
        walk(node.test)
        walk(node.consequent)
        walk(node.alternate)
        break
      case 'BinaryExpression':
        if (COMPARISON_OPERATORS.has(node.operator)) {
          addSubject(node.left)
          addSubject(node.right)
        } else {
          walk(node.left)
          walk(node.right)
        }
        break
      case 'CallExpression':
        if (isDecisionCall(node)) {
          calls.add(node.callee.name)
          break
        }
        if (isTransparentCall(node)) {
          node.arguments.forEach(walk)
          break
        }
        node.arguments.forEach(walk)
        break
      case 'Identifier':
      case 'MemberExpression':
        addSubject(node)
        break
      default:
        addSubject(node)
        break
    }
  }

  walk(expression)

  return { calls, inputs }
}

function getDeclaredDecision(node) {
  if (node.type === 'FunctionDeclaration' && node.id) {
    return { expression: getReturnExpression(node), name: node.id.name }
  }

  if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init) {
    if (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression') {
      return { expression: getReturnExpression(node.init), name: node.id.name }
    }

    // 纯布尔派生（如 const canUse = status === 'USABLE'）也算声明决策，
    // 但只分析可能是布尔表达式的初始化器，避免误伤普通数据常量。
    if (
      node.init.type === 'LogicalExpression' ||
      node.init.type === 'BinaryExpression' ||
      node.init.type === 'UnaryExpression' ||
      node.init.type === 'ConditionalExpression' ||
      node.init.type === 'CallExpression'
    ) {
      return { expression: node.init, name: node.id.name }
    }
  }

  return null
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: '页面目录不新声明依赖后端字段或状态机的决策函数，业务规则应放 services 规则层。'
    },
    schema: [
      {
        type: 'object',
        properties: {
          files: { type: 'array', items: { type: 'string' } },
          allow: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                file: { type: 'string' },
                name: { type: 'string' },
                reason: { type: 'string' }
              },
              required: ['file', 'name'],
              additionalProperties: false
            }
          }
        },
        required: ['files'],
        additionalProperties: false
      }
    ],
    messages: {
      moveToService:
        '页面里声明的决策函数「{{name}}」依赖了多项输入，业务规则请放 services/<domain>/*.rules.ts（如 services/order/core/order.actionRules.ts）；纯 UI 派生的布尔请登记到 app/no-page-business-decisions 的 allow 列表并写明原因。'
    }
  },

  create(context) {
    const filename = normalizeFilename(context.getFilename())
    const options = context.options[0]

    if (!options || !options.files.some(target => filename.includes(target))) {
      return {}
    }

    const allow = options.allow ?? []
    const sourceCode = context.getSourceCode()
    const declarations = []

    const check = node => {
      const declared = getDeclaredDecision(node)

      if (!declared || !DECISION_NAME.test(declared.name)) {
        return
      }

      const allowed = allow.some(entry => filename.endsWith(entry.file) && entry.name === declared.name)

      // 带分支/多语句的决策函数天然属于规则层，直接登记待报。
      if (declared.expression === null) {
        declarations.push({ allowed, inputs: null, name: declared.name, node, calls: new Set() })
        return
      }

      const { calls, inputs } = analyzeDecision(declared.expression, sourceCode)

      declarations.push({ allowed, calls, inputs, name: declared.name, node })
    }

    return {
      FunctionDeclaration: check,
      VariableDeclarator: check,
      'Program:exit'() {
        const localDecisionNames = new Set(declarations.map(declaration => declaration.name))

        declarations.forEach(declaration => {
          if (declaration.allowed) {
            return
          }

          // 只把「转发到本文件内另一个决策函数」视为回流；
          // 调用 services/shared 里已归位的谓词（如 isValidCoordinate）是合法用法。
          const forwardsToLocalRule = [...declaration.calls].some(name => localDecisionNames.has(name))

          if (declaration.inputs === null || declaration.inputs.size >= 2 || forwardsToLocalRule) {
            context.report({ node: declaration.node, messageId: 'moveToService', data: { name: declaration.name } })
          }
        })
      }
    }
  }
}
