import Taro from '@tarojs/taro'

import { dispatchAppRouteAsync } from './navigationRuntime'
import { APP_LOGIN_ROUTE_PATHS } from './routeRegistry'
import { APP_ROUTES } from './routes'
import { createAppRouteUrl, createRouteQuery } from './routeUrl'
import { getCurrentEcoToken } from '../../services/auth'

import type { AppRoutePath } from './routes'

type RouteParams = Record<string, unknown>

interface PageLike {
  route?: string
  __route__?: string
  options?: RouteParams
  $router?: {
    path?: string
    params?: RouteParams
  }
}

export interface LoginRedirectOptions {
  redirectUrl?: string
  replace?: boolean
  message?: string | false
}

let loginRedirectInFlight: Promise<boolean> | null = null

function isRecord(value: unknown): value is RouteParams {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeRoutePath(route?: string) {
  if (!route) {
    return ''
  }

  return route.startsWith('/') ? route : `/${route}`
}

function getRoutePathname(url: string) {
  return url.split('?')[0]
}

function isLoginRoute(url: string) {
  return getRoutePathname(url) === APP_ROUTES.login
}

function sanitizeRedirectUrl(url: string) {
  if (!url || !url.startsWith('/pages/') || isLoginRoute(url)) {
    return APP_ROUTES.mine
  }

  return url
}

function getCurrentPage(): PageLike | null {
  try {
    const pages = Taro.getCurrentPages() as PageLike[]

    return pages[pages.length - 1] ?? null
  } catch {
    return null
  }
}

function getCurrentPageParams(page: PageLike): RouteParams {
  if (isRecord(page.options)) {
    return page.options
  }

  if (isRecord(page.$router?.params)) {
    return page.$router.params
  }

  return {}
}

export function hasValidSession() {
  return !!getCurrentEcoToken()
}

export function getCurrentRouteUrl(fallback: string = APP_ROUTES.mine) {
  const page = getCurrentPage()
  const path = normalizeRoutePath(
    page?.route || page?.__route__ || page?.$router?.path
  )

  if (!page || !path) {
    return fallback
  }

  const query = createRouteQuery(getCurrentPageParams(page))

  return query ? `${path}?${query}` : path
}

export function createLoginRedirectUrl(redirectUrl?: string) {
  const target = sanitizeRedirectUrl(redirectUrl || getCurrentRouteUrl())

  return createAppRouteUrl(APP_ROUTES.login, {
    redirectUrl: target
  })
}

export function navigateToLogin(options: LoginRedirectOptions = {}) {
  if (isLoginRoute(getCurrentRouteUrl(''))) {
    return false
  }

  if (loginRedirectInFlight) {
    return false
  }

  if (options.message !== false) {
    try {
      const toast = Taro.showToast({
        title: options.message || '请先登录',
        icon: 'none'
      })

      void Promise.resolve(toast).catch(() => undefined)
    } catch {
      // Login navigation must continue when transient feedback is unavailable.
    }
  }

  const url = createLoginRedirectUrl(options.redirectUrl)
  const navigation = dispatchAppRouteAsync(url, {
    failureMessage: '登录页打开失败，请重试',
    replace: options.replace
  })

  loginRedirectInFlight = navigation
  void navigation.then(
    () => {
      if (loginRedirectInFlight === navigation) {
        loginRedirectInFlight = null
      }
    },
    () => {
      if (loginRedirectInFlight === navigation) {
        loginRedirectInFlight = null
      }
    }
  )

  return true
}

export function ensureAuthenticated(options: LoginRedirectOptions = {}) {
  if (hasValidSession()) {
    return true
  }

  navigateToLogin(options)
  return false
}

export function ensureCurrentRouteAuthenticated() {
  const currentUrl = getCurrentRouteUrl('')
  const pathname = getRoutePathname(currentUrl)

  if (
    !pathname ||
    !APP_LOGIN_ROUTE_PATHS.includes(pathname as AppRoutePath)
  ) {
    return true
  }

  return ensureAuthenticated({
    redirectUrl: currentUrl,
    replace: true
  })
}
