import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const appRoot = process.cwd()
const srcRoot = path.join(appRoot, 'src')
const routeRegistryPath = path.join(
  srcRoot,
  'shared/navigation/routeRegistry.ts'
)
const appConfigPath = path.join(srcRoot, 'app.config.ts')
const routesPath = path.join(srcRoot, 'shared/navigation/routes.ts')
const appNavigationPath = path.join(
  srcRoot,
  'shared/navigation/appNavigation.ts'
)

const violations = []

function addViolation(message) {
  violations.push(message)
}

function readText(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : ''
}

function getRouteDefinitions() {
  const content = readText(routeRegistryPath)
  const listMatch = content.match(
    /APP_ROUTE_DEFINITIONS\s*=\s*\[([\s\S]*?)\]\s*as const/
  )

  if (!listMatch) {
    addViolation('routeRegistry.ts 缺少 APP_ROUTE_DEFINITIONS 注册表。')
    return []
  }

  return [...listMatch[1].matchAll(/\{([\s\S]*?)\}/g)]
    .map((match) => {
      const block = match[1]
      const name = block.match(/name:\s*'([^']+)'/)?.[1] ?? ''
      const pagePath = block.match(/path:\s*'([^']+)'/)?.[1] ?? ''

      return {
        name,
        path: pagePath,
        main: /main:\s*true/.test(block),
        loginRequired: /loginRequired:\s*true/.test(block)
      }
    })
    .filter((item) => item.name || item.path)
}

function hasDuplicate(values) {
  return values.some((value, index) => values.indexOf(value) !== index)
}

function checkRouteDefinitions(routes) {
  if (!routes.length) {
    addViolation('routeRegistry.ts 至少需要声明一个页面路由。')
    return
  }

  const names = routes.map((item) => item.name)
  const paths = routes.map((item) => item.path)

  if (routes.some((item) => !item.name || !item.path)) {
    addViolation('routeRegistry.ts 中每个路由都必须声明 name 和 path。')
  }

  if (hasDuplicate(names)) {
    addViolation('routeRegistry.ts 存在重复的路由 name。')
  }

  if (hasDuplicate(paths)) {
    addViolation('routeRegistry.ts 存在重复的路由 path。')
  }

  for (const item of routes) {
    const tsxPath = path.join(srcRoot, `${item.path}.tsx`)
    const tsPath = path.join(srcRoot, `${item.path}.ts`)

    if (!existsSync(tsxPath) && !existsSync(tsPath)) {
      addViolation(`路由 ${item.name} 对应页面文件不存在：src/${item.path}`)
    }
  }

  const mainRouteNames = routes.filter((item) => item.main).map((item) => item.name)
  const expectedMainRoutes = ['home', 'express', 'orderList', 'mine']

  if (mainRouteNames.join(',') !== expectedMainRoutes.join(',')) {
    addViolation(
      `主导航必须保持 ${expectedMainRoutes.join(', ')}，当前为 ${mainRouteNames.join(', ')}。`
    )
  }

  if (!routes.some((item) => item.name === 'login')) {
    addViolation('routeRegistry.ts 必须声明 login 路由。')
  }

  if (!routes.some((item) => item.loginRequired)) {
    addViolation('routeRegistry.ts 至少需要一个 loginRequired 受保护路由。')
  }
}

function checkDerivedConsumers() {
  const appConfig = readText(appConfigPath)
  const routes = readText(routesPath)
  const appNavigation = readText(appNavigationPath)

  if (!appConfig.includes('APP_PAGE_PATHS')) {
    addViolation('app.config.ts 的 pages 必须从 APP_PAGE_PATHS 派生。')
  }

  if (!routes.includes('APP_ROUTE_DEFINITIONS')) {
    addViolation('routes.ts 必须从 APP_ROUTE_DEFINITIONS 派生 APP_ROUTES。')
  }

  if (!appNavigation.includes('APP_LOGIN_ROUTE_PATHS')) {
    addViolation('appNavigation.ts 的登录守卫必须从 APP_LOGIN_ROUTE_PATHS 派生。')
  }
}

const routeDefinitions = getRouteDefinitions()

checkRouteDefinitions(routeDefinitions)
checkDerivedConsumers()

if (violations.length) {
  console.error('Route registry check failed.\n')

  for (const violation of violations) {
    console.error(`- ${violation}`)
  }

  process.exit(1)
}

console.log('Route registry check passed.')
