require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const runtimeBuild = require('../../../config/runtime-build.cjs')

const productionEnv = {
  APP_ENV: 'production',
  APP_API_BASE_URL: 'https://api.example.com',
  APP_WEB_BASE_URL: 'https://web.example.com',
  APP_SERVICE_WEB_URL: 'https://service.example.com/home',
  APP_MEMBER_WEB_URL: 'https://member.example.com/home',
  APP_WEB_ALLOWED_HOSTS: 'web.example.com,service.example.com,member.example.com',
  APP_SYSTEM_CODE: 'APP',
  APP_CLIENT_CHANNEL: 'APP',
  APP_OMS_CHANNEL: 'APP',
  APP_ECARD_PMC_SYSTEM_CODE: 'APP'
}

const cases = [
  {
    name: 'runtime config rejects credentials embedded in every app url',
    run() {
      const tokenViolations = runtimeBuild.validateRuntimeEnvironment({
        APP_MEMBER_WEB_URL: 'https://mastest.deppon.com.cn/cms-h5/h5.html#/welfare?access_Token=fixed'
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
  },
  {
    name: 'runtime config matches forbidden production markers by hostname boundary',
    run() {
      const nearMatchViolations = runtimeBuild.validateRuntimeEnvironment({
        ...productionEnv,
        APP_WEB_ALLOWED_HOSTS: `${productionEnv.APP_WEB_ALLOWED_HOSTS},owstestish.example.com`
      })
      const exactMatchViolations = runtimeBuild.validateRuntimeEnvironment({
        ...productionEnv,
        APP_WEB_ALLOWED_HOSTS: `${productionEnv.APP_WEB_ALLOWED_HOSTS},api-owstest.example.com`
      })

      assert.equal(
        nearMatchViolations.some(message => message.includes('测试 host')),
        false
      )
      assert.equal(
        exactMatchViolations.some(message => message.includes('测试 host')),
        true
      )
    }
  },
  {
    name: 'runtime config rejects malformed webview hosts',
    run() {
      const violations = runtimeBuild.validateRuntimeEnvironment({
        ...productionEnv,
        APP_WEB_ALLOWED_HOSTS: 'web.example.com,.invalid.example.com'
      })

      assert.equal(
        violations.some(message => message.includes('非法 host')),
        true
      )
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
