import { APP_MAIN_ROUTE_DEFINITIONS, APP_ROUTE_DEFINITIONS } from './routeRegistry'

import type { AppMainRouteName, AppRouteName, AppRoutePath } from './routeRegistry'

export type { AppMainRouteName, AppRouteName, AppRoutePath }

type AppRoutes = {
  [Name in AppRouteName]: AppRoutePath
}

export const APP_ROUTES = Object.fromEntries(APP_ROUTE_DEFINITIONS.map(item => [item.name, `/${item.path}`])) as AppRoutes

export const APP_MAIN_NAVIGATION = APP_MAIN_ROUTE_DEFINITIONS.map(item => ({
  name: item.name as AppMainRouteName,
  title: item.title,
  path: APP_ROUTES[item.name]
}))
