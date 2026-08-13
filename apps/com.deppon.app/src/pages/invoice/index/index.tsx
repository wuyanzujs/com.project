import { ScrollView } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useCallback, useRef, useState } from 'react'

import type { DepponResponse } from '@/request/deppon'
import type {
  InvoiceHistoryView,
  InvoiceOrderSearchView,
  InvoiceOrderView
} from '@/services/invoice'
import { useLatestRequestRunner } from '@/shared/async/useLatestRequest'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { ensureAuthenticated } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'

import {
  InvoiceHistoryPanel,
  InvoiceLoading,
  InvoiceOrdersPanel,
  InvoiceTabs,
  InvoiceTaxpayersPanel
} from './components/InvoiceCenterSections'
import { InvoiceECardPanel } from './components/InvoiceECardPanel'
import { OrderAuthDialog } from './components/OrderAuthDialog'
import { useInvoiceECards } from './hooks/useInvoiceECards'
import { useInvoiceHistory } from './hooks/useInvoiceHistory'
import { useInvoiceOrderAuth } from './hooks/useInvoiceOrderAuth'
import { useInvoiceOrders } from './hooks/useInvoiceOrders'
import { useInvoiceTabCoordinator } from './hooks/useInvoiceTabCoordinator'
import { useInvoiceTaxpayers } from './hooks/useInvoiceTaxpayers'
import {
  INVOICE_CENTER_TABS,
  createInvoiceDetailUrl,
  createInvoiceECardApplyUrl,
  createInvoiceOrderApplyUrl,
  createInvoicePreviewUrl,
  parseInvoiceCenterTab
} from './invoiceCenterViewModel'

import './index.scss'

type OrderSearchResponse = DepponResponse<InvoiceOrderSearchView>

const InvoiceCenterPage = () => {
  const router = useRouter()
  const initialTab = parseInvoiceCenterTab(router.params.tab)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [orders, setOrders] = useState<InvoiceOrderView[]>([])
  const [orderPageIndex, setOrderPageIndex] = useState(1)
  const [orderTotalPage, setOrderTotalPage] = useState(1)
  const [orderTotalRows, setOrderTotalRows] = useState(0)

  const startLatestRequest = useCallback(() => {
    setLoading(true)
    setErrorMessage('')
  }, [])
  const finishLatestRequest = useCallback(() => setLoading(false), [])
  const { invalidateLatestRequest, runLatestRequest } = useLatestRequestRunner(
    startLatestRequest,
    finishLatestRequest
  )

  const ensureInvoiceAccess = useCallback(
    () =>
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.invoiceCenter,
        replace: true
      }),
    []
  )

  const showPendingToast = useCallback((title: string) => {
    Taro.showToast({
      title,
      icon: 'none'
    })
  }, [])

  const applyOrderSearchResponseRef = useRef<
    (response: OrderSearchResponse) => boolean
  >(() => false)

  const orderAuth = useInvoiceOrderAuth({
    runLatestRequest,
    invalidateLatestRequest,
    showPendingToast,
    applyOrderSearchResponse: (response: OrderSearchResponse) =>
      applyOrderSearchResponseRef.current(response)
  })

  const ordersHook = useInvoiceOrders({
    runLatestRequest,
    setErrorMessage,
    showPendingToast,
    setOrders,
    setOrderPageIndex,
    setOrderTotalPage,
    setOrderTotalRows,
    setOrderAuth: orderAuth.setOrderAuth,
    setOrderAuthValue: orderAuth.setOrderAuthValue,
    setOrderAuthMessage: orderAuth.setOrderAuthMessage,
    applyOrderSearchResponse: (response: OrderSearchResponse) =>
      applyOrderSearchResponseRef.current(response)
  })

  const applyOrderSearchResponse = useCallback(
    (response: OrderSearchResponse) => {
      if (!response.status || !response.result) {
        orderAuth.setOrderAuth(null)
        orderAuth.setOrderAuthValue('')
        orderAuth.setOrderAuthMessage('')
        setOrders([])
        setOrderPageIndex(1)
        setOrderTotalPage(1)
        setOrderTotalRows(0)
        setErrorMessage(response.message || '未查询到可开票运单')
        return false
      }

      if (response.result.auth) {
        orderAuth.setOrderAuth(response.result.auth)
        orderAuth.setOrderAuthValue('')
        orderAuth.setOrderAuthMessage('')
        setOrders([])
        setOrderPageIndex(1)
        setOrderTotalPage(1)
        setOrderTotalRows(0)
        setErrorMessage('')
        return false
      }

      orderAuth.setOrderAuth(null)
      orderAuth.setOrderAuthValue('')
      orderAuth.setOrderAuthMessage('')
      setOrders(response.result.list)
      setOrderPageIndex(1)
      setOrderTotalPage(1)
      setOrderTotalRows(response.result.list.length)
      setErrorMessage('')
      return true
    },
    [orderAuth]
  )

  applyOrderSearchResponseRef.current = applyOrderSearchResponse

  const history = useInvoiceHistory({
    runLatestRequest,
    setErrorMessage,
    showPendingToast
  })

  const ecards = useInvoiceECards({
    runLatestRequest,
    setErrorMessage,
    showPendingToast,
    navigateToApply: items =>
      navigateToAppRoute(createInvoiceECardApplyUrl(items), { login: true })
  })

  const taxpayers = useInvoiceTaxpayers({
    runLatestRequest,
    setErrorMessage
  })

  const coordinator = useInvoiceTabCoordinator({
    setErrorMessage,
    initialTab,
    loadOrders: ordersHook.loadOrders,
    loadOrderSearch: ordersHook.loadOrderSearch,
    loadHistory: history.loadHistory,
    loadECards: ecards.loadECards,
    loadTaxpayers: taxpayers.loadTaxpayers,
    orderKeyword: ordersHook.orderKeyword,
    historyKeyword: history.historyKeyword,
    orderPageIndex,
    orderTotalPage,
    historyPageIndex: history.historyPageIndex,
    historyTotalPage: history.historyTotalPage,
    ecardPageIndex: ecards.ecardPageIndex,
    ecardTotalPage: ecards.ecardTotalPage,
    onAccessDenied: () => !ensureInvoiceAccess()
  })

  useDidShow(() => {
    if (ensureInvoiceAccess()) {
      coordinator.loadActiveTab()
    }
  })

  const handleApplyOrder = (order: InvoiceOrderView) => {
    if (!order.canApply) {
      showPendingToast(order.statusText)
      return
    }

    navigateToAppRoute(createInvoiceOrderApplyUrl(order), {
      login: true
    })
  }

  const handleOpenHistoryDetail = (item: InvoiceHistoryView) => {
    navigateToAppRoute(createInvoiceDetailUrl(item), {
      login: true
    })
  }

  const handlePreviewHistory = (item: InvoiceHistoryView) => {
    if (!item.canPreview) {
      showPendingToast('暂无预览信息')
      return
    }

    navigateToAppRoute(createInvoicePreviewUrl(item), {
      login: true
    })
  }

  const handleManageTaxpayers = () => {
    navigateToAppRoute(APP_ROUTES.invoiceTaxpayerList, {
      login: true
    })
  }

  return (
    <ScrollView
      className='invoice-page'
      scrollY
      onScrollToLower={coordinator.handleLoadMore}
    >
      <InvoiceTabs
        tabs={INVOICE_CENTER_TABS}
        activeTab={coordinator.tab}
        onChange={coordinator.handleChangeTab}
      />

      {coordinator.tab === 'orders' && (
        <InvoiceOrdersPanel
          orders={orders}
          totalRows={orderTotalRows}
          keyword={ordersHook.orderKeyword}
          loading={loading}
          errorMessage={errorMessage}
          onKeywordChange={ordersHook.setOrderKeyword}
          onSearch={ordersHook.handleSearchOrder}
          onClear={ordersHook.handleClearOrder}
          onScan={ordersHook.handleScanOrder}
          onApply={handleApplyOrder}
        />
      )}

      {coordinator.tab === 'history' && (
        <InvoiceHistoryPanel
          history={history.history}
          totalRows={history.historyTotalRows}
          keyword={history.historyKeyword}
          loading={loading}
          errorMessage={errorMessage}
          onKeywordChange={history.setHistoryKeyword}
          onSearch={history.handleSearchHistory}
          onClear={history.handleClearHistory}
          onScan={history.handleScanHistory}
          onOpenDetail={handleOpenHistoryDetail}
          onPreview={handlePreviewHistory}
        />
      )}

      {coordinator.tab === 'ecards' && (
        <InvoiceECardPanel
          ecards={ecards.ecards}
          selectedIds={ecards.selectedECardIds}
          selectedAmount={ecards.selectedECardAmount}
          totalRows={ecards.ecardTotalRows}
          loading={loading}
          errorMessage={errorMessage}
          onApplySelected={ecards.handleApplySelectedECards}
          onToggle={ecards.handleToggleECard}
        />
      )}

      {coordinator.tab === 'taxpayers' && (
        <InvoiceTaxpayersPanel
          taxpayers={taxpayers.taxpayers}
          loading={loading}
          errorMessage={errorMessage}
          onManage={handleManageTaxpayers}
        />
      )}

      {orderAuth.orderAuth && (
        <OrderAuthDialog
          auth={orderAuth.orderAuth}
          countdown={orderAuth.orderAuthCountdown}
          message={orderAuth.orderAuthMessage}
          sending={orderAuth.orderAuthSending}
          submitting={orderAuth.orderAuthSubmitting}
          value={orderAuth.orderAuthValue}
          onChange={orderAuth.setOrderAuthValue}
          onClose={orderAuth.handleCloseOrderAuth}
          onConfirm={orderAuth.handleConfirmOrderAuth}
          onSendCode={orderAuth.handleSendOrderAuthCode}
        />
      )}

      {loading && <InvoiceLoading tab={coordinator.tab} />}
    </ScrollView>
  )
}

export default InvoiceCenterPage
