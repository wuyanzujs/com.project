import { beforeEach, describe, expect, it, vi } from 'vitest'

import { invoiceApplyService } from '@/services/invoice/invoice.apply.service'

import type { InvoiceApplyDraft, InvoiceECardApplyDraft, InvoicePreviewView } from '@/services/invoice/types'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  cancel: vi.fn(),
  modifyAddress: vi.fn(),
  reverse: vi.fn(),
  createPreview: vi.fn(),
  createSubmitPayload: vi.fn(),
  validateEmail: vi.fn(),
  createECardPreview: vi.fn(),
  createECardSubmitPayload: vi.fn(),
  normalizeWaybills: vi.fn(),
  normalizePreview: vi.fn()
}))

vi.mock('@/services/invoice/invoice.api', () => ({
  invoiceApi: { request: mocks.request }
}))

vi.mock('@/services/invoice/invoice.actions', () => ({
  cancelInvoiceApply: mocks.cancel,
  modifyInvoiceAddress: mocks.modifyAddress,
  reverseInvoice: mocks.reverse
}))

vi.mock('@/services/invoice/invoice.apply', () => ({
  createApplyPreview: mocks.createPreview,
  createApplySubmitPayload: mocks.createSubmitPayload,
  validateEmail: mocks.validateEmail
}))

vi.mock('@/services/invoice/invoice.ecard', () => ({
  createECardApplyPreview: mocks.createECardPreview,
  createECardApplySubmitPayload: mocks.createECardSubmitPayload
}))

vi.mock('@/services/invoice/invoice.history', () => ({
  normalizeHistoryWaybills: mocks.normalizeWaybills,
  normalizePreview: mocks.normalizePreview
}))

const draft = { taxName: '德邦科技' } as unknown as InvoiceApplyDraft
const eCardDraft = { cardNo: 'C1' } as unknown as InvoiceECardApplyDraft
const preview = { hasPreview: true, message: '', url: 'https://x' } as unknown as InvoicePreviewView

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createPreview.mockReturnValue({ canSubmit: true, message: '' })
  mocks.createECardPreview.mockReturnValue({ canSubmit: true, message: '' })
  mocks.createSubmitPayload.mockReturnValue({ payload: 'apply' })
  mocks.createECardSubmitPayload.mockReturnValue({ payload: 'ecard' })
  mocks.validateEmail.mockReturnValue('')
  mocks.normalizePreview.mockReturnValue(preview)
  mocks.normalizeWaybills.mockImplementation(raw => raw)
})

describe('invoiceApplyService.submitApplyDraft', () => {
  it('blocks submission when the preview is not submittable', async () => {
    mocks.createPreview.mockReturnValue({ canSubmit: false, message: '' })

    await expect(invoiceApplyService.submitApplyDraft(draft)).resolves.toEqual({ status: false, message: '缺少开票信息', result: null })
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('prefers the preview message when it explains the block', async () => {
    mocks.createPreview.mockReturnValue({ canSubmit: false, message: '请先选择抬头' })

    await expect(invoiceApplyService.submitApplyDraft(draft)).resolves.toEqual({ status: false, message: '请先选择抬头', result: null })
  })

  it('posts the payload through the 30s authenticated endpoint', async () => {
    mocks.request.mockResolvedValue({ status: true, message: '' })

    await expect(invoiceApplyService.submitApplyDraft(draft)).resolves.toEqual({ status: true, message: '', result: null })
    expect(mocks.request).toHaveBeenCalledWith('addTaskInfoByEle', { payload: 'apply' }, true, 30000)
  })

  it('reports backend failures with the default submit copy', async () => {
    mocks.request.mockResolvedValue({ status: false, message: '' })

    await expect(invoiceApplyService.submitApplyDraft(draft)).resolves.toEqual({ status: false, message: '提交失败，请稍后再试', result: null })
  })
})

describe('invoiceApplyService.submitECardApplyDraft', () => {
  it('uses the储值卡 endpoint and its own default copy', async () => {
    mocks.createECardPreview.mockReturnValue({ canSubmit: false, message: '' })

    await expect(invoiceApplyService.submitECardApplyDraft(eCardDraft)).resolves.toEqual({
      status: false,
      message: '缺少储值卡开票信息',
      result: null
    })

    mocks.createECardPreview.mockReturnValue({ canSubmit: true, message: '' })
    mocks.request.mockResolvedValue({ status: true, message: 'ok', result: { applyNo: 'A1' } })

    await expect(invoiceApplyService.submitECardApplyDraft(eCardDraft)).resolves.toEqual({
      status: true,
      message: 'ok',
      result: { applyNo: 'A1' }
    })
    expect(mocks.request).toHaveBeenCalledWith('addPrepayCardTask', { payload: 'ecard' }, true, 30000)
  })
})

describe('invoiceApplyService.queryPreview', () => {
  it('requires an apply number after trimming', async () => {
    await expect(invoiceApplyService.queryPreview('   ')).resolves.toEqual({ status: false, message: '缺少发票申请号', result: null })
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('passes the title through to the normalizer', async () => {
    mocks.request.mockResolvedValue({ status: true, message: '', result: { url: 'https://x' } })

    await expect(invoiceApplyService.queryPreview(' A1 ', '增值税发票')).resolves.toEqual({ status: true, message: '', result: preview })
    expect(mocks.request).toHaveBeenCalledWith('lookInvoice', { applyNo: 'A1' }, false)
    expect(mocks.normalizePreview).toHaveBeenCalledWith({ url: 'https://x' }, 'A1', '增值税发票')
  })

  it('defaults the title to 电子发票', async () => {
    mocks.request.mockResolvedValue({ status: true, message: '', result: {} })

    await invoiceApplyService.queryPreview('A1')

    expect(mocks.normalizePreview).toHaveBeenCalledWith({}, 'A1', '电子发票')
  })

  it('fails when the backend returns nothing or the preview is unusable', async () => {
    mocks.request.mockResolvedValue({ status: false, message: '', result: null })
    await expect(invoiceApplyService.queryPreview('A1')).resolves.toEqual({ status: false, message: '暂未获取到发票预览', result: null })

    mocks.request.mockResolvedValue({ status: true, message: '', result: {} })
    mocks.normalizePreview.mockReturnValue({ hasPreview: false, message: '发票还在开具中' })
    await expect(invoiceApplyService.queryPreview('A1')).resolves.toEqual({ status: false, message: '发票还在开具中', result: null })
  })
})

describe('invoiceApplyService.sendInvoiceEmail', () => {
  it('validates the apply number before the email', async () => {
    await expect(invoiceApplyService.sendInvoiceEmail(' ', 'a@b.com')).resolves.toEqual({ status: false, message: '缺少发票申请号', result: null })
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('stops on an invalid email', async () => {
    mocks.validateEmail.mockReturnValue('请输入正确的邮箱')

    await expect(invoiceApplyService.sendInvoiceEmail('A1', 'bad')).resolves.toEqual({ status: false, message: '请输入正确的邮箱', result: null })
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('sends the normalized pair and nulls the result', async () => {
    mocks.request.mockResolvedValue({ status: true, message: '', result: 'ignored' })

    await expect(invoiceApplyService.sendInvoiceEmail(' A1 ', ' a@b.com ')).resolves.toEqual({ status: true, message: '', result: null })
    expect(mocks.request).toHaveBeenCalledWith('sendEmail', { applyNo: 'A1', email: 'a@b.com' })
  })

  it('reports send failures', async () => {
    mocks.request.mockResolvedValue({ status: false, message: '' })

    await expect(invoiceApplyService.sendInvoiceEmail('A1', 'a@b.com')).resolves.toEqual({ status: false, message: '发送失败，请稍后再试', result: null })
  })
})

describe('invoiceApplyService action delegation', () => {
  it('delegates cancel, reverse and address changes without wrapping', async () => {
    const cancelResult = { status: true, message: 'cancelled', result: null }
    mocks.cancel.mockResolvedValue(cancelResult)
    await expect(invoiceApplyService.cancelApply('A1')).resolves.toBe(cancelResult)

    const reverseResult = { status: true, message: 'reversed', result: null }
    mocks.reverse.mockResolvedValue(reverseResult)
    await expect(invoiceApplyService.reverseInvoice('A1')).resolves.toBe(reverseResult)

    const contact = { name: '张三', telephone: '13800000000' } as never
    await invoiceApplyService.modifyAddress('A1', contact)
    expect(mocks.modifyAddress).toHaveBeenCalledWith('A1', contact)
  })
})

describe('invoiceApplyService.queryHistoryWaybills', () => {
  it('requires an apply number', async () => {
    await expect(invoiceApplyService.queryHistoryWaybills('')).resolves.toEqual({ status: false, message: '缺少发票申请号', result: null })
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('normalizes the waybill list', async () => {
    mocks.request.mockResolvedValue({ status: true, message: '', result: [{ waybillNumber: 'W1' }] })
    mocks.normalizeWaybills.mockReturnValue([{ waybillNumber: 'W1' }])

    await expect(invoiceApplyService.queryHistoryWaybills(' A1 ')).resolves.toEqual({
      status: true,
      message: '',
      result: [{ waybillNumber: 'W1' }]
    })
    expect(mocks.request).toHaveBeenCalledWith('queryContainWaybill', { applyNo: 'A1' }, false)
  })

  it('reports lookup failures', async () => {
    mocks.request.mockResolvedValue({ status: false, message: '', result: null })

    await expect(invoiceApplyService.queryHistoryWaybills('A1')).resolves.toEqual({
      status: false,
      message: '暂未获取到开票运单信息',
      result: null
    })
  })
})

describe('invoiceApplyService pass-through helpers', () => {
  it('exposes the preview builders and email validator directly', () => {
    expect(invoiceApplyService.createApplyPreview).toBe(mocks.createPreview)
    expect(invoiceApplyService.createECardApplyPreview).toBe(mocks.createECardPreview)
    expect(invoiceApplyService.validateEmail).toBe(mocks.validateEmail)
  })
})
