import Taro from '@tarojs/taro'

import { APP_MAIN_NAVIGATION } from './routes'
import { createRouteQuery } from './routeUrl'

interface DispatchAppRouteOptions {
  failureMessage?: string
  onFailure?: () => void
  replace?: boolean
}

interface DispatchAppRouteAsyncOptions extends DispatchAppRouteOptions {
  verify?: boolean
}

interface PageLike {
  route?: string
  __route__?: string
  options?: Record<string, unknown>
  $router?: {
    path?: string
    params?: Record<string, unknown>
  }
}

const NAVIGATION_CONFIRM_ATTEMPTS = 16
const NAVIGATION_CONFIRM_INTERVAL_MS = 32
const TAB_STACK_BACK_DELTA = 16
const TAB_STACK_SETTLE_ATTEMPTS = 12

const MAIN_ROUTE_PATHNAMES = APP_MAIN_NAVIGATION.map(item =>
  getRoutePathname(item.path)
)

function reportNavigationFailure(options: DispatchAppRouteOptions) {
  options.onFailure?.()

  try {
    const toast = Taro.showToast({
      title: options.failureMessage || '页面打开失败，请重试',
      icon: 'none'
    })

    void Promise.resolve(toast).catch(() => undefined)
  } catch {
    // 临时反馈不可用时，导航恢复流程也不能再抛错。
  }
}

function normalizeRoutePath(route: string) {
  return route.startsWith('/') ? route : `/${route}`
}

function getRoutePathname(url: string) {
  return normalizeRoutePath(url.split('?')[0])
}

function getPageRouteUrl(page: PageLike | undefined) {
  const route = page?.route || page?.__route__ || page?.$router?.path || ''

  if (!route) {
    return ''
  }

  const params = page?.options || page?.$router?.params || {}
  const query = createRouteQuery(params)

  return query
    ? `${normalizeRoutePath(route)}?${query}`
    : normalizeRoutePath(route)
}

function getCurrentRouteUrl() {
  try {
    const pages = Taro.getCurrentPages() as PageLike[]

    return getPageRouteUrl(pages[pages.length - 1])
  } catch {
    return ''
  }
}

function routeMatches(currentUrl: string, targetUrl: string) {
  const normalizedCurrent = normalizeRouteUrl(currentUrl)
  const normalizedTarget = normalizeRouteUrl(targetUrl)

  if (normalizedCurrent === normalizedTarget) {
    return true
  }

  // RN 页面快照在导航尚未稳定时可能只暴露 pathname。此时还观测不到 query 是否
  // 相等；等当前页面暴露 query 参数后，就走上面对 URL 的精确比较。
  return (
    !normalizedCurrent.includes('?') &&
    normalizedTarget.includes('?') &&
    getRoutePathname(normalizedCurrent) === getRoutePathname(normalizedTarget)
  )
}

function delayNavigationConfirmation() {
  return new Promise<void>(resolve => {
    setTimeout(resolve, NAVIGATION_CONFIRM_INTERVAL_MS)
  })
}

async function confirmCurrentRoute(url: string) {
  const targetUrl = normalizeRouteUrl(url)

  for (let attempt = 0; attempt < NAVIGATION_CONFIRM_ATTEMPTS; attempt += 1) {
    const currentUrl = getCurrentRouteUrl()

    if (currentUrl && routeMatches(currentUrl, targetUrl)) {
      return true
    }

    if (attempt < NAVIGATION_CONFIRM_ATTEMPTS - 1) {
      await delayNavigationConfirmation()
    }
  }

  return false
}

function isCurrentRoute(url: string) {
  const currentUrl = getCurrentRouteUrl()

  return Boolean(currentUrl) && routeMatches(currentUrl, url)
}

function normalizeRouteUrl(url: string) {
  const [pathname, query = ''] = url.split('?')

  if (!query) {
    return normalizeRoutePath(pathname)
  }

  const params = new URLSearchParams(query)

  return `${normalizeRoutePath(pathname)}?${createRouteQuery(
    Object.fromEntries(params.entries())
  )}`
}

interface AppRuntimeTabBarGlobal {
  __taroAppConfig?: {
    appConfig?: {
      tabBar?: {
        list?: unknown[]
      }
    }
  }
}

// tab 容器只有在 app 配置声明了 tabBar 时才存在。入口早于该配置的
// 构建产物会把主路由当普通栈页面，此时 switchTab 会静默失效。
function isTabContainerEnabled() {
  const list = (globalThis as AppRuntimeTabBarGlobal).__taroAppConfig?.appConfig
    ?.tabBar?.list

  return Array.isArray(list) && list.length > 0
}

function isMainRoutePathname(pathname: string) {
  return MAIN_ROUTE_PATHNAMES.includes(pathname)
}

function isMainRouteUrl(url: string) {
  return isMainRoutePathname(getRoutePathname(url))
}

function getCurrentPageCount() {
  try {
    return Taro.getCurrentPages().length
  } catch {
    return 0
  }
}

// tab 页面位于 tab 容器内，必须通过 Taro.switchTab 到达：既不播放页面栈
// 转场，也不会压入新页面。若容器上方还压着登录页/详情页，需要先把栈收回
// 容器，因为 switchTab 是通过当前聚焦的导航器解析 tab 路由的。
async function switchToMainRoute(url: string) {
  const needsUnwind =
    !isMainRoutePathname(getRoutePathname(getCurrentRouteUrl())) &&
    getCurrentPageCount() > 1

  if (needsUnwind) {
    try {
      await Taro.navigateBack({ delta: TAB_STACK_BACK_DELTA })
    } catch {
      // 栈已在根页面时 pop 会失败，此时直接切 tab 即可。
    }

    for (let attempt = 0; attempt < TAB_STACK_SETTLE_ATTEMPTS; attempt += 1) {
      if (getCurrentPageCount() <= 1) {
        break
      }

      await delayNavigationConfirmation()
    }
  }

  return Taro.switchTab({ url })
}

function runAppNavigation(url: string, replace = false) {
  if (isMainRouteUrl(url) && isTabContainerEnabled()) {
    return switchToMainRoute(url)
  }

  return replace ? Taro.redirectTo({ url }) : Taro.navigateTo({ url })
}

export function dispatchAppRoute(
  url: string,
  options: DispatchAppRouteOptions = {}
) {
  try {
    const navigation = runAppNavigation(url, options.replace)

    void Promise.resolve(navigation).catch(() => {
      reportNavigationFailure(options)
    })

    return true
  } catch {
    reportNavigationFailure(options)
    return false
  }
}

export async function dispatchAppRouteAsync(
  url: string,
  options: DispatchAppRouteAsyncOptions = {}
) {
  if (options.verify !== false && isCurrentRoute(url)) {
    return true
  }

  try {
    await Promise.resolve(runAppNavigation(url, options.replace))
  } catch {
    reportNavigationFailure(options)
    return false
  }

  if (options.verify === false || (await confirmCurrentRoute(url))) {
    return true
  }

  reportNavigationFailure(options)
  return false
}
