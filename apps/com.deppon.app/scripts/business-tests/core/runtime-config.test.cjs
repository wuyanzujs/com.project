require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const runtimeBuild = require('../../../config/runtime-build.cjs')

const cases = [
  {
    name: 'runtime config rejects credentials embedded in every app url',
    run() {
      const tokenViolations = runtimeBuild.validateRuntimeEnvironment({
        APP_MEMBER_WEB_URL:
          'https://mastest.deppon.com.cn/cms-h5/h5.html#/welfare?access_Token=fixed'
      })
      const userInfoViolations = runtimeBuild.validateRuntimeEnvironment({
        APP_API_BASE_URL: 'https://user:password@owstest.deppon.com'
      })

      assert.equal(
        tokenViolations.some(message => message.includes('固定 token')),
        true
      )
      assert.equal(
        userInfoViolations.some(message => message.includes('用户名或密码')),
        true
      )
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
