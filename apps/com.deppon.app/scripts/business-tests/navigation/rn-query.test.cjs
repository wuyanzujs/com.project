require('../support/register.cjs')
const Taro = require('@tarojs/taro')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { navigateToLogin } = require('@/shared/navigation/authGuard')
const { dispatchAppRouteAsync } = require('@/shared/navigation/navigationRuntime')

test('RN 缺少 URLSearchParams.entries 时，顶部登录和礼包登录仍能跳转', async t => {
  const originalSearchParams = globalThis.URLSearchParams
  const originalGetCurrentPages = Taro.getCurrentPages
  const originalNavigateTo = Taro.navigateTo
  const originalShowToast = Taro.showToast
  const navigations = []
  const feedback = []
  let currentPage = { route: 'pages/mine/index', options: {} }

  t.after(() => {
    globalThis.URLSearchParams = originalSearchParams
    Taro.getCurrentPages = originalGetCurrentPages
    Taro.navigateTo = originalNavigateTo
    Taro.showToast = originalShowToast
  })

  // RN 0.73 的 URLSearchParams 没有 entries，也不解析字符串参数。
  globalThis.URLSearchParams = class {
    constructor() {
      throw new Error('导航不能依赖浏览器或 Node 的 URLSearchParams')
    }
  }
  Taro.getCurrentPages = () => [currentPage]
  Taro.navigateTo = async ({ url }) => {
    navigations.push(url)
    currentPage = { route: 'pages/login/index', options: {} }
  }
  Taro.showToast = async options => feedback.push(options.title)

  for (const redirectUrl of ['/pages/mine/index', '/pages/coupon/list/index']) {
    currentPage = { route: 'pages/mine/index', options: {} }
    assert.equal(navigateToLogin({ redirectUrl, message: false }), true)
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(navigations.at(-1), `/pages/login/index?redirectUrl=${encodeURIComponent(redirectUrl)}`)
  }

  assert.equal(navigations.length, 2)
  assert.deepEqual(feedback, [])
})

test('带嵌套回跳参数的当前路由仍能在 RN 中正确确认', async t => {
  const originalGetCurrentPages = Taro.getCurrentPages
  const originalNavigateTo = Taro.navigateTo
  const originalSearchParams = globalThis.URLSearchParams
  let navigateCount = 0

  t.after(() => {
    Taro.getCurrentPages = originalGetCurrentPages
    Taro.navigateTo = originalNavigateTo
    globalThis.URLSearchParams = originalSearchParams
  })

  globalThis.URLSearchParams = undefined
  Taro.getCurrentPages = () => [
    {
      route: 'pages/login/index',
      options: { redirectUrl: '/pages/order/detail/index?keyword=A%26B%3DC' }
    }
  ]
  Taro.navigateTo = async () => {
    navigateCount += 1
  }

  assert.equal(await dispatchAppRouteAsync('/pages/login/index?redirectUrl=%2Fpages%2Forder%2Fdetail%2Findex%3Fkeyword%3DA%2526B%253DC'), true)
  assert.equal(navigateCount, 0)
})
