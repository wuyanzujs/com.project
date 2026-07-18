import Taro from '@tarojs/taro'

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
  $router?: {
    path?: string
  }
}

const NAVIGATION_CONFIRM_ATTEMPTS = 16
const NAVIGATION_CONFIRM_INTERVAL_MS = 32

function reportNavigationFailure(options: DispatchAppRouteOptions) {
  options.onFailure?.()

  try {
    const toast = Taro.showToast({
      title: options.failureMessage || '页面打开失败，请重试',
      icon: 'none'
    })

    void Promise.resolve(toast).catch(() => undefined)
  } catch {
    // Navigation recovery must not fail again when feedback is unavailable.
  }
}

function getRoutePathname(url: string) {
  return url.split('?')[0].replace(/^\/+/, '')
}

function getCurrentRoutePathname() {
  try {
    const pages = Taro.getCurrentPages() as PageLike[]
    const page = pages[pages.length - 1]
    const route = page?.route || page?.__route__ || page?.$router?.path || ''

    return getRoutePathname(route)
  } catch {
    return ''
  }
}

function delayNavigationConfirmation() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, NAVIGATION_CONFIRM_INTERVAL_MS)
  })
}

async function confirmCurrentRoute(url: string) {
  const targetPathname = getRoutePathname(url)

  for (let attempt = 0; attempt < NAVIGATION_CONFIRM_ATTEMPTS; attempt += 1) {
    const currentPathname = getCurrentRoutePathname()

    if (currentPathname && currentPathname === targetPathname) {
      return true
    }

    if (attempt < NAVIGATION_CONFIRM_ATTEMPTS - 1) {
      await delayNavigationConfirmation()
    }
  }

  return false
}

function isCurrentRoute(url: string) {
  const currentPathname = getCurrentRoutePathname()

  return Boolean(currentPathname) && currentPathname === getRoutePathname(url)
}

function runAppNavigation(url: string, replace = false) {
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
