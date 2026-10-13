require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { configureRequest, onRequestEvent } = require('@/request')
const { depponHttp } = require('@/request/deppon')
const {
  clearSessionCookie,
  getEcoToken,
  setSessionCookie
} = require('@/request/cookieJar')
const { createDeferred } = require('../support/deferred.cjs')
const { createStorageFixture } = require('../support/storage-fixture.cjs')

function setup(t) {
  const fixture = createStorageFixture(t)
  configureRequest({ baseURL: 'https://owstest.deppon.com', timeout: 15000 })
  t.after(clearSessionCookie)
  return fixture
}

test('HTTP integration persists login cookies and carries them on secure requests', async t => {
  const { Taro } = setup(t)
  const requests = []
  t.mock.method(Taro, 'request', async request => {
    requests.push(request)
    return {
      statusCode: 200,
      header: { 'set-cookie': 'ECO_TOKEN=login-token; Path=/; HttpOnly' },
      data: { status: true, result: { mobile: '13800138000' } }
    }
  })

  const login = await depponHttp.post('/login', {}, { login: false })
  assert.equal(login.status, true)
  assert.equal(login.sessionCookieSaved, true)
  assert.equal(getEcoToken(), 'login-token')
  await depponHttp.get('/secure/orders')
  assert.equal(requests[0].url, 'https://owstest.deppon.com/login')
  assert.equal(requests[1].header.Cookie, 'ECO_TOKEN=login-token;')
  assert.equal(requests[1].credentials, 'include')
})

test('a current-session 401 clears credentials and emits authentication expiry', async t => {
  const { Taro } = setup(t)
  await setSessionCookie('ECO_TOKEN=old-token;')
  const expired = []
  t.after(onRequestEvent('authExpired', event => expired.push(event)))
  t.mock.method(Taro, 'request', async () => ({
    statusCode: 401,
    header: {},
    data: { status: false, message: 'expired' }
  }))

  const response = await depponHttp.get('/secure/orders')
  assert.equal(response.authExpired, true)
  assert.equal(getEcoToken(), '')
  assert.equal(expired.length, 1)
  assert.equal(expired[0].statusCode, 401)
})

test('an obsolete 401 cannot clear a newly established session', async t => {
  const { Taro } = setup(t)
  await setSessionCookie('ECO_TOKEN=old-token;')
  const started = createDeferred()
  const release = createDeferred()
  const expired = []
  t.after(onRequestEvent('authExpired', event => expired.push(event)))
  t.mock.method(Taro, 'request', async () => {
    started.resolve()
    return release.promise
  })

  const pending = depponHttp.get('/secure/orders')
  await started.promise
  await setSessionCookie('ECO_TOKEN=new-token;')
  release.resolve({
    statusCode: 401,
    header: {},
    data: { status: false }
  })
  const response = await pending
  assert.equal(Boolean(response.authExpired), false)
  assert.equal(getEcoToken(), 'new-token')
  assert.equal(expired.length, 0)
})

test('HTTP timeout and rate limiting preserve their distinct outcomes', async t => {
  const { Taro } = setup(t)
  t.mock.method(Taro, 'request', async () => {
    throw new Error('request timed out')
  })
  const timeout = await depponHttp.get('/orders')
  assert.equal(timeout.status, false)
  assert.equal(timeout.transportFailure, true)
  assert.match(timeout.message, /超时/)

  const limited = []
  t.after(onRequestEvent('rateLimited', event => limited.push(event)))
  t.mock.method(Taro, 'request', async () => ({
    statusCode: 429,
    header: {},
    data: { status: false, message: 'too many requests' }
  }))
  const response = await depponHttp.get('/orders')
  assert.equal(response.status, false)
  assert.equal(Boolean(response.transportFailure), false)
  assert.equal(limited.length, 1)
})
