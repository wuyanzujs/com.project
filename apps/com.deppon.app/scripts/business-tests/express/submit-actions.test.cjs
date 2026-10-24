require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { validateExpressDraft } = require('@/services/express/core/express.draft')
const { createExpressQuoteRequestKey } = require('@/services/express/core/requestKey')

const { createValidExpressDraft } = require('../fixtures/express.cjs')
const { createDeferred } = require('../support/deferred.cjs')
const { createReactHarness, loadReactModule, findElement } = require('../support/react-harness.cjs')

function createSubmit(t, options = {}) {
  const harness = createReactHarness()
  const draft = createValidExpressDraft()
  const clear = t.mock.fn(async () => true)
  const fresh = t.mock.fn()
  const submitDraft = t.mock.fn(options.submit || (async () => ({ status: true, result: { orderNumbers: ['ORDER_ONE'] } })))
  const stageSignInfo = t.mock.fn(
    options.stageSign ||
      (async () => ({
        status: true,
        result: { stagingId: 'STAGE_ONE', uri: '/depponmobile/signStatement?queryId=STAGE_ONE' }
      }))
  )
  const saveOrderPriceLog = t.mock.fn(async () => ({ status: true }))
  const prepare = t.mock.fn(async () => ({ draft, proceed: true }))
  const preserve = t.mock.fn(options.preserve || (async () => true))
  const navigate = t.mock.fn()
  const login = t.mock.fn()
  const toast = t.mock.fn()
  const showModal = t.mock.fn(async () => ({ confirm: true }))
  const { useExpressSubmit } = loadReactModule('pages/express/hooks/useExpressSubmit.ts', {
    react: harness.react,
    '@tarojs/taro': { showToast: toast, showModal },
    '@/services/express': {
      validateExpressDraft,
      isExpressSignResponseCode: code => String(code || '').startsWith('1|'),
      expressDraftBridge: { carryFreshSend: fresh },
      expressDraftStorage: { clear, preserveForLogin: preserve },
      expressService: { submitDraft, stageSignInfo, saveOrderPriceLog }
    },
    '@/shared/navigation/appNavigation': { navigateToAppRoute: navigate },
    '@/shared/navigation/authGuard': { hasValidSession: () => options.authenticated !== false, ensureAuthenticated: login },
    '@/shared/navigation/routes': { APP_ROUTES: { express: '/express', expressSuccess: '/success' } },
    '@/shared/navigation/routeUrl': { createAppRouteUrl: route => route },
    '@/shared/webview/appWeb': {
      createAppWebUrl: ({ source, uri }) => `/web?source=${source}&uri=${encodeURIComponent(uri)}`
    }
  })
  return {
    fresh,
    render: () => harness.render(() => useExpressSubmit({ draft, warehouseController: { prepareForSubmit: prepare } })),
    submitDraft,
    stageSignInfo,
    saveOrderPriceLog,
    prepare,
    clear,
    preserve,
    navigate,
    login,
    toast,
    showModal
  }
}

test('rapid repeated taps issue a single submission and clear the draft only after success', async t => {
  const pending = createDeferred()
  const page = createSubmit(t, { submit: () => pending.promise })
  const { handleSubmit } = page.render()
  const first = handleSubmit()
  const second = handleSubmit()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(page.prepare.mock.callCount(), 1)
  assert.equal(page.submitDraft.mock.callCount(), 1)
  assert.equal(page.clear.mock.callCount(), 0)
  pending.resolve({ status: true, result: { orderNumbers: ['ORDER_ONE'] } })
  await Promise.all([first, second])
  assert.equal(page.clear.mock.callCount(), 1)
  assert.equal(page.navigate.mock.callCount(), 1)
  assert.equal(page.fresh.mock.callCount(), 1)
  await handleSubmit()
  assert.equal(page.submitDraft.mock.callCount(), 1)
})

test('a thrown submit keeps the draft, releases loading, and tells the user to verify the order first', async t => {
  const page = createSubmit(t, {
    submit: async () => {
      throw new Error('connection lost')
    }
  })
  await page.render().handleSubmit()
  assert.equal(page.clear.mock.callCount(), 0)
  assert.equal(page.navigate.mock.callCount(), 0)
  assert.equal(page.render().submiting, false)
  assert.match(page.render().submitMessage, /订单列表核实/)
})

test('a successful order records the price log without blocking the success page', async t => {
  const page = createSubmit(t)
  await page.render().handleSubmit()
  assert.equal(page.saveOrderPriceLog.mock.callCount(), 1)
  assert.equal(page.saveOrderPriceLog.mock.calls[0].arguments[1], 'ORDER_ONE')
  assert.equal(page.navigate.mock.callCount(), 1)
})

test('a signature interception stages the statement and opens the signing page instead of failing', async t => {
  const page = createSubmit(t, {
    submit: async () => ({ status: false, message: '需先签署协议', code: '1|家电|AGREEMENT_001' })
  })
  await page.render().handleSubmit()

  assert.equal(page.stageSignInfo.mock.callCount(), 1)
  assert.equal(page.stageSignInfo.mock.calls[0].arguments[1], '1|家电|AGREEMENT_001')
  assert.equal(page.clear.mock.callCount(), 0)
  assert.equal(page.fresh.mock.callCount(), 0)
  assert.match(page.navigate.mock.calls[0].arguments[0], /source=EXPRESS_STATEMENT/)
  assert.match(page.render().submitMessage, /完成电子签名/)
  assert.equal(page.showModal.mock.callCount(), 0)
})

test('login expiry during submission preserves the draft and returns to login', async t => {
  const page = createSubmit(t, {
    submit: async () => ({ status: false, message: '登录超时，请重新登录' })
  })
  await page.render().handleSubmit()

  assert.equal(page.preserve.mock.callCount(), 1)
  assert.equal(page.login.mock.callCount(), 1)
  assert.equal(page.clear.mock.callCount(), 0)
  assert.equal(page.showModal.mock.callCount(), 0)
})

test('an ordinary submit failure shows a blocking modal and keeps the failed message inline', async t => {
  const page = createSubmit(t, {
    submit: async () => ({ status: false, message: '当前货物暂不支持寄递' })
  })
  await page.render().handleSubmit()

  assert.equal(page.showModal.mock.callCount(), 1)
  assert.equal(page.showModal.mock.calls[0].arguments[0].content, '当前货物暂不支持寄递')
  assert.equal(page.render().submitMessage, '当前货物暂不支持寄递')
  assert.equal(page.clear.mock.callCount(), 0)
})

test('monthly payment is rejected only when the account is confirmed not to be a monthly customer', async t => {
  const harness = createReactHarness()
  const monthlyDraft = createValidExpressDraft()
  monthlyDraft.service = { ...monthlyDraft.service, paymentType: 'MONTH_PAY' }
  const results = []
  const { useExpressSubmit } = loadReactModule('pages/express/hooks/useExpressSubmit.ts', {
    react: harness.react,
    '@tarojs/taro': { showToast: t.mock.fn(), showModal: t.mock.fn() },
    '@/services/express': {
      validateExpressDraft,
      isExpressSignResponseCode: () => false,
      expressDraftBridge: { carryFreshSend: t.mock.fn() },
      expressDraftStorage: { clear: t.mock.fn(async () => true), preserveForLogin: t.mock.fn(async () => true) },
      expressService: { submitDraft: t.mock.fn(async () => ({ status: true, result: { orderNumbers: ['ORDER_ONE'] } })) }
    },
    '@/shared/navigation/appNavigation': { navigateToAppRoute: t.mock.fn() },
    '@/shared/navigation/authGuard': { hasValidSession: () => true, ensureAuthenticated: t.mock.fn() },
    '@/shared/navigation/routes': { APP_ROUTES: { express: '/express', expressSuccess: '/success' } },
    '@/shared/navigation/routeUrl': { createAppRouteUrl: route => route },
    '@/shared/webview/appWeb': { createAppWebUrl: ({ source, uri }) => `${source}:${uri}` }
  })

  const warehouseController = {
    prepareForSubmit: async () => ({ draft: monthlyDraft, proceed: true })
  }

  for (const monthlyEnabled of [null, true, false]) {
    results.push(harness.render(() => useExpressSubmit({ draft: monthlyDraft, monthlyEnabled, warehouseController })).validation)
  }

  assert.equal(results[0].valid, true)
  assert.equal(results[1].valid, true)
  assert.equal(results[2].valid, false)
  assert.match(results[2].messages[0], /不是月结客户/)
})

test('login navigation is blocked when the shipping draft cannot be persisted', async t => {
  const page = createSubmit(t, { authenticated: false, preserve: async () => false })
  await page.render().handleSubmit()
  assert.equal(page.preserve.mock.callCount(), 1)
  assert.equal(page.login.mock.callCount(), 0)
  assert.equal(page.submitDraft.mock.callCount(), 0)
  assert.match(page.toast.mock.calls[0].arguments[0].title, /保存失败/)
})

test('agreement and remarks do not invalidate an in-flight shipping quote', () => {
  const draft = createValidExpressDraft()
  assert.equal(createExpressQuoteRequestKey(draft), createExpressQuoteRequestKey({ ...draft, agreementAccepted: false, remark: '到门口请联系' }))
  assert.notEqual(createExpressQuoteRequestKey(draft), createExpressQuoteRequestKey({ ...draft, goods: { ...draft.goods, weight: 10 } }))
})

test('a failed or rejected quote cannot leave the old product available for submission', async t => {
  for (const reject of [false, true]) {
    const harness = createReactHarness()
    const draft = createValidExpressDraft()
    let updatedDraft = draft
    const { useExpressQuote } = loadReactModule('pages/express/hooks/useExpressQuote.ts', {
      react: harness.react,
      '@tarojs/taro': { showToast: t.mock.fn() },
      '@/services/express': {
        createExpressQuoteRequestKey,
        sortExpressQuotes: products => products,
        expressService: {
          quote: async () => {
            if (reject) throw new Error('offline')
            return { status: false, message: '未匹配到产品' }
          }
        }
      },
      '@/shared/async/useLatestRequest': {
        useLatestRequestRunner: () => ({ invalidateLatestRequest() {}, runLatestRequest: async (_key, request, apply) => apply(await request()) })
      }
    })
    const controller = harness.render(() =>
      useExpressQuote({
        draft,
        setDraft: next => {
          updatedDraft = next
        },
        onProductChange() {}
      })
    )
    await controller.onQuery()
    assert.equal(updatedDraft.selectedProduct, null)
    assert.equal(validateExpressDraft(updatedDraft, { requireProduct: true }).valid, false)
  }
})

test('submission rejects stale quotes, negative volume and fractional package counts', () => {
  for (const draft of [
    { ...createValidExpressDraft(), quoteStaleReason: '地址变化' },
    { ...createValidExpressDraft(), goods: { ...createValidExpressDraft().goods, volume: -0.1 } },
    { ...createValidExpressDraft(), goods: { ...createValidExpressDraft().goods, count: 1.5 } }
  ]) {
    assert.equal(validateExpressDraft(draft, { requireProduct: true, requireAgreement: true }).valid, false)
  }
})

test('opening the shipping agreement is independent from accepting it', t => {
  const toggle = t.mock.fn()
  const openAgreement = t.mock.fn()
  const { ExpressOrderOptionsSection } = loadReactModule('pages/express/components/ExpressOrderOptionsSection/index.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/components': { Text: 'Text', View: 'View' },
    '@/shared/components': { AppPressable: 'AppPressable' },
    './index.scss': {}
  })
  const view = ExpressOrderOptionsSection({
    agreementAccepted: false,
    submitMessage: '',
    validationMessages: [],
    onOpenAgreement: openAgreement,
    onToggleAgreement: toggle
  })
  findElement(view, element => element.props?.accessibilityLabel === '阅读电子运单服务协议').props.onPress()
  assert.equal(openAgreement.mock.callCount(), 1)
  assert.equal(toggle.mock.callCount(), 0)
  findElement(view, element => element.props?.accessibilityLabel === '同意电子运单协议').props.onPress()
  assert.equal(toggle.mock.callCount(), 1)
})
