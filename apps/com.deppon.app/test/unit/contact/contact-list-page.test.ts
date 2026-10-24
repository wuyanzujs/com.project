import { beforeEach, describe, expect, it, vi } from 'vitest'

import ContactListPage from '@/pages/contact/list'

import { findElement, reactRuntime, textOf } from '../support/react-runtime'

const mocks = vi.hoisted(() => ({
  checkAddressIntegrity: vi.fn(),
  ensureAuthenticated: vi.fn(),
  navigateBack: vi.fn(),
  navigateToAppRoute: vi.fn(),
  parseParams: vi.fn(),
  queryList: vi.fn(),
  select: vi.fn(),
  setEditingContact: vi.fn(),
  showToast: vi.fn()
}))

const lifecycle = vi.hoisted(() => ({
  load: [] as Array<() => void>,
  show: [] as Array<() => void>
}))

const selectionParams = { mode: 'select', returnDelta: '1', source: 'express', target: 'sender' }

const contact = {
  address: '明珠路 100 号',
  city: '上海市',
  county: '青浦区',
  defaultAddress: '0',
  id: 'C1',
  name: '张三',
  province: '上海',
  telephone: '13800000000',
  type: 0
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
  Input: 'Input',
  ScrollView: 'ScrollView',
  Text: 'Text',
  View: 'View'
}))

vi.mock('@tarojs/taro', () => ({
  default: {
    navigateBack: mocks.navigateBack,
    setNavigationBarTitle: vi.fn(),
    showModal: vi.fn(),
    showToast: mocks.showToast
  },
  useDidShow: (callback: () => void) => lifecycle.show.push(callback),
  useLoad: (callback: () => void) => lifecycle.load.push(callback),
  useRouter: () => ({ params: {} })
}))

vi.mock('@/services/contact', () => ({
  contactSelection: {
    parseParams: mocks.parseParams,
    select: mocks.select,
    setEditingContact: mocks.setEditingContact
  },
  contactService: {
    queryList: mocks.queryList,
    remove: vi.fn(),
    setDefault: vi.fn()
  },
  getContactFullAddress: (item: typeof contact) => `${item.province}${item.city}${item.county}${item.address}`
}))

vi.mock('@/services/express', () => ({
  maskExpressContactMobile: () => '138****0000'
}))

vi.mock('@/shared/components', () => ({
  AppDialog: 'AppDialog',
  AppPage: 'AppPage',
  AppPressable: 'AppPressable'
}))

vi.mock('@/shared/components/AppIcon', () => ({
  AppIcon: 'AppIcon'
}))

vi.mock('@/shared/navigation/appNavigation', () => ({
  navigateToAppRoute: mocks.navigateToAppRoute
}))

vi.mock('@/shared/navigation/authGuard', () => ({
  ensureAuthenticated: mocks.ensureAuthenticated
}))

vi.mock('@/shared/navigation/routes', () => ({
  APP_ROUTES: { contactEdit: '/pages/contact/edit', contactList: '/pages/contact/list' }
}))

vi.mock('@/shared/navigation/routeUrl', () => ({
  createAppRouteUrl: () => '/pages/contact/list'
}))

vi.mock('@/shared/platform', () => ({
  copyTextToClipboard: vi.fn()
}))

vi.mock('@/styles/nativeTokens', () => ({
  APP_STYLE_COLORS: {
    brand: { gradientEnd: '#4b7cff', gradientStart: '#1b58ff' },
    text: { inverse: '#fff', neutral: '#666', neutralHint: '#868686', neutralSoft: '#747474', subdued: '#999' }
  }
}))

vi.mock('@/shared/native', () => ({
  AppLinearGradient: 'AppLinearGradient'
}))

vi.mock('@/pages/contact/components/ContactNavBar', () => ({
  ContactNavBar: 'ContactNavBar'
}))

vi.mock('@/pages/contact/hooks/useContactAddressIntegrity', () => ({
  useContactAddressIntegrity: () => ({ checkAddressIntegrity: mocks.checkAddressIntegrity, checkingKey: '' })
}))

vi.mock('@/pages/contact/list/index.scss', () => ({}))
vi.mock('@/pages/contact/list/content.scss', () => ({}))

function renderPage() {
  return reactRuntime.render(() => ContactListPage())
}

async function flush() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

async function openPage() {
  renderPage()
  lifecycle.load.at(-1)?.()
  await flush()
  return renderPage()
}

function findContactCard(view: unknown) {
  return findElement(view, element => element.type === 'AppPressable' && typeof element.props?.onPress === 'function' && textOf(element).includes('张三'))
}

beforeEach(() => {
  reactRuntime.reset()
  vi.clearAllMocks()
  lifecycle.load.length = 0
  lifecycle.show.length = 0
  mocks.parseParams.mockReturnValue(selectionParams)
  mocks.ensureAuthenticated.mockReturnValue(true)
  mocks.checkAddressIntegrity.mockResolvedValue('continue')
  mocks.queryList.mockResolvedValue({ message: '', result: { list: [contact], pageNum: 1, totalPage: 1 }, status: true })
})

describe('contact list address integrity', () => {
  it('checks the address before selecting it', async () => {
    const order: string[] = []
    mocks.checkAddressIntegrity.mockImplementation(async () => {
      order.push('check')
      return 'continue'
    })
    mocks.select.mockImplementation(() => order.push('select'))

    const card = findContactCard(await openPage())
    await card.props.onPress()

    expect(order).toEqual(['check', 'select'])
    expect(mocks.checkAddressIntegrity).toHaveBeenCalledWith(contact, { cancelText: '继续使用', confirmText: '修改地址' })
    expect(mocks.select).toHaveBeenCalledWith('sender', contact, 'express')
    expect(mocks.navigateBack).toHaveBeenCalledTimes(1)
  })

  it('opens the edit page instead of selecting when the address needs review', async () => {
    mocks.checkAddressIntegrity.mockResolvedValue('review')

    const card = findContactCard(await openPage())
    await card.props.onPress()

    expect(mocks.select).not.toHaveBeenCalled()
    expect(mocks.setEditingContact).toHaveBeenCalledWith(contact)
    expect(mocks.navigateToAppRoute).toHaveBeenCalledTimes(1)
  })

  it('stops the selection when the integrity check blocks the flow', async () => {
    mocks.checkAddressIntegrity.mockResolvedValue('blocked')

    const card = findContactCard(await openPage())
    await card.props.onPress()

    expect(mocks.select).not.toHaveBeenCalled()
    expect(mocks.navigateToAppRoute).not.toHaveBeenCalled()
  })

  it('does not check the address before the login guard passes', async () => {
    const card = findContactCard(await openPage())
    mocks.ensureAuthenticated.mockReturnValue(false)

    await card.props.onPress()

    expect(mocks.checkAddressIntegrity).not.toHaveBeenCalled()
    expect(mocks.select).not.toHaveBeenCalled()
  })
})
