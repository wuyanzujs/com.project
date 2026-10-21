import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryExpressProductAvailability } from '@/services/express/product/productAvailability.service'

import type { ExpressDraft, ExpressGoodsLabel } from '@/services/express/core/types'

const mocks = vi.hoisted(() => ({
  goodsLabels: vi.fn(),
  pointCity: vi.fn(),
  productSwitch: vi.fn(),
  productUpgrade: vi.fn(),
  queryCustomerCapability: vi.fn(),
  token: vi.fn()
}))

vi.mock('@/services/express/core/express.api', () => ({
  expressApi: {
    queryGoodsLabels: mocks.goodsLabels,
    queryProductPointCity: mocks.pointCity,
    queryProductSwitch: mocks.productSwitch,
    queryProductUpgrade: mocks.productUpgrade
  }
}))

vi.mock('@/services/auth/session', () => ({
  getCurrentEcoToken: mocks.token
}))

vi.mock('@/services/customer/customer.service', () => ({
  customerService: { queryCustomerCapability: mocks.queryCustomerCapability }
}))

const contact = {
  address: '明珠路 100 号',
  city: '上海市',
  county: '青浦区',
  mobile: '13800000000',
  name: '张三',
  province: '上海'
}

const batteryLabel: ExpressGoodsLabel = {
  displayType: 'tips',
  goodsRemarkCode: 'battery_category',
  tip: '含电池'
}

const fragileLabel: ExpressGoodsLabel = {
  displayType: 'tips',
  goodsRemarkCode: 'fragile_articles',
  tip: '易碎'
}

function createDraft(overrides: Partial<ExpressDraft> = {}): ExpressDraft {
  return {
    agreementAccepted: true,
    collection: { account: '', accountName: '', agreementAccepted: false, amount: 0, limit: 0, type: '' },
    consignee: contact,
    couponNumber: '',
    deliveryPoint: { address: '', code: '', name: '', type: '' },
    deliveryPreference: { notifyReceiver: false, notifySender: false, type: '', scheduledDate: '', scheduledTime: '' },
    goods: { count: 1, insuredAmount: 0, name: '电池', volume: 0, weight: 1 },
    insurance: { capability: { disabled: false, fragile: false, inputKey: '', worryFree: false }, limit: 0, type: 'NORMAL' },
    packaging: { materials: [] },
    pickup: { address: '', contact: '', time: '' },
    quoteStaleReason: '',
    remark: '',
    selectedProduct: null,
    sender: contact,
    service: {
      deliveryMode: '',
      needContact: 'N',
      passwordSigning: 'N',
      paymentType: 'MP',
      privacyProtection: 'N',
      returnBill: { customRequirement: '', fileCode: '', requirements: [], returnCount: 0, type: 'NO_RETURN_SIGNED' },
      transportMode: ''
    },
    valueAdded: { insurance: false, receipt: false, returnBill: false },
    warehouse: { enabled: false, stagingId: '' },
    ...overrides
  } as unknown as ExpressDraft
}

function fulfillAll() {
  mocks.pointCity.mockResolvedValue({ message: '', result: true, status: true })
  mocks.productSwitch.mockResolvedValue({ message: '', result: true, status: true })
  mocks.productUpgrade.mockResolvedValue({ message: '', result: 'NEW', status: true })
  mocks.goodsLabels.mockResolvedValue({ message: '', result: [batteryLabel], status: true })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.token.mockReturnValue('')
  fulfillAll()
})

describe('queryExpressProductAvailability', () => {
  it('combines every optional result into the availability decision', async () => {
    const availability = await queryExpressProductAvailability(createDraft())

    expect(availability).toMatchObject({
      dczpAvailable: true,
      goodsHasBattery: true,
      productSwitch: 'UNIVERSAL',
      recommendDczp: true
    })
    expect(availability.insuranceCapability).toMatchObject({ fragile: false, worryFree: false })
    expect(mocks.pointCity).toHaveBeenCalledTimes(1)
    expect(mocks.productSwitch).toHaveBeenCalledTimes(1)
    expect(mocks.productUpgrade).toHaveBeenCalledTimes(1)
    expect(mocks.goodsLabels).toHaveBeenCalledTimes(1)
  })

  it('keeps the quote when the product switch endpoint fails', async () => {
    mocks.productSwitch.mockRejectedValue(new Error('switch offline'))

    const availability = await queryExpressProductAvailability(createDraft())

    expect(availability).toMatchObject({
      dczpAvailable: true,
      goodsHasBattery: true,
      productSwitch: 'UNIVERSAL',
      recommendDczp: true
    })
  })

  it('degrades only the dczp recommendation when the point endpoint fails', async () => {
    mocks.pointCity.mockRejectedValue(new Error('point offline'))

    const availability = await queryExpressProductAvailability(createDraft())

    expect(availability).toMatchObject({
      dczpAvailable: false,
      goodsHasBattery: true,
      productSwitch: 'UNIVERSAL',
      recommendDczp: false
    })
  })

  it('degrades only the upgrade decision when that endpoint fails', async () => {
    mocks.productUpgrade.mockRejectedValue(new Error('upgrade offline'))

    const availability = await queryExpressProductAvailability(createDraft())

    expect(availability).toMatchObject({
      dczpAvailable: true,
      goodsHasBattery: true,
      productSwitch: 'EXP'
    })
  })

  it('degrades only the goods labels when that endpoint fails', async () => {
    mocks.goodsLabels.mockRejectedValue(new Error('labels offline'))

    const availability = await queryExpressProductAvailability(createDraft())

    expect(availability).toMatchObject({
      dczpAvailable: true,
      goodsHasBattery: false,
      productSwitch: 'UNIVERSAL'
    })
    expect(availability.insuranceCapability).toEqual({ disabled: false, fragile: false, inputKey: '', worryFree: false })
  })

  it('treats failed responses as missing instead of throwing', async () => {
    mocks.pointCity.mockResolvedValue({ message: '', result: true, status: false })
    mocks.productSwitch.mockResolvedValue({ message: '', result: true, status: false })
    mocks.productUpgrade.mockResolvedValue({ message: '', result: 'NEW', status: true })

    const availability = await queryExpressProductAvailability(createDraft())

    expect(availability.dczpAvailable).toBe(false)
    expect(availability.productSwitch).toBe('UNIVERSAL')
  })

  it('lets a false fusion result win over the upgrade result', async () => {
    mocks.productSwitch.mockResolvedValue({ message: '', result: false, status: true })

    const availability = await queryExpressProductAvailability(createDraft())

    expect(availability.productSwitch).toBe('OLD')
  })

  it('uses an empty goods label list when the backend returns no result payload', async () => {
    mocks.goodsLabels.mockResolvedValue({ message: '', result: null, status: true })

    const availability = await queryExpressProductAvailability(createDraft())

    expect(availability.goodsHasBattery).toBe(false)
    expect(availability.insuranceCapability.inputKey).not.toBe('')
  })

  it('survives every optional endpoint rejecting at once', async () => {
    mocks.pointCity.mockRejectedValue(new Error('point'))
    mocks.productSwitch.mockRejectedValue(new Error('switch'))
    mocks.productUpgrade.mockRejectedValue(new Error('upgrade'))
    mocks.goodsLabels.mockRejectedValue(new Error('labels'))

    const availability = await queryExpressProductAvailability(createDraft())

    expect(availability).toMatchObject({
      dczpAvailable: false,
      goodsHasBattery: false,
      productSwitch: 'EXP',
      recommendDczp: false
    })
  })

  it('skips optional calls that the draft does not support', async () => {
    const availability = await queryExpressProductAvailability(
      createDraft({
        goods: { count: 1, insuredAmount: 0, name: '  ', volume: 0, weight: 1 },
        scanContext: { role: 'businessCode', value: '' }
      })
    )

    expect(mocks.pointCity).not.toHaveBeenCalled()
    expect(mocks.productSwitch).not.toHaveBeenCalled()
    expect(mocks.productUpgrade).not.toHaveBeenCalled()
    expect(mocks.goodsLabels).not.toHaveBeenCalled()
    expect(availability).toMatchObject({ dczpAvailable: false, goodsHasBattery: false, productSwitch: 'EXP' })
  })

  it('falls back to default availability when a request builder throws', async () => {
    const availability = await queryExpressProductAvailability(createDraft({ consignee: null, sender: null }))

    expect(availability).toMatchObject({ dczpAvailable: false, goodsHasBattery: false, productSwitch: 'EXP' })
  })
})

describe('queryExpressProductAvailability customer capability', () => {
  it('uses the account capability when a session exists', async () => {
    mocks.token.mockReturnValue('token')
    mocks.queryCustomerCapability.mockResolvedValue({
      message: '',
      result: { contractEnabled: true, customerCode: 'C1', insuranceLimit: 1000, monthlyEnabled: true },
      status: true
    })

    const availability = await queryExpressProductAvailability(createDraft())

    expect(mocks.queryCustomerCapability).toHaveBeenCalledTimes(1)
    expect(availability.customer).toMatchObject({ contractEnabled: true, customerCode: 'C1' })
    expect(availability.productSwitch).toBe('CONTRACT')
  })

  it('falls back when the capability response fails', async () => {
    mocks.token.mockReturnValue('token')
    mocks.queryCustomerCapability.mockResolvedValue({ message: 'no customer', result: null, status: false })

    const availability = await queryExpressProductAvailability(createDraft())

    expect(availability.customer).toMatchObject({ contractEnabled: false, customerCode: '' })
  })

  it('falls back when the capability query rejects', async () => {
    mocks.token.mockReturnValue('token')
    mocks.queryCustomerCapability.mockRejectedValue(new Error('customer offline'))

    const availability = await queryExpressProductAvailability(createDraft())

    expect(availability.customer).toMatchObject({ contractEnabled: false, customerCode: '' })
  })

  it('uses the scan customer code instead of the account capability', async () => {
    mocks.token.mockReturnValue('token')
    mocks.queryCustomerCapability.mockResolvedValue({
      message: '',
      result: { contractEnabled: true, customerCode: 'ACCOUNT', insuranceLimit: 1000, monthlyEnabled: true },
      status: true
    })

    const availability = await queryExpressProductAvailability(
      createDraft({
        goods: { count: 1, insuredAmount: 0, name: '文件', volume: 0, weight: 1 },
        scanContext: { role: 'shipperNumber', value: 'SCAN01' }
      })
    )

    expect(availability.customer.customerCode).toBe('SCAN01')
    expect(availability.customer.contractEnabled).toBe(false)
  })

  it('keeps fragile insurance capability from the goods labels', async () => {
    mocks.goodsLabels.mockResolvedValue({ message: '', result: [fragileLabel], status: true })

    const availability = await queryExpressProductAvailability(createDraft())

    expect(availability.insuranceCapability).toMatchObject({ fragile: true, worryFree: false })
  })
})
