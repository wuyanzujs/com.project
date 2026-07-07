import Taro from '@tarojs/taro'

import { ensureAuthenticated } from './authGuard'
import { APP_MAIN_NAVIGATION, APP_ROUTES } from './routes'

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
    pathname === APP_ROUTES.orderList ||
    pathname === APP_ROUTES.orderStub ||
    pathname === APP_ROUTES.paymentList ||
    pathname === APP_ROUTES.couponList ||
    pathname === APP_ROUTES.couponDetail ||
    pathname === APP_ROUTES.accountSettings ||
    pathname === APP_ROUTES.accountCancel ||
    pathname === APP_ROUTES.realNameCenter ||
    pathname === APP_ROUTES.memberCenter ||
    pathname === APP_ROUTES.customerCenter ||
    pathname === APP_ROUTES.signCode ||
    pathname === APP_ROUTES.ecardCenter ||
    pathname === APP_ROUTES.invoiceCenter ||
    pathname === APP_ROUTES.invoiceApply ||
    pathname === APP_ROUTES.invoiceDetail ||
    pathname === APP_ROUTES.invoicePreview ||
    pathname === APP_ROUTES.invoiceTaxpayerList ||
    pathname === APP_ROUTES.invoiceTaxpayerEdit ||
    pathname === APP_ROUTES.privacySettings
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
