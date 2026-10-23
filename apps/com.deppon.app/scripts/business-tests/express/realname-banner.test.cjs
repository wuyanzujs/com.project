require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { createReactHarness, loadReactModule } = require('../support/react-harness.cjs')

function createRealNameHook(t, options = {}) {
  const harness = createReactHarness()
  let onShow
  const query = t.mock.fn(
    options.query ||
      (async () => ({
        status: true,
        result: { authenticated: false }
      }))
  )
  const { useExpressRealName } = loadReactModule('pages/express/hooks/useExpressRealName.ts', {
    react: harness.react,
    '@tarojs/taro': {
      useDidShow: callback => {
        onShow = callback
      }
    },
    '@/services/auth': {
      getCurrentUser: () => (options.user === undefined ? { mobile: '13800138000' } : options.user)
    },
    '@/services/realname': {
      realNameService: { query }
    }
  })

  return {
    query,
    render: () => harness.render(() => useExpressRealName()),
    show: async () => {
      onShow()
      await new Promise(resolve => setImmediate(resolve))
    }
  }
}

test('实名提示只在已登录且未实名时展示', async t => {
  const authenticated = createRealNameHook(t, {
    query: async () => ({ status: true, result: { authenticated: true } })
  })
  authenticated.render()
  await authenticated.show()
  assert.equal(authenticated.render().visible, false)

  const unauthenticated = createRealNameHook(t)
  unauthenticated.render()
  await unauthenticated.show()
  assert.equal(unauthenticated.render().visible, true)
})

test('未登录、查询失败或未返回结果时不展示实名提示', async t => {
  const guest = createRealNameHook(t, { user: null })
  guest.render()
  await guest.show()
  assert.equal(guest.render().visible, false)
  assert.equal(guest.query.mock.callCount(), 0)

  const failed = createRealNameHook(t, {
    query: async () => ({ status: false, result: null })
  })
  failed.render()
  await failed.show()
  assert.equal(failed.render().visible, false)
})
