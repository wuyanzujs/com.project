require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { LatestRequestCoordinator } = require('@/shared/async/latestRequest')

const { createDeferred } = require('../support/deferred.cjs')

test('rapid filter changes discard an older response arriving last', async () => {
  const coordinator = new LatestRequestCoordinator()
  const first = createDeferred()
  const second = createDeferred()
  const rendered = []
  function query(key, request) {
    const token = coordinator.begin(key)
    return request.then(value => {
      if (coordinator.isLatest(token)) rendered.push(value)
      return coordinator.finish(token)
    })
  }

  const stale = query('sender', first.promise)
  const fresh = query('receiver', second.promise)
  second.resolve('receiver-orders')
  assert.equal(await fresh, true)
  first.resolve('sender-orders')
  assert.equal(await stale, false)
  assert.deepEqual(rendered, ['receiver-orders'])
})

test('invalidation prevents an unmounted consumer from applying pending results', async () => {
  const coordinator = new LatestRequestCoordinator()
  const pending = createDeferred()
  const token = coordinator.begin('orders')
  const rendered = []
  const response = pending.promise.then(value => {
    if (coordinator.isLatest(token)) rendered.push(value)
    return coordinator.finish(token)
  })

  coordinator.invalidate()
  pending.resolve('old-orders')
  assert.equal(await response, false)
  assert.deepEqual(rendered, [])
  assert.ok(coordinator.begin('orders'))
})
