const normalizeFilename = filename => filename.replace(/\\/g, '/')

const matchesTargetFile = (filename, targets) => targets.some(target => filename.includes(target))

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: '指定文件必须从给定模块引入依赖，用于锁定 facade 的唯一来源。'
    },
    schema: [
      {
        type: 'object',
        properties: {
          files: { type: 'array', items: { type: 'string' } },
          source: { type: 'string' }
        },
        required: ['files', 'source'],
        additionalProperties: false
      }
    ],
    messages: {
      missingImport: '该文件必须从 {{source}} 引入依赖。'
    }
  },

  create(context) {
    const filename = normalizeFilename(context.getFilename())
    const options = context.options[0]

    if (!options || !matchesTargetFile(filename, options.files)) {
      return {}
    }

    let found = false

    return {
      ImportDeclaration(node) {
        if (node.source?.value === options.source) {
          found = true
        }
      },
      'Program:exit'(node) {
        if (!found) {
          context.report({ node, messageId: 'missingImport', data: { source: options.source } })
        }
      }
    }
  }
}
