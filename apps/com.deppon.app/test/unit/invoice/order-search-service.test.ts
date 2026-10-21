import { beforeEach, describe, expect, it, vi } from 'vitest'

import { invoiceOrderSearchService } from '@/services/invoice/orderSearch.service'

import type { InvoiceOrderRaw } from '@/services/invoice/types'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  mapOrder: vi.fn()
}))

vi.mock('@/services/invoice/invoice.api', () => ({
  invoiceApi: { request: mocks.request }
}))

vi.mock('@/services/invoice/order.mapper', () => ({
  normalizeInvoiceOrder: mocks.mapOrder
}))

const createOrder = (overrides: Partial<InvoiceOrderRaw> = {}): InvoiceOrderRaw =>
  ({
    sourceBillNo: 'W1',
    paymentPhone: '13800000000',
    paymentType: 'SENDER',
    ...overrides
  }) as InvoiceOrderRaw

const listResponse = (list: InvoiceOrderRaw[], message = '') => ({ status: true, message, result: { list } })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.mapOrder.mockImplementation(raw => ({ waybill: raw.sourceBillNo }))
})

describe('invoiceOrderSearchService.queryByWaybill', () => {
  it('requires a waybill number', async () => {
    await expect(invoiceOrderSearchService.queryByWaybill('  ')).resolves.toEqual({ status: false, message: '请输入运单号', result: null })
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('queries with the trimmed waybill and a 30s timeout', async () => {
    mocks.request.mockResolvedValue(listResponse([createOrder()]))

    await invoiceOrderSearchService.queryByWaybill(' W1 ')

    expect(mocks.request).toHaveBeenCalledWith('tradeQueryBySourceBillNo', { sourceBillNo: 'W1' }, false, 30000)
  })

  it('treats an empty list as not found', async () => {
    mocks.request.mockResolvedValue({ status: true, message: '', result: { list: [] } })
    await expect(invoiceOrderSearchService.queryByWaybill('W1')).resolves.toEqual({ status: false, message: '未查询到可开票运单', result: null })

    mocks.request.mockResolvedValue({ status: false, message: '运单不存在', result: null })
    await expect(invoiceOrderSearchService.queryByWaybill('W1')).resolves.toEqual({ status: false, message: '运单不存在', result: null })
  })

  it('maps every order when no verification is needed', async () => {
    mocks.request.mockResolvedValue(listResponse([createOrder(), createOrder({ sourceBillNo: 'W2' })]))

    const response = await invoiceOrderSearchService.queryByWaybill('W1')

    expect(mocks.mapOrder).toHaveBeenCalledTimes(2)
    expect(response.result).toEqual({ list: [{ waybill: 'W1' }, { waybill: 'W2' }], auth: null })
  })

  it('hides the list and returns a challenge when verification is required', async () => {
    mocks.request.mockResolvedValue(listResponse([createOrder(), createOrder({ option: '02' })]))

    const response = await invoiceOrderSearchService.queryByWaybill('W1')

    expect(mocks.mapOrder).not.toHaveBeenCalled()
    expect(response.result?.list).toEqual([])
    expect(response.result?.auth).toMatchObject({ authType: '02', maxLength: 4, inputType: 'number' })
  })
})

describe('invoiceOrderSearchService auth challenges', () => {
  it('treats missing or 01 options as no verification', async () => {
    mocks.request.mockResolvedValue(listResponse([createOrder({ option: '01' })]))

    const response = await invoiceOrderSearchService.queryByWaybill('W1')

    expect(response.result?.auth).toBeNull()
  })

  it('asks for the last four digits of the payer phone for 02', async () => {
    mocks.request.mockResolvedValue(listResponse([createOrder({ option: '02' })]))
    const auth = (await invoiceOrderSearchService.queryByWaybill('W1')).result?.auth

    expect(auth?.placeholder).toBe('请输入付款人手机后四位')
    expect(auth?.summary).toContain('W1')
    expect(auth?.phone).toBe('13800000000')
  })

  it('names the consignee or sender depending on the payment type for 03', async () => {
    mocks.request.mockResolvedValue(listResponse([createOrder({ option: '03', paymentType: 'FC' })]))
    const receiver = (await invoiceOrderSearchService.queryByWaybill('W1')).result?.auth
    expect(receiver?.placeholder).toBe('请输入收货人电话')
    expect(receiver?.summary).toContain('收货人')

    mocks.request.mockResolvedValue(listResponse([createOrder({ option: '03', paymentType: 'SENDER' })]))
    const sender = (await invoiceOrderSearchService.queryByWaybill('W1')).result?.auth
    expect(sender?.placeholder).toBe('请输入发货人电话')
    expect(sender?.summary).toContain('发货人')
  })

  it('falls back to a six digit code challenge for every other option', async () => {
    mocks.request.mockResolvedValue(listResponse([createOrder({ option: '04' })]))
    const auth = (await invoiceOrderSearchService.queryByWaybill('W1')).result?.auth

    expect(auth).toMatchObject({ authType: '04', maxLength: 6, inputType: 'number', placeholder: '请输入验证码' })
    expect(auth?.summary).toContain('13800000000')
  })
})

describe('invoiceOrderSearchService.verifyPhone', () => {
  it('requires both the waybill and the verification value', async () => {
    await expect(invoiceOrderSearchService.verifyPhone(' ', '1234')).resolves.toEqual({ status: false, message: '缺少运单号', result: null })
    await expect(invoiceOrderSearchService.verifyPhone('W1', '  ')).resolves.toEqual({ status: false, message: '请输入验证信息', result: null })
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('checks the trimmed pair against the backend', async () => {
    mocks.request.mockResolvedValue(listResponse([createOrder()]))

    await invoiceOrderSearchService.verifyPhone(' W1 ', ' 1234 ')

    expect(mocks.request).toHaveBeenCalledWith('checkSourcePaymentNumber', { sourceBillNo: 'W1', inspectPhone: '1234' }, false, 30000)
  })

  it('reports an empty list as a failed verification', async () => {
    mocks.request.mockResolvedValue({ status: true, message: '', result: { list: [] } })

    await expect(invoiceOrderSearchService.verifyPhone('W1', '1234')).resolves.toEqual({
      status: false,
      message: '验证失败，请重新确认信息',
      result: null
    })
  })

  it('still returns a challenge when the backend keeps asking for it', async () => {
    mocks.request.mockResolvedValue(listResponse([createOrder({ option: '02' })]))

    const response = await invoiceOrderSearchService.verifyPhone('W1', '1234')

    expect(response.result?.list).toEqual([])
    expect(response.result?.auth?.authType).toBe('02')
  })
})

describe('invoiceOrderSearchService.sendAuthCode', () => {
  it('requires a waybill number', async () => {
    await expect(invoiceOrderSearchService.sendAuthCode('')).resolves.toEqual({ status: false, message: '缺少运单号', result: null })
  })

  it('sends the code request and nulls the result', async () => {
    mocks.request.mockResolvedValue({ status: true, message: '', result: 'ignored' })

    await expect(invoiceOrderSearchService.sendAuthCode(' W1 ')).resolves.toEqual({ status: true, message: '', result: null })
    expect(mocks.request).toHaveBeenCalledWith('sendCheckCode', { sourceBillNo: 'W1' })
  })

  it('reports send failures', async () => {
    mocks.request.mockResolvedValue({ status: false, message: '' })

    await expect(invoiceOrderSearchService.sendAuthCode('W1')).resolves.toEqual({ status: false, message: '发送失败，请稍后再试', result: null })
  })
})

describe('invoiceOrderSearchService.verifyAuthCode', () => {
  it('rejects anything that is not six digits', async () => {
    await expect(invoiceOrderSearchService.verifyAuthCode('', '123456')).resolves.toEqual({ status: false, message: '缺少运单号', result: null })

    for (const code of ['12345', '1234567', 'abcdef', '12 3456']) {
      await expect(invoiceOrderSearchService.verifyAuthCode('W1', code)).resolves.toEqual({
        status: false,
        message: '请输入正确的短信验证码',
        result: null
      })
    }

    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('checks the 6 digit code and nulls the result', async () => {
    mocks.request.mockResolvedValue({ status: true, message: '' })

    await expect(invoiceOrderSearchService.verifyAuthCode(' W1 ', ' 123456 ')).resolves.toEqual({ status: true, message: '', result: null })
    expect(mocks.request).toHaveBeenCalledWith('checkVerificationCode', { sourceBillNo: 'W1', checkTestCode: '123456' })
  })

  it('reports verification failures', async () => {
    mocks.request.mockResolvedValue({ status: false, message: '' })

    await expect(invoiceOrderSearchService.verifyAuthCode('W1', '123456')).resolves.toEqual({
      status: false,
      message: '验证失败，请稍后再试',
      result: null
    })
  })
})
