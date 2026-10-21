import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createPaymentEvaluateWebUri,
  createPaymentWaybillQuery,
  getPaymentEvaluateScene,
  getPaymentItemAmount,
  getPaymentOrderTypeLabel,
  getPaymentRangeDays,
  getPaymentWriteOffStatus,
  paymentService
} from '@/services/payment/payment.service'

import type { PaymentItem } from '@/services/payment/types'

const mocks = vi.hoisted(() => ({
  queryUnpaidList: vi.fn(),
  getCachedUser: vi.fn()
}))

vi.mock('@/services/payment/payment.api', () => ({
  paymentApi: { queryUnpaidList: mocks.queryUnpaidList }
}))

vi.mock('@/services/auth', () => ({
  authService: { getCachedUser: mocks.getCachedUser }
}))

const createItem = (overrides: Partial<PaymentItem> = {}): PaymentItem =>
  ({
    waybillNum: 'W1',
    paymentMethod: 'DT',
    unWriteoffAmount: 10,
    totalAmount: 12,
    writeoffAmount: 12,
    ...overrides
  }) as PaymentItem

const listResponse = (list: PaymentItem[], extra: Record<string, unknown> = {}) => ({
  status: true,
  message: '',
  result: { list, ...extra }
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getCachedUser.mockReturnValue({ mobile: '13800000000' })
  mocks.queryUnpaidList.mockResolvedValue(listResponse([createItem()]))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('payment status helpers', () => {
  it('maps list status to write-off values and ranges', () => {
    expect(getPaymentWriteOffStatus()).toBe(0)
    expect(getPaymentWriteOffStatus('UNPAID')).toBe(0)
    expect(getPaymentWriteOffStatus('PAID')).toBe(1)
    expect(getPaymentRangeDays()).toBe(30)
    expect(getPaymentRangeDays('UNPAID')).toBe(30)
    expect(getPaymentRangeDays('PAID')).toBe(180)
  })

  it('labels order types with 运费 as the default', () => {
    expect(getPaymentOrderTypeLabel('CR')).toBe('货款')
    expect(getPaymentOrderTypeLabel('DVAR')).toBe('保管费')
    expect(getPaymentOrderTypeLabel('OR')).toBe('运费')
    expect(getPaymentOrderTypeLabel(null)).toBe('运费')
    expect(getPaymentOrderTypeLabel(undefined)).toBe('运费')
  })

  it('derives the evaluation scene from the payment method', () => {
    expect(getPaymentEvaluateScene(createItem({ paymentMethod: 'FC' }))).toBe('S0705')
    expect(getPaymentEvaluateScene(createItem({ paymentMethod: 'DT' }))).toBe('S0405')
  })
})

describe('getPaymentItemAmount', () => {
  it('prefers the unpaid amount for unpaid rows', () => {
    expect(getPaymentItemAmount(createItem({ unWriteoffAmount: 5, totalAmount: 12 }))).toBe(5)
  })

  it('prefers the write-off amount for paid rows', () => {
    expect(getPaymentItemAmount(createItem({ writeoffAmount: 11, totalAmount: 12 }), 'PAID')).toBe(11)
  })

  it('falls back through the候选 amounts and finally to zero', () => {
    expect(getPaymentItemAmount(createItem({ unWriteoffAmount: undefined, totalAmount: 12 }))).toBe(12)
    expect(getPaymentItemAmount(createItem({ writeoffAmount: undefined, totalAmount: 12, unWriteoffAmount: 7 }), 'PAID')).toBe(12)
    expect(getPaymentItemAmount(createItem({ unWriteoffAmount: undefined, totalAmount: undefined }))).toBe(0)
  })

  it('accepts numeric strings and rejects non numeric values', () => {
    expect(getPaymentItemAmount(createItem({ unWriteoffAmount: '8.5' as never }))).toBe(8.5)
    expect(getPaymentItemAmount(createItem({ unWriteoffAmount: 'abc' as never, totalAmount: 'bad' as never }))).toBe(0)
  })
})

describe('createPaymentWaybillQuery', () => {
  it('handles empty, single and multi waybill input', () => {
    expect(createPaymentWaybillQuery()).toEqual({})
    expect(createPaymentWaybillQuery('   ')).toEqual({})
    expect(createPaymentWaybillQuery(' W1 ')).toEqual({ waybillNo: 'W1' })
    expect(createPaymentWaybillQuery('W1,W2')).toEqual({ waybillNos: ['W1', 'W2'] })
    expect(createPaymentWaybillQuery('W1，W2 W3')).toEqual({ waybillNos: ['W1', 'W2', 'W3'] })
  })
})

describe('createPaymentEvaluateWebUri', () => {
  it('uses the cached user mobile by default', () => {
    const uri = createPaymentEvaluateWebUri(createItem())

    expect(uri.startsWith('/depponmobile/survey/land?')).toBe(true)
    expect(uri).toContain('channel=TEST_SYSTEM_CODE')
    expect(uri).toContain('mobile=13800000000')
    expect(uri).toContain('scene=S0405')
    expect(uri).toContain(encodeURIComponent('"waybillNumber"'))
  })

  it('prefers an explicit mobile and trims it', () => {
    const uri = createPaymentEvaluateWebUri(createItem({ paymentMethod: 'FC' }), ' 13900000000 ')

    expect(uri).toContain('mobile=13900000000')
    expect(uri).toContain('scene=S0705')
    expect(mocks.getCachedUser).not.toHaveBeenCalled()
  })
})

describe('paymentService.getDateRange', () => {
  it('formats a local start and end boundary for the range', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15, 10, 20, 30))

    const range = paymentService.getDateRange(30)

    expect(range.endTime).toBe('2026-03-15 23:59:59')
    expect(range.startTime).toBe('2026-02-13 00:00:00')
  })

  it('falls back to the default range for invalid input', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15, 10, 20, 30))

    expect(paymentService.getDateRange(0).startTime).toBe('2026-02-13 00:00:00')
    expect(paymentService.getDateRange(Number.NaN).startTime).toBe('2026-02-13 00:00:00')
  })

  it('maps roles to order types', () => {
    expect(paymentService.getOrderTypeByRole('receive')).toBe('DR')
    expect(paymentService.getOrderTypeByRole('sender')).toBe('OR')
  })
})

describe('paymentService.queryPaymentList', () => {
  it('filters JD payments and defaults active only for unpaid lists', async () => {
    mocks.queryUnpaidList.mockResolvedValue(
      listResponse([createItem({ waybillNum: 'W1' }), createItem({ waybillNum: 'W2', isJdPay: 'Y' }), createItem({ waybillNum: 'W3', active: false })])
    )

    const response = await paymentService.queryPaymentList({ status: 'UNPAID' })

    expect(response.result?.list).toEqual([
      expect.objectContaining({ waybillNum: 'W1', active: true }),
      expect.objectContaining({ waybillNum: 'W3', active: false })
    ])
    expect(response.result?.pageAmount).toBe(20)
  })

  it('keeps JD payments for paid lists but still defaults active', async () => {
    mocks.queryUnpaidList.mockResolvedValue(
      listResponse([createItem({ waybillNum: 'W1', isJdPay: 'Y', writeoffAmount: 3, totalAmount: 3 })])
    )

    const response = await paymentService.queryPaymentList({ status: 'PAID' })

    expect(response.result?.list).toHaveLength(1)
    expect(response.result?.list[0].active).toBe(true)
    expect(response.result?.pageAmount).toBe(3)
  })

  it('passes write-off status, order type, waybill query and loading flag', async () => {
    await paymentService.queryPaymentList({ status: 'PAID', role: 'receive', waybillNumber: 'W1,W2', pageIndex: 2, pageSize: 5, loading: true })

    expect(mocks.queryUnpaidList).toHaveBeenCalledWith(
      expect.objectContaining({
        writeOffStatus: 1,
        customerProperty: 'DR',
        waybillNos: ['W1', 'W2'],
        pageIndex: 2,
        pageSize: 5,
        orderSource: undefined
      }),
      true
    )
  })

  it('derives paging values when the backend omits them', async () => {
    mocks.queryUnpaidList.mockResolvedValue(listResponse([createItem()], { totalRows: 23 }))

    const response = await paymentService.queryPaymentList({ pageIndex: 2, pageSize: 10 })

    expect(response.result).toMatchObject({ pageIndex: 2, pageSize: 10, totalPage: 3, totalRows: 23 })
  })

  it('uses the backend paging values when present', async () => {
    mocks.queryUnpaidList.mockResolvedValue(listResponse([createItem()], { totalRows: 99, pageNum: 1, pageSize: 20, totalPage: 5 }))

    const response = await paymentService.queryPaymentList({})

    expect(response.result).toMatchObject({ pageIndex: 1, pageSize: 20, totalPage: 5, totalRows: 99 })
  })

  it('uses a different failure copy per status', async () => {
    mocks.queryUnpaidList.mockResolvedValue({ status: false, message: '', result: null })
    await expect(paymentService.queryPaymentList({ status: 'PAID' })).resolves.toEqual({
      status: false,
      message: '暂未获取到支付记录',
      result: null
    })
    await expect(paymentService.queryPaymentList({})).resolves.toEqual({ status: false, message: '暂未获取到待支付运单', result: null })

    mocks.queryUnpaidList.mockResolvedValue({ status: false, message: '网关超时', result: null })
    await expect(paymentService.queryPaymentList({})).resolves.toEqual({ status: false, message: '网关超时', result: null })
  })

  it('forwards unpaid queries through queryUnpaidList', async () => {
    const spy = vi.spyOn(paymentService, 'queryPaymentList')

    await paymentService.queryUnpaidList({ waybillNumber: 'W1' })

    expect(spy).toHaveBeenCalledWith({ waybillNumber: 'W1', status: 'UNPAID' })
    spy.mockRestore()
  })
})

describe('paymentService.queryUnpaidByWaybill', () => {
  it('requires a waybill number', async () => {
    await expect(paymentService.queryUnpaidByWaybill({ waybillNumber: '  ', role: 'sender' })).resolves.toEqual({
      status: false,
      message: '缺少运单号，暂无法查询待支付费用',
      result: null
    })
    expect(mocks.queryUnpaidList).not.toHaveBeenCalled()
  })

  it('summarizes payable items', async () => {
    mocks.queryUnpaidList.mockResolvedValue(listResponse([createItem({ unWriteoffAmount: 6 }), createItem({ unWriteoffAmount: 4 })]))

    const response = await paymentService.queryUnpaidByWaybill({ waybillNumber: ' W1 ', role: 'receive' })

    expect(mocks.queryUnpaidList).toHaveBeenCalledWith(
      expect.objectContaining({ customerProperty: 'DR', pageIndex: 1, writeOffStatus: 0, waybillNo: 'W1' }),
      false
    )
    expect(response.result).toMatchObject({ waybillNumber: 'W1', count: 2, amount: 10, canPay: true, disabledReason: undefined })
  })

  it('marks the summary as not payable when every item is unsupported', async () => {
    mocks.queryUnpaidList.mockResolvedValue(listResponse([createItem({ isJdPay: 'Y' })]))

    const response = await paymentService.queryUnpaidByWaybill({ waybillNumber: 'W1', role: 'sender' })

    expect(response.result).toMatchObject({ count: 0, amount: 0, canPay: false, disabledReason: '该运单暂不支持 App 在线支付' })
  })

  it('reports lookup failures', async () => {
    mocks.queryUnpaidList.mockResolvedValue({ status: false, message: '', result: null })

    await expect(paymentService.queryUnpaidByWaybill({ waybillNumber: 'W1', role: 'sender' })).resolves.toEqual({
      status: false,
      message: '暂未获取到待支付费用',
      result: null
    })
  })
})
