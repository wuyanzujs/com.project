require('../support/register.cjs')
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createServiceFailure } = require('@/services/serviceResponse')

const cases = [
  {
    name: 'service response factory creates consistent failure responses',
    run() {
      assert.deepEqual(createServiceFailure('业务失败'), {
        status: false,
        message: '业务失败',
        result: null
      })
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
