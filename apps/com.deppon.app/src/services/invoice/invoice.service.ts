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
  createECardApplySubmitPayload,
  normalizeInvoiceECard
} from './invoice.ecard'
import {
  normalizeHistory,
  normalizeHistoryWaybills,
  normalizePreview
} from './invoice.history'
import { formatDateTime, normalizeText } from './invoice.shared'
import {
  createFormFromTaxpayer,
  createTaxpayerPayload,
  normalizeTaxpayer,
  validateTaxpayer
} from './invoice.taxpayer'
import { normalizeInvoiceOrder } from './order.mapper'
import { createServiceFailure as createFailure } from '../serviceResponse'

import type {
  InvoiceHistoryListRequest,
  InvoiceHistoryListResponse,
  InvoiceHistoryQueryRequest,
  InvoiceHistoryQueryResponse,
  InvoiceHistoryView,
  InvoiceHistoryWaybillRequest,
  InvoiceHistoryWaybillView,
  InvoiceApplyDraft,
  InvoiceECardApplyDraft,
  InvoiceECardApplySubmitRequest,
  InvoiceECardListResponse,
  InvoiceECardView,
  InvoiceApplySubmitRequest,
  InvoiceApplySubmitResult,
  InvoiceListResult,
  InvoiceOrderListRequest,
  InvoiceOrderListResponse,
  InvoiceOrderView,
  InvoicePreviewRequest,
  InvoicePreviewView,
  InvoiceSendEmailRequest,
  InvoiceTaxpayerDeleteRequest,
  InvoiceTaxpayerForm,
  InvoiceTaxpayerMatch,
  InvoiceTaxpayerMatchRequest,
  InvoiceTaxpayerRaw,
  InvoiceTaxpayerSaveRequest,
  InvoiceTaxpayerType,
  InvoiceTaxpayerView,
  InvoiceHistoryWaybillRaw,
  InvoicePreviewRaw
} from './types'
import type { DepponResponse } from '../../request/deppon'
import type { Contact } from '../contact'

const DEFAULT_ORDER_RANGE_MONTHS = 3
const DEFAULT_HISTORY_RANGE_MONTHS = 12
const DEFAULT_PAGE_SIZE = 10

function getDateRange(months: number) {
  const endDate = new Date()
  const startDate = new Date()

  startDate.setMonth(startDate.getMonth() - months)
  startDate.setDate(1)
  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(23, 59, 59, 0)

  return {
    startDate: formatDateTime(startDate),
    endDate: formatDateTime(endDate)
  }
}

function createListResult<TItem>(
  list: TItem[],
  pageIndex: number,
  pageSize: number,
  totalRows?: number
): InvoiceListResult<TItem> {
  const total = totalRows ?? list.length

  return {
    list,
    pageIndex,
    pageSize,
    totalRows: total,
    totalPage: Math.max(1, Math.ceil(total / pageSize))
  }
}

export const invoiceService = {
  createTaxpayerForm: createFormFromTaxpayer,

  validateTaxpayer,

  validateEmail,

  createApplyPreview,

  createECardApplyPreview,

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
    contact: Pick<
      Contact,
      'name' | 'telephone' | 'province' | 'city' | 'county' | 'town' | 'address'
    >
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
  },

  async queryOrders(
    pageIndex = 1,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<DepponResponse<InvoiceListResult<InvoiceOrderView>>> {
    const range = getDateRange(DEFAULT_ORDER_RANGE_MONTHS)
    const response = await invoiceApi.request<
      InvoiceOrderListResponse,
      InvoiceOrderListRequest
    >(
      'tradeQueryByCustomerCode',
      {
        currentPage: pageIndex,
        pageSize,
        startDate: range.startDate,
        endDate: range.endDate
      },
      false,
      30000
    )

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未获取到可开票运单')
    }

    const list = (response.result.list ?? []).map(normalizeInvoiceOrder)

    return {
      ...response,
      result: createListResult(
        list,
        response.result.pageIndex ?? pageIndex,
        response.result.pageSize ?? pageSize,
        response.result.total
      )
    }
  },

  async queryECards(
    pageIndex = 1,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<DepponResponse<InvoiceListResult<InvoiceECardView>>> {
    const response = await invoiceApi.request<InvoiceECardListResponse>(
      'prepayCardQueryByCustomerCode',
      undefined,
      false,
      30000
    )

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未获取到储值卡开票记录')
    }

    const allItems = (response.result.list ?? [])
      .map(normalizeInvoiceECard)
      .filter(item => item.id && item.amount > 0)
    const startIndex = (pageIndex - 1) * pageSize
    const list = allItems.slice(startIndex, startIndex + pageSize)

    return {
      ...response,
      result: createListResult(list, pageIndex, pageSize, allItems.length)
    }
  },

  async queryHistory(
    pageIndex = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    waybillNumber = ''
  ): Promise<DepponResponse<InvoiceListResult<InvoiceHistoryView>>> {
    const keyword = waybillNumber.trim()

    if (keyword) {
      const response = await invoiceApi.request<
        InvoiceHistoryQueryResponse,
        InvoiceHistoryQueryRequest
      >(
        'queryApplyByWayBillNo',
        {
          sourceBillNo: keyword
        },
        false
      )

      if (!response.status || !response.result) {
        return createFailure(response.message || '暂未查询到开票历史')
      }

      const list = response.result.map(normalizeHistory)

      return {
        ...response,
        result: createListResult(list, 1, list.length || pageSize, list.length)
      }
    }

    const range = getDateRange(DEFAULT_HISTORY_RANGE_MONTHS)
    const response = await invoiceApi.request<
      InvoiceHistoryListResponse,
      InvoiceHistoryListRequest
    >(
      'queryInvoiceHistory',
      {
        currentPage: pageIndex,
        pageSize,
        openBillStartDate: range.startDate,
        openBillEndDate: range.endDate
      },
      false
    )

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未获取到开票历史')
    }

    const list = (response.result.list ?? []).map(normalizeHistory)

    return {
      ...response,
      result: createListResult(
        list,
        response.result.pageIndex ?? pageIndex,
        response.result.pageSize ?? pageSize,
        response.result.total
      )
    }
  },

  async queryTaxpayers(): Promise<DepponResponse<InvoiceTaxpayerView[]>> {
    const response = await invoiceApi.request<InvoiceTaxpayerRaw[]>(
      'queryTaxpayerInfo',
      undefined,
      false
    )

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未获取到发票抬头')
    }

    return {
      ...response,
      result: response.result.map(normalizeTaxpayer)
    }
  },

  async queryTaxpayerMatches(
    taxName: string,
    customerType: InvoiceTaxpayerType
  ): Promise<DepponResponse<InvoiceTaxpayerMatch[]>> {
    const keyword = taxName.trim()

    if (!keyword || keyword.length <= 3 || customerType !== '1') {
      return {
        status: true,
        message: '',
        result: []
      }
    }

    const response = await invoiceApi.request<
      InvoiceTaxpayerMatch[],
      InvoiceTaxpayerMatchRequest
    >(
      'queryCustomerTaxName',
      {
        taxName: keyword,
        customerType
      },
      false,
      3000
    )

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未匹配到企业抬头')
    }

    return response
  },

  async saveTaxpayer(
    form: InvoiceTaxpayerForm
  ): Promise<DepponResponse<unknown>> {
    const message = validateTaxpayer(form)

    if (message) {
      return createFailure(message)
    }

    const path = form.id ? 'alterTaxpayerInfo' : 'addTaxpayerInfo'
    const response = await invoiceApi.request<
      unknown,
      InvoiceTaxpayerSaveRequest
    >(path, createTaxpayerPayload(form))

    if (!response.status) {
      return createFailure(response.message || '保存失败，请稍后再试')
    }

    return response
  },

  async deleteTaxpayer(id: number): Promise<DepponResponse<unknown>> {
    const response = await invoiceApi.request<
      unknown,
      InvoiceTaxpayerDeleteRequest
    >('deleteTaxpayerInfo', { id: [id] })

    if (!response.status) {
      return createFailure(response.message || '删除失败，请稍后再试')
    }

    return response
  }
}
