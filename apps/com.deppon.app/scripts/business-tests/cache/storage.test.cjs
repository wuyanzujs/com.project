require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const {
  getJsonStorageValue,
  getStorageValue,
  removeStorageValue,
  setJsonStorageValue,
  setStorageValue
} = require('@/cache/storage')

const { createDeferred } = require('../support/deferred.cjs')
const { createStorageFixture } = require('../support/storage-fixture.cjs')

test('failed writes retain the committed value in memory and on disk', async t => {
  const { disk, Taro } = createStorageFixture(t)
  const key = 'TEST_WRITE_FAILURE'
  await setStorageValue(key, 'old')
  t.mock.method(Taro, 'setStorage', async () => {
    throw new Error('disk full')
  })

  assert.equal(await setStorageValue(key, 'new'), false)
  assert.equal(getStorageValue(key), 'old')
  assert.equal(disk.get(key), 'old')
})

test('failed first writes do not create a cached value', async t => {
  const { disk, Taro } = createStorageFixture(t)
  t.mock.method(Taro, 'setStorage', async () => {
    throw new Error('disk full')
  })

  assert.equal(await setStorageValue('TEST_FIRST_WRITE', 'new'), false)
  assert.equal(getStorageValue('TEST_FIRST_WRITE'), '')
  assert.equal(disk.has('TEST_FIRST_WRITE'), false)
})

test('failed deletions retain the committed value in memory and on disk', async t => {
  const { disk, Taro } = createStorageFixture(t)
  const key = 'TEST_REMOVE_FAILURE'
  await setStorageValue(key, 'old')
  t.mock.method(Taro, 'removeStorage', async () => {
    throw new Error('deletion rejected')
  })

  assert.equal(await removeStorageValue(key), false)
  assert.equal(getStorageValue(key), 'old')
  assert.equal(disk.get(key), 'old')
})

test('pending writes expose only the last committed value', async t => {
  const { disk, Taro } = createStorageFixture(t)
  const key = 'TEST_PENDING_WRITE'
  await setStorageValue(key, 'old')
  const started = createDeferred()
  const release = createDeferred()
  t.mock.method(Taro, 'setStorage', async ({ key: target, data }) => {
    started.resolve()
    await release.promise
    disk.set(target, data)
  })

  const pending = setStorageValue(key, 'new')
  await started.promise
  assert.equal(getStorageValue(key), 'old')
  assert.equal(disk.get(key), 'old')
  release.resolve()
  assert.equal(await pending, true)
  assert.equal(getStorageValue(key), 'new')
  assert.equal(disk.get(key), 'new')
})

test('writes to the same key run in invocation order', async t => {
  const { disk, Taro } = createStorageFixture(t)
  const key = 'TEST_WRITE_ORDER'
  const started = createDeferred()
  const release = createDeferred()
  const calls = []
  t.mock.method(Taro, 'setStorage', async ({ key: target, data }) => {
    calls.push(data)
    if (data === 'first') {
      started.resolve()
      await release.promise
    }
    disk.set(target, data)
  })

  const first = setStorageValue(key, 'first')
  const second = setStorageValue(key, 'second')
  await started.promise
  assert.deepEqual(calls, ['first'])
  release.resolve()
  assert.deepEqual(await Promise.all([first, second]), [true, true])
  assert.deepEqual(calls, ['first', 'second'])
  assert.equal(getStorageValue(key), 'second')
  assert.equal(disk.get(key), 'second')
})

test('write then delete leaves no value on disk or in memory', async t => {
  const { disk, Taro } = createStorageFixture(t)
  const release = createDeferred()
  const started = createDeferred()
  const key = 'TEST_WRITE_DELETE'
  t.mock.method(Taro, 'setStorage', async ({ key: target, data }) => {
    started.resolve()
    await release.promise
    disk.set(target, data)
  })

  const write = setStorageValue(key, 'new')
  const remove = removeStorageValue(key)
  await started.promise
  assert.equal(disk.has(key), false)
  release.resolve()
  assert.deepEqual(await Promise.all([write, remove]), [true, true])
  assert.equal(getStorageValue(key), '')
  assert.equal(disk.has(key), false)
})

test('delete then write commits the replacement value', async t => {
  const { disk } = createStorageFixture(t)
  const key = 'TEST_DELETE_WRITE'
  await setStorageValue(key, 'old')
  assert.deepEqual(
    await Promise.all([removeStorageValue(key), setStorageValue(key, 'new')]),
    [true, true]
  )
  assert.equal(getStorageValue(key), 'new')
  assert.equal(disk.get(key), 'new')
})

test('a failed operation does not prevent the next write', async t => {
  const { disk, Taro } = createStorageFixture(t)
  const key = 'TEST_RECOVERY_WRITE'
  await setStorageValue(key, 'old')
  t.mock.method(Taro, 'setStorage', async ({ key: target, data }) => {
    if (data === 'failed') {
      throw new Error('temporary failure')
    }
    disk.set(target, data)
  })

  assert.deepEqual(
    await Promise.all([
      setStorageValue(key, 'failed'),
      setStorageValue(key, 'recovered')
    ]),
    [false, true]
  )
  assert.equal(getStorageValue(key), 'recovered')
  assert.equal(disk.get(key), 'recovered')
})

test('writes for different keys can complete independently', async t => {
  const { disk, Taro } = createStorageFixture(t)
  const started = createDeferred()
  const release = createDeferred()
  t.mock.method(Taro, 'setStorage', async ({ key, data }) => {
    if (key === 'TEST_SLOW_KEY') {
      started.resolve()
      await release.promise
    }
    disk.set(key, data)
  })

  const slow = setStorageValue('TEST_SLOW_KEY', 'slow')
  await started.promise
  assert.equal(await setStorageValue('TEST_FAST_KEY', 'fast'), true)
  assert.equal(getStorageValue('TEST_SLOW_KEY'), '')
  assert.equal(getStorageValue('TEST_FAST_KEY'), 'fast')
  release.resolve()
  assert.equal(await slow, true)
})

test('invalid JSON writes preserve the previous JSON payload', async t => {
  const { disk } = createStorageFixture(t)
  const key = 'TEST_JSON_SERIALIZATION'
  await setJsonStorageValue(key, { old: true })
  const circular = {}
  circular.self = circular

  assert.equal(await setJsonStorageValue(key, circular), false)
  assert.deepEqual(getJsonStorageValue(key), { old: true })
  assert.deepEqual(JSON.parse(disk.get(key)), { old: true })
})
