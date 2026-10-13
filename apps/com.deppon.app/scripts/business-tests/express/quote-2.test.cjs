require('../support/register.cjs')
const { test } = require('node:test')
const {
  createExpressQuoteRequestKey
} = require('@/services/express/requestKey')
const assert = require('node:assert/strict')
const { createValidExpressDraft } = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'express quote request key changes with warehouse and address inputs',
    run() {
      const base = createValidExpressDraft()
      const baseKey = createExpressQuoteRequestKey(base)
      const clonedKey = createExpressQuoteRequestKey({
        ...base,
        consignee: { ...base.consignee },
        warehouse: { ...base.warehouse }
      })
      const warehouseKey = createExpressQuoteRequestKey({
        ...base,
        warehouse: {
          ...base.warehouse,
          enabled: true,
          warehouseType: '3',
          warehouseCode: 'WH-CODE-002'
        }
      })
      const addressKey = createExpressQuoteRequestKey({
        ...base,
        consignee: {
          ...base.consignee,
          address: `${base.consignee.address}附楼`
        }
      })

      assert.equal(clonedKey, baseKey)
      assert.notEqual(warehouseKey, baseKey)
      assert.notEqual(addressKey, baseKey)
      assert.notEqual(addressKey, warehouseKey)
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
