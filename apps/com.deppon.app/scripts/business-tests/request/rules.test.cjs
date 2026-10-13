require('../support/register.cjs')
const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  isDepponSuccessStatus,
  isResponseForCurrentSession,
  shouldAcceptDepponHttpStatus,
  shouldEmitAuthExpiredEvent,
  shouldEmitRateLimitedEvent
} = require('@/request/deppon.rules')
const { RequestError, getRequestFailureMessage } = require('@/request/error')

const cases = [
  {
    name: 'deppon request rules normalize OWS success and accepted http status',
    run() {
      assert.equal(isDepponSuccessStatus(true), true)
      assert.equal(isDepponSuccessStatus('1'), true)
      assert.equal(isDepponSuccessStatus(0), true)
      assert.equal(isDepponSuccessStatus('success'), true)
      assert.equal(isDepponSuccessStatus('0'), false)
      assert.equal(isDepponSuccessStatus(1), false)
      assert.equal(shouldAcceptDepponHttpStatus(200), true)
      assert.equal(shouldAcceptDepponHttpStatus(401), true)
      assert.equal(shouldAcceptDepponHttpStatus(429), true)
      assert.equal(shouldAcceptDepponHttpStatus(500), false)
    }
  },
  {
    name: 'deppon request rules detect auth expired and rate limited responses',
    run() {
      assert.equal(shouldEmitAuthExpiredEvent(true, 401, '901'), true)
      assert.equal(shouldEmitAuthExpiredEvent(false, 401, '901'), false)
      assert.equal(shouldEmitAuthExpiredEvent(true, 200, '901'), true)
      assert.equal(shouldEmitAuthExpiredEvent(true, 401, 'failed'), true)
      assert.equal(shouldEmitRateLimitedEvent(429, false), true)
      assert.equal(shouldEmitRateLimitedEvent(200, 429), true)
      assert.equal(shouldEmitRateLimitedEvent(200, false), false)
      assert.equal(isResponseForCurrentSession('cookie-a', 'cookie-a'), true)
      assert.equal(isResponseForCurrentSession('cookie-a', 'cookie-b'), false)
      assert.equal(isResponseForCurrentSession('', ''), true)
    }
  },
  {
    name: 'request failures expose stable user-facing retry messages',
    run() {
      assert.equal(
        getRequestFailureMessage(
          new RequestError({
            type: 'NETWORK_ERROR',
            message: 'network failed',
            url: '/orders',
            method: 'GET'
          })
        ),
        '网络连接失败，请检查网络后重试'
      )
      assert.equal(
        getRequestFailureMessage(
          new RequestError({
            type: 'NETWORK_ERROR',
            message: 'network failed',
            url: '/orders',
            method: 'GET',
            cause: { errMsg: 'request:fail timeout' }
          })
        ),
        '请求超时，请稍后重试'
      )
      assert.equal(
        getRequestFailureMessage(
          new RequestError({
            type: 'HTTP_ERROR',
            message: 'http failed',
            url: '/orders',
            method: 'GET',
            statusCode: 503
          })
        ),
        '服务暂时不可用，请稍后重试'
      )
      assert.equal(
        getRequestFailureMessage(
          new RequestError({
            type: 'HTTP_ERROR',
            message: 'not found',
            url: '/orders',
            method: 'GET',
            statusCode: 404
          })
        ),
        null
      )
      assert.equal(getRequestFailureMessage(new Error('boom')), null)
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
