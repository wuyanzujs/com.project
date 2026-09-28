import { useCallback, useRef, useState } from 'react'

import { orderService } from '@/services/order'
import type {
  OrderListItem,
  OrderPaymentFilter,
  OrderRole,
  OrderStatusFilter
} from '@/services/order'
import { LatestRequestCoordinator } from '@/shared/async/latestRequest'

const PAGE_SIZE = 10

interface UseOrderListDataParams {
  role: OrderRole
  keyword: string
  orderStatus: OrderStatusFilter
  paymentType: OrderPaymentFilter
  rangeDays: number
}

interface UseOrderListDataResult {
  orders: OrderListItem[]
  pageIndex: number
  totalPage: number
  totalRows: number
  loading: boolean
  errorMessage: string
  loadOrders: (
    nextPage?: number,
    nextRole?: OrderRole,
    nextKeyword?: string,
    nextStatus?: OrderStatusFilter,
    nextPaymentType?: OrderPaymentFilter,
    nextRangeDays?: number
  ) => Promise<void>
  removeOrder: (predicate: (item: OrderListItem) => boolean) => void
  resetOrders: () => void
}

export function useOrderListData({
  role,
  keyword,
  orderStatus,
  paymentType,
  rangeDays
}: UseOrderListDataParams): UseOrderListDataResult {
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [pageIndex, setPageIndex] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const requestCoordinator = useRef(new LatestRequestCoordinator()).current

  const loadOrders = useCallback(
    async (
      nextPage = 1,
      nextRole = role,
      nextKeyword = keyword,
      nextStatus = orderStatus,
      nextPaymentType = paymentType,
      nextRangeDays = rangeDays
    ) => {
      const requestToken = requestCoordinator.begin(
        JSON.stringify([
          nextPage,
          nextRole,
          nextKeyword,
          nextStatus,
          nextPaymentType,
          nextRangeDays
        ])
      )

      if (!requestToken) {
        return
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const dateRange = orderService.getDateRange(nextRangeDays)
        const response = await orderService.queryList({
          role: nextRole,
          pageIndex: nextPage,
          pageSize: PAGE_SIZE,
          keyword: nextKeyword,
          orderStatus: nextStatus,
          paymentType: nextPaymentType,
          startTime: dateRange.startTime,
          endTime: dateRange.endTime
        })

        if (!requestCoordinator.isLatest(requestToken)) {
          return
        }

        if (!response.status || !response.result) {
          setErrorMessage(response.message || '暂未获取到订单')
          if (nextPage === 1) {
            setOrders([])
          }
          return
        }

        setOrders(current =>
          nextPage === 1
            ? (response.result?.list ?? [])
            : [...current, ...(response.result?.list ?? [])]
        )
        setPageIndex(response.result.pageIndex)
        setTotalPage(response.result.totalPage)
        setTotalRows(response.result.totalRows)
      } finally {
        if (requestCoordinator.finish(requestToken)) {
          setLoading(false)
        }
      }
    },
    [keyword, orderStatus, paymentType, rangeDays, requestCoordinator, role]
  )

  const removeOrder = useCallback(
    (predicate: (item: OrderListItem) => boolean) => {
      setOrders(current => current.filter(item => !predicate(item)))
      setTotalRows(current => Math.max(0, current - 1))
    },
    []
  )

  const resetOrders = useCallback(() => {
    setOrders([])
    setPageIndex(1)
    setTotalPage(1)
    setTotalRows(0)
    setErrorMessage('')
  }, [])

  return {
    orders,
    pageIndex,
    totalPage,
    totalRows,
    loading,
    errorMessage,
    loadOrders,
    removeOrder,
    resetOrders
  }
}
