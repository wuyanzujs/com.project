import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useContactAddressIntegrity } from '@/pages/contact/hooks/useContactAddressIntegrity'

import { reactRuntime } from '../support/react-runtime'

const mocks = vi.hoisted(() => ({
  checkAddressDetail: vi.fn(),
  showModal: vi.fn(),
  showToast: vi.fn()
}))

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

vi.mock('@tarojs/taro', () => ({
  default: { showModal: mocks.showModal, showToast: mocks.showToast }
}))

vi.mock('@/services/contact', async () => {
  const actual = await vi.importActual<typeof import('@/services/contact/contact.addressIntegrity')>('@/services/contact/contact.addressIntegrity')

  return {
    contactService: { checkAddressDetail: mocks.checkAddressDetail },
    resolveContactAddressIntegrity: actual.resolveContactAddressIntegrity
  }
})

const contact = {
  address: '明珠路 100 号',
  city: '上海市',
  county: '青浦区',
  defaultAddress: '0' as const,
  id: 'C1',
  name: '张三',
  province: '上海',
  regionType: '' as const,
  telephone: '13800000000',
  type: 0 as const
}

const options = { cancelText: '继续使用', confirmText: '修改地址' }

function renderHook() {
  return reactRuntime.render(() => useContactAddressIntegrity())
}

beforeEach(() => {
  reactRuntime.reset()
  vi.clearAllMocks()
  mocks.checkAddressDetail.mockResolvedValue({ message: '', result: null, status: true })
  mocks.showModal.mockResolvedValue({ cancel: false, confirm: false })
})

describe('useContactAddressIntegrity', () => {
  it('continues through the contact service when the address is complete', async () => {
    const { checkAddressIntegrity } = renderHook()

    await expect(checkAddressIntegrity(contact, options)).resolves.toBe('continue')

    expect(mocks.checkAddressDetail).toHaveBeenCalledWith(contact)
    expect(mocks.showModal).not.toHaveBeenCalled()
  })

  it('blocks the flow when the session expired', async () => {
    mocks.checkAddressDetail.mockResolvedValue({ authExpired: true, message: '', result: null, status: false })
    const { checkAddressIntegrity } = renderHook()

    await expect(checkAddressIntegrity(contact, options)).resolves.toBe('blocked')

    expect(mocks.showModal).not.toHaveBeenCalled()
  })

  it('continues with a toast when the integrity check is unavailable', async () => {
    mocks.checkAddressDetail.mockResolvedValue({ message: '', result: null, status: false, transportFailure: true })
    const { checkAddressIntegrity } = renderHook()

    await expect(checkAddressIntegrity(contact, options)).resolves.toBe('continue')

    expect(mocks.showToast).toHaveBeenCalledWith({ icon: 'none', title: '地址完整性校验暂不可用，已继续' })
    expect(mocks.showModal).not.toHaveBeenCalled()
  })

  it('asks the caller to review an incomplete address', async () => {
    mocks.checkAddressDetail.mockResolvedValue({ message: '缺少门牌号', result: null, status: false })
    mocks.showModal.mockResolvedValue({ cancel: false, confirm: true })
    const { checkAddressIntegrity } = renderHook()

    await expect(checkAddressIntegrity(contact, options)).resolves.toBe('review')

    expect(mocks.showModal).toHaveBeenCalledWith({
      cancelText: '继续使用',
      confirmText: '修改地址',
      content: '缺少门牌号',
      title: '地址可能不完整'
    })
  })

  it('continues when the caller decides to keep the address', async () => {
    mocks.checkAddressDetail.mockResolvedValue({ message: '', result: null, status: false })
    mocks.showModal.mockResolvedValue({ cancel: true, confirm: false })
    const { checkAddressIntegrity } = renderHook()

    await expect(checkAddressIntegrity(contact, options)).resolves.toBe('continue')

    expect(mocks.showModal).toHaveBeenCalledWith(expect.objectContaining({ content: '地址可能不完整，请确认是否继续使用' }))
  })

  it('blocks when the confirmation dialog fails to open', async () => {
    mocks.checkAddressDetail.mockResolvedValue({ message: '缺少门牌号', result: null, status: false })
    mocks.showModal.mockRejectedValue(new Error('dialog unavailable'))
    const { checkAddressIntegrity } = renderHook()

    await expect(checkAddressIntegrity(contact, options)).resolves.toBe('blocked')

    expect(mocks.showToast).toHaveBeenCalledWith({ icon: 'none', title: '地址确认未完成，请重试' })
  })

  it('rejects a second check while the first one is still running', async () => {
    let resolveCheck: (value: unknown) => void = () => undefined
    mocks.checkAddressDetail.mockImplementation(() => new Promise(resolve => (resolveCheck = resolve)))
    const { checkAddressIntegrity } = renderHook()

    const first = checkAddressIntegrity(contact, options)
    await expect(checkAddressIntegrity(contact, options)).resolves.toBe('blocked')

    resolveCheck({ message: '', result: null, status: true })

    await expect(first).resolves.toBe('continue')
    expect(mocks.checkAddressDetail).toHaveBeenCalledTimes(1)
  })

  it('clears the checking key after the decision', async () => {
    const { checkingKey, checkAddressIntegrity } = renderHook()

    await checkAddressIntegrity(contact, options)

    expect(checkingKey).toBe('')
  })
})
