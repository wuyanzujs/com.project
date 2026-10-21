require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { expressService } = require('@/services/express/core/express.service')
const { goodsQueryService } = require('@/services/goods/goods.service')

const { createDeferred } = require('../support/deferred.cjs')
const { createStorageFixture } = require('../support/storage-fixture.cjs')

test('goods checking waits for history persistence before exposing completion', async t => {
  const { disk, Taro } = createStorageFixture(t)
  const started = createDeferred()
  const release = createDeferred()
  t.mock.method(expressService, 'checkGoodsByName', async () => ({
    status: true,
    result: { goodsName: '文件', status: 'allowed', title: '可寄递' }
  }))
  t.mock.method(Taro, 'setStorage', async ({ key, data }) => {
    started.resolve()
    await release.promise
    disk.set(key, data)
  })
  let completed = false
  const checking = goodsQueryService.checkGoods({ goodsName: '文件' }).then(result => {
    completed = true
    return result
  })
  await started.promise
  assert.equal(completed, false)
  release.resolve()
  assert.equal((await checking).status, true)
  assert.equal(goodsQueryService.getHistory()[0].goodsName, '文件')
})
