require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { selectExpressProduct } = require('@/services/express/core/express.draft')
const { applyExpressInsuranceCapability } = require('@/services/express/insurance/insurance.rules')
const { createExpressValueAddedQuoteView, findExpressValueAddedProduct } = require('@/services/express/value-added/valueAdded.quoteView')

const { createValidExpressDraft } = require('../fixtures/express.cjs')
const { createDeferred } = require('../support/deferred.cjs')
const { createReactHarness, loadReactModule, findElement } = require('../support/react-harness.cjs')

const base = createValidExpressDraft().selectedProduct
const product = {
  ...base,
  totalfee: 100,
  mainRoutePref: 'A',
  shortDistance: 'N',
  deliveryNature: 'A',
  timeProducts: [{ timeProductsCode: 'FAST', timeProductsName: '标快' }],
  detail: [
    { priceEntryCode: 'FRT', priceEntryName: '运费', caculateFee: 80 },
    { priceEntryCode: 'BF', priceEntryName: '保价', caculateFee: 10 },
    { priceEntryCode: 'SRPS', priceEntryName: '双人', caculateFee: 3 },
    { priceEntryCode: 'PZQS', priceEntryName: '签收拍照', caculateFee: 0.1 },
    { priceEntryCode: 'LSPZ', priceEntryName: '揽收拍照', caculateFee: 0.2 },
    { priceEntryCode: 'BZ', priceEntryName: '包装', caculateFee: 2 },
    { priceEntryCode: 'UNKNOWN', priceEntryName: '未来费项', caculateFee: 200 }
  ]
}

test('value added totals only explicit service codes, excludes freight, insurance and unknown codes', () => {
  const view = createExpressValueAddedQuoteView(product)
  assert.equal(view.total, 5.3)
  assert.equal(view.priceText, '¥5.3')
  assert.equal(view.serviceAmounts.photo, 0.3)
  assert.equal(view.serviceAmounts.collection, 0)
  assert.equal(view.rows.length, 4)
  assert.equal(
    view.rows.some(row => ['FRT', 'BF', 'UNKNOWN'].includes(row.key)),
    false
  )
  assert.equal(createExpressValueAddedQuoteView(null).priceText, '¥--')
  assert.equal(createExpressValueAddedQuoteView({ ...product, detail: null }).total, null)
  assert.equal(createExpressValueAddedQuoteView({ ...product, detail: [] }).total, 0)
})

test('value added matching preserves current route and time product rather than choosing a same-code alternative', () => {
  const wrongRoute = { ...product, mainRoutePref: 'B' }
  const wrongDistance = { ...product, shortDistance: 'Y' }
  const wrongDelivery = { ...product, deliveryNature: 'B' }
  const wrongTime = { ...product, timeProducts: [{ timeProductsCode: 'SLOW' }] }
  const fresh = { ...product, totalfee: 110 }
  assert.equal(findExpressValueAddedProduct([wrongRoute, wrongDistance, wrongDelivery, wrongTime, fresh], product, ''), fresh)
  assert.equal(findExpressValueAddedProduct([wrongRoute, wrongTime], product, ''), null)
})

function createQuotePage(quote) {
  const harness = createReactHarness()
  const timers = new Map()
  let timerId = 0
  let draft = {
    ...createValidExpressDraft(),
    selectedProduct: product,
    service: { ...createValidExpressDraft().service, transportMode: product.omsProductCode }
  }
  const setDraft = next => {
    draft = typeof next === 'function' ? next(draft) : next
  }
  const { useValueAddedQuote } = loadReactModule(
    'pages/express/services/useValueAddedQuote.ts',
    {
      react: harness.react,
      '@/services/express': { expressService: { quote }, selectExpressProduct, applyExpressInsuranceCapability },
      '@/services/express/value-added/valueAdded.quoteView': { findExpressValueAddedProduct }
    },
    {
      setTimeout: callback => {
        const id = ++timerId
        timers.set(id, callback)
        return id
      },
      clearTimeout: id => timers.delete(id)
    }
  )
  return {
    render: (blocked = '') => harness.render(() => useValueAddedQuote(draft, setDraft, blocked)),
    getDraft: () => draft,
    update: patch => {
      draft = { ...draft, ...patch }
    },
    get timerCount() {
      return timers.size
    },
    start() {
      const next = timers.entries().next().value
      assert.ok(next, 'expected one debounced query')
      timers.delete(next[0])
      return next[1]()
    },
    unmount: harness.unmount
  }
}

test('service changes hide old fees immediately, debounce changes, preserve the selected route, and avoid capability response loops', async () => {
  let calls = 0
  const fresh = { ...product, totalfee: 101 }
  const page = createQuotePage(async () => {
    calls += 1
    return {
      status: true,
      result: {
        products: [{ ...fresh, mainRoutePref: 'B' }, fresh],
        availability: { insuranceCapability: { inputKey: 'new', fragile: false, worryFree: false, disabled: false }, customer: { insuranceLimit: 5000 } }
      }
    }
  })
  assert.equal(page.render().product.totalfee, 100)
  assert.equal(page.timerCount, 0)
  page.update({ collection: { ...page.getDraft().collection, amount: 100 }, selectedProduct: null, quoteStaleReason: 'changed' })
  assert.equal(page.render().product, null)
  page.update({ collection: { ...page.getDraft().collection, amount: 200 } })
  page.render()
  assert.equal(page.timerCount, 1, 'superseded debounced query is cancelled')
  await page.start()
  assert.equal(page.getDraft().selectedProduct.totalfee, 101)
  assert.equal(page.getDraft().selectedProduct.mainRoutePref, 'A')
  assert.equal(page.render().status, 'done')
  assert.equal(page.timerCount, 0, 'normalizing returned insurance capability cannot start another query')
  assert.equal(calls, 1)
  page.unmount()
})

test('old success and failure responses cannot overwrite newer service choices', async () => {
  for (const oldFails of [false, true]) {
    const first = createDeferred()
    const second = createDeferred()
    let calls = 0
    const page = createQuotePage(() => (++calls === 1 ? first.promise : second.promise))
    page.render()
    page.update({ collection: { ...page.getDraft().collection, amount: 1 }, selectedProduct: null })
    page.render()
    const pendingFirst = page.start()
    page.update({ collection: { ...page.getDraft().collection, amount: 2 } })
    page.render()
    const pendingSecond = page.start()
    second.resolve({ status: true, result: { products: [{ ...product, totalfee: 102 }] } })
    await pendingSecond
    page.render()
    first.resolve(oldFails ? { status: false, message: 'old error' } : { status: true, result: { products: [{ ...product, totalfee: 101 }] } })
    await pendingFirst
    assert.equal(page.getDraft().selectedProduct.totalfee, 102)
    assert.equal(page.render().status, 'done')
    page.unmount()
  }
})

test('quote failure clears old submission price, retry settles once, and unavailable machine categories block quoting', async () => {
  let calls = 0
  const page = createQuotePage(async () => {
    calls += 1
    if (calls === 1) throw new Error('offline')
    return { status: true, result: { products: [product] } }
  })
  page.render()
  page.update({ collection: { ...page.getDraft().collection, amount: 1 } })
  page.render()
  await page.start()
  assert.equal(page.getDraft().selectedProduct, null)
  assert.equal(page.render().status, 'error')
  page.render().retry()
  page.render()
  await page.start()
  assert.equal(page.render().status, 'done')
  assert.equal(page.timerCount, 0, 'retry success cannot restart itself')
  assert.equal(calls, 2)
  const blocked = page.render('请先获取可验机品类')
  assert.equal(blocked.product, null)
  assert.equal(page.timerCount, 0)
  page.render('请先获取可验机品类')
  assert.equal(page.getDraft().selectedProduct, null)
  page.unmount()
})

test('service card information opens its description, only a selected card shows a service fee', () => {
  const messages = []
  const { ServiceCard } = loadReactModule('pages/express/services/ServiceCard.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/components': { Image: 'Image', Text: 'Text', View: 'View' },
    '@tarojs/taro': { showModal: message => messages.push(message) },
    '@/services/express/value-added/valueAdded.quoteView': require('@/services/express/value-added/valueAdded.quoteView'),
    '@/shared/components': { AppPressable: 'AppPressable' },
    '@/shared/components/AppIcon': { AppIcon: 'AppIcon' },
    '@/styles/nativeTokens': require('@/styles/nativeTokens'),
    './cards.scss': {}
  })
  const props = { title: '双人派送', description: '不适用于自提、外发及进仓', icon: 'icon', fee: 3, selected: false, onPress() {} }
  const view = ServiceCard(props)
  assert.equal(
    findElement(view, element => element.props?.className === 'express-service-card__fee'),
    undefined
  )
  findElement(view, element => element.props?.accessibilityLabel === '查看双人派送说明').props.onPress()
  assert.equal(messages[0].content, props.description)
  assert.ok(findElement(ServiceCard({ ...props, selected: true }), element => element.props?.className === 'express-service-card__fee'))
})

test('machine category raw API follows the witnessed endpoint and request parameters', async () => {
  const requests = []
  const response = { status: true, result: ['电视'] }
  const { queryExpressPowerMachineCategoriesRaw } = loadReactModule('services/express/value-added/valueAdded.api.ts', {
    '@/request/deppon': {
      depponHttp: {
        post: async (...args) => {
          requests.push(args)
          return response
        }
      }
    }
  })
  assert.equal(await queryExpressPowerMachineCategoriesRaw(), response)
  assert.equal(requests[0][0], '/gwapi/orderService/eco/order/secure/queryGoodsNameList')
  assert.equal(requests[0][1].standardLevelGoodsNames, '通电验机')
})

test('machine category service rejects failed or malformed lists and deduplicates available categories', async () => {
  let response = { status: true, result: [' 电视 ', '电视', 4, '', '冰箱'] }
  const { queryExpressPowerMachineCategories } = loadReactModule('services/express/value-added/valueAdded.service.ts', {
    './valueAdded.api': { queryExpressPowerMachineCategoriesRaw: async () => response }
  })
  const success = await queryExpressPowerMachineCategories()
  assert.equal(JSON.stringify(success.result), JSON.stringify(['电视', '冰箱']))
  response = { status: false, result: ['电视'] }
  assert.equal((await queryExpressPowerMachineCategories()).result.length, 0)
  response = { status: true, result: { list: ['电视'] } }
  assert.equal((await queryExpressPowerMachineCategories()).result.length, 0, 'do not guess a different response shape')
})

test('service page keeps changes local until confirm and passes fresh quote explicitly to its bridge', async () => {
  const harness = createReactHarness()
  const saves = []
  const carried = []
  const services = require('@/services/express/core/express.draft')
  const imports = {
    react: harness.react,
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/components': { ScrollView: 'ScrollView', Text: 'Text', View: 'View' },
    '@tarojs/taro': { navigateBack: async () => {}, showToast() {} },
    '@/services/express': {
      createExpressDraft: services.createExpressDraft,
      expressDraftStorage: { restore: () => ({ ...createValidExpressDraft(), selectedProduct: product }), save: draft => saves.push(draft) },
      expressDraftBridge: { carryFromValueAdded: (...args) => carried.push(args) },
      getExpressReturnBillOption: () => ({ label: '无需返单' }),
      updateExpressService: services.updateExpressService
    },
    '@/services/express/value-added/valueAdded.quoteView': require('@/services/express/value-added/valueAdded.quoteView'),
    '@/services/express/value-added/valueAdded.rules': require('@/services/express/value-added/valueAdded.rules'),
    '@/shared/components': { AppPage: 'AppPage', AppPressable: 'AppPressable' },
    '@/shared/navigation/appNavigation': { navigateToAppRoute() {} },
    '@/shared/navigation/routes': { APP_ROUTES: { express: '/express' } },
    '@/shared/platform': { getNativeCapabilityErrorMessage() {}, shareWithApp() {} },
    './ExtraServiceEditors': {
      PhotoServiceEditor: 'PhotoServiceEditor',
      PowerMachineEditor: 'PowerMachineEditor',
      usePowerMachineCategories: () => ({ categories: [], status: 'done' })
    },
    './ServiceCard': { ServiceCard: 'ServiceCard' },
    './useValueAddedQuote': { useValueAddedQuote: draft => ({ status: 'done', message: '', product: draft.selectedProduct }) },
    './ValueAddedFeeSheet': { ValueAddedFeeSheet: 'ValueAddedFeeSheet' },
    './index.scss': {},
    './content.scss': {},
    './cards.scss': {}
  }
  for (const name of ['collection', 'delivery', 'double_delivery', 'packing', 'powercheck', 'pwd', 'signform', 'take_photo', 'warehouse']) {
    imports[`@/assets/express/services/service_icon_${name}.png`] = 'icon'
  }
  for (const name of ['CollectionCard', 'DeliveryPreferenceCard', 'NavBar', 'PackagingCard', 'ReturnBillCard', 'WarehouseCard']) {
    imports[`../components/Express${name}`] = { [`Express${name}`]: `Express${name}` }
  }
  for (const name of ['Collection', 'DeliveryPreference', 'Goods', 'ReturnBill', 'Warehouse']) {
    imports[`../hooks/useExpress${name}`] = { [`useExpress${name}`]: () => ({}) }
  }
  const { default: Page } = loadReactModule('pages/express/services/index.tsx', imports)
  let view = harness.render(Page)
  assert.equal(saves.length, 0)
  await findElement(view.props.footer, element => element.props?.accessibilityLabel === '确定增值服务').props.onPress()
  assert.equal(carried[0][1][0], product, 'fresh quoted product is passed explicitly for bridge freshness validation')
  saves.length = 0
  carried.length = 0
  const double = findElement(view, element => element.type === 'ServiceCard' && element.props.title === '双人派送')
  double.props.onPress()
  view = harness.render(Page)
  assert.equal(saves.length, 0, 'editing must not persist the page temporary draft')
  assert.equal(carried.length, 0)
  await findElement(view.props.footer, element => element.props?.accessibilityLabel === '确定增值服务').props.onPress()
  assert.equal(saves.length, 1)
  assert.equal(carried.length, 1)
  assert.equal(saves[0].valueAdded.doubleDelivery, true)
  assert.equal(carried[0][1].length, 0, 'an edited draft with invalidated quote must not invent a fresh quote')
  const passwordSigning = findElement(view, element => element.type === 'ServiceCard' && element.props.title === '口令签收')
  passwordSigning.props.onPress()
  view = harness.render(Page)
  await findElement(view.props.footer, element => element.props?.accessibilityLabel === '确定增值服务').props.onPress()
  assert.equal(saves[1].service.passwordSigning, 'Y')
  harness.unmount()
})
