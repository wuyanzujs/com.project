import { ScrollView } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useCallback, useEffect, useState } from 'react'

import {
  InvoiceHeader,
  InvoiceHistoryPanel,
  InvoiceLoading,
  InvoiceOrdersPanel,
  InvoiceTabs,
  InvoiceTaxpayersPanel
} from './components/InvoiceCenterSections'
import { OrderAuthDialog } from './components/OrderAuthDialog'
import { CACHE_KEYS, DPCacheExpireType, dpCache } from '../../../cache'
import {
  invoiceOrderSearchService,
  invoiceService
} from '../../../services/invoice'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'
import { getNativeCapabilityErrorMessage } from '../../../shared/platform/capabilities'
import { scanAppCode } from '../../../shared/platform/scan'

import type { InvoiceTabItem } from './components/InvoiceCenterSections'
import type { DepponResponse } from '../../../request/deppon'
import type {
  InvoiceHistoryView,
  InvoiceOrderAuthChallenge,
  InvoiceOrderSearchView,
  InvoiceOrderView,
  InvoiceTab,
  InvoiceTaxpayerView
} from '../../../services/invoice'

import './index.scss'

const PAGE_SIZE = 10
const ORDER_AUTH_CODE_SECONDS = 60

interface CachedInvoiceOrderAuth {
  id: string
  value: string
}

const INVOICE_TABS: InvoiceTabItem[] = [
  {
    label: '可开票',
    value: 'orders'
  },
  {
    label: '开票历史',
    value: 'history'
  },
  {
    label: '发票抬头',
    value: 'taxpayers'
  }
]

function parseInvoiceTab(value?: string): InvoiceTab {
  return value === 'history' || value === 'taxpayers' ? value : 'orders'
}

function createInvoiceApplyUrl(order: InvoiceOrderView) {
  return createAppRouteUrl(APP_ROUTES.invoiceApply, {
    order: JSON.stringify(order)
  })
}

function createInvoicePreviewUrl(item: InvoiceHistoryView) {
  return createAppRouteUrl(APP_ROUTES.invoicePreview, {
    id: item.id,
    title: item.title,
    email: item.email
  })
}

function createInvoiceDetailUrl(item: InvoiceHistoryView) {
  return createAppRouteUrl(APP_ROUTES.invoiceDetail, {
    data: JSON.stringify(item)
  })
}

function getCachedInvoiceOrderAuth(waybillNumber: string) {
  const list =
    dpCache.get<CachedInvoiceOrderAuth[]>(CACHE_KEYS.invoiceOrderAuth) ?? []

  return (
    list.find((item) => item.id === waybillNumber.trim())?.value.trim() ?? ''
  )
}

function cacheInvoiceOrderAuth(waybillNumber: string, value: string) {
  const normalizedWaybill = waybillNumber.trim()
  const normalizedValue = value.trim()
  const list =
    dpCache.get<CachedInvoiceOrderAuth[]>(CACHE_KEYS.invoiceOrderAuth) ?? []
  const nextList = list.filter((item) => item.id !== normalizedWaybill)

  nextList.push({
    id: normalizedWaybill,
    value: normalizedValue
  })

  dpCache.set(CACHE_KEYS.invoiceOrderAuth, {
    data: nextList,
    expire: {
      type: DPCacheExpireType.TODAY
    }
  })
}

function getOrderAuthValidationMessage(
  auth: InvoiceOrderAuthChallenge,
  value: string
) {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return '请按提示输入验证信息'
  }

  if (auth.authType === '02' && !/^\d{4}$/.test(normalizedValue)) {
    return '请输入付款人手机号后四位'
  }

  if (auth.authType === '03' && normalizedValue.length <= 6) {
    return '请输入付款人完整的联系方式'
  }

  if (auth.authType === '04' && !/^\d{6}$/.test(normalizedValue)) {
    return '请输入正确的短信验证码'
  }

  return ''
}

const InvoiceCenterPage = () => {
  const router = useRouter()
  const [tab, setTab] = useState<InvoiceTab>(() =>
    parseInvoiceTab(router.params.tab)
  )
  const [orders, setOrders] = useState<InvoiceOrderView[]>([])
  const [orderPageIndex, setOrderPageIndex] = useState(1)
  const [orderTotalPage, setOrderTotalPage] = useState(1)
  const [orderTotalRows, setOrderTotalRows] = useState(0)
  const [orderKeyword, setOrderKeyword] = useState('')
  const [orderAuth, setOrderAuth] =
    useState<InvoiceOrderAuthChallenge | null>(null)
  const [orderAuthValue, setOrderAuthValue] = useState('')
  const [orderAuthMessage, setOrderAuthMessage] = useState('')
  const [orderAuthCountdown, setOrderAuthCountdown] = useState(0)
  const [orderAuthSending, setOrderAuthSending] = useState(false)
  const [orderAuthSubmitting, setOrderAuthSubmitting] = useState(false)
  const [history, setHistory] = useState<InvoiceHistoryView[]>([])
  const [historyPageIndex, setHistoryPageIndex] = useState(1)
  const [historyTotalPage, setHistoryTotalPage] = useState(1)
  const [historyTotalRows, setHistoryTotalRows] = useState(0)
  const [historyKeyword, setHistoryKeyword] = useState('')
  const [taxpayers, setTaxpayers] = useState<InvoiceTaxpayerView[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

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

    const sendTime = dpCache.get<number>(CACHE_KEYS.invoiceOrderAuthCodeSend)

    if (!sendTime) {
      setOrderAuthCountdown(0)
      return
    }

    const nextSeconds = Math.ceil(
      ORDER_AUTH_CODE_SECONDS - (Date.now() - sendTime) / 1000
    )

    setOrderAuthCountdown(nextSeconds > 0 ? nextSeconds : 0)
  }, [orderAuth])

  useEffect(() => {
    if (orderAuthCountdown <= 0) {
      return undefined
    }

    const timer = setTimeout(() => {
      setOrderAuthCountdown((current) => Math.max(0, current - 1))
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
      if (loading) {
        return
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const response = await invoiceService.queryOrders(nextPage, PAGE_SIZE)

        if (!response.status || !response.result) {
          setErrorMessage(response.message || '暂未获取到可开票运单')
          if (nextPage === 1) {
            setOrders([])
            setOrderTotalRows(0)
          }
          return
        }

        setOrders((current) =>
          nextPage === 1
            ? response.result?.list ?? []
            : [...current, ...(response.result?.list ?? [])]
        )
        setOrderPageIndex(response.result.pageIndex)
        setOrderTotalPage(response.result.totalPage)
        setOrderTotalRows(response.result.totalRows)
      } finally {
        setLoading(false)
      }
    },
    [loading]
  )

  const loadOrderSearch = useCallback(
    async (keyword = orderKeyword) => {
      const normalizedKeyword = keyword.trim()

      if (loading || !normalizedKeyword) {
        return
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const cachedValue = getCachedInvoiceOrderAuth(normalizedKeyword)

        if (cachedValue) {
          const cachedResponse = await invoiceOrderSearchService.verifyPhone(
            normalizedKeyword,
            cachedValue
          )

          if (cachedResponse.status && cachedResponse.result?.list.length) {
            applyOrderSearchResponse(cachedResponse)
            return
          }
        }

        const response =
          await invoiceOrderSearchService.queryByWaybill(normalizedKeyword)

        applyOrderSearchResponse(response)
      } finally {
        setLoading(false)
      }
    },
    [applyOrderSearchResponse, loading, orderKeyword]
  )

  const loadHistory = useCallback(
    async (nextPage = 1, keyword = historyKeyword) => {
      if (loading) {
        return
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const response = await invoiceService.queryHistory(
          nextPage,
          PAGE_SIZE,
          keyword
        )

        if (!response.status || !response.result) {
          setErrorMessage(response.message || '暂未获取到开票历史')
          if (nextPage === 1) {
            setHistory([])
            setHistoryTotalRows(0)
          }
          return
        }

        setHistory((current) =>
          nextPage === 1
            ? response.result?.list ?? []
            : [...current, ...(response.result?.list ?? [])]
        )
        setHistoryPageIndex(response.result.pageIndex)
        setHistoryTotalPage(response.result.totalPage)
        setHistoryTotalRows(response.result.totalRows)
      } finally {
        setLoading(false)
      }
    },
    [historyKeyword, loading]
  )

  const loadTaxpayers = useCallback(async () => {
    if (loading) {
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const response = await invoiceService.queryTaxpayers()

      if (!response.status || !response.result) {
        setTaxpayers([])
        setErrorMessage(response.message || '暂未获取到发票抬头')
        return
      }

      setTaxpayers(response.result)
    } finally {
      setLoading(false)
    }
  }, [loading])

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

      loadTaxpayers()
    },
    [loadHistory, loadOrderSearch, loadOrders, loadTaxpayers, orderKeyword, tab]
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

      dpCache.set(CACHE_KEYS.invoiceOrderAuthCodeSend, {
        data: Date.now(),
        expire: {
          type: DPCacheExpireType.MINUTES,
          value: 1
        }
      })
      setOrderAuthCountdown(ORDER_AUTH_CODE_SECONDS)
      showPendingToast('验证码已发送')
    } finally {
      setOrderAuthSending(false)
    }
  }

  const handleConfirmOrderAuth = async () => {
    if (!orderAuth || orderAuthSubmitting) {
      return
    }

    const normalizedValue = orderAuthValue.trim()
    const validationMessage = getOrderAuthValidationMessage(
      orderAuth,
      normalizedValue
    )

    if (validationMessage) {
      showPendingToast(validationMessage)
      return
    }

    setOrderAuthSubmitting(true)
    setOrderAuthMessage('')

    try {
      if (orderAuth.authType === '04') {
        const verifyResponse = await invoiceOrderSearchService.verifyAuthCode(
          orderAuth.waybillNumber,
          normalizedValue
        )

        if (!verifyResponse.status) {
          setOrderAuthMessage(verifyResponse.message || '验证失败，请稍后再试')
          return
        }

        const response = await invoiceOrderSearchService.queryByWaybill(
          orderAuth.waybillNumber
        )

        if (applyOrderSearchResponse(response)) {
          showPendingToast('验证通过')
        }
        return
      }

      const response = await invoiceOrderSearchService.verifyPhone(
        orderAuth.waybillNumber,
        normalizedValue
      )

      if (!response.status) {
        setOrderAuthMessage(response.message || '验证失败，请重新确认信息')
        return
      }

      if (applyOrderSearchResponse(response)) {
        cacheInvoiceOrderAuth(orderAuth.waybillNumber, normalizedValue)
        showPendingToast('验证通过')
      }
    } finally {
      setOrderAuthSubmitting(false)
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

    navigateToAppRoute(createInvoiceApplyUrl(order), {
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
      onScrollToLower={handleLoadMore}
    >
      <InvoiceHeader />
      <InvoiceTabs
        tabs={INVOICE_TABS}
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
