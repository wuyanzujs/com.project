const FORBIDDEN_TARO_APIS = new Set([
  'authorize',
  'canvasToTempFilePath',
  'checkSession',
  'chooseAddress',
  'chooseImage',
  'chooseInvoiceTitle',
  'chooseLocation',
  'chooseMedia',
  'chooseVideo',
  'createCanvasContext',
  'createSelectorQuery',
  'downloadFile',
  'getFileSystemManager',
  'getLocation',
  'getMenuButtonBoundingClientRect',
  'getSetting',
  'getSystemInfoSync',
  'getUserProfile',
  'hideShareMenu',
  'login',
  'makePhoneCall',
  'navigateToMiniProgram',
  'offUserCaptureScreen',
  'onUserCaptureScreen',
  'openDocument',
  'openLocation',
  'openSetting',
  'pageScrollTo',
  'previewImage',
  'removeTabBarBadge',
  'requestPayment',
  'requestSubscribeMessage',
  'saveImageToPhotosAlbum',
  'scanCode',
  'setClipboardData',
  'getClipboardData',
  'setTabBarBadge',
  'showShareMenu',
  'uploadFile'
])

const MINI_PROGRAM_OBJECTS = new Set(['wx', 'my'])

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止直调 Taro 平台 API / wx.* / my.*，统一走 shared/platform facade。'
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
      taroApi: 'Taro.{{api}} 属于平台能力，请通过 shared/platform 对应 facade 调用。',
      miniProgram: 'RN App 不能调用小程序 API {{api}}，请通过 shared/platform facade 重新建模。'
    }
  },

  create(context) {
    const filename = context.getFilename().replace(/\\/g, '/')
    const allow = context.options[0]?.allow ?? []

    if (allow.some(fragment => filename.includes(fragment))) {
      return {}
    }

    return {
      MemberExpression(node) {
        if (node.object?.type !== 'Identifier' || node.property?.type !== 'Identifier') {
          return
        }

        const objectName = node.object.name
        const api = node.property.name

        if (MINI_PROGRAM_OBJECTS.has(objectName)) {
          context.report({ node, messageId: 'miniProgram', data: { api: `${objectName}.${api}` } })
          return
        }

        if (objectName === 'Taro' && FORBIDDEN_TARO_APIS.has(api)) {
          context.report({ node, messageId: 'taroApi', data: { api } })
        }
      }
    }
  }
}
