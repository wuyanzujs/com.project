import { beforeEach, describe, expect, it, vi } from 'vitest'

import WebPage from '@/pages/web'

import { findElement, reactRuntime, textOf } from '../support/react-runtime'

const mocks = vi.hoisted(() => ({
  ensureAuthenticated: vi.fn(),
  getAppWebWarehouseStagingId: vi.fn(),
  getCurrentPages: vi.fn(),
  getCurrentRouteUrl: vi.fn(),
  hasValidSession: vi.fn(),
  isAllowedAppWebTargetUrl: vi.fn(),
  navigateBack: vi.fn(),
  navigateToAppRoute: vi.fn(),
  requiresAppWebLogin: vi.fn(),
  resolveAppWebTarget: vi.fn(),
  setNavigationBarTitle: vi.fn(),
  showToast: vi.fn(),
  stage: vi.fn()
}))

const lifecycle = vi.hoisted(() => ({
  show: [] as Array<() => void>
}))

const target = {
  allowed: true,
  auth: true,
  message: '',
  messageContext: '',
  source: 'CUSTOMER_CENTER',
  title: '客户中心',
  url: 'https://owstest.deppon.com/depponmobile/mow/customer'
}

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
  Text: 'Text',
  View: 'View'
}))

vi.mock('@tarojs/taro', () => ({
  default: {
    getCurrentPages: mocks.getCurrentPages,
    navigateBack: mocks.navigateBack,
    setNavigationBarTitle: mocks.setNavigationBarTitle,
    showToast: mocks.showToast
  },
  useDidShow: (callback: () => void) => lifecycle.show.push(callback),
  useRouter: () => ({ params: {} })
}))

vi.mock('@/shared/components', () => ({
  AppPressable: 'AppPressable'
}))

vi.mock('@/shared/native', () => ({
  AppWebView: 'AppWebView'
}))

vi.mock('@/shared/navigation/appNavigation', () => ({
  navigateToAppRoute: mocks.navigateToAppRoute
}))

vi.mock('@/shared/navigation/authGuard', () => ({
  ensureAuthenticated: mocks.ensureAuthenticated,
  getCurrentRouteUrl: mocks.getCurrentRouteUrl,
  hasValidSession: mocks.hasValidSession
}))

vi.mock('@/shared/navigation/routes', () => ({
  APP_ROUTES: { home: '/pages/home/index' }
}))

vi.mock('@/shared/webview/appWeb', () => ({
  getAppWebWarehouseStagingId: mocks.getAppWebWarehouseStagingId,
  isAllowedAppWebTargetUrl: mocks.isAllowedAppWebTargetUrl,
  requiresAppWebLogin: mocks.requiresAppWebLogin,
  resolveAppWebTarget: mocks.resolveAppWebTarget
}))

vi.mock('@/shared/webview/appWebMessage', () => ({
  appWebMessageBridge: { stage: mocks.stage }
}))

vi.mock('@/pages/web/index.scss', () => ({}))
vi.mock('@/pages/web/content.scss', () => ({}))

function renderPage() {
  return reactRuntime.render(() => WebPage())
}

function findWebView(view: unknown) {
  return findElement(view, element => element.type === 'AppWebView')
}

beforeEach(() => {
  reactRuntime.reset()
  vi.clearAllMocks()
  lifecycle.show.length = 0
  mocks.resolveAppWebTarget.mockReturnValue(target)
  mocks.hasValidSession.mockReturnValue(false)
  mocks.requiresAppWebLogin.mockReturnValue(false)
  mocks.isAllowedAppWebTargetUrl.mockReturnValue(true)
  mocks.getCurrentRouteUrl.mockReturnValue('/pages/home/index')
  mocks.getAppWebWarehouseStagingId.mockReturnValue('WH1')
  mocks.getCurrentPages.mockReturnValue([{}, {}])
  mocks.ensureAuthenticated.mockReturnValue(false)
  mocks.stage.mockReturnValue({ closeAfterReceive: false, handled: false })
})

describe('web page authentication', () => {
  it('checks the App session before rendering an authenticated target', () => {
    const order: string[] = []
    mocks.resolveAppWebTarget.mockImplementation(() => {
      order.push('target')
      return target
    })
    mocks.requiresAppWebLogin.mockImplementation(() => {
      order.push('login')
      return true
    })

    const view = renderPage()

    expect(order).toEqual(['target', 'login'])
    expect(mocks.requiresAppWebLogin).toHaveBeenCalledWith(target, false)
    expect(findWebView(view)).toBeUndefined()
    expect(textOf(view)).toContain('请先登录')
    expect(textOf(view)).toContain('登录后继续访问当前服务')
  })

  it('sends the user to the unified login guard with the current route', () => {
    mocks.requiresAppWebLogin.mockReturnValue(true)

    const view = renderPage()
    const loginButton = findElement(view, element => element.type === 'AppPressable' && textOf(element) === '去登录')

    loginButton.props.onPress()

    expect(mocks.ensureAuthenticated).toHaveBeenCalledWith({
      message: false,
      redirectUrl: '/pages/home/index',
      replace: true
    })
  })

  it('re-checks the session when the page is shown again', () => {
    mocks.requiresAppWebLogin.mockReturnValue(true)

    renderPage()
    lifecycle.show.at(-1)?.()

    expect(mocks.ensureAuthenticated).toHaveBeenCalledWith(expect.objectContaining({ redirectUrl: '/pages/home/index', replace: true }))
  })

  it('renders a public target once the session check passes', () => {
    const view = renderPage()
    const webView = findWebView(view)

    expect(mocks.requiresAppWebLogin).toHaveBeenCalledWith(target, false)
    expect(webView.props).toMatchObject({ authenticated: true, uri: target.url })
    expect(textOf(view)).not.toContain('请先登录')
  })
})

describe('web page target guards', () => {
  it('shows the configured fallback when the target has no url', () => {
    mocks.resolveAppWebTarget.mockReturnValue({ ...target, message: '当前入口暂未配置承接地址', url: '' })

    const view = renderPage()

    expect(textOf(view)).toContain('当前入口暂未配置承接地址')
    expect(findWebView(view)).toBeUndefined()
  })

  it('shows the allow-list fallback for an unauthorized target', () => {
    mocks.resolveAppWebTarget.mockReturnValue({ ...target, allowed: false, message: '当前链接暂未允许访问' })

    const view = renderPage()

    expect(textOf(view)).toContain('当前链接暂未允许访问')
    expect(findWebView(view)).toBeUndefined()
  })

  it('reports load failures instead of keeping the web view', () => {
    const view = renderPage()
    findWebView(view).props.onError()

    expect(textOf(renderPage())).toContain('页面加载失败')
  })

  it('shows and hides the loading overlay', () => {
    const view = renderPage()
    const webView = findWebView(view)

    webView.props.onLoadStart()
    expect(textOf(renderPage())).toContain('加载中')

    findWebView(renderPage()).props.onLoadEnd()
    expect(textOf(renderPage())).not.toContain('加载中')
  })

  it('navigates back to the previous page or home', () => {
    const view = renderPage()
    findWebView(view).props.onError()

    const backButton = findElement(renderPage(), element => element.type === 'AppPressable' && textOf(element) === '返回')
    backButton.props.onPress()
    expect(mocks.navigateBack).toHaveBeenCalledTimes(1)

    mocks.getCurrentPages.mockReturnValue([{}])
    findElement(renderPage(), element => element.type === 'AppPressable' && textOf(element) === '返回').props.onPress()
    expect(mocks.navigateToAppRoute).toHaveBeenCalledWith('/pages/home/index')
  })
})

describe('web page message bridge', () => {
  it('blocks unauthorized in-page navigation', () => {
    mocks.isAllowedAppWebTargetUrl.mockReturnValue(false)
    const view = renderPage()

    const allowed = findWebView(view).props.onShouldStartLoad('https://evil.example.com')

    expect(allowed).toBe(false)
    expect(mocks.showToast).toHaveBeenCalledWith({ icon: 'none', title: '已拦截未授权链接' })
  })

  it('tracks the active url for warehouse staging messages', () => {
    mocks.resolveAppWebTarget.mockReturnValue({ ...target, source: 'EXPRESS_WAREHOUSE' })
    const view = renderPage()
    const webView = findWebView(view)

    expect(webView.props.onShouldStartLoad('https://owstest.deppon.com/depponmobile/mow/send/warehouse/index?warehouseId=WH1')).toBe(true)
    webView.props.onMessage('{"event":"done"}')

    expect(mocks.stage).toHaveBeenCalledWith('EXPRESS_WAREHOUSE', '{"event":"done"}', { stagingId: 'WH1' })
  })

  it('passes the message context through and closes the page when requested', () => {
    mocks.resolveAppWebTarget.mockReturnValue({ ...target, messageContext: 'EXPRESS_DRAFT' })
    mocks.stage.mockReturnValue({ closeAfterReceive: true, handled: true })

    const view = renderPage()
    findWebView(view).props.onMessage('{"event":"done"}')

    expect(mocks.stage).toHaveBeenCalledWith('CUSTOMER_CENTER', '{"event":"done"}', { messageContext: 'EXPRESS_DRAFT' })
    expect(mocks.navigateBack).toHaveBeenCalledTimes(1)
  })

  it('stages messages without context when the target has none', () => {
    const view = renderPage()
    findWebView(view).props.onMessage('{"event":"done"}')

    expect(mocks.stage).toHaveBeenCalledWith('CUSTOMER_CENTER', '{"event":"done"}', undefined)
  })
})
