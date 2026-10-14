require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const CookieManager = require('@react-native-cookies/cookies')

const { createAppSessionCookieRuntime } = require('@/shared/native/AppSessionCookie')

test('native cookie cleanup expires only configured ECO_TOKEN cookies', async t => {
  const originalSet = CookieManager.set
  const originalClearAll = CookieManager.clearAll
  const originalFlush = CookieManager.flush
  const writes = []
  let clearAllCalls = 0

  t.after(() => {
    CookieManager.set = originalSet
    CookieManager.clearAll = originalClearAll
    CookieManager.flush = originalFlush
  })

  CookieManager.set = async (url, cookie, useWebKit) => {
    writes.push({ url, cookie, useWebKit })
    return true
  }
  CookieManager.clearAll = async () => {
    clearAllCalls += 1
    return true
  }
  CookieManager.flush = async () => true

  const runtime = createAppSessionCookieRuntime(['https://api.example.com/v1', 'https://web.example.com'])
  assert.equal(await runtime.write('ECO_TOKEN=token-1;'), true)
  assert.equal(await runtime.clear(), true)
  assert.equal(clearAllCalls, 0)
  assert.equal(writes.length, 8)
  assert.deepEqual(
    writes.slice(4).map(item => [item.url, item.cookie.name, item.cookie.value]),
    [
      ['https://api.example.com', 'ECO_TOKEN', ''],
      ['https://api.example.com', 'ECO_TOKEN', ''],
      ['https://web.example.com', 'ECO_TOKEN', ''],
      ['https://web.example.com', 'ECO_TOKEN', '']
    ]
  )
})

test('native cookie cleanup fails when any configured cookie write fails', async t => {
  const originalSet = CookieManager.set
  const originalFlush = CookieManager.flush
  t.after(() => {
    CookieManager.set = originalSet
    CookieManager.flush = originalFlush
  })

  CookieManager.set = async (url, cookie) => {
    if (cookie.value === '' && url.includes('web.example.com')) {
      throw new Error('web cookie unavailable')
    }
    return true
  }
  CookieManager.flush = async () => true

  const runtime = createAppSessionCookieRuntime(['https://api.example.com', 'https://web.example.com'])
  assert.equal(await runtime.clear(), false)
})
