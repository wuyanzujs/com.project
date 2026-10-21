const SERVICE_API_PATTERN = /(?:^|\/)services\/[^'"]*\.api$/

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: '页面与 shared 层不能绕过 service facade 直接 import 领域 API。'
    },
    schema: [],
    messages: {
      forbidden: '页面和 shared 层不能绕过 service facade 直接调用领域 API，请从对应 service 的 index 引入。'
    }
  },

  create(context) {
    const filename = context.getFilename().replace(/\\/g, '/')

    if (filename.includes('/src/services/')) {
      return {}
    }

    return {
      ImportDeclaration(node) {
        const source = node.source?.value

        if (typeof source === 'string' && SERVICE_API_PATTERN.test(source)) {
          context.report({ node, messageId: 'forbidden' })
        }
      }
    }
  }
}
