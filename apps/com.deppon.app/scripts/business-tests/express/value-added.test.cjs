require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { dpCache } = require('@/cache/dpCache')
const { CACHE_KEYS, createCacheStorageKey } = require('@/cache/keys')
const { getStorageValue, removeStorageValue, setStorageValue } = require('@/cache/storage')
const { createExpressDraft, validateExpressDraft } = require('@/services/express/core/express.draft')
const { buildCreateOrderRequest, buildFreightRequest } = require('@/services/express/core/express.payload')
const { expressDraftBridge } = require('@/services/express/draft/draftBridge')
const { expressDraftStorage } = require('@/services/express/draft/draftStorage')
const {
  createExpressValueAddedDraft,
  createExpressValueAddedOrderFields,
  createExpressValueAddedQuoteFields,
  normalizeExpressValueAddedDraft,
  updateExpressValueAdded,
  validateExpressValueAdded
} = require('@/services/express/value-added/valueAdded.rules')
const { templateDraftBridge } = require('@/services/template/template.bridge')

const { createValidExpressDraft, expressProduct } = require('../fixtures/express.cjs')

function selectedServices() {
  return {
    doubleDelivery: true,
    powerMachine: { enabled: true, category: ' 电视 ', count: 2, collect: true, delivery: true },
    photo: { sign: true, pickup: true }
  }
}

test('value added quote and order preserve field names, stages and number representations', () => {
  const draft = { ...createValidExpressDraft(), valueAdded: selectedServices() }
  const quote = buildFreightRequest(draft)
  const fields = buildCreateOrderRequest(draft).receive[0].orderExtendFields

  assert.equal(quote.doubleDelivery, 'Y')
  assert.equal(quote.isPhotoSigning, 'Y')
  assert.equal(quote.pickupPhoto, 'LSPZ')
  assert.equal(quote.powerMachineTypes, 'collect,delivery')
  assert.equal(quote.installationCategory, '电视')
  assert.equal(quote.testMacHineQty, 2)
  assert.equal(Object.hasOwn(quote, 'photoSigning'), false)
  assert.deepEqual(
    fields.filter(field => field.key !== 'nightAccept'),
    [
      { key: 'doubleDelivery', value: 'Y' },
      { key: 'photoSigning', value: 'Y' },
      { key: 'pickupPhoto', value: 'LSPZ' },
      { key: 'installationCategory', value: '电视' },
      { key: 'testMacHineQty', value: '2' },
      { key: 'powerMachineTypes', value: 'collect,delivery' },
      { key: 'productPrice', value: '28' }
    ]
  )
  assert.equal(
    fields.some(field => field.key === 'isPhotoSigning'),
    false
  )
})

test('value added single stages, single photo choice and boundary counts stay independent', () => {
  for (const [collect, delivery, types, count] of [
    [true, false, 'collect', 1],
    [false, true, 'delivery', 99]
  ]) {
    const value = {
      ...createExpressValueAddedDraft(),
      powerMachine: { enabled: true, category: '电视', count, collect, delivery },
      photo: { sign: collect, pickup: delivery }
    }
    const quote = createExpressValueAddedQuoteFields(value)

    assert.equal(quote.powerMachineTypes, types)
    assert.equal(quote.testMacHineQty, count)
    assert.equal(Object.hasOwn(quote, 'isPhotoSigning'), collect)
    assert.equal(Object.hasOwn(quote, 'pickupPhoto'), delivery)
    assert.equal(Object.hasOwn(quote, 'doubleDelivery'), false)
  }
})

test('invalid power machine quantity is rejected before quote or order serialization', () => {
  for (const count of [undefined, null, '', '2', 0, -1, 100, 1.5, NaN, Infinity]) {
    const value = selectedServices()
    value.powerMachine.count = count
    const draft = { ...createValidExpressDraft(), valueAdded: value }

    assert.ok(validateExpressValueAdded(value).includes('验机件数须为 1–99 的整数'))
    assert.throws(() => buildFreightRequest(draft), /验机件数/)
    assert.throws(() => buildCreateOrderRequest(draft), /验机件数/)
    assert.equal(validateExpressDraft(draft).valid, false)
  }
})

test('power machine requires a category and a stage and supports server category validation', () => {
  const value = selectedServices()
  value.powerMachine.category = ' '
  value.powerMachine.collect = false
  value.powerMachine.delivery = false

  assert.deepEqual(validateExpressValueAdded(value), ['请选择通电物品类型', '请选择收件或派送通电验机'])
  assert.throws(() => createExpressValueAddedQuoteFields(value), /通电物品类型/)
  assert.throws(() => createExpressValueAddedOrderFields(value), /通电物品类型/)
  assert.deepEqual(validateExpressValueAdded(selectedServices(), { categories: ['电视'] }), [])
  assert.deepEqual(validateExpressValueAdded(selectedServices(), { categories: ['冰箱'] }), ['通电物品类型已失效，请重新选择'])
})

test('clearing services removes every quote and order field and resets nested power machine state', () => {
  const source = { ...createValidExpressDraft(), valueAdded: selectedServices() }
  const cleared = updateExpressValueAdded(source, {
    doubleDelivery: false,
    powerMachine: { enabled: false },
    photo: { sign: false, pickup: false }
  })

  assert.deepEqual(cleared.valueAdded, createExpressValueAddedDraft())
  assert.deepEqual(createExpressValueAddedQuoteFields(cleared.valueAdded), {})
  assert.deepEqual(createExpressValueAddedOrderFields(cleared.valueAdded), [])
  assert.equal(cleared.selectedProduct, null)
  assert.equal(cleared.quoteStaleReason, '增值服务已变更，请重新获取价格')
  assert.equal(source.valueAdded.doubleDelivery, true)
  assert.equal(updateExpressValueAdded(cleared, { doubleDelivery: false }), cleared)
  assert.deepEqual(createExpressValueAddedQuoteFields(undefined), {})
  assert.deepEqual(createExpressValueAddedOrderFields(undefined), [])
})

test('value added mutation retains invalid quantity for validation instead of silently changing order quantity', () => {
  const source = { ...createValidExpressDraft(), valueAdded: selectedServices() }
  const invalid = updateExpressValueAdded(source, { powerMachine: { count: 100 } })

  assert.equal(invalid.valueAdded.powerMachine.count, 100)
  assert.throws(() => buildCreateOrderRequest(invalid), /验机件数/)
  assert.deepEqual(normalizeExpressValueAddedDraft(null), createExpressValueAddedDraft())
})

test('value added storage supports old cache, service-only draft and nested isolation across bridge', async () => {
  const storageKey = createCacheStorageKey(CACHE_KEYS.expressDraft)
  const originalStorageValue = getStorageValue(storageKey)

  try {
    const legacy = createValidExpressDraft()
    delete legacy.valueAdded
    await dpCache.set(CACHE_KEYS.expressDraft, { data: legacy })
    assert.deepEqual(expressDraftStorage.restore().valueAdded, createExpressValueAddedDraft())

    const source = createExpressDraft()
    source.valueAdded = selectedServices()
    await expressDraftStorage.save(source)
    source.valueAdded.powerMachine.category = '被后续修改'
    source.valueAdded.photo.sign = false

    const restored = expressDraftStorage.restore()
    assert.equal(restored.valueAdded.powerMachine.category, '电视')
    assert.equal(restored.valueAdded.photo.sign, true)
    expressDraftBridge.carryFromValueAdded(restored)
    restored.valueAdded.powerMachine.count = 20
    restored.valueAdded.photo.pickup = false

    const carried = expressDraftBridge.consume()
    assert.equal(carried.draft.valueAdded.powerMachine.count, 2)
    assert.equal(carried.draft.valueAdded.photo.pickup, true)
    assert.equal(carried.draft.selectedProduct, null)
    assert.deepEqual(expressDraftBridge.consume(), null)

    templateDraftBridge.stage(carried.draft)
    carried.draft.valueAdded.powerMachine.category = '再次修改'
    carried.draft.valueAdded.photo.pickup = false
    const templateDraft = templateDraftBridge.consume()
    assert.equal(templateDraft.valueAdded.powerMachine.category, '电视')
    assert.equal(templateDraft.valueAdded.photo.pickup, true)
  } finally {
    if (originalStorageValue) await setStorageValue(storageKey, originalStorageValue)
    else await removeStorageValue(storageKey)
  }
})

test('value added bridge drops an old quote unless explicitly refreshed and still current', () => {
  const draft = createValidExpressDraft()
  expressDraftBridge.carryFromValueAdded(draft)
  const old = expressDraftBridge.consume()
  assert.equal(old.draft.selectedProduct, null)
  assert.deepEqual(old.quotes, [])

  const fresh = { ...expressProduct, totalfee: 48, detail: [{ priceEntryCode: 'SRPS', priceEntryName: '双人派送费', caculateFee: 20 }] }
  expressDraftBridge.carryFromValueAdded({ ...draft, selectedProduct: fresh }, [fresh])
  fresh.detail[0].caculateFee = 99
  const carried = expressDraftBridge.consume()
  assert.equal(carried.draft.selectedProduct.totalfee, 48)
  assert.equal(carried.draft.selectedProduct.detail[0].caculateFee, 20)
  assert.equal(carried.quotes[0].detail[0].caculateFee, 20)
  assert.equal(carried.draft.quoteStaleReason, '')

  expressDraftBridge.carryFromValueAdded({ ...draft, quoteStaleReason: '服务已变化' }, [expressProduct])
  const stale = expressDraftBridge.consume()
  assert.equal(stale.draft.selectedProduct, null)
  assert.deepEqual(stale.quotes, [])
  assert.equal(stale.draft.quoteStaleReason, '服务已变化')
})

test('value added bridge preserves the selected route and time product rather than another matching code', () => {
  const product = {
    ...expressProduct,
    mainRoutePref: 'A',
    shortDistance: 'N',
    deliveryNature: 'EXP',
    timeProducts: [{ timeProductsCode: 'TM01', timeProductsName: '次日达' }]
  }
  const draft = { ...createValidExpressDraft(), selectedProduct: product }

  for (const different of [
    { mainRoutePref: 'B' },
    { shortDistance: 'Y' },
    { deliveryNature: 'LTL' },
    { timeProducts: [{ timeProductsCode: 'TM02', timeProductsName: '隔日达' }] },
    { totalfee: 29 }
  ]) {
    expressDraftBridge.carryFromValueAdded(draft, [{ ...product, ...different }])
    assert.equal(expressDraftBridge.consume().draft.selectedProduct, null)
  }
})
