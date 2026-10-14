require('../support/register.cjs')
const Taro = require('@tarojs/taro')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { clearSessionCookie, setSessionCookie } = require('@/request/cookieJar')
const { navigateToAppRoute } = require('@/shared/navigation/appNavigation')
const { APP_LOGIN_ROUTE_PATHS } = require('@/shared/navigation/routeRegistry')
const { APP_ROUTES } = require('@/shared/navigation/routes')

const { createStorageFixture } = require('../support/storage-fixture.cjs')

function flushNavigation() {
  return new Promise(resolve => setImmediate(resolve))
}

function stubRouteStack(t, initialRoute) {
  const originalGetCurrentPages = Taro.getCurrentPages
  const originalNavigateTo = Taro.navigateTo
  const originalRedirectTo = Taro.redirectTo
  const navigations = []
  let currentRoute = initialRoute

  Taro.getCurrentPages = () => [
    {
      route: currentRoute,
      options: {}
    }
  ]
  Taro.navigateTo = options => {
    navigations.push(options.url)
    currentRoute = options.url.split('?')[0].replace(/^\//, '')

    return Promise.resolve({ errMsg: 'navigateTo:ok' })
  }
  Taro.redirectTo = options => {
    navigations.push(options.url)
    currentRoute = options.url.split('?')[0].replace(/^\//, '')

    return Promise.resolve({ errMsg: 'redirectTo:ok' })
  }

  t.after(() => {
    Taro.getCurrentPages = originalGetCurrentPages
    Taro.navigateTo = originalNavigateTo
    Taro.redirectTo = originalRedirectTo
  })

  return {
    navigations,
    setCurrentRoute: route => {
      currentRoute = route
    }
  }
}

test('寄件主页在路由注册表中声明为登录必需', () => {
  assert.equal(APP_LOGIN_ROUTE_PATHS.includes(APP_ROUTES.express), true, '寄件主页必须受登录守卫保护')
})

test('未登录进入寄件页会跳登录并携带回跳地址', async t => {
  const { navigations } = stubRouteStack(t, 'pages/home/index')

  assert.equal(navigateToAppRoute(APP_ROUTES.express), false)
  await flushNavigation()
  await flushNavigation()

  assert.deepEqual(navigations, [`/pages/login/index?redirectUrl=${encodeURIComponent(APP_ROUTES.express)}`])
})

test('寄件页携带来源参数进入时回跳地址保留 query', async t => {
  const { navigations } = stubRouteStack(t, 'pages/home/index')
  const targetUrl = `${APP_ROUTES.express}?source=QUERY_PRICE_PRODUCT`

  assert.equal(navigateToAppRoute(targetUrl), false)
  await flushNavigation()
  await flushNavigation()

  assert.deepEqual(navigations, [`/pages/login/index?redirectUrl=${encodeURIComponent(targetUrl)}`])
})

test('已登录进入寄件页按普通导航直接打开', async t => {
  createStorageFixture(t)
  const { navigations } = stubRouteStack(t, 'pages/home/index')

  assert.equal(await setSessionCookie('ECO_TOKEN=gating-token;'), true)
  t.after(clearSessionCookie)

  assert.equal(navigateToAppRoute(APP_ROUTES.express), true)
  await flushNavigation()

  assert.deepEqual(navigations, [APP_ROUTES.express])
})
