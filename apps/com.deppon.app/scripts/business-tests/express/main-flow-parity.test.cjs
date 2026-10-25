require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { expressApi } = require('@/services/express/core/express.api')
const {
  applyExpressScanContext,
  isExpressSpecialRegion,
  isExpressSpecialRegionBlocked,
  selectExpressProduct,
  validateExpressDraft
} = require('@/services/express/core/express.draft')
const {
  buildCreateOrderRequest,
  buildFilterOrderRequest,
  buildFreightRequest,
  buildOrderPriceLogRequest,
  buildSignStagingRequest
} = require('@/services/express/core/express.payload')
const { isExpressSignResponseCode, parseExpressSignResponseCode, stageExpressSign } = require('@/services/express/core/express.sign')
const { sortExpressQuotes, selectDefaultExpressQuote } = require('@/services/express/product/productAvailability.rules')

const { createValidExpressDraft, expressProduct } = require('../fixtures/express.cjs')

function withDraft(patch) {
  const draft = createValidExpressDraft()

  return {
    ...draft,
    ...patch
  }
}

test('freight request carries PPC payment method and package quantity like the mini program', () => {
  assert.equal(buildFreightRequest(createValidExpressDraft()).paidMethod, 'MP')
  assert.equal(buildFreightRequest(createValidExpressDraft()).totalQuantity, 1)

  const arrivePay = withDraft({
    service: { ...createValidExpressDraft().service, paymentType: 'PAY_ARIIVE' }
  })
  const monthlyPay = withDraft({
    service: { ...createValidExpressDraft().service, paymentType: 'MONTH_PAY' }
  })
  const multiPackage = withDraft({
    goods: { ...createValidExpressDraft().goods, count: 3 }
  })

  assert.equal(buildFreightRequest(arrivePay).paidMethod, 'FC')
  assert.equal(buildFreightRequest(monthlyPay).paidMethod, 'CT')
  assert.equal(buildFreightRequest(multiPackage).totalQuantity, 3)
})

test('special region interchange follows the mini program guard matrix', () => {
  assert.equal(isExpressSpecialRegion('香港特别行政区'), true)
  assert.equal(isExpressSpecialRegion('上海市'), false)

  for (const [sender, consignee, blocked] of [
    ['台湾省', '上海市', true],
    ['香港特别行政区', '上海市', false],
    ['澳门特别行政区', '澳门特别行政区', false],
    ['香港特别行政区', '澳门特别行政区', true],
    ['上海市', '台湾省', false]
  ]) {
    assert.equal(isExpressSpecialRegionBlocked(sender, consignee), blocked, `${sender} -> ${consignee}`)
  }

  const draft = withDraft({
    sender: { ...createValidExpressDraft().sender, province: '台湾省' }
  })

  assert.equal(validateExpressDraft(draft).valid, true)
  assert.equal(validateExpressDraft(draft, { requireOrderableRegion: true }).valid, false)
  assert.match(validateExpressDraft(draft, { requireOrderableRegion: true }).messages[0], /港澳台互寄/)
})

test('order payload differentiates express and LTL drop-off without changing contact intent for door pickup', () => {
  const doorDraft = createValidExpressDraft()
  const selfSend = withDraft({
    pickup: { ...createValidExpressDraft().pickup, dispatch: 'N' }
  })
  const ltlSelfSend = {
    ...selfSend,
    goods: { ...selfSend.goods, weight: 61 }
  }
  const ltlVolumeSelfSend = {
    ...selfSend,
    goods: { ...selfSend.goods, volume: 0.5 }
  }
  const ltlDoor = {
    ...doorDraft,
    goods: { ...doorDraft.goods, weight: 61 }
  }

  assert.equal(buildCreateOrderRequest(doorDraft).receive[0].isRecieveGoods, 1)
  assert.equal(buildCreateOrderRequest(doorDraft).isContact, 'Y')
  assert.equal(buildCreateOrderRequest(selfSend).receive[0].isRecieveGoods, 1)
  assert.equal(buildCreateOrderRequest(selfSend).isContact, 'N')
  assert.equal(buildCreateOrderRequest(ltlSelfSend).receive[0].isRecieveGoods, 0)
  assert.equal(buildCreateOrderRequest(ltlVolumeSelfSend).receive[0].isRecieveGoods, 0)
  assert.equal(buildCreateOrderRequest(ltlDoor).receive[0].isRecieveGoods, 1)
})

test('business point scan drops off at the scanned station without dispatching a courier', () => {
  const businessDraft = applyExpressScanContext(createValidExpressDraft(), {
    role: 'businessCode',
    value: 'DEPT_001'
  })
  const departmentDraft = applyExpressScanContext(createValidExpressDraft(), {
    role: 'acceptDept',
    value: 'DEPT_002'
  })
  const businessOrder = buildCreateOrderRequest(businessDraft)
  const departmentOrder = buildCreateOrderRequest(departmentDraft)

  assert.equal(businessOrder.acceptDept, 'DEPT_001')
  assert.equal(businessOrder.startStation, 'DEPT_001')
  assert.equal(businessOrder.startStationName, '')
  assert.equal(businessOrder.dispatchFlag, 'N')
  assert.equal(businessOrder.isContact, 'N')
  assert.equal(businessDraft.pickup.dispatch, 'N')

  assert.equal(departmentDraft.goods.weight, 61)
  assert.equal(departmentDraft.service.deliveryMode, 'PICKNOTUPSTAIRS')
  assert.equal(departmentOrder.acceptDept, 'DEPT_002')
  assert.equal(departmentOrder.startStation, 'DEPT_002')
  assert.equal(departmentOrder.dispatchFlag, 'Y')
  assert.equal(departmentOrder.isContact, 'N')
  assert.equal(departmentOrder.receive[0].isRecieveGoods, 1)
  assert.equal(
    buildCreateOrderRequest({
      ...departmentDraft,
      pickup: { ...departmentDraft.pickup, dispatch: 'N' }
    }).receive[0].isRecieveGoods,
    0
  )
})

test('product change keeps a coupon only when the new quote can use it and drops arrive pay for battery products', () => {
  const couponProduct = {
    ...expressProduct,
    discount: [{ marketCode: 'YHJ', reduceFee: 5 }]
  }
  const plainProduct = { ...expressProduct, omsProductCode: 'RCP' }
  const dczpProduct = { ...expressProduct, omsProductCode: 'DCZP' }
  const base = withDraft({
    couponNumber: 'COUPON001',
    service: { ...createValidExpressDraft().service, paymentType: 'PAY_ARIIVE' }
  })

  assert.equal(selectExpressProduct(base, couponProduct).couponNumber, 'COUPON001')
  assert.equal(selectExpressProduct(base, plainProduct).couponNumber, '')
  assert.equal(selectExpressProduct(base, plainProduct).service.paymentType, 'PAY_ARIIVE')
  assert.equal(selectExpressProduct(base, dczpProduct).service.paymentType, 'MP')
})

test('create order payload puts the detail address in Address fields like the mini program', () => {
  const draft = createValidExpressDraft()
  const request = buildCreateOrderRequest(draft)

  assert.equal(request.contactAddress, '徐泾镇明珠路100号')
  assert.equal(request.contactAddressDetail, '上海市-上海市-青浦区,徐泾镇明珠路100号')
  assert.equal(request.receive[0].receiverCustAddress, '科技园科苑路200号')
  assert.equal(request.receive[0].receiverCustAddressDetail, '广东省-深圳市-南山区,科技园科苑路200号')
})

test('filter request keeps the mini program address format and volume', () => {
  const draft = withDraft({
    goods: { ...createValidExpressDraft().goods, volume: 0.02 }
  })
  const request = buildFilterOrderRequest(draft)

  assert.equal(request.contactAddress, '上海市-上海市-青浦区,徐泾镇明珠路100号')
  assert.equal(request.receiverAddress, '广东省-深圳市-南山区,科技园科苑路200号')
  assert.equal(request.totalVolume, 0.02)
})

test('order extension fields keep quote price and time product information', () => {
  const product = {
    ...expressProduct,
    totalfee: 36.5,
    ppcTotalFee: 40,
    daysFormat: '明天18:00前',
    detail: [{ priceEntryCode: 'FRT', caculateFee: 30 }],
    discount: [{ marketCode: 'YHJ', reduceFee: 5 }],
    timeProducts: [{ timeProductsCode: 'TP001', timeProductsName: '特快' }]
  }
  const draft = withDraft({ selectedProduct: product })
  const fields = buildCreateOrderRequest(draft).receive[0].orderExtendFields.filter(field =>
    ['productPrice', 'days', 'timeProductsCode', 'timeProductsName', 'totalFee', 'basicFee', 'discountFee'].includes(field.key)
  )

  assert.deepEqual(fields, [
    { key: 'productPrice', value: '36.5' },
    { key: 'days', value: '明天18:00前' },
    { key: 'timeProductsCode', value: 'TP001' },
    { key: 'timeProductsName', value: '特快' },
    { key: 'totalFee', value: 40 },
    { key: 'basicFee', value: 35 },
    { key: 'discountFee', value: 5 }
  ])
})

test('order price log reuses the selected product and packaging volume', () => {
  const draft = withDraft({
    goods: { ...createValidExpressDraft().goods, weight: 2.5, volume: 0.12 }
  })
  const request = buildOrderPriceLogRequest(draft, ' ORDER_001 ')

  assert.equal(request.orderNumber, 'ORDER_001')
  assert.equal(request.priceBody.totalWeight, 2.5)
  assert.equal(request.priceBody.totalVolume, 0.12)
  assert.equal(request.priceBody.deliveryMode, draft.service.deliveryMode)
  assert.equal(request.priceBody.productDetail, draft.selectedProduct)
  assert.equal(buildOrderPriceLogRequest({ ...draft, selectedProduct: null }, 'ORDER_001'), null)
  assert.equal(buildOrderPriceLogRequest(draft, '  '), null)
})

test('sign response code parsing and staging request follow the statement contract', async t => {
  assert.equal(isExpressSignResponseCode('1|家电|AGREEMENT_001'), true)
  assert.equal(isExpressSignResponseCode('0|家电|AGREEMENT_001'), false)
  assert.equal(isExpressSignResponseCode(undefined), false)
  assert.deepEqual(parseExpressSignResponseCode('1|家电|AGREEMENT_001'), {
    goodsType: '家电',
    agreementId: 'AGREEMENT_001'
  })

  const draft = createValidExpressDraft()
  const staging = buildSignStagingRequest(draft, parseExpressSignResponseCode('1|家电|AGREEMENT_001'), '13800138000')

  assert.equal(staging.agreementId, 'AGREEMENT_001')
  assert.equal(staging.goodsType, '家电')
  assert.equal(staging.orderPhone, '13800138000')
  assert.equal(staging.senderAddress, '上海市-上海市-青浦区,徐泾镇明珠路100号')
  assert.equal(staging.consigneeAddress, '广东省-深圳市-南山区,科技园科苑路200号')

  const original = expressApi.stageStagingInfo
  expressApi.stageStagingInfo = t.mock.fn(async () => ({ status: true, result: ' STAGE_001 ' }))

  try {
    const response = await stageExpressSign(draft, '1|家电|AGREEMENT_001')

    assert.equal(response.status, true)
    assert.equal(response.result.stagingId, 'STAGE_001')
    assert.match(response.result.uri, /queryId=STAGE_001/)
    assert.match(response.result.uri, /\/depponmobile\/signStatement/)
  } finally {
    expressApi.stageStagingInfo = original
  }
})

test('sign staging failures keep the draft usable and surface the backend message', async t => {
  const draft = createValidExpressDraft()
  const original = expressApi.stageStagingInfo
  expressApi.stageStagingInfo = t.mock.fn(async () => ({ status: false, message: '暂存服务不可用' }))

  try {
    const response = await stageExpressSign(draft, '1|家电|AGREEMENT_001')

    assert.equal(response.status, false)
    assert.equal(response.message, '暂存服务不可用')
    assert.equal(response.result, null)
  } finally {
    expressApi.stageStagingInfo = original
  }
})

test('default quote follows the mini program product priority instead of response order', () => {
  const yty = { ...expressProduct, omsProductCode: 'YTY', totalfee: 99 }
  const xjbk = { ...expressProduct, omsProductCode: 'XJBK', totalfee: 20 }
  const packageProduct = { ...expressProduct, omsProductCode: 'PACKAGE', totalfee: 28 }
  const sorted = sortExpressQuotes([yty, xjbk, packageProduct])

  assert.deepEqual(
    sorted.map(product => product.omsProductCode),
    ['XJBK', 'PACKAGE', 'YTY']
  )
  assert.equal(selectDefaultExpressQuote(sorted, false), packageProduct)
  assert.equal(selectDefaultExpressQuote([yty, xjbk], false), xjbk)
  assert.equal(selectDefaultExpressQuote([yty], false), yty)
  assert.deepEqual(sortExpressQuotes([packageProduct]), [packageProduct])
})
