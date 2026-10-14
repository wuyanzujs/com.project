require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const {
  clearExpressCollection,
  createExpressCollectionDraft,
  getExpressCollectionFee,
  maskExpressCollectionAccount,
  normalizeExpressCollectionAmountInput,
  parseExpressCollectionAmount,
  updateExpressCollectionDetails,
  updateExpressCollectionPricing,
  validateExpressCollection
} = require('@/services/express/collection.rules')
const { selectExpressProduct } = require('@/services/express/express.draft')
const { buildCreateOrderRequest, buildFreightRequest } = require('@/services/express/express.payload')

const { createValidExpressDraft, expressProduct } = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'express collection rules validate account agreement amount and limit',
    run() {
      const emptyCollection = createExpressCollectionDraft()

      assert.deepEqual(validateExpressCollection(emptyCollection), [])
      assert.equal(parseExpressCollectionAmount('12.345'), 12.35)
      assert.equal(parseExpressCollectionAmount('-1'), 0)
      assert.equal(normalizeExpressCollectionAmountInput('0012.345元'), '12.34')
      assert.equal(normalizeExpressCollectionAmountInput('.5'), '0.5')
      assert.equal(maskExpressCollectionAccount('6222 0000 1234'), '**** 1234')

      assert.deepEqual(
        validateExpressCollection({
          ...emptyCollection,
          type: 'NORMAL'
        }),
        ['请填写代收货款金额', '请选择代收货款收款账户', '请阅读并同意代收货款服务协议']
      )
      assert.equal(
        validateExpressCollection({
          ...emptyCollection,
          type: 'INTRADAY',
          amount: 1000,
          account: '622200001234',
          accountName: '张三',
          limit: 500,
          agreementAccepted: true
        })[0],
        '代收货款金额不能超过 500 元'
      )
    }
  },
  {
    name: 'express collection mutations drive quote and order payloads',
    run() {
      let draft = updateExpressCollectionPricing(createValidExpressDraft(), {
        type: 'INTRADAY',
        amount: 125.555
      })

      assert.equal(draft.collection.amount, 125.56)
      assert.equal(draft.selectedProduct, null)
      assert.equal(draft.quoteStaleReason, '代收货款信息变化，请重新获取价格')

      draft = updateExpressCollectionDetails(draft, {
        account: ' 6222 0000 1234 ',
        accountName: ' 张三 ',
        limit: 500,
        agreementAccepted: true
      })
      draft = selectExpressProduct(draft, {
        ...expressProduct,
        detail: [
          {
            priceEntryCode: 'HK',
            priceEntryName: '代收手续费',
            caculateFee: 3.5
          }
        ]
      })

      const freightRequest = buildFreightRequest(draft)
      const orderRequest = buildCreateOrderRequest(draft)

      assert.deepEqual(validateExpressCollection(draft.collection), [])
      assert.equal(freightRequest.reciveLoanType, 'R1')
      assert.equal(freightRequest.reviceMoneyAmount, 125.56)
      assert.equal(orderRequest.receive[0].reciveLoanType, 'INTRADAY')
      assert.equal(orderRequest.receive[0].reciveLoanAccount, '622200001234')
      assert.equal(orderRequest.receive[0].accountName, '张三')
      assert.equal(orderRequest.receive[0].reviceMoneyAmount, 125.56)
      assert.equal(getExpressCollectionFee(draft.selectedProduct), 3.5)

      const cleared = clearExpressCollection(draft)

      assert.equal(cleared.collection.type, '')
      assert.equal(cleared.collection.limit, 500)
      assert.equal(cleared.selectedProduct, null)
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
