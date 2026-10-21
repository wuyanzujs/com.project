require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { reportAppError, setAppErrorReporter } = require('@/shared/platform/analytics')

// reportAppError 会先打 native 日志，测试里静音掉避免污染用例输出。
function silenceConsole(t) {
  const original = console.error
  console.error = () => {}
  t.after(() => {
    console.error = original
  })
}

test('registered reporter receives scope message and stack', t => {
  silenceConsole(t)
  const reporter = t.mock.fn()
  setAppErrorReporter(reporter)
  t.after(() => setAppErrorReporter(null))

  const error = new Error('boom')
  reportAppError(error, { scope: 'unit-test', componentStack: '\n  at Boundary' })

  assert.equal(reporter.mock.callCount(), 1)

  const payload = reporter.mock.calls[0].arguments[0]
  assert.equal(payload.scope, 'unit-test')
  assert.equal(payload.message, 'boom')
  assert.equal(payload.componentStack, '\n  at Boundary')
  assert.match(payload.stack, /boom/)
})

test('a throwing reporter cannot break the error path', t => {
  silenceConsole(t)
  setAppErrorReporter(() => {
    throw new Error('sink down')
  })
  t.after(() => setAppErrorReporter(null))

  assert.doesNotThrow(() => reportAppError(new Error('original'), { scope: 'unit-test' }))
})

test('without a reporter the error still resolves to the analytics channel', t => {
  silenceConsole(t)
  setAppErrorReporter(null)

  assert.equal(reportAppError(new Error('no sink'), { scope: 'unit-test' }), false)
})
