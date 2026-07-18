import { invoiceApi } from './invoice.api'
import { normalizeInvoiceECard } from './invoice.ecard'
import { normalizeHistory } from './invoice.history'
import { formatDateTime } from './invoice.shared'
import { normalizeInvoiceOrder } from './order.mapper'
import { createServiceFailure as createFailure } from '../serviceResponse'

import type {
  InvoiceECardListResponse,
  InvoiceECardView,
  InvoiceHistoryListRequest,
  InvoiceHistoryListResponse,
  InvoiceHistoryQueryRequest,
  InvoiceHistoryQueryResponse,
  InvoiceHistoryView,
  InvoiceListResult,
  InvoiceOrderListRequest,
  InvoiceOrderListResponse,
  InvoiceOrderView
} from './types'
import type { DepponResponse } from '../../request/deppon'

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

export const invoiceCenterService = {
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
  }
}
