import { useCallback, useState } from 'react'

import type { DepponResponse } from '@/request/deppon'
import { invoiceOrderAuth, invoiceOrderSearchService, invoiceService } from '@/services/invoice'
import type { InvoiceOrderAuthChallenge, InvoiceOrderSearchView, InvoiceOrderView } from '@/services/invoice'
import { getNativeCapabilityErrorMessage } from '@/shared/platform/capabilities'
import { scanAppCode } from '@/shared/platform/scan'

import { INVOICE_PAGE_SIZE } from './latestRequestTypes'

import type { LatestRequestRunner } from './latestRequestTypes'

interface UseInvoiceOrdersParams {
  runLatestRequest: LatestRequestRunner
  setErrorMessage: (next: string) => void
  showPendingToast: (title: string) => void
  setOrders: (next: InvoiceOrderView[] | ((current: InvoiceOrderView[]) => InvoiceOrderView[])) => void
  setOrderPageIndex: (next: number) => void
  setOrderTotalPage: (next: number) => void
  setOrderTotalRows: (next: number) => void
  setOrderAuth: (next: InvoiceOrderAuthChallenge | null) => void
  setOrderAuthValue: (next: string) => void
  setOrderAuthMessage: (next: string) => void
  applyOrderSearchResponse: (response: DepponResponse<InvoiceOrderSearchView>) => boolean
}

interface UseInvoiceOrdersResult {
  orderKeyword: string
  setOrderKeyword: (next: string) => void
  loadOrders: (nextPage?: number) => Promise<void>
  loadOrderSearch: (keyword?: string) => Promise<void>
  handleSearchOrder: () => void
  handleScanOrder: () => Promise<void>
  handleClearOrder: () => void
}

export function useInvoiceOrders({
  runLatestRequest,
  setErrorMessage,
  showPendingToast,
  setOrders,
  setOrderPageIndex,
  setOrderTotalPage,
  setOrderTotalRows,
  setOrderAuth,
  setOrderAuthValue,
  setOrderAuthMessage,
  applyOrderSearchResponse
}: UseInvoiceOrdersParams): UseInvoiceOrdersResult {
  const [orderKeyword, setOrderKeyword] = useState('')

  const loadOrders = useCallback(
    async (nextPage = 1) => {
      await runLatestRequest(
        `orders:${nextPage}`,
        () => invoiceService.queryOrders(nextPage, INVOICE_PAGE_SIZE),
        response => {
          if (!response.status || !response.result) {
            setErrorMessage(response.message || '暂未获取到可开票运单')
            if (nextPage === 1) {
              setOrders([])
              setOrderTotalRows(0)
            }
            return
          }

          setOrders(current => (nextPage === 1 ? (response.result?.list ?? []) : [...current, ...(response.result?.list ?? [])]))
          setOrderPageIndex(response.result.pageIndex)
          setOrderTotalPage(response.result.totalPage)
          setOrderTotalRows(response.result.totalRows)
        }
      )
    },
    [runLatestRequest, setErrorMessage, setOrders, setOrderPageIndex, setOrderTotalPage, setOrderTotalRows]
  )

  const loadOrderSearch = useCallback(
    async (keyword = orderKeyword) => {
      const normalizedKeyword = keyword.trim()

      if (!normalizedKeyword) {
        return
      }

      await runLatestRequest(
        `order-search:${normalizedKeyword}`,
        async () => {
          const cachedValue = invoiceOrderAuth.getCachedValue(normalizedKeyword)

          if (cachedValue) {
            const cachedResponse = await invoiceOrderSearchService.verifyPhone(normalizedKeyword, cachedValue)

            if (cachedResponse.status && cachedResponse.result?.list.length) {
              return cachedResponse
            }
          }

          return invoiceOrderSearchService.queryByWaybill(normalizedKeyword)
        },
        response => applyOrderSearchResponse(response)
      )
    },
    [applyOrderSearchResponse, orderKeyword, runLatestRequest]
  )

  const handleSearchOrder = useCallback(() => {
    const keyword = orderKeyword.trim()

    if (!keyword) {
      showPendingToast('请输入运单号')
      return
    }

    setOrders([])
    loadOrderSearch(keyword)
  }, [loadOrderSearch, orderKeyword, setOrders, showPendingToast])

  const handleScanOrder = useCallback(async () => {
    try {
      const result = await scanAppCode('INVOICE_ORDER_SEARCH')

      if (result.kind !== 'waybill') {
        showPendingToast(result.kind === 'unsupported' ? result.message : '云打印码不能用于发票查询')
        return
      }

      setOrderKeyword(result.waybillNumber)
      setOrders([])
      loadOrderSearch(result.waybillNumber)
    } catch (error) {
      showPendingToast(getNativeCapabilityErrorMessage(error))
    }
  }, [loadOrderSearch, setOrders, showPendingToast])

  const handleClearOrder = useCallback(() => {
    setOrderKeyword('')
    setOrders([])
    setOrderAuth(null)
    setOrderAuthValue('')
    setOrderAuthMessage('')
    loadOrders(1)
  }, [loadOrders, setOrderAuth, setOrderAuthMessage, setOrderAuthValue, setOrders])

  return {
    orderKeyword,
    setOrderKeyword,
    loadOrders,
    loadOrderSearch,
    handleSearchOrder,
    handleScanOrder,
    handleClearOrder
  }
}
