require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { appendRouteQuery, createAppRouteUrl, createRouteQuery, normalizeAppRouteUrlParam, parseRouteQuery } = require('@/shared/navigation/routeUrl')

const cases = [
  {
    name: 'RN query 解析保留嵌套地址、等号、中文和异常转义',
    run() {
      assert.deepEqual(parseRouteQuery('keyword=%E5%BE%B7%E9%82%A6+快递&value=A=B&key=first&key=last&bad=%ZZ&flag'), {
        keyword: '德邦 快递',
        value: 'A=B',
        key: 'last',
        bad: '%ZZ',
        flag: ''
      })
      assert.deepEqual(parseRouteQuery('redirectUrl=%2Fpages%2Forder%2Fdetail%2Findex%3Fkeyword%3DA%2526B%253DC'), {
        redirectUrl: '/pages/order/detail/index?keyword=A%26B%3DC'
      })
      assert.deepEqual(parseRouteQuery('&&'), {})
    }
  },
  {
    name: 'route query keeps 0/false, drops empty values and encodes text',
    run() {
      assert.equal(
        createRouteQuery({
          keyword: '德邦 快递',
          page: 0,
          enabled: false,
          empty: '',
          nil: null,
          arrayValue: ['A&B', 'ignored']
        }),
        'keyword=%E5%BE%B7%E9%82%A6%20%E5%BF%AB%E9%80%92&page=0&enabled=false&arrayValue=A%26B'
      )
    }
  },
  {
    name: 'route helpers append query to app and h5 urls',
    run() {
      assert.equal(
        createAppRouteUrl('/pages/order/detail/index', {
          waybillNumber: 'DPK123456789',
          source: 'TEST'
        }),
        '/pages/order/detail/index?waybillNumber=DPK123456789&source=TEST'
      )
      assert.equal(
        appendRouteQuery('https://example.com/path?token=abc', {
          pageSource: 'APP'
        }),
        'https://example.com/path?token=abc&pageSource=APP'
      )
      assert.equal(normalizeAppRouteUrlParam('/pages/order/detail/index?keyword=A%26B%3DC'), '/pages/order/detail/index?keyword=A%26B%3DC')
      assert.equal(normalizeAppRouteUrlParam('%2Fpages%2Forder%2Fdetail%2Findex%3Fkeyword%3DA%2526B%253DC'), '/pages/order/detail/index?keyword=A%26B%3DC')
      assert.equal(normalizeAppRouteUrlParam('https%3A%2F%2Fexample.com'), '')
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
