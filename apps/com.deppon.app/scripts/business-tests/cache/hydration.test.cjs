require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { CACHE_KEYS } = require('@/cache/keys')
const {
  getStorageValue,
  hydrateStorage,
  removeStorageValue,
  setStorageValue
} = require('@/cache/storage')

const { createDeferred } = require('../support/deferred.cjs')
const { createStorageFixture } = require('../support/storage-fixture.cjs')

test('startup hydration never overwrites later writes or deletions', async t => {
  const { disk, Taro } = createStorageFixture(t)
  const started = createDeferred()
  const release = createDeferred()
  disk.set(CACHE_KEYS.userInfo, 'old-user')
  disk.set(CACHE_KEYS.cookie, 'old-cookie')
  t.mock.method(Taro, 'getStorage', async ({ key }) => {
    const snapshot = disk.get(key)
    if (key === CACHE_KEYS.userInfo || key === CACHE_KEYS.cookie) {
      started.resolve()
      await release.promise
    }
    return { data: snapshot }
  })

  const hydration = hydrateStorage()
  assert.equal(hydrateStorage(), hydration)
  const write = setStorageValue(CACHE_KEYS.userInfo, 'new-user')
  const remove = removeStorageValue(CACHE_KEYS.cookie)
  await started.promise
  release.resolve()
  await Promise.all([hydration, write, remove])

  assert.equal(getStorageValue(CACHE_KEYS.userInfo), 'new-user')
  assert.equal(disk.get(CACHE_KEYS.userInfo), 'new-user')
  assert.equal(getStorageValue(CACHE_KEYS.cookie), '')
  assert.equal(disk.has(CACHE_KEYS.cookie), false)
})
