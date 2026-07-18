import { ScrollView } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  InvoiceHistoryPanel,
  InvoiceLoading,
  InvoiceOrdersPanel,
  InvoiceTabs,
  InvoiceTaxpayersPanel
} from './components/InvoiceCenterSections'
import { InvoiceECardPanel } from './components/InvoiceECardPanel'
import { OrderAuthDialog } from './components/OrderAuthDialog'
import {
  INVOICE_CENTER_TABS,
  createInvoiceDetailUrl,
  createInvoiceECardApplyUrl,
  createInvoiceOrderApplyUrl,
  createInvoicePreviewUrl,
  getSelectedInvoiceECards,
  getSelectedInvoiceECardAmount,
  parseInvoiceCenterTab
} from './invoiceCenterViewModel'
import {
  invoiceOrderAuth,
  invoiceOrderSearchService,
  invoiceService
} from '../../../services/invoice'
import { useLatestRequestRunner } from '../../../shared/async/useLatestRequest'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { getNativeCapabilityErrorMessage } from '../../../shared/platform/capabilities'
import { scanAppCode } from '../../../shared/platform/scan'

import type { DepponResponse } from '../../../request/deppon'
import type {
  InvoiceHistoryView,
  InvoiceECardView,
  InvoiceOrderAuthChallenge,
  InvoiceOrderSearchView,
  InvoiceOrderView,
  InvoiceTab,
  InvoiceTaxpayerView
} from '../../../services/invoice'

import './index.scss'

const PAGE_SIZE = 10
const InvoiceCenterPage = () => {
  const router = useRouter()
  const [tab, setTab] = useState<InvoiceTab>(() =>
    parseInvoiceCenterTab(router.params.tab)
  )
  const [orders, setOrders] = useState<InvoiceOrderView[]>([])
  const [orderPageIndex, setOrderPageIndex] = useState(1)
  const [orderTotalPage, setOrderTotalPage] = useState(1)
  const [orderTotalRows, setOrderTotalRows] = useState(0)
  const [orderKeyword, setOrderKeyword] = useState('')
  const [orderAuth, setOrderAuth] = useState<InvoiceOrderAuthChallenge | null>(
    null
  )
  const [orderAuthValue, setOrderAuthValue] = useState('')
  const [orderAuthMessage, setOrderAuthMessage] = useState('')
  const [orderAuthCountdown, setOrderAuthCountdown] = useState(0)
  const [orderAuthSending, setOrderAuthSending] = useState(false)
  const [orderAuthSubmitting, setOrderAuthSubmitting] = useState(false)
  const [ecards, setECards] = useState<InvoiceECardView[]>([])
  const [selectedECardIds, setSelectedECardIds] = useState<string[]>([])
  const [ecardPageIndex, setECardPageIndex] = useState(1)
  const [ecardTotalPage, setECardTotalPage] = useState(1)
  const [ecardTotalRows, setECardTotalRows] = useState(0)
  const [history, setHistory] = useState<InvoiceHistoryView[]>([])
  const [historyPageIndex, setHistoryPageIndex] = useState(1)
  const [historyTotalPage, setHistoryTotalPage] = useState(1)
  const [historyTotalRows, setHistoryTotalRows] = useState(0)
  const [historyKeyword, setHistoryKeyword] = useState('')
  const [taxpayers, setTaxpayers] = useState<InvoiceTaxpayerView[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const orderAuthRequestId = useRef(0)
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

  useEffect(() => {
    if (!orderAuth || orderAuth.authType !== '04') {
      setOrderAuthCountdown(0)
      return
    }

    setOrderAuthCountdown(invoiceOrderAuth.getCodeCountdown())
  }, [orderAuth])

  useEffect(() => {
    if (orderAuthCountdown <= 0) {
      return undefined
    }

    const timer = setTimeout(() => {
      setOrderAuthCountdown(current => Math.max(0, current - 1))
    }, 1000)

    return () => clearTimeout(timer)
  }, [orderAuthCountdown])

  const applyOrderSearchResponse = useCallback(
    (response: DepponResponse<InvoiceOrderSearchView>) => {
      if (!response.status || !response.result) {
        setOrderAuth(null)
        setOrders([])
        setOrderPageIndex(1)
        setOrderTotalPage(1)
        setOrderTotalRows(0)
        setErrorMessage(response.message || '未查询到可开票运单')
        return false
      }

      if (response.result.auth) {
        setOrderAuth(response.result.auth)
        setOrderAuthValue('')
        setOrderAuthMessage('')
        setOrders([])
        setOrderPageIndex(1)
        setOrderTotalPage(1)
        setOrderTotalRows(0)
        setErrorMessage('')
        return false
      }

      setOrderAuth(null)
      setOrderAuthValue('')
      setOrderAuthMessage('')
      setOrders(response.result.list)
      setOrderPageIndex(1)
      setOrderTotalPage(1)
      setOrderTotalRows(response.result.list.length)
      setErrorMessage('')
      return true
    },
    []
  )

  const loadOrders = useCallback(
    async (nextPage = 1) => {
      await runLatestRequest(
        `orders:${nextPage}`,
        () => invoiceService.queryOrders(nextPage, PAGE_SIZE),
        response => {
          if (!response.status || !response.result) {
            setErrorMessage(response.message || '暂未获取到可开票运单')
            if (nextPage === 1) {
              setOrders([])
              setOrderTotalRows(0)
            }
            return
          }

          setOrders(current =>
            nextPage === 1
              ? (response.result?.list ?? [])
              : [...current, ...(response.result?.list ?? [])]
          )
          setOrderPageIndex(response.result.pageIndex)
          setOrderTotalPage(response.result.totalPage)
          setOrderTotalRows(response.result.totalRows)
        }
      )
    },
    [runLatestRequest]
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
            const cachedResponse = await invoiceOrderSearchService.verifyPhone(
              normalizedKeyword,
              cachedValue
            )

            if (cachedResponse.status && cachedResponse.result?.list.length) {
              return cachedResponse
            }
          }

          return invoiceOrderSearchService.queryByWaybill(normalizedKeyword)
        },
        applyOrderSearchResponse
      )
    },
    [applyOrderSearchResponse, orderKeyword, runLatestRequest]
  )

  const loadHistory = useCallback(
    async (nextPage = 1, keyword = historyKeyword) => {
      await runLatestRequest(
        `history:${nextPage}:${keyword.trim()}`,
        () => invoiceService.queryHistory(nextPage, PAGE_SIZE, keyword),
        response => {
          if (!response.status || !response.result) {
            setErrorMessage(response.message || '暂未获取到开票历史')
            if (nextPage === 1) {
              setHistory([])
              setHistoryTotalRows(0)
            }
            return
          }

          setHistory(current =>
            nextPage === 1
              ? (response.result?.list ?? [])
              : [...current, ...(response.result?.list ?? [])]
          )
          setHistoryPageIndex(response.result.pageIndex)
          setHistoryTotalPage(response.result.totalPage)
          setHistoryTotalRows(response.result.totalRows)
        }
      )
    },
    [historyKeyword, runLatestRequest]
  )

  const loadECards = useCallback(
    async (nextPage = 1) => {
      await runLatestRequest(
        `ecards:${nextPage}`,
        () => invoiceService.queryECards(nextPage, PAGE_SIZE),
        response => {
          if (!response.status || !response.result) {
            setErrorMessage(response.message || '暂未获取到储值卡开票记录')
            if (nextPage === 1) {
              setECards([])
              setSelectedECardIds([])
              setECardTotalRows(0)
            }
            return
          }

          if (nextPage === 1) {
            setSelectedECardIds([])
          }
          setECards(current =>
            nextPage === 1
              ? (response.result?.list ?? [])
              : [...current, ...(response.result?.list ?? [])]
          )
          setECardPageIndex(response.result.pageIndex)
          setECardTotalPage(response.result.totalPage)
          setECardTotalRows(response.result.totalRows)
        }
      )
    },
    [runLatestRequest]
  )

  const loadTaxpayers = useCallback(async () => {
    await runLatestRequest(
      'taxpayers',
      () => invoiceService.queryTaxpayers(),
      response => {
        if (!response.status || !response.result) {
          setTaxpayers([])
          setErrorMessage(response.message || '暂未获取到发票抬头')
          return
        }

        setTaxpayers(response.result)
      }
    )
  }, [runLatestRequest])

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

  useDidShow(() => {
    if (ensureInvoiceAccess()) {
      loadActiveTab()
    }
  })

  const handleChangeTab = (nextTab: InvoiceTab) => {
    if (!ensureInvoiceAccess() || nextTab === tab) {
      return
    }

    setTab(nextTab)
    setErrorMessage('')
    loadActiveTab(nextTab)
  }

  const handleLoadMore = () => {
    if (!ensureInvoiceAccess() || loading) {
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
  }

  const handleSearchOrder = () => {
    if (!ensureInvoiceAccess()) {
      return
    }

    const keyword = orderKeyword.trim()

    if (!keyword) {
      showPendingToast('请输入运单号')
      return
    }

    setOrders([])
    loadOrderSearch(keyword)
  }

  const handleScanOrder = async () => {
    if (!ensureInvoiceAccess()) {
      return
    }

    try {
      const result = await scanAppCode('INVOICE_ORDER_SEARCH')

      if (result.kind !== 'waybill') {
        showPendingToast(
          result.kind === 'unsupported'
            ? result.message
            : '云打印码不能用于发票查询'
        )
        return
      }

      setOrderKeyword(result.waybillNumber)
      setOrders([])
      loadOrderSearch(result.waybillNumber)
    } catch (error) {
      showPendingToast(getNativeCapabilityErrorMessage(error))
    }
  }

  const handleClearOrder = () => {
    setOrderKeyword('')
    setOrders([])
    setOrderAuth(null)
    setOrderAuthValue('')
    setOrderAuthMessage('')
    loadOrders(1)
  }

  const handleCloseOrderAuth = () => {
    orderAuthRequestId.current += 1
    invalidateLatestRequest()
    setOrderAuthSubmitting(false)
    setOrderAuth(null)
    setOrderAuthValue('')
    setOrderAuthMessage('')
  }

  const handleSendOrderAuthCode = async () => {
    if (
      !orderAuth ||
      orderAuth.authType !== '04' ||
      orderAuthCountdown > 0 ||
      orderAuthSending
    ) {
      return
    }

    setOrderAuthSending(true)
    setOrderAuthMessage('')

    try {
      const response = await invoiceOrderSearchService.sendAuthCode(
        orderAuth.waybillNumber
      )

      if (!response.status) {
        setOrderAuthMessage(response.message || '发送失败，请稍后再试')
        return
      }

      invoiceOrderAuth.markCodeSent()
      setOrderAuthCountdown(invoiceOrderAuth.codeSeconds)
      showPendingToast('验证码已发送')
    } finally {
      setOrderAuthSending(false)
    }
  }

  const handleConfirmOrderAuth = async () => {
    if (!orderAuth || orderAuthSubmitting) {
      return
    }

    const auth = orderAuth
    const requestId = ++orderAuthRequestId.current
    const normalizedValue = orderAuthValue.trim()
    const validationMessage = invoiceOrderAuth.validateValue(
      auth,
      normalizedValue
    )

    if (validationMessage) {
      showPendingToast(validationMessage)
      return
    }

    setOrderAuthSubmitting(true)
    setOrderAuthMessage('')

    try {
      await runLatestRequest(
        `order-auth:${auth.waybillNumber}`,
        async () => {
          if (auth.authType === '04') {
            const verifyResponse =
              await invoiceOrderSearchService.verifyAuthCode(
                auth.waybillNumber,
                normalizedValue
              )

            if (!verifyResponse.status) {
              return {
                kind: 'error' as const,
                message: verifyResponse.message || '验证失败，请稍后再试'
              }
            }

            return {
              kind: 'result' as const,
              response: await invoiceOrderSearchService.queryByWaybill(
                auth.waybillNumber
              ),
              shouldCache: false
            }
          }

          const response = await invoiceOrderSearchService.verifyPhone(
            auth.waybillNumber,
            normalizedValue
          )

          return response.status
            ? { kind: 'result' as const, response, shouldCache: true }
            : {
                kind: 'error' as const,
                message: response.message || '验证失败，请重新确认信息'
              }
        },
        result => {
          if (result.kind === 'error') {
            setOrderAuthMessage(result.message)
            return
          }

          if (applyOrderSearchResponse(result.response)) {
            if (result.shouldCache) {
              invoiceOrderAuth.rememberValue(
                auth.waybillNumber,
                normalizedValue
              )
            }
            showPendingToast('验证通过')
          }
        },
        { force: true }
      )
    } finally {
      if (requestId === orderAuthRequestId.current) {
        setOrderAuthSubmitting(false)
      }
    }
  }

  const handleSearchHistory = () => {
    if (!ensureInvoiceAccess()) {
      return
    }

    setHistory([])
    loadHistory(1, historyKeyword)
  }

  const handleScanHistory = async () => {
    if (!ensureInvoiceAccess()) {
      return
    }

    try {
      const result = await scanAppCode('INVOICE_HISTORY_SEARCH')

      if (result.kind !== 'waybill') {
        showPendingToast(
          result.kind === 'unsupported'
            ? result.message
            : '云打印码不能用于开票历史查询'
        )
        return
      }

      setHistoryKeyword(result.waybillNumber)
      setHistory([])
      loadHistory(1, result.waybillNumber)
    } catch (error) {
      showPendingToast(getNativeCapabilityErrorMessage(error))
    }
  }

  const handleClearHistory = () => {
    setHistoryKeyword('')
    setHistory([])
    loadHistory(1, '')
  }

  const showPendingToast = (title: string) => {
    Taro.showToast({
      title,
      icon: 'none'
    })
  }

  const handleApplyOrder = (order: InvoiceOrderView) => {
    if (!order.canApply) {
      showPendingToast(order.statusText)
      return
    }

    navigateToAppRoute(createInvoiceOrderApplyUrl(order), {
      login: true
    })
  }

  const handleToggleECard = (item: InvoiceECardView) => {
    setSelectedECardIds(current =>
      current.includes(item.id)
        ? current.filter(id => id !== item.id)
        : [...current, item.id]
    )
  }

  const handleApplySelectedECards = () => {
    const selectedItems = getSelectedInvoiceECards(ecards, selectedECardIds)

    if (!selectedItems.length) {
      showPendingToast('请选择储值卡开票记录')
      return
    }

    navigateToAppRoute(createInvoiceECardApplyUrl(selectedItems), {
      login: true
    })
  }

  const selectedECardAmount = useMemo(
    () => getSelectedInvoiceECardAmount(ecards, selectedECardIds),
    [ecards, selectedECardIds]
  )

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
      onScrollToLower={handleLoadMore}
    >
      <InvoiceTabs
        tabs={INVOICE_CENTER_TABS}
        activeTab={tab}
        onChange={handleChangeTab}
      />

      {tab === 'orders' && (
        <InvoiceOrdersPanel
          orders={orders}
          totalRows={orderTotalRows}
          keyword={orderKeyword}
          loading={loading}
          errorMessage={errorMessage}
          onKeywordChange={setOrderKeyword}
          onSearch={handleSearchOrder}
          onClear={handleClearOrder}
          onScan={handleScanOrder}
          onApply={handleApplyOrder}
        />
      )}

      {tab === 'history' && (
        <InvoiceHistoryPanel
          history={history}
          totalRows={historyTotalRows}
          keyword={historyKeyword}
          loading={loading}
          errorMessage={errorMessage}
          onKeywordChange={setHistoryKeyword}
          onSearch={handleSearchHistory}
          onClear={handleClearHistory}
          onScan={handleScanHistory}
          onOpenDetail={handleOpenHistoryDetail}
          onPreview={handlePreviewHistory}
        />
      )}

      {tab === 'ecards' && (
        <InvoiceECardPanel
          ecards={ecards}
          selectedIds={selectedECardIds}
          selectedAmount={selectedECardAmount}
          totalRows={ecardTotalRows}
          loading={loading}
          errorMessage={errorMessage}
          onApplySelected={handleApplySelectedECards}
          onToggle={handleToggleECard}
        />
      )}

      {tab === 'taxpayers' && (
        <InvoiceTaxpayersPanel
          taxpayers={taxpayers}
          loading={loading}
          errorMessage={errorMessage}
          onManage={handleManageTaxpayers}
        />
      )}

      {orderAuth && (
        <OrderAuthDialog
          auth={orderAuth}
          countdown={orderAuthCountdown}
          message={orderAuthMessage}
          sending={orderAuthSending}
          submitting={orderAuthSubmitting}
          value={orderAuthValue}
          onChange={setOrderAuthValue}
          onClose={handleCloseOrderAuth}
          onConfirm={handleConfirmOrderAuth}
          onSendCode={handleSendOrderAuthCode}
        />
      )}

      {loading && <InvoiceLoading tab={tab} />}
    </ScrollView>
  )
}

export default InvoiceCenterPage
