require('../support/register.cjs')
const Taro = require('@tarojs/taro')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const {
  dispatchAppRouteAsync
} = require('@/shared/navigation/navigationRuntime')

test('same page path with different query parameters still navigates', async t => {
  const originalGetCurrentPages = Taro.getCurrentPages
  const originalNavigateTo = Taro.navigateTo
  const originalShowToast = Taro.showToast
  let navigateCount = 0
  let currentPage = {
    route: 'pages/order/detail/index',
    options: { waybillNumber: 'OLD' }
  }

  t.after(() => {
    Taro.getCurrentPages = originalGetCurrentPages
    Taro.navigateTo = originalNavigateTo
    Taro.showToast = originalShowToast
  })

  Taro.getCurrentPages = () => [currentPage]
  Taro.navigateTo = async ({ url }) => {
    navigateCount += 1
    const query = new URLSearchParams(url.split('?')[1])
    currentPage = {
      route: 'pages/order/detail/index',
      options: { waybillNumber: query.get('waybillNumber') }
    }
  }
  Taro.showToast = async () => undefined

  assert.equal(
    await dispatchAppRouteAsync('/pages/order/detail/index?waybillNumber=NEW'),
    true
  )
  assert.equal(navigateCount, 1)
})
