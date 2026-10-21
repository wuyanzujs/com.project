require('../support/register.cjs')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const { runInNewContext } = require('node:vm')

const ts = require('typescript')

const { getOrderDetailRole } = require('@/pages/order/detail/orderDetailViewModel')
const { APP_ROUTES } = require('@/shared/navigation/routes')
const { createAppRouteUrl, parseRouteQuery } = require('@/shared/navigation/routeUrl')

const { createDeferred } = require('../support/deferred.cjs')

// 执行真实页面的点击处理和 JSX；仅替换 hooks 与平台组件，不加载原生运行时。
function createPage(t, item, markMessageRead) {
  const hooks = []
  let hookIndex = 0
  const navigate = t.mock.fn()
  const showToast = t.mock.fn()
  const useState = initial => {
    const index = hookIndex++
    if (!(index in hooks)) hooks[index] = index === 0 ? [item] : initial
    return [
      hooks[index],
      value => {
        hooks[index] = typeof value === 'function' ? value(hooks[index]) : value
      }
    ]
  }
  const useRef = initial => {
    const index = hookIndex++
    if (!(index in hooks)) hooks[index] = { current: initial }
    return hooks[index]
  }
  const imports = {
    '@tarojs/components': { ScrollView: 'ScrollView', Text: 'Text', View: 'View' },
    '@tarojs/taro': { showToast, useDidShow() {}, useRouter: () => ({ params: { groupKey: 'SYSTEM' } }) },
    react: { useState, useRef, useCallback: callback => callback },
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@/services/message': { messageService: { markMessageRead } },
    '@/shared/components': { AppPressable: 'AppPressable', AppEmptyState: 'AppEmptyState' },
    '@/shared/native': { AppVirtualList: 'AppVirtualList' },
    '@/shared/navigation/appNavigation': { navigateToAppRoute: navigate },
    '@/shared/navigation/authGuard': { ensureAuthenticated: () => true },
    '@/shared/navigation/routes': { APP_ROUTES },
    '@/shared/navigation/routeUrl': { createAppRouteUrl },
    './index.scss': {},
    './content.scss': {}
  }
  const fileName = path.resolve(__dirname, '../../../src/pages/message/list/index.tsx')
  const { outputText } = ts.transpileModule(readFileSync(fileName, 'utf8'), {
    fileName,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  })
  const exports = {}
  runInNewContext(outputText, {
    exports,
    require(specifier) {
      assert.ok(Object.hasOwn(imports, specifier), `Unexpected page dependency: ${specifier}`)
      return imports[specifier]
    }
  })

  function render() {
    hookIndex = 0
    return expandVirtualList(exports.default())
  }

  function find(className, element) {
    if (!element || typeof element !== 'object') return undefined
    if (element.props?.className === className) return element
    return [element.props?.children]
      .flat(Infinity)
      .map(child => find(className, child))
      .find(Boolean)
  }

  return {
    navigate,
    showToast,
    hasUnreadDot: () => Boolean(find('message-item-card__dot', render())),
    press: () => find('message-item-card__body', render()).props.onPress()
  }
}

function expandVirtualList(element) {
  if (Array.isArray(element)) return element.map(expandVirtualList)
  if (!element || typeof element !== 'object') return element
  if (element.type === 'AppVirtualList') {
    const { empty, footer, header, items = [], renderItem } = element.props
    return {
      type: 'AppVirtualList',
      props: { children: [header, items.map((item, index) => renderItem(item, index)), items.length ? null : empty, footer] }
    }
  }
  if (!element.props) return element
  return { ...element, props: { ...element.props, children: expandVirtualList(element.props.children) } }
}

const flushActions = () => new Promise(resolve => setImmediate(resolve))
const unreadItem = { id: 'message-1', isRead: false, title: '消息', content: '', time: '', waybillNumber: '' }

test('failed read marking keeps the unread dot and permits a successful retry', async t => {
  const pending = createDeferred()
  const markRead = t.mock.fn(() => pending.promise)
  const page = createPage(t, unreadItem, markRead)

  page.press()
  page.press()
  assert.equal(markRead.mock.callCount(), 1)
  assert.equal(page.hasUnreadDot(), true)

  pending.resolve({ status: false, message: '请重试' })
  await flushActions()
  assert.equal(page.hasUnreadDot(), true)
  assert.equal(page.showToast.mock.calls[0].arguments[0].title, '请重试')

  markRead.mock.mockImplementation(async () => ({ status: true }))
  page.press()
  await flushActions()
  assert.equal(markRead.mock.callCount(), 2)
  assert.equal(page.hasUnreadDot(), false)
})

test('rejected read requests keep the message retryable and show a failure hint', async t => {
  const markRead = t.mock.fn(async () => {
    throw new Error('offline')
  })
  const page = createPage(t, unreadItem, markRead)

  page.press()
  await flushActions()
  assert.equal(page.hasUnreadDot(), true)
  assert.equal(page.showToast.mock.callCount(), 1)

  page.press()
  await flushActions()
  assert.equal(markRead.mock.callCount(), 2)
})

test('message order navigation lets receiver details infer the correct role even if marking fails', async t => {
  const page = createPage(t, { ...unreadItem, waybillNumber: 'WB123' }, async () => ({ status: false }))

  page.press()
  await flushActions()
  assert.equal(page.navigate.mock.callCount(), 1)
  const [url, options] = page.navigate.mock.calls[0].arguments
  assert.equal(url.split('?')[0], APP_ROUTES.orderDetail)
  const params = parseRouteQuery(url.split('?')[1])
  assert.equal(params.waybillNumber, 'WB123')
  assert.equal(params.view, 'secure')
  assert.equal(options.login, true)
  assert.equal(getOrderDetailRole({ isReceiver: 'Y', isSender: 'N' }, params.role || ''), 'receive')
})
