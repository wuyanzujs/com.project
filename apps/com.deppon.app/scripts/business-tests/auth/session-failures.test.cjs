require('../support/register.cjs')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const { test } = require('node:test')
const { CACHE_KEYS, createCacheStorageKey } = require('@/cache/keys')
const { getStorageValue, setStorageValue } = require('@/cache/storage')
const {
  clearSessionCookie,
  configureSessionCookieRuntime,
  getEcoToken,
  recoverSessionCookie,
  saveSessionCookieFromResponse,
  setSessionCookie
} = require('@/request/cookieJar')
const { authApi } = require('@/services/auth/auth.api')
const { authService } = require('@/services/auth/auth.service')
const { clearAppSession, saveCurrentUser } = require('@/services/auth/session')
const { createDeferred } = require('../support/deferred.cjs')
const { createStorageFixture } = require('../support/storage-fixture.cjs')

function createSessionFixture(t) {
  const fixture = createStorageFixture(t)
  t.after(async () => {
    configureSessionCookieRuntime(null)
    await clearAppSession()
  })
  return fixture
}

test('failed cookie deletion blocks recovery and persists an invalidation marker', async t => {
  const { disk, Taro } = createSessionFixture(t)
  await setSessionCookie('ECO_TOKEN=old-token;')
  let nativeReads = 0
  configureSessionCookieRuntime({
    async read() {
      nativeReads += 1
      return 'ECO_TOKEN=old-native-token;'
    },
    async write() {
      return true
    },
    async clear() {
      return true
    }
  })
  t.mock.method(Taro, 'removeStorage', async ({ key }) => {
    if (key === CACHE_KEYS.cookie) {
      throw new Error('cookie deletion failed')
    }
    disk.delete(key)
  })

  assert.equal(await clearSessionCookie(), false)
  assert.equal(disk.get(CACHE_KEYS.cookie), 'ECO_TOKEN=old-token;')
  assert.equal(disk.get(CACHE_KEYS.sessionInvalidated), '1')
  assert.equal(getEcoToken(), '')
  assert.equal(await recoverSessionCookie('https://owstest.deppon.com'), '')
  assert.equal(nativeReads, 0)

  const restart = spawnSync(
    process.execPath,
    [path.join(__dirname, '../support/restart-session.cjs')],
    { input: JSON.stringify([...disk]), encoding: 'utf8', timeout: 10000 }
  )
  assert.equal(restart.status, 0, restart.stderr)
  assert.deepEqual(JSON.parse(restart.stdout), { token: '', nativeReads: 0 })
})

test('failed native cookie cleanup keeps the invalidation marker', async t => {
  const { disk } = createSessionFixture(t)
  await setSessionCookie('ECO_TOKEN=old-token;')
  configureSessionCookieRuntime({
    async read() {
      return 'ECO_TOKEN=old-native-token;'
    },
    async write() {
      return true
    },
    async clear() {
      return false
    }
  })

  assert.equal(await clearSessionCookie(), false)
  assert.equal(disk.has(CACHE_KEYS.cookie), false)
  assert.equal(disk.get(CACHE_KEYS.sessionInvalidated), '1')
  assert.equal(getEcoToken(), '')
})

test('a successful cleanup retry removes the marker and all session data', async t => {
  const { disk, Taro } = createSessionFixture(t)
  await setSessionCookie('ECO_TOKEN=old-token;')
  const removal = t.mock.method(Taro, 'removeStorage', async () => {
    throw new Error('temporary deletion failure')
  })
  assert.equal(await clearSessionCookie(), false)
  removal.mock.restore()

  assert.equal(await clearAppSession(), true)
  assert.equal(disk.has(CACHE_KEYS.cookie), false)
  assert.equal(disk.has(CACHE_KEYS.sessionInvalidated), false)
  assert.equal(getEcoToken(), '')
})

test('a fresh login can replace an invalidated cookie after deletion recovers', async t => {
  const { disk, Taro } = createSessionFixture(t)
  await setSessionCookie('ECO_TOKEN=old-token;')
  const removal = t.mock.method(Taro, 'removeStorage', async () => {
    throw new Error('temporary deletion failure')
  })
  assert.equal(await clearSessionCookie(), false)
  removal.mock.restore()

  assert.equal(await setSessionCookie('ECO_TOKEN=fresh-token;'), true)
  assert.equal(getEcoToken(), 'fresh-token')
  assert.equal(disk.get(CACHE_KEYS.cookie), 'ECO_TOKEN=fresh-token;')
  assert.equal(disk.has(CACHE_KEYS.sessionInvalidated), false)
})

test('in-flight native recovery cannot restore a cookie after logout', async t => {
  createSessionFixture(t)
  const started = createDeferred()
  const release = createDeferred()
  configureSessionCookieRuntime({
    async read() {
      started.resolve()
      await release.promise
      return 'ECO_TOKEN=obsolete-token;'
    },
    async write() {
      return true
    },
    async clear() {
      return true
    }
  })

  const recovery = recoverSessionCookie('https://owstest.deppon.com')
  await started.promise
  assert.equal(await clearAppSession(), true)
  release.resolve()
  assert.equal(await recovery, '')
  assert.equal(getEcoToken(), '')
})

test('failed account cache cleanup prevents switching to another user', async t => {
  const { disk, Taro } = createSessionFixture(t)
  const originalUser = { mobile: '13800138000' }
  await setStorageValue(CACHE_KEYS.userInfo, JSON.stringify(originalUser))
  await setStorageValue(
    CACHE_KEYS.accountCacheOwner,
    JSON.stringify(originalUser)
  )
  const draftKey = createCacheStorageKey(CACHE_KEYS.expressDraft)
  await setStorageValue(draftKey, 'private-old-draft')
  t.mock.method(Taro, 'removeStorage', async ({ key }) => {
    if (key === draftKey) {
      throw new Error('private cache cannot be removed')
    }
    disk.delete(key)
  })

  assert.equal(await saveCurrentUser({ mobile: '13900139000' }), false)
  assert.deepEqual(
    JSON.parse(getStorageValue(CACHE_KEYS.userInfo)),
    originalUser
  )
  assert.deepEqual(
    JSON.parse(disk.get(CACHE_KEYS.accountCacheOwner)),
    originalUser
  )
  assert.equal(getStorageValue(draftKey), 'private-old-draft')
})

test('logout reports cleanup failure instead of claiming success', async t => {
  const { Taro } = createSessionFixture(t)
  await setSessionCookie('ECO_TOKEN=old-token;')
  t.mock.method(authApi, 'logout', async () => ({ status: true }))
  t.mock.method(Taro, 'removeStorage', async () => {
    throw new Error('deletion failed')
  })

  await assert.rejects(authService.logout(), /本机数据清理失败/)
  assert.equal(getEcoToken(), '')
})

test('ordinary responses cannot restore an invalidated cookie from the native jar', async t => {
  const { Taro } = createSessionFixture(t)
  await setSessionCookie('ECO_TOKEN=old-token;')
  configureSessionCookieRuntime({
    async read() {
      return 'ECO_TOKEN=old-native-token;'
    },
    async write() {
      return true
    },
    async clear() {
      return false
    }
  })
  assert.equal(await clearSessionCookie(), false)
  const response = {
    url: 'https://owstest.deppon.com/public/config',
    headers: {},
    statusCode: 200,
    method: 'GET',
    data: {}
  }
  assert.equal(await saveSessionCookieFromResponse(response), '')
  assert.equal(getEcoToken(), '')
  const markerRemoval = t.mock.method(Taro, 'removeStorage', async () => {
    throw new Error('marker still cannot be removed')
  })
  assert.equal(await setSessionCookie('ECO_TOKEN=new-token;'), false)
  assert.equal(getEcoToken(), '')
  markerRemoval.mock.restore()
})

test('logout waits for pending native writes before clearing the cookie jar', async t => {
  const { disk } = createSessionFixture(t)
  await setSessionCookie('ECO_TOKEN=old-token;')
  const started = createDeferred()
  const release = createDeferred()
  let nativeCookie = ''
  configureSessionCookieRuntime({
    async read() {
      return nativeCookie
    },
    async write(cookie) {
      started.resolve()
      await release.promise
      nativeCookie = cookie
      return true
    },
    async clear() {
      nativeCookie = ''
      return true
    }
  })
  const pendingWrite = setSessionCookie('ECO_TOKEN=pending-token;')
  await started.promise
  const logout = clearSessionCookie()
  assert.equal(getEcoToken(), '')
  release.resolve()
  assert.equal(await pendingWrite, false)
  assert.equal(await logout, true)
  assert.equal(nativeCookie, '')
  assert.equal(disk.has(CACHE_KEYS.cookie), false)
})

test('an explicit SMS login can replace a session invalidated by native cleanup failure', async t => {
  const { disk, Taro } = createSessionFixture(t)
  await setSessionCookie('ECO_TOKEN=old-token;')
  configureSessionCookieRuntime({
    async read() {
      return 'ECO_TOKEN=old-native-token;'
    },
    async write() {
      return true
    },
    async clear() {
      return false
    }
  })
  assert.equal(await clearSessionCookie(), false)
  t.mock.method(Taro, 'request', async () => ({
    statusCode: 200,
    header: { 'set-cookie': 'ECO_TOKEN=fresh-login-token; Path=/; HttpOnly' },
    data: { status: true, result: { mobile: '13800138000' } }
  }))

  const response = await authService.loginWithSms('13800138000', '123456')
  assert.equal(response.status, true, response.message)
  assert.equal(getEcoToken(), 'fresh-login-token')
  assert.equal(disk.has(CACHE_KEYS.sessionInvalidated), false)
})

test('concurrent responses with the same cookie do not invalidate login persistence', async t => {
  createSessionFixture(t)
  const started = createDeferred()
  const release = createDeferred()
  configureSessionCookieRuntime({
    async read() {
      return ''
    },
    async write() {
      started.resolve()
      await release.promise
      return true
    },
    async clear() {
      return true
    }
  })
  const first = setSessionCookie('ECO_TOKEN=same-login-token;')
  await started.promise
  const second = setSessionCookie('ECO_TOKEN=same-login-token;')
  release.resolve()

  assert.deepEqual(await Promise.all([first, second]), [true, true])
  assert.equal(getEcoToken(), 'same-login-token')
})
