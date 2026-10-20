require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { createReactHarness, findElement, loadReactModule } = require('../support/react-harness.cjs')

function textOf(element) {
  return [element.props?.children].flat(Infinity).join('')
}

function loadCancelStepOne(t, overrides = {}) {
  const harness = createReactHarness()
  const navigate = t.mock.fn()
  const sendCancelSms = t.mock.fn(async () => overrides.sendResult ?? { status: true })
  const toast = t.mock.fn()
  const page = loadReactModule('pages/account/cancel/index.tsx', {
    react: harness.react,
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/components': { ScrollView: 'ScrollView', Text: 'Text', View: 'View' },
    '@tarojs/taro': { showToast: toast, useDidShow: () => undefined },
    '@/services/account': {
      accountService: {
        getOverview: () => ({ maskedMobile: overrides.maskedMobile ?? '151****5262' }),
        sendCancelSms,
        cancelAccount: async () => ({ status: true })
      }
    },
    '@/shared/components': { AppPressable: 'AppPressable' },
    '@/shared/navigation/appNavigation': { navigateToAppRoute: navigate },
    '@/shared/navigation/authGuard': { hasValidSession: () => true, navigateToLogin: () => undefined },
    '@/shared/navigation/routes': {
      APP_ROUTES: { accountCancel: '/pages/account/cancel/index', accountCancelConfirm: '/pages/account/cancel/confirm/index', mine: '/pages/mine/index' }
    },
    './index.scss': {},
    './content.scss': {}
  }).default

  return { harness, page, navigate, sendCancelSms, toast }
}

test('cancel step one shows the bound mobile and the four warnings', t => {
  const { harness, page } = loadCancelStepOne(t)
  const view = harness.render(() => page())

  assert.ok(findElement(view, element => textOf(element) === '绑定手机号：151****5262'))
  assert.ok(findElement(view, element => textOf(element) === '温馨提示'))

  for (const index of [1, 2, 3, 4]) {
    assert.ok(
      findElement(view, element => textOf(element).startsWith(`${index}.`) && textOf(element).length > 3),
      `warning ${index} is numbered`
    )
  }

  assert.ok(findElement(view, element => textOf(element) === '获取验证码'))
})

test('cancel step one sends the sms and opens the confirm step', async t => {
  const { harness, page, navigate, sendCancelSms } = loadCancelStepOne(t)
  const view = harness.render(() => page())

  await findElement(view, element => element.props?.accessibilityLabel === '获取验证码').props.onPress()

  assert.equal(sendCancelSms.mock.callCount(), 1)
  assert.equal(navigate.mock.calls[0].arguments[0], '/pages/account/cancel/confirm/index')
  assert.equal(navigate.mock.calls[0].arguments[1].login, true)
})

test('cancel step one stays on the page when the sms request fails', async t => {
  const { harness, page, navigate, toast } = loadCancelStepOne(t, { sendResult: { status: false, message: '发送过于频繁' } })
  const view = harness.render(() => page())

  await findElement(view, element => element.props?.accessibilityLabel === '获取验证码').props.onPress()

  assert.equal(navigate.mock.callCount(), 0)
  assert.equal(toast.mock.calls[0].arguments[0].title, '发送过于频繁')
})

function loadCancelConfirm(t, overrides = {}) {
  const harness = createReactHarness()
  const navigate = t.mock.fn()
  const toast = t.mock.fn()
  const cancelAccount = t.mock.fn(async () => overrides.cancelResult ?? { status: true })
  const sendCancelSms = t.mock.fn(async () => ({ status: true }))
  const page = loadReactModule('pages/account/cancel/confirm/index.tsx', {
    react: harness.react,
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/components': { Input: 'Input', ScrollView: 'ScrollView', Text: 'Text', View: 'View' },
    '@tarojs/taro': { showToast: toast, useDidShow: () => undefined },
    '@/services/account': {
      accountService: {
        getOverview: () => ({ maskedMobile: overrides.maskedMobile ?? '151****5262' }),
        sendCancelSms,
        cancelAccount
      }
    },
    '@/shared/components': { AppPressable: 'AppPressable' },
    '@/shared/navigation/appNavigation': { navigateToAppRoute: navigate },
    '@/shared/navigation/authGuard': { hasValidSession: () => true, navigateToLogin: () => undefined },
    '@/shared/navigation/routes': {
      APP_ROUTES: { accountCancel: '/pages/account/cancel/index', accountCancelConfirm: '/pages/account/cancel/confirm/index', mine: '/pages/mine/index' }
    },
    './index.scss': {},
    './content.scss': {}
  }).default

  return { harness, page, navigate, toast, cancelAccount, sendCancelSms }
}

test('cancel confirm step shows six code cells and the resend countdown', t => {
  const { harness, page } = loadCancelConfirm(t)
  const view = harness.render(() => page())
  harness.unmount()

  assert.ok(findElement(view, element => textOf(element) === '绑定手机号：151****5262'))
  assert.ok(findElement(view, element => textOf(element).includes('s后重试')))
  assert.ok(findElement(view, element => textOf(element) === '确认注销'))

  const cells = []
  const collect = element => {
    if (!element || typeof element !== 'object') return
    if (element.props?.className?.includes('account-cancel-confirm-code__cell')) cells.push(element)
    ;[element.props?.children].flat(Infinity).forEach(collect)
  }
  collect(view)
  assert.equal(cells.length, 6)
})

test('cancel confirm step rejects a short code before calling the backend', async t => {
  const { harness, page, toast, cancelAccount } = loadCancelConfirm(t)
  const view = harness.render(() => page())
  harness.unmount()

  await findElement(view, element => element.props?.accessibilityLabel === '确认注销').props.onPress()

  assert.equal(cancelAccount.mock.callCount(), 0)
  assert.equal(toast.mock.calls[0].arguments[0].title, '请输入 6 位数字验证码')
})

test('cancel confirm step submits the six digit code and returns to mine on success', async t => {
  const { harness, page, navigate, cancelAccount } = loadCancelConfirm(t)
  const view = harness.render(() => page())
  harness.unmount()

  const input = findElement(view, element => element.type === 'Input')
  input.props.onInput({ detail: { value: '123456' } })

  const refreshed = harness.render(() => page())
  harness.unmount()

  await findElement(refreshed, element => element.props?.accessibilityLabel === '确认注销').props.onPress()
  await new Promise(resolve => setTimeout(resolve, 900))

  assert.equal(cancelAccount.mock.callCount(), 1)
  assert.equal(cancelAccount.mock.calls[0].arguments[0], '123456')
  assert.equal(navigate.mock.calls[0].arguments[0], '/pages/mine/index')
})

test('cancel confirm step keeps the code on a failed cancellation', async t => {
  const { harness, page, navigate, toast } = loadCancelConfirm(t, { cancelResult: { status: false, message: '验证码已失效' } })
  const view = harness.render(() => page())
  harness.unmount()

  const input = findElement(view, element => element.type === 'Input')
  input.props.onInput({ detail: { value: '123456' } })

  const refreshed = harness.render(() => page())
  harness.unmount()

  await findElement(refreshed, element => element.props?.accessibilityLabel === '确认注销').props.onPress()

  assert.equal(navigate.mock.callCount(), 0)
  assert.equal(toast.mock.calls[0].arguments[0].title, '验证码已失效')
})
