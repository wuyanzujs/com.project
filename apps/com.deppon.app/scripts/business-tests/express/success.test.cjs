require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { depponHttp } = require('@/request/deppon')
const { expressDraftBridge } = require('@/services/express/draft/draftBridge')
const { expressSuccessApi } = require('@/services/express/success/success.api')
const { queryExpressSuccessCourier } = require('@/services/express/success/success.service')

const { createReactHarness, findElement, loadReactModule } = require('../support/react-harness.cjs')

test('success courier request uses the post-order dispatch contract and short nonblocking timeout', async t => {
  const calls = []
  t.mock.method(depponHttp, 'post', async (...args) => {
    calls.push(args)
    return { status: true, result: null }
  })

  await expressSuccessApi.queryCourier({ orderNumber: 'DP123' })

  assert.deepEqual(calls, [
    ['/gwapi/orderService/eco/order/secure/preAllocationCourier', { orderNumber: 'DP123' }, { loading: false, login: false, timeout: 3000 }]
  ])
})

test('success courier query requires an order number and never substitutes a waybill', async t => {
  let calls = 0
  t.mock.method(expressSuccessApi, 'queryCourier', async () => {
    calls += 1
    throw new Error('must not call without an order number')
  })

  assert.deepEqual(await queryExpressSuccessCourier('  '), { status: 'unavailable' })
  assert.equal(calls, 0)
})

test('success courier query displays only a complete contact and normalizes text', async t => {
  t.mock.method(expressSuccessApi, 'queryCourier', async request => {
    assert.deepEqual(request, { orderNumber: 'DP123' })
    return {
      status: true,
      result: { courierCode: ' 001 ', courierName: ' 张师傅 ', courierPhone: ' 13800138000 ' }
    }
  })

  assert.deepEqual(await queryExpressSuccessCourier(' DP123 '), {
    status: 'assigned',
    courier: { code: '001', name: '张师傅', phone: '13800138000' }
  })
})

test('missing or partial courier contact remains pending without a fabricated assignment', async t => {
  const results = [null, {}, { courierName: '张师傅' }, { courierPhone: '13800138000' }, { courierName: ' ', courierPhone: '13800138000' }]
  t.mock.method(expressSuccessApi, 'queryCourier', async () => ({ status: true, result: results.shift() }))

  for (let index = 0; index < 5; index += 1) {
    assert.deepEqual(await queryExpressSuccessCourier('DP123'), { status: 'pending' })
  }
})

test('dispatch failures are recoverable independently of the successful order', async t => {
  let attempt = 0
  t.mock.method(expressSuccessApi, 'queryCourier', async () => {
    attempt += 1
    if (attempt === 1) return { status: false, message: '调度服务暂不可用' }
    if (attempt === 2) throw new Error('timeout')
    return { status: true, result: { courierName: '张师傅', courierPhone: '13800138000' } }
  })

  assert.deepEqual(await queryExpressSuccessCourier('DP123'), { status: 'unavailable' })
  assert.deepEqual(await queryExpressSuccessCourier('DP123'), { status: 'unavailable' })
  assert.deepEqual(await queryExpressSuccessCourier('DP123'), {
    status: 'assigned',
    courier: { code: '', name: '张师傅', phone: '13800138000' }
  })
})

test('continue sending carries a fresh one-time draft without a previous order or quote', () => {
  expressDraftBridge.carryFreshSend()
  const payload = expressDraftBridge.consume()

  assert.equal(payload.source, 'FRESH_SEND')
  assert.deepEqual(payload.quotes, [])
  assert.equal(payload.draft.selectedProduct, null)
  assert.equal(payload.draft.sender, null)
  assert.equal(payload.draft.consignee, null)
  assert.equal(payload.draft.agreementAccepted, false)
  assert.equal(expressDraftBridge.consume(), null)
})

function loadSuccessPage(t) {
  const harness = createReactHarness()
  const navigate = t.mock.fn()
  const useLoadCallbacks = []
  const page = loadReactModule('pages/express/success/index.tsx', {
    react: harness.react,
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/components': { Text: 'Text', View: 'View' },
    '@tarojs/taro': {
      useLoad: callback => useLoadCallbacks.push(callback),
      useRouter: () => ({ params: { orderNumber: 'DP123', waybillNumber: 'WB456' } })
    },
    '@/services/express/draft/draftBridge': { expressDraftBridge },
    '@/services/order': {
      getOrderIdentityText: value => value.waybillNumber || value.orderNumber || '--',
      orderService: { queryDetail: async () => ({ status: false, message: '' }) }
    },
    '@/shared/components': { AppPressable: 'AppPressable' },
    '@/shared/navigation/appNavigation': { navigateToAppRoute: navigate },
    '@/shared/navigation/routes': {
      APP_ROUTES: { express: '/pages/express/index', orderDetail: '/pages/order/detail/index', orderList: '/pages/order/list/index' }
    },
    '@/shared/navigation/routeUrl': { createAppRouteUrl: () => '/pages/order/detail/index?orderNumber=DP123' },
    './CourierCard': { CourierCard: () => null },
    './index.scss': {},
    './content.scss': {}
  }).default

  return { harness, navigate, page, useLoadCallbacks }
}

function pageText(node) {
  if (node === null || node === undefined) return ''
  if (typeof node !== 'object') return String(node)
  const children = node.props?.children
  return Array.isArray(children) ? children.map(pageText).join('') : pageText(children)
}

test('success page uses the expected copy instead of invented labels', t => {
  const { harness, page } = loadSuccessPage(t)
  const view = harness.render(() => page())
  harness.unmount()

  const text = pageText(view)
  assert.ok(text.includes('下单成功'))
  assert.ok(text.includes('寄件信息'))
  assert.ok(text.includes('订单号'))
  assert.ok(text.includes('运单号'))
  assert.ok(text.includes('继续寄件'))
  assert.ok(text.includes('查看订单'))
  assert.ok(text.includes('秒后自动返回首页'))

  for (const removed of ['预约成功', '结果信息', '当前状态', '进入订单列表', '查看详情']) {
    assert.ok(!text.includes(removed), `page has no ${removed}`)
  }
})

test('success page primary action opens the order detail', async t => {
  const { harness, navigate, page } = loadSuccessPage(t)
  const view = harness.render(() => page())
  harness.unmount()

  await findElement(view, element => element.props?.className === 'express-success-primary').props.onPress()

  assert.equal(navigate.mock.callCount(), 1)
  assert.equal(navigate.mock.calls[0].arguments[0], '/pages/order/detail/index?orderNumber=DP123')
})

test('success page secondary action starts a fresh send', async t => {
  expressDraftBridge.consume()
  const { harness, navigate, page } = loadSuccessPage(t)
  const view = harness.render(() => page())
  harness.unmount()

  await findElement(view, element => element.props?.className === 'express-success-secondary').props.onPress()

  assert.equal(navigate.mock.calls[0].arguments[0], '/pages/express/index')
  assert.equal(expressDraftBridge.consume().source, 'FRESH_SEND')
})
