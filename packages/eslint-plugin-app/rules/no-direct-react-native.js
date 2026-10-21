const NATIVE_SOURCE = 'react-native'

const isNativeSource = value => value === NATIVE_SOURCE || value.startsWith(`${NATIVE_SOURCE}/`)

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止业务代码直接依赖 react-native，统一走 shared/native 或 shared/platform facade。'
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: { type: 'array', items: { type: 'string' } }
        },
        additionalProperties: false
      }
    ],
    messages: {
      forbidden: '业务代码不能直接依赖 react-native，请通过 shared/platform 或 shared/native facade。'
    }
  },

  create(context) {
    const filename = context.getFilename().replace(/\\/g, '/')
    const allow = context.options[0]?.allow ?? []

    if (allow.some(fragment => filename.includes(fragment))) {
      return {}
    }

    const report = node => {
      const source = node.source?.value ?? node.arguments?.[0]?.value

      if (typeof source === 'string' && isNativeSource(source)) {
        context.report({ node, messageId: 'forbidden' })
      }
    }

    return {
      ImportDeclaration: report,
      ExportNamedDeclaration: report,
      ExportAllDeclaration: report,
      ImportExpression: report,
      CallExpression: node => {
        if (node.callee?.name === 'require') {
          report(node)
        }
      }
    }
  }
}
