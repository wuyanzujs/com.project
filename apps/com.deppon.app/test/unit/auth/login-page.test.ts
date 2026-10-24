import { beforeEach, describe, expect, it, vi } from 'vitest'

import LoginPage from '@/pages/login'

import { findElement, reactRuntime, textOf } from '../support/react-runtime'

const mocks = vi.hoisted(() => ({
  loginWithSms: vi.fn(),
  navigateToAppRoute: vi.fn(),
  navigateToAppRouteAsync: vi.fn(),
  sendLoginSms: vi.fn(),
  showToast: vi.fn()
}))

vi.mock('react', () => ({
  get useCallback() {
    return reactRuntime.react.useCallback
  },
  get useEffect() {
    return reactRuntime.react.useEffect
  },
  get useMemo() {
    return reactRuntime.react.useMemo
  },
  get useRef() {
    return reactRuntime.react.useRef
  },
  get useState() {
    return reactRuntime.react.useState
  }
}))

vi.mock('@tarojs/components', () => ({
  Image: 'Image',
  Input: 'Input',
  ScrollView: 'ScrollView',
  Text: 'Text',
  View: 'View'
}))

vi.mock('@tarojs/taro', () => ({
  default: {
    navigateBack: vi.fn(),
    showToast: mocks.showToast
  },
  useRouter: () => ({ params: {} })
}))

vi.mock('@/assets/login/login-bg.png', () => ({ default: 'login-bg' }))
vi.mock('@/assets/login/login-label.png', () => ({ default: 'login-label' }))
vi.mock('@/assets/login/logo-alipay.png', () => ({ default: 'logo-alipay' }))
vi.mock('@/assets/login/logo-wechat.png', () => ({ default: 'logo-wechat' }))

vi.mock('@/services/auth', () => ({
  authService: {
    getCachedUser: () => null,
    loginWithSms: mocks.loginWithSms,
    sendLoginSms: mocks.sendLoginSms
  },
  isValidMobile: (value: string) => /^1\d{10}$/.test(value),
  isValidSmsCode: (value: string) => /^\d{6}$/.test(value)
}))

vi.mock('@/services/captcha', () => ({
  shouldOfferCaptcha: () => false
}))

vi.mock('@/shared/components', () => ({
  AppPressable: 'AppPressable',
  AppRadio: 'AppRadio'
}))

vi.mock('@/shared/components/AppIcon', () => ({
  AppIcon: 'AppIcon'
}))

vi.mock('@/shared/native', () => ({
  AppFormScrollView: 'AppFormScrollView',
  AppKeyboardAvoidingView: 'AppKeyboardAvoidingView'
}))

vi.mock('@/shared/navigation/appNavigation', () => ({
  navigateToAppRoute: mocks.navigateToAppRoute,
  navigateToAppRouteAsync: mocks.navigateToAppRouteAsync
}))

vi.mock('@/shared/navigation/authGuard', () => ({
  hasValidSession: () => false
}))

vi.mock('@/shared/navigation/routes', () => ({
  APP_ROUTES: { mine: '/pages/mine/index' }
}))

vi.mock('@/shared/navigation/routeUrl', () => ({
  normalizeAppRouteUrlParam: (value: string | undefined) => value ?? ''
}))

vi.mock('@/shared/platform', () => ({
  shareWithApp: vi.fn()
}))

vi.mock('@/shared/webview/appWeb', () => ({
  createAppWebUrl: ({ source }: { source: string }) => `https://web.test/${source}`
}))

vi.mock('@/styles/nativeTokens', () => ({
  APP_STYLE_COLORS: {
    brand: { gradientEnd: '#4b7cff', gradientStart: '#1b58ff' },
    text: { heading: '#16181a', inverse: '#fff', subdued: '#9b9b9b' }
  }
}))

vi.mock('@/pages/login/components/ClickWordCaptcha', () => ({
  ClickWordCaptcha: 'ClickWordCaptcha'
}))

vi.mock('@/pages/login/components/LoginAgreementSheet', () => ({
  LoginAgreementSheet: 'LoginAgreementSheet'
}))

vi.mock('@/pages/login/index.scss', () => ({}))
vi.mock('@/pages/login/content.scss', () => ({}))

const MOBILE = '13800138000'
const SMS_CODE = '123456'

function renderPage() {
  return reactRuntime.render(() => LoginPage())
}

async function flush() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

function findInput(view: unknown, placeholder: string) {
  return findElement(view, element => element.type === 'Input' && element.props?.placeholder === placeholder)
}

function findPressableByText(view: unknown, text: string) {
  return findElement(view, element => element.type === 'AppPressable' && typeof element.props?.onPress === 'function' && textOf(element).includes(text))
}

function findSheet(view: unknown) {
  return findElement(view, element => element.type === 'LoginAgreementSheet')
}

async function openPage() {
  renderPage()
  await flush()

  const view = renderPage()
  const mobileInput = findInput(view, '请输入手机号')
  mobileInput.props.onInput({ detail: { value: MOBILE } })

  return renderPage()
}

beforeEach(() => {
  reactRuntime.reset()
  vi.clearAllMocks()
  mocks.sendLoginSms.mockResolvedValue({ status: true, message: '', result: null })
  mocks.loginWithSms.mockResolvedValue({ status: true, message: '', result: null })
})

describe('login agreement sheet gating', () => {
  it('opens the agreement sheet instead of sending when the checkbox is unchecked', async () => {
    const view = await openPage()

    const codeInput = findInput(view, '请输入验证码')
    codeInput.props.onInput({ detail: { value: SMS_CODE } })

    const sendButton = findPressableByText(renderPage(), '获取验证码')
    await sendButton.props.onPress()

    const sheet = findSheet(renderPage())
    expect(sheet.props.visible).toBe(true)
    expect(mocks.sendLoginSms).not.toHaveBeenCalled()
  })

  it('checks the agreement and continues sending after agreeing in the sheet', async () => {
    const view = await openPage()

    const sendButton = findPressableByText(view, '获取验证码')
    await sendButton.props.onPress()

    const sheet = findSheet(renderPage())
    sheet.props.onAgree()
    await flush()

    expect(mocks.sendLoginSms).toHaveBeenCalledWith(MOBILE, undefined)
    expect(findSheet(renderPage()).props.visible).toBe(false)
    reactRuntime.reset()
  })

  it('opens the agreement sheet instead of toasting when submitting without agreement', async () => {
    const view = await openPage()

    const codeInput = findInput(view, '请输入验证码')
    codeInput.props.onInput({ detail: { value: SMS_CODE } })

    const submitButton = findPressableByText(renderPage(), '立即登录')
    await submitButton.props.onPress()

    const sheet = findSheet(renderPage())
    expect(sheet.props.visible).toBe(true)
    expect(mocks.showToast).not.toHaveBeenCalledWith(expect.objectContaining({ title: '请先阅读并同意协议' }))
    expect(mocks.loginWithSms).not.toHaveBeenCalled()
  })

  it('logs in after agreeing in the sheet', async () => {
    const view = await openPage()

    const codeInput = findInput(view, '请输入验证码')
    codeInput.props.onInput({ detail: { value: SMS_CODE } })

    const submitButton = findPressableByText(renderPage(), '立即登录')
    await submitButton.props.onPress()

    const sheet = findSheet(renderPage())
    sheet.props.onAgree()
    await flush()

    expect(mocks.loginWithSms).toHaveBeenCalledWith(MOBILE, SMS_CODE, '/pages/mine/index', undefined)
  })

  it('closes the sheet without accepting on decline', async () => {
    const view = await openPage()

    const sendButton = findPressableByText(view, '获取验证码')
    await sendButton.props.onPress()

    const sheet = findSheet(renderPage())
    sheet.props.onDecline()
    await flush()

    const closed = renderPage()
    expect(findSheet(closed).props.visible).toBe(false)
    expect(mocks.sendLoginSms).not.toHaveBeenCalled()

    await findPressableByText(closed, '获取验证码').props.onPress()
    expect(findSheet(renderPage()).props.visible).toBe(true)
  })
})
