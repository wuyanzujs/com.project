import { useCallback, useState } from 'react'

import type { InvoiceTab } from '@/services/invoice'

interface UseInvoiceTabCoordinatorParams {
  setErrorMessage: (next: string) => void
  initialTab: InvoiceTab
  loadOrders: (nextPage?: number) => Promise<void>
  loadOrderSearch: (keyword?: string) => Promise<void>
  loadHistory: (nextPage?: number, keyword?: string) => Promise<void>
  loadECards: (nextPage?: number) => Promise<void>
  loadTaxpayers: () => Promise<void>
  orderKeyword: string
  historyKeyword: string
  orderPageIndex: number
  orderTotalPage: number
  historyPageIndex: number
  historyTotalPage: number
  ecardPageIndex: number
  ecardTotalPage: number
  onAccessDenied: () => boolean
}

interface UseInvoiceTabCoordinatorResult {
  tab: InvoiceTab
  setTab: (next: InvoiceTab) => void
  loadActiveTab: (nextTab?: InvoiceTab) => void
  handleChangeTab: (nextTab: InvoiceTab) => void
  handleLoadMore: () => void
}

export function useInvoiceTabCoordinator({
  setErrorMessage,
  initialTab,
  loadOrders,
  loadOrderSearch,
  loadHistory,
  loadECards,
  loadTaxpayers,
  orderKeyword,
  historyKeyword,
  orderPageIndex,
  orderTotalPage,
  historyPageIndex,
  historyTotalPage,
  ecardPageIndex,
  ecardTotalPage,
  onAccessDenied
}: UseInvoiceTabCoordinatorParams): UseInvoiceTabCoordinatorResult {
  const [tab, setTab] = useState<InvoiceTab>(initialTab)

  const loadActiveTab = useCallback(
    (nextTab = tab) => {
      if (nextTab === 'orders') {
        if (orderKeyword.trim()) {
          loadOrderSearch(orderKeyword)
          return
        }

        loadOrders(1)
        return
      }

      if (nextTab === 'history') {
        loadHistory(1)
        return
      }

      if (nextTab === 'ecards') {
        loadECards(1)
        return
      }

      loadTaxpayers()
    },
    [
      loadECards,
      loadHistory,
      loadOrderSearch,
      loadOrders,
      loadTaxpayers,
      orderKeyword,
      tab
    ]
  )

  const handleChangeTab = useCallback(
    (nextTab: InvoiceTab) => {
      if (onAccessDenied() || nextTab === tab) {
        return
      }

      setTab(nextTab)
      setErrorMessage('')
      loadActiveTab(nextTab)
    },
    [loadActiveTab, onAccessDenied, setErrorMessage, tab]
  )

  const handleLoadMore = useCallback(() => {
    if (onAccessDenied()) {
      return
    }

    if (
      tab === 'orders' &&
      !orderKeyword.trim() &&
      orderPageIndex < orderTotalPage
    ) {
      loadOrders(orderPageIndex + 1)
      return
    }

    if (
      tab === 'history' &&
      !historyKeyword.trim() &&
      historyPageIndex < historyTotalPage
    ) {
      loadHistory(historyPageIndex + 1)
      return
    }

    if (tab === 'ecards' && ecardPageIndex < ecardTotalPage) {
      loadECards(ecardPageIndex + 1)
    }
  }, [
    ecardPageIndex,
    ecardTotalPage,
    historyPageIndex,
    historyTotalPage,
    historyKeyword,
    loadECards,
    loadHistory,
    loadOrders,
    onAccessDenied,
    orderPageIndex,
    orderKeyword,
    orderTotalPage,
    tab
  ])

  return { tab, setTab, loadActiveTab, handleChangeTab, handleLoadMore }
}
