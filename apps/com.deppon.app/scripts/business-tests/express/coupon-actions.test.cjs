require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const {
  canAutoApplyExpressCoupon,
  createExpressCouponQueryRequest,
  createExpressCouponRequestKey,
  shouldShowExpressCouponRow
} = require('@/services/express/billing/couponOrder.rules')
const { updateExpressCouponNumber, updateExpressService } = require('@/services/express/core/express.mutations')

const { createValidExpressDraft, expressProduct } = require('../fixtures/express.cjs')
const { createReactHarness, loadReactModule } = require('../support/react-harness.cjs')

function createCard(code, extra = {}) {
  return {
    code,
    typeName: '立减券',
    amountValue: '5',
    amountUnit: '元',
    title: '寄件券',
    thresholdText: '无门槛',
    validityText: '2026.12.31 前有效',
    usageTimeText: '',
    statusText: '可使用',
    labelText: '',
    tags: [],
    canUse: true,
    raw: { couponCode: code, startTime: '', endTime: '2026-12-31', discountFee: 500, useFee: 0, subFee: 0, limitDiscountFee: 0, discountType: '1' },
    ...extra
  }
}

function createCouponHook(t, options = {}) {
  const harness = createReactHarness()
  let draft = {
    ...createValidExpressDraft(),
    selectedProduct: { ...expressProduct, producteCode: 'PACKAGE' }
  }
  const toasts = []
  const invalidate = t.mock.fn()
  const queryOrderCoupons = t.mock.fn(
    async () => options.response || { status: true, result: { available: [createCard('A'), createCard('B')], unavailable: [] } }
  )
  const { useExpressCoupons } = loadReactModule('pages/express/hooks/useExpressCoupons.ts', {
    react: harness.react,
    '@tarojs/taro': { showToast: toast => toasts.push(toast) },
    '@/services/coupon': { expressCouponService: { queryOrderCoupons } },
    '@/services/express': {
      EXPRESS_COUPON_AUTO_QUERY_DELAY_MS: 0,
      canAutoApplyExpressCoupon,
      createExpressCouponQueryRequest,
      createExpressCouponRequestKey,
      expressDraftStorage: { preserveForLogin: async () => true },
      shouldShowExpressCouponRow,
      updateExpressCouponNumber,
      updateExpressService
    },
    '@/shared/async/useLatestRequest': {
      useLatestRequestRunner: () => ({
        invalidateLatestRequest() {},
        runLatestRequest: async (_key, request, apply) => apply(await request())
      })
    },
    '@/shared/navigation/authGuard': { hasValidSession: () => true, ensureAuthenticated: () => {} },
    '@/shared/navigation/routes': { APP_ROUTES: { express: '/express' } }
  })

  const setDraft = next => {
    draft = typeof next === 'function' ? next(draft) : next
  }

  return {
    get draft() {
      return draft
    },
    invalidate,
    queryOrderCoupons,
    toasts,
    render: () => harness.render(() => useExpressCoupons({ draft, setDraft, onInvalidateQuote: invalidate })),
    setDraft(next) {
      draft = next
    }
  }
}

async function flush() {
  await new Promise(resolve => setTimeout(resolve, 5))
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))
}

test('coupon query applies the first available coupon automatically for normal cash orders', async t => {
  const page = createCouponHook(t)

  page.render()
  await flush()

  assert.equal(page.queryOrderCoupons.mock.callCount(), 1)
  assert.equal(page.draft.couponNumber, 'A')
  assert.equal(page.invalidate.mock.callCount(), 1)

  page.render()
  page.setDraft({ ...page.draft, couponNumber: '' })
  page.render()
  await flush()
  assert.equal(page.draft.couponNumber, '')
})

test('manual coupon selection cancels month pay and keeps the coupon', async t => {
  const page = createCouponHook(t, { response: { status: true, result: { available: [createCard('A')], unavailable: [] } } })

  page.setDraft(updateExpressService(page.draft, { paymentType: 'MONTH_PAY' }))
  page.render()
  await flush()
  assert.equal(page.draft.couponNumber, '')

  page.render().onSelect(createCard('A'))
  assert.equal(page.draft.couponNumber, 'A')
  assert.equal(page.draft.service.paymentType, 'MP')
  assert.ok(page.toasts.some(toast => toast.title === '已取消月结支付'))
})

test('a selected coupon is cleared when the latest coupon response has no coupons left', async t => {
  const page = createCouponHook(t, { response: { status: true, result: { available: [], unavailable: [] } } })

  page.setDraft({
    ...page.draft,
    couponNumber: 'OLD',
    scanContext: { role: 'pickupManId', value: 'PM_001' }
  })
  page.render()
  await flush()

  assert.equal(page.draft.couponNumber, '')
})

test('a manual coupon is kept even when it is missing from the latest lists', async t => {
  const page = createCouponHook(t, { response: { status: true, result: { available: [createCard('A')], unavailable: [] } } })

  page.setDraft({
    ...page.draft,
    couponNumber: 'MANUAL',
    scanContext: { role: 'pickupManId', value: 'PM_001' }
  })
  page.render()
  await flush()

  assert.equal(page.draft.couponNumber, 'MANUAL')
})

test('scanned orders do not auto apply coupons', async t => {
  const page = createCouponHook(t)

  page.setDraft({
    ...page.draft,
    scanContext: { role: 'pickupManId', value: 'PM_001' }
  })
  page.render()
  await flush()

  assert.equal(page.queryOrderCoupons.mock.callCount(), 1)
  assert.equal(page.draft.couponNumber, '')
})
