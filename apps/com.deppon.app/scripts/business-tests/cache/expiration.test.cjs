require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { DPCacheExpireType, dpCache } = require('@/cache/dpCache')
const { createCacheStorageKey } = require('@/cache/keys')
const { createStorageFixture } = require('../support/storage-fixture.cjs')

test('cache expiration respects each duration and local calendar boundary', async t => {
  createStorageFixture(t)
  let now = new Date('2026-10-13T23:59:00+08:00').getTime()
  t.mock.method(Date, 'now', () => now)
  const scenarios = [
    [DPCacheExpireType.MINUTES, 2, 2 * 60000],
    [DPCacheExpireType.HOURS, 2, 2 * 3600000],
    [DPCacheExpireType.DAYS, 2, 2 * 86400000]
  ]

  for (const [type, value, duration] of scenarios) {
    const start = now
    await dpCache.set(type, { data: 'cached', expire: { type, value } })
    now = start + duration
    assert.equal(dpCache.get(type), 'cached')
    now += 1
    assert.equal(dpCache.get(type), null)
    assert.equal(dpCache.has(type), false)
  }

  now = new Date('2026-10-13T23:59:00+08:00').getTime()
  await dpCache.set('today', {
    data: 'cached',
    expire: { type: DPCacheExpireType.TODAY }
  })
  now += 60000
  assert.equal(dpCache.get('today'), null)

  now = new Date('2026-10-31T23:59:00+08:00').getTime()
  await dpCache.set('month', {
    data: 'cached',
    expire: { type: DPCacheExpireType.THE_MONTH }
  })
  await dpCache.set('forever', { data: 'cached' })
  now += 60000
  assert.equal(dpCache.get('month'), null)
  assert.equal(dpCache.get('forever'), 'cached')
})

test('cache persistence failures preserve the old payload and expiry', async t => {
  const { disk, Taro } = createStorageFixture(t)
  const key = 'TEST_CACHE_FAILURE'
  await dpCache.set(key, { data: { old: true } })
  const committed = disk.get(createCacheStorageKey(key))
  t.mock.method(Taro, 'setStorage', async () => {
    throw new Error('disk full')
  })
  t.mock.method(Taro, 'removeStorage', async () => {
    throw new Error('cannot delete')
  })

  assert.equal(await dpCache.set(key, { data: { new: true } }), false)
  assert.deepEqual(dpCache.get(key), { old: true })
  assert.equal(await dpCache.remove(key), false)
  assert.equal(dpCache.has(key), true)
  assert.equal(disk.get(createCacheStorageKey(key)), committed)
})
