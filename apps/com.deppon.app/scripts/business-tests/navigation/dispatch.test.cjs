require('../support/register.cjs')
const Taro = require('@tarojs/taro')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { contactSelection } = require('@/services/contact')
const { sanitizeAppRouteUrl } = require('@/shared/navigation/appNavigation')
const { createLoginRedirectUrl, navigateToLogin } = require('@/shared/navigation/authGuard')
const { dispatchAppRoute, dispatchAppRouteAsync } = require('@/shared/navigation/navigationRuntime')

const cases = [
  {
    name: 'navigation does not rewrite an explicit login route to mine',
    run() {
      assert.equal(sanitizeAppRouteUrl('/pages/login/index?redirectUrl=%2Fpages%2Fmine%2Findex'), '/pages/login/index?redirectUrl=%2Fpages%2Fmine%2Findex')
      assert.equal(sanitizeAppRouteUrl('https://example.com'), '/pages/mine/index')
    }
  },
  {
    name: 'mine login entry dispatches the registered login route',
    async run() {
      const originalGetCurrentPages = Taro.getCurrentPages
      const originalNavigateTo = Taro.navigateTo
      let navigateOptions = null
      let currentRoute = 'pages/mine/index'

      try {
        Taro.getCurrentPages = () => [
          {
            route: currentRoute,
            options: {}
          }
        ]
        Taro.navigateTo = options => {
          navigateOptions = options
          currentRoute = 'pages/login/index'

          return Promise.resolve({ errMsg: 'navigateTo:ok' })
        }

        const redirectUrl = createLoginRedirectUrl('/pages/mine/index')
        const dispatched = navigateToLogin({
          redirectUrl: '/pages/mine/index',
          message: false
        })

        assert.equal(dispatched, true)
        assert.equal(redirectUrl, '/pages/login/index?redirectUrl=%2Fpages%2Fmine%2Findex')
        assert.deepEqual(navigateOptions, { url: redirectUrl })
        await new Promise(resolve => setImmediate(resolve))
      } finally {
        if (originalGetCurrentPages) {
          Taro.getCurrentPages = originalGetCurrentPages
        } else {
          delete Taro.getCurrentPages
        }

        if (originalNavigateTo) {
          Taro.navigateTo = originalNavigateTo
        } else {
          delete Taro.navigateTo
        }
      }
    }
  },
  {
    name: 'login redirect keeps one navigation in flight and releases after confirmation',
    async run() {
      const originalGetCurrentPages = Taro.getCurrentPages
      const originalRedirectTo = Taro.redirectTo
      let currentRoute = 'pages/mine/index'
      let redirectCount = 0
      let releaseFirstNavigation = null

      try {
        Taro.getCurrentPages = () => [
          {
            route: currentRoute,
            options: {}
          }
        ]
        Taro.redirectTo = () => {
          redirectCount += 1

          if (redirectCount === 1) {
            return new Promise(resolve => {
              releaseFirstNavigation = () => {
                currentRoute = 'pages/login/index'
                resolve({ errMsg: 'redirectTo:ok' })
              }
            })
          }

          currentRoute = 'pages/login/index'
          return Promise.resolve({ errMsg: 'redirectTo:ok' })
        }

        assert.equal(
          navigateToLogin({
            redirectUrl: '/pages/mine/index',
            replace: true,
            message: false
          }),
          true
        )
        assert.equal(
          navigateToLogin({
            redirectUrl: '/pages/order/list/index',
            replace: true,
            message: false
          }),
          false
        )
        assert.equal(redirectCount, 1)

        releaseFirstNavigation()
        await new Promise(resolve => setImmediate(resolve))
        await new Promise(resolve => setImmediate(resolve))

        currentRoute = 'pages/mine/index'
        assert.equal(
          navigateToLogin({
            redirectUrl: '/pages/order/list/index',
            replace: true,
            message: false
          }),
          true
        )
        assert.equal(redirectCount, 2)
        await new Promise(resolve => setImmediate(resolve))
      } finally {
        if (originalGetCurrentPages) {
          Taro.getCurrentPages = originalGetCurrentPages
        } else {
          delete Taro.getCurrentPages
        }

        if (originalRedirectTo) {
          Taro.redirectTo = originalRedirectTo
        } else {
          delete Taro.redirectTo
        }
      }
    }
  },
  {
    name: 'login redirect continues when feedback is unavailable',
    async run() {
      const originalGetCurrentPages = Taro.getCurrentPages
      const originalRedirectTo = Taro.redirectTo
      const originalShowToast = Taro.showToast
      let currentRoute = 'pages/mine/index'
      let redirectCount = 0

      try {
        Taro.getCurrentPages = () => [
          {
            route: currentRoute,
            options: {}
          }
        ]
        Taro.showToast = () => {
          throw new Error('toast unavailable')
        }
        Taro.redirectTo = () => {
          redirectCount += 1
          currentRoute = 'pages/login/index'
          return Promise.resolve({ errMsg: 'redirectTo:ok' })
        }

        assert.equal(
          navigateToLogin({
            redirectUrl: '/pages/mine/index',
            replace: true
          }),
          true
        )
        assert.equal(redirectCount, 1)
        await new Promise(resolve => setImmediate(resolve))
      } finally {
        if (originalGetCurrentPages) {
          Taro.getCurrentPages = originalGetCurrentPages
        } else {
          delete Taro.getCurrentPages
        }

        if (originalRedirectTo) {
          Taro.redirectTo = originalRedirectTo
        } else {
          delete Taro.redirectTo
        }

        if (originalShowToast) {
          Taro.showToast = originalShowToast
        } else {
          delete Taro.showToast
        }
      }
    }
  },
  {
    name: 'RN navigation failures stay visible and release caller recovery',
    async run() {
      const originalRedirectTo = Taro.redirectTo
      const originalShowToast = Taro.showToast
      let failureCount = 0
      let toastOptions = null

      try {
        Taro.redirectTo = () => Promise.reject(new Error('route rejected'))
        Taro.showToast = options => {
          toastOptions = options

          return Promise.resolve({ errMsg: 'showToast:ok' })
        }

        const dispatched = dispatchAppRoute('/pages/login/index', {
          failureMessage: '登录页打开失败，请重试',
          replace: true,
          onFailure: () => {
            failureCount += 1
          }
        })

        assert.equal(dispatched, true)
        await new Promise(resolve => setImmediate(resolve))
        assert.equal(failureCount, 1)
        assert.deepEqual(toastOptions, {
          title: '登录页打开失败，请重试',
          icon: 'none'
        })
      } finally {
        if (originalRedirectTo) {
          Taro.redirectTo = originalRedirectTo
        } else {
          delete Taro.redirectTo
        }

        if (originalShowToast) {
          Taro.showToast = originalShowToast
        } else {
          delete Taro.showToast
        }
      }
    }
  },
  {
    name: 'critical replace navigation never dispatches a second competing replace',
    async run() {
      const originalGetCurrentPages = Taro.getCurrentPages
      const originalRedirectTo = Taro.redirectTo
      const originalShowToast = Taro.showToast
      let currentRoute = 'pages/mine/index'
      let redirectCount = 0
      let toastCount = 0

      try {
        Taro.getCurrentPages = () => [{ route: currentRoute, options: {} }]
        Taro.redirectTo = () => {
          redirectCount += 1

          return Promise.resolve({ errMsg: 'redirectTo:ok' })
        }
        Taro.showToast = () => {
          toastCount += 1
          return Promise.resolve({ errMsg: 'showToast:ok' })
        }

        const navigated = await dispatchAppRouteAsync('/pages/login/index', {
          failureMessage: '登录页打开失败，请重试',
          replace: true
        })

        assert.equal(navigated, false)
        assert.equal(redirectCount, 1)
        assert.equal(toastCount, 1)
      } finally {
        if (originalGetCurrentPages) {
          Taro.getCurrentPages = originalGetCurrentPages
        } else {
          delete Taro.getCurrentPages
        }

        if (originalRedirectTo) {
          Taro.redirectTo = originalRedirectTo
        } else {
          delete Taro.redirectTo
        }

        if (originalShowToast) {
          Taro.showToast = originalShowToast
        } else {
          delete Taro.showToast
        }
      }
    }
  },
  {
    name: 'critical replace navigation observes a late route without redispatch',
    async run() {
      const originalGetCurrentPages = Taro.getCurrentPages
      const originalRedirectTo = Taro.redirectTo
      let currentRoute = 'pages/mine/index'
      let redirectCount = 0
      let routeReadCount = 0

      try {
        Taro.getCurrentPages = () => {
          routeReadCount += 1

          if (redirectCount === 1 && routeReadCount >= 10) {
            currentRoute = 'pages/login/index'
          }

          return [{ route: currentRoute, options: {} }]
        }
        Taro.redirectTo = () => {
          redirectCount += 1
          return Promise.resolve({ errMsg: 'redirectTo:ok' })
        }

        const navigated = await dispatchAppRouteAsync('/pages/login/index', {
          replace: true
        })

        assert.equal(navigated, true)
        assert.equal(redirectCount, 1)
      } finally {
        if (originalGetCurrentPages) {
          Taro.getCurrentPages = originalGetCurrentPages
        } else {
          delete Taro.getCurrentPages
        }

        if (originalRedirectTo) {
          Taro.redirectTo = originalRedirectTo
        } else {
          delete Taro.redirectTo
        }
      }
    }
  },
  {
    name: 'empty RN page snapshots never count as successful navigation',
    async run() {
      const originalGetCurrentPages = Taro.getCurrentPages
      const originalRedirectTo = Taro.redirectTo
      const originalShowToast = Taro.showToast
      let navigationStarted = false
      let redirectCount = 0
      let toastCount = 0

      try {
        Taro.getCurrentPages = () => (navigationStarted ? [] : [{ route: 'pages/mine/index', options: {} }])
        Taro.redirectTo = () => {
          navigationStarted = true
          redirectCount += 1
          return Promise.resolve({ errMsg: 'redirectTo:ok' })
        }
        Taro.showToast = () => {
          toastCount += 1
          return Promise.resolve({ errMsg: 'showToast:ok' })
        }

        const navigated = await dispatchAppRouteAsync('/pages/login/index', {
          replace: true
        })

        assert.equal(navigated, false)
        assert.equal(redirectCount, 1)
        assert.equal(toastCount, 1)
      } finally {
        if (originalGetCurrentPages) {
          Taro.getCurrentPages = originalGetCurrentPages
        } else {
          delete Taro.getCurrentPages
        }

        if (originalRedirectTo) {
          Taro.redirectTo = originalRedirectTo
        } else {
          delete Taro.redirectTo
        }

        if (originalShowToast) {
          Taro.showToast = originalShowToast
        } else {
          delete Taro.showToast
        }
      }
    }
  },
  {
    name: 'contact selection preserves batch source across navigation',
    run() {
      const params = contactSelection.createParams('sender', 'select', 'BATCH')
      const contact = {
        id: 'CONTACT_BATCH_001',
        name: '张三',
        telephone: '13800138000',
        province: '上海市',
        city: '上海市',
        county: '青浦区',
        address: '明珠路100号',
        type: 0,
        defaultAddress: '0',
        regionType: ''
      }

      assert.equal(contactSelection.parseParams(params).source, 'BATCH')
      contactSelection.select('sender', contact, 'BATCH')

      const selection = contactSelection.consumeSelection('sender', 'BATCH')

      assert.equal(selection.source, 'BATCH')
      assert.equal(selection.contact.id, 'CONTACT_BATCH_001')
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
