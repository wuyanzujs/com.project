require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { CACHE_KEYS } = require('@/cache/keys')
const { clearAppCache, getAppCacheSizeBytes } = require('@/cache/maintenance')
const { getPersonalizedRecommendEnabled, setPersonalizedRecommendEnabled } = require('@/cache/preferences')
const { getJsonStorageValue, removeStorageValue, setJsonStorageValue } = require('@/cache/storage')
const { formatAppVersionText, formatCacheSize } = require('@/services/account/settings.rules')
const { accountSettingsService } = require('@/services/account/settings.service')

const { createReactHarness, findElement, loadReactModule } = require('../support/react-harness.cjs')

function textOf(element) {
  return [element.props?.children].flat(Infinity).join('')
}

test('cache size text follows the settings page format', () => {
  assert.equal(formatCacheSize(0), '0B')
  assert.equal(formatCacheSize(-1), '0B')
  assert.equal(formatCacheSize(Number.NaN), '0B')
  assert.equal(formatCacheSize(512), '512B')
  assert.equal(formatCacheSize(128 * 1024 + 399), '128.39K')
  assert.equal(formatCacheSize(1024 * 1024), '1.00M')
})

test('version row text keeps the 当前版本v prefix without duplicating v', () => {
  assert.equal(formatAppVersionText('1.0.0'), '当前版本v1.0.0')
  assert.equal(formatAppVersionText(' v1.2.3 '), '当前版本v1.2.3')
  assert.equal(formatAppVersionText(''), '当前版本v--')
})

test('clearing the app cache drops drafts but keeps the session and the recommendation preference', async () => {
  await setJsonStorageValue(CACHE_KEYS.expressDraft, { cargoName: '文件' })
  await setJsonStorageValue(CACHE_KEYS.expressGoodsHistory, ['文件'])
  await setJsonStorageValue(CACHE_KEYS.userInfo, { mobile: '15136805262' })
  await setJsonStorageValue(CACHE_KEYS.userSession, { token: 'ECO_TOKEN' })
  await setPersonalizedRecommendEnabled(false)

  assert.ok(getAppCacheSizeBytes() > 0, 'draft payloads count towards the cache size')

  await clearAppCache()

  assert.equal(getJsonStorageValue(CACHE_KEYS.expressDraft), null)
  assert.equal(getJsonStorageValue(CACHE_KEYS.expressGoodsHistory), null)
  assert.deepEqual(getJsonStorageValue(CACHE_KEYS.userInfo), { mobile: '15136805262' })
  assert.deepEqual(getJsonStorageValue(CACHE_KEYS.userSession), { token: 'ECO_TOKEN' })
  assert.equal(getPersonalizedRecommendEnabled(), false)
  assert.equal(getAppCacheSizeBytes(), 0)
})

test('personalized recommendation defaults to on and persists explicit choices', async () => {
  await removeStorageValue(CACHE_KEYS.personalizedRecommend)

  assert.equal(getPersonalizedRecommendEnabled(), true)

  assert.equal(await setPersonalizedRecommendEnabled(false), true)
  assert.equal(getPersonalizedRecommendEnabled(), false)

  assert.equal(await setPersonalizedRecommendEnabled(true), true)
  assert.equal(getPersonalizedRecommendEnabled(), true)
})

function loadSettingsPage(t, overrides = {}) {
  const harness = createReactHarness()
  const navigate = t.mock.fn()
  const logout = t.mock.fn(async () => undefined)
  const setPersonalized = t.mock.fn(async () => overrides.persistResult === undefined || overrides.persistResult)

  const page = loadReactModule('pages/account/settings/index.tsx', {
    react: harness.react,
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/components': { ScrollView: 'ScrollView', Text: 'Text', View: 'View' },
    '@tarojs/taro': { showToast: () => Promise.resolve({}), useDidShow: () => undefined },
    '@/services/account': {
      accountSettingsService: {
        getCacheSizeText: () => '128.39K',
        clearCache: async () => '0B',
        isPersonalizedRecommendEnabled: () => overrides.personalized !== false,
        setPersonalizedRecommendEnabled: setPersonalized,
        getVersionText: () => '当前版本v1.0.0'
      }
    },
    '@/services/auth': { authService: { logout } },
    '@/shared/components': { AppPressable: 'AppPressable', AppSwitch: 'AppSwitch' },
    '@/shared/components/AppIcon/images': {
      APP_IMAGE_ICONS: { arrowRightGrey: 'arrow-right-grey.png' }
    },
    '@/shared/navigation/appNavigation': { navigateToAppRoute: navigate },
    '@/shared/navigation/authGuard': { hasValidSession: () => true, navigateToLogin: () => undefined },
    '@/shared/webview/appWeb': { createAppWebUrl: options => `/pages/web/index?source=${options.source}` },
    '@/shared/navigation/routes': {
      APP_ROUTES: { privacySettings: '/pages/privacy/settings/index', mine: '/pages/mine/index', accountSettings: '/pages/account/settings/index' }
    },
    './index.scss': {},
    './content.scss': {}
  }).default

  return { harness, page, navigate, logout, setPersonalized }
}

test('settings page renders the rows with cache size and version', t => {
  const { harness, page } = loadSettingsPage(t)
  const view = harness.render(() => page())

  for (const label of ['清除缓存', '协议说明', '个性化推荐功能', '版本信息']) {
    assert.ok(
      findElement(view, element => textOf(element) === label),
      `${label} row rendered`
    )
  }

  assert.ok(
    findElement(view, element => textOf(element) === '128.39K'),
    'cache size uses the measured value'
  )
  assert.ok(
    findElement(view, element => textOf(element) === '当前版本v1.0.0'),
    'version row keeps the expected wording'
  )
  assert.ok(
    findElement(view, element => textOf(element) === '退出登录'),
    'logout action rendered'
  )
  assert.equal(
    findElement(view, element => typeof element.props?.children === 'string' && element.props.children.includes('H5')),
    undefined,
    'no engineering copy about H5 handover is rendered'
  )
})

test('settings page entries navigate to the agreement page and persist the recommendation switch', async t => {
  const { harness, page, navigate, setPersonalized } = loadSettingsPage(t)
  const view = harness.render(() => page())

  const agreement = findElement(view, element => element.props?.accessibilityLabel === '协议说明')
  agreement.props.onPress()
  // 「协议说明」走 H5：/depponmobile/protocol/record（页面标题「法律条款与隐私政策」）。
  assert.equal(navigate.mock.calls[0].arguments[0], '/pages/web/index?source=PROTOCOL_RECORD')
  assert.equal(navigate.mock.calls[0].arguments[1].login, true)

  const toggle = findElement(view, element => element.type === 'AppSwitch')
  await toggle.props.onChange(false)
  assert.equal(setPersonalized.mock.calls[0].arguments[0], false)
})

test('settings page logout clears the session without a confirmation dialog', async t => {
  const { harness, page, logout, navigate } = loadSettingsPage(t)
  const view = harness.render(() => page())

  await findElement(view, element => element.props?.accessibilityLabel === '退出登录').props.onPress()

  assert.equal(logout.mock.callCount(), 1)
  assert.equal(navigate.mock.calls[0].arguments[0], '/pages/mine/index')
  assert.equal(navigate.mock.calls[0].arguments[1].replace, true)
})

function loadProfilePage(t, overrides = {}) {
  const harness = createReactHarness()
  const navigate = t.mock.fn()
  const logout = t.mock.fn(async () => undefined)
  const page = loadReactModule('pages/account/profile/index.tsx', {
    react: harness.react,
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/components': { Image: 'Image', Text: 'Text', View: 'View' },
    '@tarojs/taro': { showToast: () => Promise.resolve({}), useDidShow: () => undefined },
    '@/services/account': {
      accountService: {
        getOverview: () => ({
          user: { mobile: '15136805262' },
          displayName: '测试',
          mobile: '15136805262',
          maskedMobile: overrides.maskedMobile ?? '151****5262',
          loggedIn: true
        })
      }
    },
    '@/services/auth': { authService: { logout } },
    '@/shared/components': { AppPage: 'AppPage', AppPressable: 'AppPressable' },
    '@/shared/navigation/appNavigation': { navigateToAppRoute: navigate },
    '@/shared/navigation/authGuard': { hasValidSession: () => overrides.authenticated !== false, navigateToLogin: () => undefined },
    '@/shared/navigation/routes': {
      APP_ROUTES: { accountProfile: '/pages/account/profile/index', accountCancel: '/pages/account/cancel/index', mine: '/pages/mine/index' }
    },
    './content.scss': {}
  }).default

  return { harness, page, navigate, logout }
}

test('profile settings page shows the masked mobile with logout and cancel entries', t => {
  const { harness, page } = loadProfilePage(t)
  const view = harness.render(() => page())

  assert.ok(
    findElement(view, element => textOf(element) === '151****5262'),
    'masked mobile rendered'
  )
  assert.ok(
    findElement(view, element => textOf(element) === '退出登录'),
    'logout action rendered'
  )
  assert.ok(
    findElement(view, element => textOf(element) === '注销账号'),
    'cancel account entry rendered'
  )
  assert.ok(
    findElement(view, element => textOf(element).includes('注销后无法恢复')),
    'cancel account warning rendered'
  )
})

test('profile settings page logout and cancel account use the shared navigation guard', async t => {
  const { harness, page, navigate, logout } = loadProfilePage(t)
  const view = harness.render(() => page())

  await findElement(view, element => element.props?.accessibilityLabel === '退出登录').props.onPress()
  assert.equal(logout.mock.callCount(), 1)
  assert.equal(navigate.mock.calls[0].arguments[0], '/pages/mine/index')
  assert.equal(navigate.mock.calls[0].arguments[1].replace, true)

  findElement(view, element => element.props?.accessibilityLabel === '注销账号').props.onPress()
  assert.equal(navigate.mock.calls[1].arguments[0], '/pages/account/cancel/index')
  assert.equal(navigate.mock.calls[1].arguments[1].login, true)
})

test('profile settings page redirects to login when the session is gone', t => {
  const harness = createReactHarness()
  const login = t.mock.fn()
  const shown = []
  const page = loadReactModule('pages/account/profile/index.tsx', {
    react: harness.react,
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/components': { Image: 'Image', Text: 'Text', View: 'View' },
    '@tarojs/taro': {
      showToast: () => Promise.resolve({}),
      useDidShow: callback => {
        shown.push(callback)
      }
    },
    '@/services/account': {
      accountService: { getOverview: () => ({ user: null, displayName: '未登录', mobile: '', maskedMobile: '', loggedIn: false }) }
    },
    '@/services/auth': { authService: { logout: async () => undefined } },
    '@/shared/components': { AppPage: 'AppPage', AppPressable: 'AppPressable' },
    '@/shared/navigation/appNavigation': { navigateToAppRoute: () => undefined },
    '@/shared/navigation/authGuard': { hasValidSession: () => false, navigateToLogin: login },
    '@/shared/navigation/routes': {
      APP_ROUTES: { accountProfile: '/pages/account/profile/index', accountCancel: '/pages/account/cancel/index', mine: '/pages/mine/index' }
    },
    './content.scss': {}
  }).default

  harness.render(() => page())
  shown.forEach(callback => callback())

  assert.equal(login.mock.callCount(), 1)
  assert.deepEqual(login.mock.calls[0].arguments[0].redirectUrl, '/pages/account/profile/index')
})

test('settings service reports the version and cache text from the shared sources', () => {
  assert.equal(accountSettingsService.getVersionText(), '当前版本v1.0.0')
  assert.ok(accountSettingsService.getCacheSizeText().length > 0)
})
