import Taro from '@tarojs/taro'

import { ensureAuthenticated } from './authGuard'
import { APP_LOGIN_ROUTE_PATHS } from './routeRegistry'
import { APP_MAIN_NAVIGATION, APP_ROUTES } from './routes'

import type { AppRoutePath } from './routes'

export interface NavigateToAppRouteOptions {
  login?: boolean
  message?: string | false
  replace?: boolean
}

const MAIN_ROUTE_PATHS = APP_MAIN_NAVIGATION.map((item) => item.path)

function getRoutePathname(url: string) {
  return url.split('?')[0]
}

function sanitizeAppRouteUrl(url: string) {
  if (!url || !url.startsWith('/pages/')) {
    return APP_ROUTES.mine
  }

  if (getRoutePathname(url) === APP_ROUTES.login) {
    return APP_ROUTES.mine
  }

  return url
}

export function isAppMainRoute(url: string) {
  const pathname = getRoutePathname(url)

  return MAIN_ROUTE_PATHS.includes(
    pathname as (typeof MAIN_ROUTE_PATHS)[number]
  )
}

function shouldRequireLogin(url: string, options: NavigateToAppRouteOptions) {
  const pathname = getRoutePathname(url)

  return (
    options.login ||
    APP_LOGIN_ROUTE_PATHS.includes(pathname as AppRoutePath)
  )
}

export function navigateToAppRoute(
  url: string,
  options: NavigateToAppRouteOptions = {}
) {
  const targetUrl = sanitizeAppRouteUrl(url)

  if (shouldRequireLogin(targetUrl, options)) {
    const allowed = ensureAuthenticated({
      redirectUrl: targetUrl,
      replace: options.replace || isAppMainRoute(targetUrl),
      message: options.message
    })

    if (!allowed) {
      return false
    }
  }

  if (options.replace || isAppMainRoute(targetUrl)) {
    Taro.redirectTo({ url: targetUrl })
    return true
  }

  Taro.navigateTo({ url: targetUrl })
  return true
}
