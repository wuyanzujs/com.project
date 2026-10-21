import { beforeEach, describe, expect, it, vi } from 'vitest'

import { invoiceTaxpayerService } from '@/services/invoice/invoice.taxpayer.service'

import type { InvoiceTaxpayerForm, InvoiceTaxpayerMatch, InvoiceTaxpayerView } from '@/services/invoice/types'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  validate: vi.fn(),
  createPayload: vi.fn(),
  normalize: vi.fn(),
  createForm: vi.fn()
}))

vi.mock('@/services/invoice/invoice.api', () => ({
  invoiceApi: { request: mocks.request }
}))

vi.mock('@/services/invoice/invoice.taxpayer', () => ({
  validateTaxpayer: mocks.validate,
  createTaxpayerPayload: mocks.createPayload,
  normalizeTaxpayer: mocks.normalize,
  createFormFromTaxpayer: mocks.createForm
}))

const form = { id: 1, taxName: '德邦科技' } as unknown as InvoiceTaxpayerForm

beforeEach(() => {
  vi.clearAllMocks()
  mocks.validate.mockReturnValue('')
  mocks.createPayload.mockReturnValue({ taxName: '德邦科技' })
  mocks.normalize.mockImplementation(raw => raw as unknown as InvoiceTaxpayerView)
})

describe('invoiceTaxpayerService.queryTaxpayers', () => {
  it('maps every raw taxpayer into a view', async () => {
    mocks.request.mockResolvedValue({ status: true, message: '', result: [{ id: 1, taxName: 'A' }, { id: 2, taxName: 'B' }] })

    const response = await invoiceTaxpayerService.queryTaxpayers()

    expect(mocks.request).toHaveBeenCalledWith('queryTaxpayerInfo', undefined, false)
    expect(mocks.normalize).toHaveBeenCalledTimes(2)
    expect(response.result).toEqual([{ id: 1, taxName: 'A' }, { id: 2, taxName: 'B' }])
  })

  it('falls back to the default copy when the backend gives no message', async () => {
    mocks.request.mockResolvedValue({ status: false, message: '', result: null })

    await expect(invoiceTaxpayerService.queryTaxpayers()).resolves.toEqual({ status: false, message: '暂未获取到发票抬头', result: null })
  })
})

describe('invoiceTaxpayerService.queryTaxpayerMatches', () => {
  it('skips the request for short keywords and non-enterprise types', async () => {
    await expect(invoiceTaxpayerService.queryTaxpayerMatches(' 德邦 ', '1' as never)).resolves.toEqual({ status: true, message: '', result: [] })
    await expect(invoiceTaxpayerService.queryTaxpayerMatches('德邦快递科技', '2' as never)).resolves.toEqual({ status: true, message: '', result: [] })
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('passes the trimmed keyword and a 3s timeout for enterprise lookups', async () => {
    const matches = [{ taxName: '德邦快递' }] as unknown as InvoiceTaxpayerMatch[]
    mocks.request.mockResolvedValue({ status: true, message: '', result: matches })

    await expect(invoiceTaxpayerService.queryTaxpayerMatches(' 德邦快递科技 ', '1' as never)).resolves.toEqual({ status: true, message: '', result: matches })
    expect(mocks.request).toHaveBeenCalledWith('queryCustomerTaxName', { taxName: '德邦快递科技', customerType: '1' }, false, 3000)
  })

  it('maps an empty match result to the default failure copy', async () => {
    mocks.request.mockResolvedValue({ status: false, message: '', result: null })

    await expect(invoiceTaxpayerService.queryTaxpayerMatches('德邦快递科技', '1' as never)).resolves.toEqual({
      status: false,
      message: '暂未匹配到企业抬头',
      result: null
    })
  })
})

describe('invoiceTaxpayerService.saveTaxpayer', () => {
  it('stops before the api when validation fails', async () => {
    mocks.validate.mockReturnValue('请填写企业名称')

    await expect(invoiceTaxpayerService.saveTaxpayer(form)).resolves.toEqual({ status: false, message: '请填写企业名称', result: null })
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('uses add for new taxpayers and alter for existing ones', async () => {
    mocks.request.mockResolvedValue({ status: true, message: '', result: true })

    await invoiceTaxpayerService.saveTaxpayer(form)
    expect(mocks.request).toHaveBeenCalledWith('alterTaxpayerInfo', { taxName: '德邦科技' })

    await invoiceTaxpayerService.saveTaxpayer({ taxName: '新抬头' } as unknown as InvoiceTaxpayerForm)
    expect(mocks.request).toHaveBeenLastCalledWith('addTaxpayerInfo', { taxName: '德邦科技' })
  })

  it('surfaces backend failures', async () => {
    mocks.request.mockResolvedValue({ status: false, message: '抬头已存在', result: null })

    await expect(invoiceTaxpayerService.saveTaxpayer(form)).resolves.toEqual({ status: false, message: '抬头已存在', result: null })

    mocks.request.mockResolvedValue({ status: false, message: '', result: null })
    await expect(invoiceTaxpayerService.saveTaxpayer(form)).resolves.toEqual({ status: false, message: '保存失败，请稍后再试', result: null })
  })

  it('passes a successful response through untouched', async () => {
    const response = { status: true, message: 'ok', result: { id: 9 } }
    mocks.request.mockResolvedValue(response)

    await expect(invoiceTaxpayerService.saveTaxpayer(form)).resolves.toBe(response)
  })
})

describe('invoiceTaxpayerService.deleteTaxpayer', () => {
  it('wraps the id into the backend payload', async () => {
    mocks.request.mockResolvedValue({ status: true, message: '', result: true })

    await invoiceTaxpayerService.deleteTaxpayer(7)
    expect(mocks.request).toHaveBeenCalledWith('deleteTaxpayerInfo', { id: [7] })
  })

  it('reports failures with the default delete copy', async () => {
    mocks.request.mockResolvedValue({ status: false, message: '', result: null })

    await expect(invoiceTaxpayerService.deleteTaxpayer(7)).resolves.toEqual({ status: false, message: '删除失败，请稍后再试', result: null })
  })
})

describe('invoiceTaxpayerService pass-through helpers', () => {
  it('exposes the form builder and validator without wrapping them', () => {
    expect(invoiceTaxpayerService.createTaxpayerForm).toBe(mocks.createForm)
    expect(invoiceTaxpayerService.validateTaxpayer).toBe(mocks.validate)
  })
})
