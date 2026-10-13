require('../support/register.cjs')
const { test } = require('node:test')
const { LatestRequestCoordinator } = require('@/shared/async/latestRequest')
const assert = require('node:assert/strict')

const cases = [
  {
    name: 'latest request coordinator deduplicates and promotes repeated filters',
    run() {
      const coordinator = new LatestRequestCoordinator()
      const first = coordinator.begin('orders:1')

      assert.ok(first)
      assert.equal(coordinator.begin('orders:1'), null)
      assert.equal(coordinator.isLatest(first), true)

      const second = coordinator.begin('orders:2')

      assert.ok(second)
      assert.equal(coordinator.isLatest(first), false)
      assert.equal(coordinator.isLatest(second), true)
      assert.equal(coordinator.begin('orders:1'), null)
      assert.equal(coordinator.isLatest(first), true)
      assert.equal(coordinator.isLatest(second), false)
      assert.equal(coordinator.finish(second), false)
      assert.equal(coordinator.finish(first), true)

      const retried = coordinator.begin('orders:1')

      assert.ok(retried)
      assert.equal(coordinator.finish(retried), true)
      assert.ok(coordinator.begin('orders:2'))

      const refresh = coordinator.begin('orders:2', { force: true })

      assert.ok(refresh)
      assert.equal(coordinator.isLatest(refresh), true)
      coordinator.invalidate()
      assert.equal(coordinator.isLatest(refresh), false)
      assert.ok(coordinator.begin('orders:2'))
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
