import { beforeEach, describe, expect, it, vi } from 'vitest'

import ContactEditPage from '@/pages/contact/edit'

import { findElement, reactRuntime, textOf } from '../support/react-runtime'

const mocks = vi.hoisted(() => ({
  checkAddressIntegrity: vi.fn(),
  consumeEditingContact: vi.fn(),
  ensureAuthenticated: vi.fn(),
  navigateBack: vi.fn(),
  parseParams: vi.fn(),
  save: vi.fn(),
  showToast: vi.fn(),
  validateContact: vi.fn()
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
  Image: 'Image',
  Input: 'Input',
  ScrollView: 'ScrollView',
  Text: 'Text',
  Textarea: 'Textarea',
  View: 'View'
}))

vi.mock('@tarojs/taro', () => ({
  default: {
    navigateBack: mocks.navigateBack,
    setNavigationBarTitle: vi.fn(),
    showToast: mocks.showToast
  },
  useLoad: vi.fn(),
  useRouter: () => ({ params: {} })
}))

vi.mock('@/assets/contact/contact_icon_book.png', () => ({ default: 'book.png' }))
vi.mock('@/assets/contact/contact_icon_camera.png', () => ({ default: 'camera.png' }))
vi.mock('@/assets/contact/contact_icon_speech.png', () => ({ default: 'speech.png' }))

vi.mock('@/services/contact', () => ({
  contactSelection: {
    consumeEditingContact: mocks.consumeEditingContact,
    parseParams: mocks.parseParams,
    select: vi.fn()
  },
  contactService: { save: mocks.save },
  createEmptyContact: () => ({ ...contact, id: '' }),
  formatRegionLabel: () => '上海市青浦区',
  validateContact: mocks.validateContact
}))

vi.mock('@/shared/components', () => ({
  AppPage: 'AppPage',
  AppPressable: 'AppPressable'
}))

vi.mock('@/shared/components/AppIcon', () => ({
  AppIcon: 'AppIcon'
}))

vi.mock('@/shared/navigation/authGuard', () => ({
  ensureAuthenticated: mocks.ensureAuthenticated
}))

vi.mock('@/shared/navigation/routes', () => ({
  APP_ROUTES: { contactEdit: '/pages/contact/edit' }
}))

vi.mock('@/shared/navigation/routeUrl', () => ({
  createAppRouteUrl: () => '/pages/contact/edit'
}))

vi.mock('@/shared/platform', () => ({
  getNativeCapabilityErrorMessage: () => '分享失败',
  shareWithApp: vi.fn()
}))

vi.mock('@/styles/nativeTokens', () => ({
  APP_STYLE_COLORS: { text: { heading: '#111', inverse: '#fff', placeholderSoft: '#aaa', supporting: '#888' } }
}))

vi.mock('@/pages/contact/components/ContactNavBar', () => ({
  ContactNavBar: 'ContactNavBar'
}))

vi.mock('@/pages/contact/hooks/useContactAddressActions', () => ({
  useContactAddressActions: () => ({
    analyzing: false,
    analysisText: '',
    handleAnalyze: vi.fn(),
    setAnalysisText: vi.fn()
  })
}))

vi.mock('@/pages/contact/hooks/useContactAddressIntegrity', () => ({
  useContactAddressIntegrity: () => ({ checkAddressIntegrity: mocks.checkAddressIntegrity, checkingKey: '' })
}))

vi.mock('@/pages/contact/edit/components/RegionPicker', () => ({
  RegionPicker: 'RegionPicker'
}))

vi.mock('@/pages/contact/edit/index.scss', () => ({}))
vi.mock('@/pages/contact/edit/content.scss', () => ({}))

function renderPage() {
  return reactRuntime.render(() => ContactEditPage())
}

function findSaveButton(view: unknown) {
  const page = findElement(view, element => element.type === 'AppPage')

  return findElement(
    page?.props?.footer,
    element => element.type === 'AppPressable' && typeof element.props?.onPress === 'function' && textOf(element) === '确定'
  )
}

beforeEach(() => {
  reactRuntime.reset()
  vi.clearAllMocks()
  mocks.parseParams.mockReturnValue(selectionParams)
  mocks.consumeEditingContact.mockReturnValue(null)
  mocks.ensureAuthenticated.mockReturnValue(true)
  mocks.validateContact.mockReturnValue({ messages: [], valid: true })
  mocks.checkAddressIntegrity.mockResolvedValue('continue')
  mocks.save.mockResolvedValue({ message: '', result: contact, status: true })
})

describe('contact edit address integrity', () => {
  it('checks the address before saving it', async () => {
    const order: string[] = []
    mocks.checkAddressIntegrity.mockImplementation(async () => {
      order.push('check')
      return 'continue'
    })
    mocks.save.mockImplementation(async () => {
      order.push('save')
      return { message: '', result: contact, status: true }
    })

    const button = findSaveButton(renderPage())
    await button.props.onPress()

    expect(order).toEqual(['check', 'save'])
    expect(mocks.checkAddressIntegrity).toHaveBeenCalledWith(expect.objectContaining({ address: '明珠路 100 号' }), {
      cancelText: '仍然保存',
      confirmText: '继续修改'
    })
    expect(mocks.navigateBack).toHaveBeenCalledTimes(1)
  })

  it('does not save when the address needs review', async () => {
    mocks.checkAddressIntegrity.mockResolvedValue('review')

    const button = findSaveButton(renderPage())
    await button.props.onPress()

    expect(mocks.save).not.toHaveBeenCalled()
    expect(mocks.navigateBack).not.toHaveBeenCalled()
  })

  it('does not save when the integrity check blocks the flow', async () => {
    mocks.checkAddressIntegrity.mockResolvedValue('blocked')

    const button = findSaveButton(renderPage())
    await button.props.onPress()

    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('does not run the integrity check when local validation fails', async () => {
    mocks.validateContact.mockReturnValue({ messages: ['请输入详细地址'], valid: false })

    const button = findSaveButton(renderPage())
    await button.props.onPress()

    expect(mocks.checkAddressIntegrity).not.toHaveBeenCalled()
    expect(mocks.showToast).toHaveBeenCalledWith({ icon: 'none', title: '请输入详细地址' })
  })

  it('stops at the login guard before checking or saving', async () => {
    mocks.ensureAuthenticated.mockReturnValue(false)

    const button = findSaveButton(renderPage())
    await button.props.onPress()

    expect(mocks.checkAddressIntegrity).not.toHaveBeenCalled()
    expect(mocks.save).not.toHaveBeenCalled()
  })
})
