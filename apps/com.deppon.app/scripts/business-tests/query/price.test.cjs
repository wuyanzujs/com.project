require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { validateExpressPriceTimeDraft } = require('@/services/express/express.draft')
const { createExpressProductQuoteView } = require('@/services/express/express.quoteView')

const { createValidExpressDraft } = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'price-time validation only requires address and goods metrics',
    run() {
      const quoteView = createExpressProductQuoteView({
        productName: '精准卡航',
        omsProductCode: 'PACKAGE',
        days: null,
        daysFormat: null,
        arriveDate: '明日达',
        message: null,
        label: '',
        totalfee: 28,
        billWeight: 3.5,
        detail: [
          {
            priceEntryCode: 'FRT',
            priceEntryName: '基础运费',
            caculateFee: 20
          },
          {
            priceEntryCode: 'BF',
            priceEntryName: '保价费',
            caculateFee: 0
          }
        ]
      })
      const emptyPriceView = createExpressProductQuoteView({
        productName: '',
        omsProductCode: '',
        days: null,
        arriveDate: null,
        message: null,
        label: '',
        totalfee: null,
        detail: null,
        billWeight: null
      })
      const draft = {
        ...createValidExpressDraft(),
        goods: {
          ...createValidExpressDraft().goods,
          weight: 0,
          count: 0
        }
      }
      const result = validateExpressPriceTimeDraft(draft)

      assert.equal(result.valid, false)
      assert.ok(result.messages.includes('请填写正确的货物重量'))
      assert.ok(result.messages.includes('货物件数至少为1件'))
      assert.equal(quoteView.name, '精准卡航')
      assert.equal(quoteView.priceText, '¥28')
      assert.equal(quoteView.priceWithSuffixText, '¥28起')
      assert.equal(quoteView.timeText, '明日达')
      assert.equal(quoteView.billWeightText, '计费重量 3.5kg')
      assert.deepEqual(quoteView.feeRows, [
        {
          key: 'FRT',
          name: '基础运费',
          amount: 20
        }
      ])
      assert.equal(emptyPriceView.name, '德邦快递')
      assert.equal(emptyPriceView.priceText, '--')
      assert.equal(emptyPriceView.timeText, '时效待确认')
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
