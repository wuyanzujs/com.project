require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { createExpressProductQuoteView } = require('@/services/express/core/express.quoteView')

test('price detail separates freight from value-added fees without repeating the order total', () => {
  const view = createExpressProductQuoteView({
    productName: '小件标快',
    omsProductCode: 'PACKAGE',
    totalfee: 25.3,
    detail: [
      { priceEntryCode: ' frt ', priceEntryName: '基础运费', caculateFee: 20 },
      { priceEntryCode: 'BZ', priceEntryName: '纸箱', caculateFee: 0.1 },
      { priceEntryCode: 'SRPS', priceEntryName: '双人派送', caculateFee: 5.2 }
    ]
  })

  assert.equal(view.priceText, '¥25.3', 'the order total remains available to the submit bar')
  assert.equal(view.baseFeeText, '¥20')
  assert.equal(view.addedFeeText, '¥5.3', 'sum money in cents')
  assert.deepEqual(
    view.addedFeeRows.map(row => row.key),
    ['BZ', 'SRPS']
  )
  assert.deepEqual(
    view.feeRows.map(row => row.key),
    ['FRT', 'BZ', 'SRPS'],
    'other consumers keep the complete fee detail'
  )
  assert.equal(view.discountTotal, 0)
})

test('missing freight does not get replaced with the order total or an invented free price', () => {
  const view = createExpressProductQuoteView({ productName: '标快', omsProductCode: 'PACKAGE', totalfee: 10, detail: null })
  assert.equal(view.baseFeeText, '¥--')
  assert.equal(view.addedFeeText, '¥--')
  assert.deepEqual(view.feeRows, [])

  const free = createExpressProductQuoteView({
    productName: '标快',
    omsProductCode: 'PACKAGE',
    totalfee: 0,
    detail: [{ priceEntryCode: 'FRT', priceEntryName: '运费', caculateFee: 0 }]
  })
  assert.equal(free.baseFeeText, '¥0')
})

test('price detail restores discount rows and bill type from the quote response', () => {
  const view = createExpressProductQuoteView({
    productName: '标快',
    omsProductCode: 'PACKAGE',
    totalfee: 20,
    detail: [{ priceEntryCode: 'FRT', priceEntryName: '运费', caculateFee: 19 }],
    discount: [{ marketCode: 'YHJ', marketName: '运费优惠券', reduceFee: 1 }],
    expBillCalculateResponse: { billType: 'CALC_WEIGHT' }
  })

  assert.equal(view.baseFeeText, '¥20')
  assert.equal(view.discountTotal, 1)
  assert.deepEqual(view.discountRows, [{ key: 'YHJ', name: '运费优惠券', amount: 1 }])
  assert.equal(view.billType, 'CALC_WEIGHT')
})
