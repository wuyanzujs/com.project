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
  const prepare = t.mock.fn(async () => ({ draft, proceed: true }))
  const preserve = t.mock.fn(options.preserve || (async () => true))
  const navigate = t.mock.fn()
  const login = t.mock.fn()
  const toast = t.mock.fn()
  const { useExpressSubmit } = loadReactModule('pages/express/hooks/useExpressSubmit.ts', {
    react: harness.react,
    '@tarojs/taro': { showToast: toast },
    '@/services/express': {
      validateExpressDraft,
      expressDraftBridge: { carryFreshSend: fresh },
      expressDraftStorage: { clear, preserveForLogin: preserve },
      expressService: { submitDraft }
    },
    '@/shared/navigation/appNavigation': { navigateToAppRoute: navigate },
    '@/shared/navigation/authGuard': { hasValidSession: () => options.authenticated !== false, ensureAuthenticated: login },
    '@/shared/navigation/routes': { APP_ROUTES: { express: '/express', expressSuccess: '/success' } },
    '@/shared/navigation/routeUrl': { createAppRouteUrl: route => route }
  })
  return {
    fresh,
    render: () => harness.render(() => useExpressSubmit({ draft, warehouseController: { prepareForSubmit: prepare } })),
    submitDraft,
    prepare,
    clear,
    preserve,
    navigate,
    login,
    toast
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
