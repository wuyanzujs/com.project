require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { authApi, authService, createAppLoginRegisterRecord, createAppSmsLoginRequest } = require('@/services/auth')

const cases = [
  {
    name: 'sms auth request keeps the reference login contract for App runtime',
    async run() {
      const originalSendSmsMessage = authApi.sendSmsMessage
      const originalLogin = authApi.login
      let smsRequest = null
      let loginRequest = null

      try {
        authApi.sendSmsMessage = async request => {
          smsRequest = request

          return { status: true, result: null }
        }
        authApi.login = async request => {
          loginRequest = request

          return {
            status: false,
            message: 'mock login rejected',
            result: null
          }
        }

        const smsResponse = await authService.sendLoginSms('13800138000')
        const loginResponse = await authService.loginWithSms('13800138000', '123456')

        assert.equal(smsResponse.status, true)
        assert.deepEqual(smsRequest, {
          mobile: '13800138000',
          sysCode: 'APP',
          messageType: 'login'
        })
        assert.deepEqual(loginRequest, {
          account: '13800138000',
          verifyCode: '123456',
          loginType: 'MOBILE_VERIFICATION_CODE',
          sysCode: 'APP',
          registerRecord: createAppLoginRegisterRecord('')
        })
        assert.equal(loginResponse.status, false)
        assert.equal(loginResponse.message, 'mock login rejected')
      } finally {
        authApi.sendSmsMessage = originalSendSmsMessage
        authApi.login = originalLogin
      }
    }
  },
  {
    name: 'App login register record keeps only safe return context',
    run() {
      assert.deepEqual(createAppSmsLoginRequest(' 13800138000 ', ' 123456 ', '/pages/express/index?source=LOGIN'), {
        account: '13800138000',
        verifyCode: '123456',
        loginType: 'MOBILE_VERIFICATION_CODE',
        sysCode: 'APP',
        registerRecord: {
          ...createAppLoginRegisterRecord('/pages/express/index'),
          registerPage: 'pages/express/index'
        }
      })
      assert.equal(createAppLoginRegisterRecord('https://example.com').registerPage, '')
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
