require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { createSignCodePayload, signService } = require('@/services/sign')

const cases = [
  {
    name: 'sign code rules create qr payload and validate real names',
    run() {
      assert.equal(
        createSignCodePayload(' CODE 123 '),
        'https://www.deppon.com/user/sign?code=CODE%20123'
      )
      assert.equal(createSignCodePayload(''), '')
      assert.deepEqual(signService.validateRealName(' 张三 '), {
        status: true,
        message: '',
        value: '张三'
      })
      assert.equal(
        signService.validateRealName('A').message,
        '请输入 2-20 个字符的签收人姓名'
      )
      assert.equal(
        signService.validateRealName('张<三').message,
        '签收人姓名包含非法字符'
      )
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
