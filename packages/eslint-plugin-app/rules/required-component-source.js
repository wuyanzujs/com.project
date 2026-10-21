const normalizeFilename = filename => filename.replace(/\\/g, '/')

const matchesTargetFile = (filename, targets) => targets.some(target => filename.includes(target))

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: '指定文件必须渲染来自给定模块的组件，避免绕开共享 facade。'
    },
    schema: [
      {
        type: 'object',
        properties: {
          files: { type: 'array', items: { type: 'string' } },
          name: { type: 'string' },
          source: { type: 'string' }
        },
        required: ['files', 'name', 'source'],
        additionalProperties: false
      }
    ],
    messages: {
      missingUsage: '该文件必须渲染 {{name}} 组件。',
      wrongSource: '{{name}} 必须从 {{source}} 引入。'
    }
  },

  create(context) {
    const filename = normalizeFilename(context.getFilename())
    const options = context.options[0]

    if (!options || !matchesTargetFile(filename, options.files)) {
      return {}
    }

    const importSources = new Map()
    let rendered = false

    return {
      ImportDeclaration(node) {
        if (typeof node.source?.value !== 'string') {
          return
        }

        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportSpecifier' && specifier.imported?.name === options.name) {
            importSources.set(specifier.local.name, node.source.value)
          }
        }
      },
      JSXOpeningElement(node) {
        if (node.name?.type !== 'JSXIdentifier' || node.name.name !== options.name) {
          return
        }

        rendered = true
        const source = importSources.get(options.name)

        if (source !== options.source) {
          context.report({ node, messageId: 'wrongSource', data: { name: options.name, source: options.source } })
        }
      },
      'Program:exit'(node) {
        if (!rendered) {
          context.report({ node, messageId: 'missingUsage', data: { name: options.name } })
        }
      }
    }
  }
}
