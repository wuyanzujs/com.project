require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { configureRequest } = require('@/request')
const { getEcoToken } = require('@/request/cookieJar')
const { authService } = require('@/services/auth/auth.service')
const { clearAppSession, getCurrentUser } = require('@/services/auth/session')
const { expressService } = require('@/services/express/core/express.service')
const { expressDraftStorage } = require('@/services/express/draft/draftStorage')
const { applyExpressInsuranceCapability, createExpressInsuranceCapability } = require('@/services/express/insurance/insurance.rules')
const { orderService } = require('@/services/order/core/order.service')

const { createValidExpressDraft } = require('../fixtures/express.cjs')
const { createStorageFixture } = require('../support/storage-fixture.cjs')

function createFlow(t, interceptAllowed = true) {
  const { disk, Taro } = createStorageFixture(t)
  configureRequest({ baseURL: 'https://owstest.deppon.com' })
  t.after(clearAppSession)
  const calls = []
  const responses = new Map([
    ['/gwapi/userService/eco/user/login', { mobile: '13800138000' }],
    ['/gwapi/orderService/eco/order/queryGoodsRemark', []],
    ['/gwapi/orderService/eco/order/sieveOrder/tips', { type: 0, reason: '' }],
    [
      '/gwapi/orderService/eco/order/secure/queryIsCanCreateOrder',
      {
        orderFlag: interceptAllowed ? 'Y' : 'N'
      }
    ],
    [
      '/gwapi/orderService/eco/order/mysql/createOrder',
      {
        orderNumbers: ['ORDER_FLOW'],
        waybillNumbers: ['DPK123456789']
      }
    ],
    [
      '/gwapi/orderService/eco/order/secure/orderList',
      {
        queryOrderList: [{ orderNumber: 'ORDER_FLOW', orderClassification: 0 }],
        pageNum: 1,
        totalRows: 1,
        totalPage: 1
      }
    ],
    ['/gwapi/userService/eco/user/secure/logout', null]
  ])
  t.mock.method(Taro, 'request', async request => {
    const pathname = new URL(request.url).pathname
    assert.equal(responses.has(pathname), true, 'Unexpected endpoint: ' + pathname)
    calls.push({ pathname, request })
    return {
      statusCode: 200,
      header: pathname.endsWith('/login') ? { 'set-cookie': 'ECO_TOKEN=flow-token; Path=/; HttpOnly' } : {},
      data: { status: true, result: responses.get(pathname) }
    }
  })
  return { calls, disk }
}

function createPreparedDraft() {
  const draft = createValidExpressDraft()
  return applyExpressInsuranceCapability(draft, createExpressInsuranceCapability(draft, []), 750000)
}

test('login, persist draft, submit, query orders and logout share a consistent session', async t => {
  const { calls, disk } = createFlow(t)
  const login = await authService.loginWithSms('13800138000', '123456')
  assert.equal(login.status, true)
  assert.equal(getCurrentUser().mobile, '13800138000')
  assert.equal(getEcoToken(), 'flow-token')

  const draft = createPreparedDraft()
  assert.equal(await expressDraftStorage.save(draft), true)
  const submitted = await expressService.submitDraft(expressDraftStorage.restore())
  assert.equal(submitted.status, true, submitted.message)
  assert.deepEqual(submitted.result.orderNumbers, ['ORDER_FLOW'])
  assert.equal(await expressDraftStorage.clear(), true)
  assert.equal(expressDraftStorage.restore(), null)

  const orders = await orderService.queryList({ role: 'sender' })
  assert.equal(orders.status, true)
  assert.equal(orders.result.totalRows, 1)
  assert.equal(orders.result.list[0].orderNumber, 'ORDER_FLOW')
  const created = calls.filter(item => item.pathname.endsWith('/createOrder'))
  assert.equal(created.length, 1)
  assert.equal(created[0].request.header.Cookie, 'ECO_TOKEN=flow-token;')

  await authService.logout()
  assert.equal(getEcoToken(), '')
  assert.equal(getCurrentUser(), null)
  assert.equal(disk.size, 0)
})

test('a rejected submission preserves the committed draft and never creates an order', async t => {
  const { calls } = createFlow(t, false)
  assert.equal((await authService.loginWithSms('13800138000', '123456')).status, true)
  const draft = createPreparedDraft()
  await expressDraftStorage.save(draft)
  const response = await expressService.submitDraft(expressDraftStorage.restore())

  assert.equal(response.status, false)
  assert.equal(
    calls.some(item => item.pathname.endsWith('/createOrder')),
    false
  )
  assert.equal(expressDraftStorage.restore().sender.mobile, draft.sender.mobile)
  assert.equal(getEcoToken(), 'flow-token')
})
