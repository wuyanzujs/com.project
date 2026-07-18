import {
  cancelInvoiceApply,
  modifyInvoiceAddress,
  reverseInvoice as reverseInvoiceAction
} from './invoice.actions'
import { invoiceApi } from './invoice.api'
import {
  createApplyPreview,
  createApplySubmitPayload,
  validateEmail
} from './invoice.apply'
import {
  createECardApplyPreview,
  createECardApplySubmitPayload
} from './invoice.ecard'
import {
  normalizeHistoryWaybills,
  normalizePreview
} from './invoice.history'
import { normalizeText } from './invoice.shared'
import { createServiceFailure as createFailure } from '../serviceResponse'

import type {
  InvoiceApplyDraft,
  InvoiceApplySubmitRequest,
  InvoiceApplySubmitResult,
  InvoiceECardApplyDraft,
  InvoiceECardApplySubmitRequest,
  InvoiceHistoryWaybillRaw,
  InvoiceHistoryWaybillRequest,
  InvoiceHistoryWaybillView,
  InvoicePreviewRaw,
  InvoicePreviewRequest,
  InvoicePreviewView,
  InvoiceSendEmailRequest
} from './types'
import type { DepponResponse } from '../../request/deppon'
import type { Contact } from '../contact'

type InvoiceAddressContact = Pick<
  Contact,
  'name' | 'telephone' | 'province' | 'city' | 'county' | 'town' | 'address'
>

export const invoiceApplyService = {
  createApplyPreview,
  createECardApplyPreview,
  validateEmail,

  async submitApplyDraft(
    draft: InvoiceApplyDraft
  ): Promise<DepponResponse<InvoiceApplySubmitResult | null>> {
    const preview = createApplyPreview(draft)

    if (!preview.canSubmit) {
      return createFailure(preview.message || '缺少开票信息')
    }

    const response = await invoiceApi.request<
      InvoiceApplySubmitResult | null,
      InvoiceApplySubmitRequest
    >('addTaskInfoByEle', createApplySubmitPayload(draft), true, 30000)

    if (!response.status) {
      return createFailure(response.message || '提交失败，请稍后再试')
    }

    return {
      ...response,
      result: response.result ?? null
    }
  },

  async submitECardApplyDraft(
    draft: InvoiceECardApplyDraft
  ): Promise<DepponResponse<InvoiceApplySubmitResult | null>> {
    const preview = createECardApplyPreview(draft)

    if (!preview.canSubmit) {
      return createFailure(preview.message || '缺少储值卡开票信息')
    }

    const response = await invoiceApi.request<
      InvoiceApplySubmitResult | null,
      InvoiceECardApplySubmitRequest
    >('addPrepayCardTask', createECardApplySubmitPayload(draft), true, 30000)

    if (!response.status) {
      return createFailure(response.message || '提交失败，请稍后再试')
    }

    return {
      ...response,
      result: response.result ?? null
    }
  },

  async queryPreview(
    applyNo: string,
    title = '电子发票'
  ): Promise<DepponResponse<InvoicePreviewView>> {
    const normalizedApplyNo = normalizeText(applyNo)

    if (!normalizedApplyNo) {
      return createFailure('缺少发票申请号')
    }

    const response = await invoiceApi.request<
      InvoicePreviewRaw,
      InvoicePreviewRequest
    >(
      'lookInvoice',
      {
        applyNo: normalizedApplyNo
      },
      false
    )

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未获取到发票预览')
    }

    const preview = normalizePreview(response.result, normalizedApplyNo, title)

    if (!preview.hasPreview) {
      return createFailure(preview.message)
    }

    return {
      ...response,
      result: preview
    }
  },

  async sendInvoiceEmail(
    applyNo: string,
    email: string
  ): Promise<DepponResponse<null>> {
    const normalizedApplyNo = normalizeText(applyNo)
    const normalizedEmail = normalizeText(email)
    const emailMessage = validateEmail(normalizedEmail)

    if (!normalizedApplyNo) {
      return createFailure('缺少发票申请号')
    }

    if (emailMessage) {
      return createFailure(emailMessage)
    }

    const response = await invoiceApi.request<null, InvoiceSendEmailRequest>(
      'sendEmail',
      {
        applyNo: normalizedApplyNo,
        email: normalizedEmail
      }
    )

    if (!response.status) {
      return createFailure(response.message || '发送失败，请稍后再试')
    }

    return {
      ...response,
      result: null
    }
  },

  async cancelApply(applyNo: string): Promise<DepponResponse<null>> {
    return cancelInvoiceApply(applyNo)
  },

  async reverseInvoice(applyNo: string): Promise<DepponResponse<null>> {
    return reverseInvoiceAction(applyNo)
  },

  async modifyAddress(
    applyNo: string,
    contact: InvoiceAddressContact
  ): Promise<DepponResponse<null>> {
    return modifyInvoiceAddress(applyNo, contact)
  },

  async queryHistoryWaybills(
    applyNo: string
  ): Promise<DepponResponse<InvoiceHistoryWaybillView[]>> {
    const normalizedApplyNo = normalizeText(applyNo)

    if (!normalizedApplyNo) {
      return createFailure('缺少发票申请号')
    }

    const response = await invoiceApi.request<
      InvoiceHistoryWaybillRaw,
      InvoiceHistoryWaybillRequest
    >(
      'queryContainWaybill',
      {
        applyNo: normalizedApplyNo
      },
      false
    )

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未获取到开票运单信息')
    }

    return {
      ...response,
      result: normalizeHistoryWaybills(response.result)
    }
  }
}
