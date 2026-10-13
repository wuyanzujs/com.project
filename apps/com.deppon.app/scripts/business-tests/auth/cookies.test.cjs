require('../support/register.cjs')
const Taro = require('@tarojs/taro')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { CACHE_KEYS } = require('@/cache/keys')
const {
  getStorageValue,
  removeStorageValue,
  setStorageValue
} = require('@/cache/storage')
const {
  createEcoSessionCookie,
  extractEcoToken,
  getSetCookieFromHeaders,
  normalizeCookieList
} = require('@/request/cookie.rules')
const {
  clearSessionCookie,
  configureSessionCookieRuntime,
  getResponseSetCookie,
  hydrateSessionCookie,
  saveSessionCookieFromResponse
} = require('@/request/cookieJar')
const { depponHttp } = require('@/request/deppon')
const {
  authApi,
  authService,
  clearAppSession,
  createAppSmsLoginRequest
} = require('@/services/auth')
const authSession = require('@/services/auth/session')

const cases = [
  {
    name: 'cookie rules extract ECO_TOKEN from response headers and cookie lists',
    run() {
      assert.equal(
        extractEcoToken('foo=bar; ECO_TOKEN=token-123; path=/'),
        'token-123'
      )
      assert.equal(extractEcoToken('foo=bar;'), '')
      assert.equal(
        createEcoSessionCookie('foo=bar; ECO_TOKEN=token-123; path=/'),
        'ECO_TOKEN=token-123;'
      )
      assert.equal(
        getSetCookieFromHeaders({
          'set-cookie': ['foo=bar', 'ECO_TOKEN=token-456; Path=/']
        }),
        'foo=bar;ECO_TOKEN=token-456; Path=/'
      )
      const fetchHeaders = {
        get(name) {
          return name === 'set-cookie'
            ? 'foo=bar; Path=/, ECO_TOKEN=rn-token; Path=/'
            : null
        }
      }
      const fetchHeadersWithSetCookie = {
        getSetCookie() {
          return ['foo=bar; Path=/', 'ECO_TOKEN=rn-set-cookie-token; Path=/']
        }
      }

      assert.equal(
        getSetCookieFromHeaders(fetchHeaders),
        'foo=bar; Path=/, ECO_TOKEN=rn-token; Path=/'
      )
      assert.equal(
        extractEcoToken(getSetCookieFromHeaders(fetchHeaders)),
        'rn-token'
      )
      assert.equal(
        extractEcoToken(getSetCookieFromHeaders(fetchHeadersWithSetCookie)),
        'rn-set-cookie-token'
      )
      assert.equal(
        normalizeCookieList(['foo=bar', 'ECO_TOKEN=token-789; Path=/']),
        'foo=bar;ECO_TOKEN=token-789; Path=/'
      )
      assert.equal(
        normalizeCookieList([
          { name: 'foo', value: 'bar' },
          { name: 'ECO_TOKEN', value: 'token-object' }
        ]),
        'foo=bar;ECO_TOKEN=token-object'
      )
      assert.equal(
        getSetCookieFromHeaders({
          raw() {
            return {
              'set-cookie': ['ECO_TOKEN=token-raw; Path=/']
            }
          }
        }),
        'ECO_TOKEN=token-raw; Path=/'
      )
      assert.equal(
        getSetCookieFromHeaders({
          map: {
            'set-cookie': 'ECO_TOKEN=token-map; Path=/'
          }
        }),
        'ECO_TOKEN=token-map; Path=/'
      )
    }
  },
  {
    name: 'cookie facade falls back to alternate response headers',
    run() {
      assert.equal(
        getResponseSetCookie({
          headers: {},
          fallbackHeaders: {
            'set-cookie': ['ECO_TOKEN=fallback-token; Path=/']
          },
          cookies: []
        }),
        'ECO_TOKEN=fallback-token; Path=/'
      )
    }
  },
  {
    name: 'RN cookie facade recovers ECO_TOKEN from the native session jar',
    async run() {
      const originalCookie = getStorageValue(CACHE_KEYS.cookie)
      const originalSetStorage = Taro.setStorage
      const originalRemoveStorage = Taro.removeStorage
      const readUrls = []
      const writtenCookies = []
      let clearCount = 0

      configureSessionCookieRuntime({
        async read(url) {
          readUrls.push(url)
          return 'ECO_TOKEN=native-login-token;'
        },
        async write(cookie) {
          writtenCookies.push(cookie)
          return true
        },
        async clear() {
          clearCount += 1
          return true
        }
      })

      try {
        Taro.setStorage = () => Promise.resolve({ errMsg: 'setStorage:ok' })
        Taro.removeStorage = () =>
          Promise.resolve({ errMsg: 'removeStorage:ok' })
        await removeStorageValue(CACHE_KEYS.cookie)

        const savedCookie = await saveSessionCookieFromResponse({
          data: { status: true },
          statusCode: 200,
          headers: {
            get() {
              return null
            }
          },
          url: 'https://owstest.deppon.com/gwapi/user/login',
          method: 'POST'
        })

        assert.equal(savedCookie, 'ECO_TOKEN=native-login-token;')
        assert.equal(
          getStorageValue(CACHE_KEYS.cookie),
          'ECO_TOKEN=native-login-token;'
        )
        assert.deepEqual(readUrls, [
          'https://owstest.deppon.com/gwapi/user/login'
        ])
        assert.deepEqual(writtenCookies, ['ECO_TOKEN=native-login-token;'])

        await removeStorageValue(CACHE_KEYS.cookie)
        assert.equal(
          await hydrateSessionCookie('https://owstest.deppon.com'),
          'ECO_TOKEN=native-login-token;'
        )
        await clearSessionCookie()
        assert.equal(clearCount, 1)
        assert.equal(getStorageValue(CACHE_KEYS.cookie), '')
      } finally {
        configureSessionCookieRuntime(null)

        if (originalSetStorage) {
          Taro.setStorage = originalSetStorage
        } else {
          delete Taro.setStorage
        }

        if (originalRemoveStorage) {
          Taro.removeStorage = originalRemoveStorage
        } else {
          delete Taro.removeStorage
        }

        if (originalCookie) {
          await setStorageValue(CACHE_KEYS.cookie, originalCookie)
        } else {
          await removeStorageValue(CACHE_KEYS.cookie)
        }
      }
    }
  },
  {
    name: 'public login endpoints never emit authenticated-request expiry',
    async run() {
      const originalPost = depponHttp.post
      const calls = []

      try {
        depponHttp.post = async (url, data, options) => {
          calls.push({ url, data, options })
          return { status: true, result: null }
        }

        await authApi.login(
          createAppSmsLoginRequest('13800138000', '123456'),
          false
        )
        await authApi.sendSmsMessage({
          mobile: '13800138000',
          sysCode: 'APP',
          messageType: 'login'
        })

        assert.deepEqual(
          calls.map(call => ({ url: call.url, options: call.options })),
          [
            {
              url: '/gwapi/userService/eco/user/login',
              options: { loading: false, login: false, sessionLogin: true }
            },
            {
              url: '/gwapi/messageService/eco/message/sendSmsMessage',
              options: { login: false }
            }
          ]
        )
      } finally {
        depponHttp.post = originalPost
      }
    }
  },
  {
    name: 'sms login rejects a successful body without a persisted session cookie',
    async run() {
      const originalLogin = authApi.login
      const originalSaveCurrentUser = authSession.saveCurrentUser
      const sessionKeys = [
        CACHE_KEYS.cookie,
        CACHE_KEYS.userInfo,
        CACHE_KEYS.accountCacheOwner
      ]
      const originalValues = new Map(
        sessionKeys.map(key => [key, getStorageValue(key)])
      )

      try {
        await clearAppSession()
        authApi.login = async () => ({
          status: true,
          result: { mobile: '13800138000' }
        })

        const missingCookie = await authService.loginWithSms(
          '13800138000',
          '123456'
        )

        assert.equal(missingCookie.status, false)
        assert.equal(missingCookie.message, '登录凭证保存失败，请重试')
        assert.equal(getStorageValue(CACHE_KEYS.userInfo), '')

        await setStorageValue(CACHE_KEYS.cookie, 'ECO_TOKEN=login-token;')
        authSession.saveCurrentUser = async user => user
        authApi.login = async () => ({
          status: true,
          result: { mobile: '13800138000' },
          sessionCookieSaved: true
        })

        const authenticated = await authService.loginWithSms(
          '13800138000',
          '123456'
        )

        assert.equal(authenticated.status, true)
        assert.equal(authenticated.user.mobile, '13800138000')
      } finally {
        authApi.login = originalLogin
        authSession.saveCurrentUser = originalSaveCurrentUser
        await clearAppSession()

        for (const [key, value] of originalValues) {
          if (value) {
            await setStorageValue(key, value)
          } else {
            await removeStorageValue(key)
          }
        }
      }
    }
  },
  {
    name: 'sms login waits for a delayed native session cookie',
    async run() {
      const originalLogin = authApi.login
      const originalSaveCurrentUser = authSession.saveCurrentUser
      const sessionKeys = [
        CACHE_KEYS.cookie,
        CACHE_KEYS.userInfo,
        CACHE_KEYS.accountCacheOwner
      ]
      const originalValues = new Map(
        sessionKeys.map(key => [key, getStorageValue(key)])
      )
      let readCount = 0

      try {
        await clearAppSession()
        configureSessionCookieRuntime({
          async read() {
            readCount += 1

            return readCount >= 3 ? 'ECO_TOKEN=delayed-native-token;' : ''
          },
          async write() {
            return true
          },
          async clear() {
            return true
          }
        })
        authSession.saveCurrentUser = async user => user
        authApi.login = async () => ({
          status: true,
          result: { mobile: '13800138000' }
        })

        const authenticated = await authService.loginWithSms(
          '13800138000',
          '123456'
        )

        assert.equal(authenticated.status, true)
        assert.equal(authenticated.user.mobile, '13800138000')
        assert.equal(readCount, 3)
        assert.equal(
          getStorageValue(CACHE_KEYS.cookie),
          'ECO_TOKEN=delayed-native-token;'
        )
      } finally {
        configureSessionCookieRuntime(null)
        authApi.login = originalLogin
        authSession.saveCurrentUser = originalSaveCurrentUser
        await clearAppSession()

        for (const [key, value] of originalValues) {
          if (value) {
            await setStorageValue(key, value)
          } else {
            await removeStorageValue(key)
          }
        }
      }
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
