import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useCallback, useEffect, useState } from 'react'

import { OrderAuthDialog } from './components/OrderAuthDialog'
import { CACHE_KEYS, DPCacheExpireType, dpCache } from '../../../cache'
import {
  invoiceOrderSearchService,
  invoiceService
} from '../../../services/invoice'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'

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

const INVOICE_TABS: Array<{ label: string; value: InvoiceTab }> = [
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

function getMoneyText(value: number) {
  if (!Number.isFinite(value)) {
    return '¥0'
  }

  return Number.isInteger(value) ? `¥${value}` : `¥${value.toFixed(2)}`
}

function getStatusClassName(base: string, statusClass: string) {
  return `${base} ${base}--${statusClass.toLowerCase()}`
}

function createInvoiceApplyUrl(order: InvoiceOrderView) {
  return `${APP_ROUTES.invoiceApply}?order=${encodeURIComponent(
    JSON.stringify(order)
  )}`
}

function createInvoicePreviewUrl(item: InvoiceHistoryView) {
  const params = [
    `id=${encodeURIComponent(item.id)}`,
    `title=${encodeURIComponent(item.title)}`,
    `email=${encodeURIComponent(item.email)}`
  ]

  return `${APP_ROUTES.invoicePreview}?${params.join('&')}`
}

function createInvoiceDetailUrl(item: InvoiceHistoryView) {
  return `${APP_ROUTES.invoiceDetail}?data=${encodeURIComponent(
    JSON.stringify(item)
  )}`
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

  return (
    <ScrollView
      className='invoice-page'
      scrollY
      onScrollToLower={handleLoadMore}
    >
      <View className='invoice-header'>
        <Text className='invoice-header__label'>Invoice</Text>
        <Text className='invoice-header__title'>发票中心</Text>
        <Text className='invoice-header__summary'>
          支持可开票运单、运单号搜索、开票历史、发票预览和抬头管理。
        </Text>
      </View>

      <View className='invoice-tabs'>
        {INVOICE_TABS.map((item) => (
          <View
            className={
              item.value === tab ? 'invoice-tab invoice-tab--active' : 'invoice-tab'
            }
            key={item.value}
            onClick={() => handleChangeTab(item.value)}
          >
            <Text
              className={
                item.value === tab
                  ? 'invoice-tab__text invoice-tab__text--active'
                  : 'invoice-tab__text'
              }
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {tab === 'orders' && (
        <>
          <View className='invoice-search'>
            <Input
              className='invoice-search__input'
              placeholder='输入运单号搜索可开票记录'
              value={orderKeyword}
              onInput={(event) => setOrderKeyword(event.detail.value)}
            />
            <View className='invoice-search__button' onClick={handleSearchOrder}>
              <Text className='invoice-search__button-text'>搜索</Text>
            </View>
            {orderKeyword && (
              <View className='invoice-search__clear' onClick={handleClearOrder}>
                <Text className='invoice-search__clear-text'>清除</Text>
              </View>
            )}
          </View>

          <View className='invoice-summary'>
            <View>
              <Text className='invoice-summary__title'>
                {orderKeyword.trim() ? '运单搜索结果' : '近三个月运单'}
              </Text>
              <Text className='invoice-summary__count'>
                共 {orderTotalRows} 条可查询记录
              </Text>
            </View>
            <Text className='invoice-summary__hint'>
              {orderKeyword.trim() ? '搜索结果' : '支持分页加载'}
            </Text>
          </View>

          <View className='invoice-content'>
            {orders.map((item) => (
              <View className='invoice-card' key={item.id || item.waybillNumber}>
                <View className='invoice-card__top'>
                  <Text className='invoice-card__number'>
                    运单 {item.waybillNumber || '--'}
                  </Text>
                  <Text
                    className={getStatusClassName(
                      'invoice-card__status',
                      item.statusClass
                    )}
                  >
                    {item.statusText}
                  </Text>
                </View>
                <View className='invoice-route'>
                  <Text className='invoice-route__text'>
                    {item.senderText || '--'}
                  </Text>
                  <Text className='invoice-route__arrow'>→</Text>
                  <Text className='invoice-route__text invoice-route__text--right'>
                    {item.consigneeText || '--'}
                  </Text>
                </View>
                <View className='invoice-card__meta'>
                  <Text className='invoice-card__time'>{item.businessTime}</Text>
                  <Text className='invoice-card__amount'>
                    {getMoneyText(item.amount)}
                  </Text>
                </View>
                {item.pendingPayment && (
                  <Text className='invoice-card__warning'>
                    仍有待支付金额 {getMoneyText(item.unpaidAmount)}
                  </Text>
                )}
                <View className='invoice-card__actions'>
                  <View
                    className={
                      item.canApply
                        ? 'invoice-card__button'
                        : 'invoice-card__button invoice-card__button--disabled'
                    }
                    onClick={() =>
                      item.canApply
                        ? navigateToAppRoute(createInvoiceApplyUrl(item), {
                            login: true
                          })
                        : showPendingToast(item.statusText)
                    }
                  >
                    <Text
                      className={
                        item.canApply
                          ? 'invoice-card__button-text'
                          : 'invoice-card__button-text invoice-card__button-text--disabled'
                      }
                    >
                      {item.canApply ? '申请发票' : item.statusText}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {!orders.length && !loading && (
              <View className='invoice-empty'>
                <Text className='invoice-empty__title'>
                  {errorMessage || '暂无可开票运单'}
                </Text>
                <Text className='invoice-empty__summary'>
                  可按运单号搜索可开票记录，需身份校验的运单会按后端规则拦截。
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {tab === 'history' && (
        <>
          <View className='invoice-search'>
            <Input
              className='invoice-search__input'
              placeholder='输入运单号搜索开票历史'
              value={historyKeyword}
              onInput={(event) => setHistoryKeyword(event.detail.value)}
            />
            <View className='invoice-search__button' onClick={handleSearchHistory}>
              <Text className='invoice-search__button-text'>搜索</Text>
            </View>
            {historyKeyword && (
              <View
                className='invoice-search__clear'
                onClick={handleClearHistory}
              >
                <Text className='invoice-search__clear-text'>清除</Text>
              </View>
            )}
          </View>

          <View className='invoice-summary'>
            <View>
              <Text className='invoice-summary__title'>近一年历史</Text>
              <Text className='invoice-summary__count'>
                共 {historyTotalRows} 条开票记录
              </Text>
            </View>
            <Text className='invoice-summary__hint'>
              {historyKeyword ? '搜索结果' : '支持分页加载'}
            </Text>
          </View>

          <View className='invoice-content'>
            {history.map((item) => (
              <View className='invoice-card' key={item.id}>
                <View className='invoice-card__top'>
                  <Text className='invoice-card__number'>{item.title}</Text>
                  <Text
                    className={getStatusClassName(
                      'invoice-card__status',
                      item.statusClass
                    )}
                  >
                    {item.statusText}
                  </Text>
                </View>
                <Text className='invoice-card__desc'>
                  {item.typeText} · {item.applyTime}
                </Text>
                <Text className='invoice-card__desc'>
                  邮箱 {item.email || '--'}
                </Text>
                <View className='invoice-card__meta'>
                  <Text className='invoice-card__time'>
                    {item.taxNumber || '无税号'}
                  </Text>
                  <Text className='invoice-card__amount'>
                    {getMoneyText(item.amount)}
                  </Text>
                </View>
                <View className='invoice-card__actions'>
                  <View
                    className='invoice-card__button invoice-card__button--ghost'
                    onClick={() =>
                      navigateToAppRoute(createInvoiceDetailUrl(item), {
                        login: true
                      })
                    }
                  >
                    <Text className='invoice-card__button-text invoice-card__button-text--ghost'>
                      查看详情
                    </Text>
                  </View>
                  <View
                    className={
                      item.canPreview
                        ? 'invoice-card__button'
                        : 'invoice-card__button invoice-card__button--disabled'
                    }
                    onClick={() =>
                      item.canPreview
                        ? navigateToAppRoute(createInvoicePreviewUrl(item), {
                            login: true
                          })
                        : showPendingToast('暂无预览信息')
                    }
                  >
                    <Text
                      className={
                        item.canPreview
                          ? 'invoice-card__button-text'
                          : 'invoice-card__button-text invoice-card__button-text--disabled'
                      }
                    >
                      {item.canPreview ? '预览发票' : '暂无预览'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {!history.length && !loading && (
              <View className='invoice-empty'>
                <Text className='invoice-empty__title'>
                  {errorMessage || '暂无开票历史'}
                </Text>
                <Text className='invoice-empty__summary'>
                  可按运单号搜索历史开票记录，扫码查询后续接入 App 扫码能力。
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {tab === 'taxpayers' && (
        <View className='invoice-content'>
          <View className='invoice-summary invoice-summary--inside'>
            <View>
              <Text className='invoice-summary__title'>发票抬头</Text>
              <Text className='invoice-summary__count'>
                共 {taxpayers.length} 条抬头
              </Text>
            </View>
            <View
              className='invoice-summary__button'
              onClick={() =>
                navigateToAppRoute(APP_ROUTES.invoiceTaxpayerList, {
                  login: true
                })
              }
            >
              <Text className='invoice-summary__button-text'>管理</Text>
            </View>
          </View>

          {taxpayers.map((item) => (
            <View className='invoice-card' key={item.id}>
              <View className='invoice-card__top'>
                <Text className='invoice-card__number'>{item.name || '--'}</Text>
                {item.isDefault && (
                  <Text className='invoice-card__status invoice-card__status--success'>
                    默认
                  </Text>
                )}
              </View>
              <Text className='invoice-card__desc'>{item.typeText}</Text>
              <Text className='invoice-card__desc'>
                税号 {item.taxNumber || '--'}
              </Text>
              <Text className='invoice-card__desc'>
                电话 {item.phone || '--'}
              </Text>
              <Text className='invoice-card__desc'>
                地址 {item.address || '--'}
              </Text>
              {(item.bank || item.bankAccount) && (
                <Text className='invoice-card__desc'>
                  银行 {item.bank || '--'} {item.bankAccount || ''}
                </Text>
              )}
            </View>
          ))}

          {!taxpayers.length && !loading && (
            <View className='invoice-empty'>
              <Text className='invoice-empty__title'>
                {errorMessage || '暂无发票抬头'}
              </Text>
              <Text className='invoice-empty__summary'>
                合同客户和抬头新增/编辑规则较多，后续单独迁移抬头管理页。
              </Text>
            </View>
          )}
        </View>
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

      {loading && (
        <Text className='invoice-loading'>
          {tab === 'orders'
            ? '正在加载可开票运单...'
            : tab === 'history'
              ? '正在加载开票历史...'
              : '正在加载发票抬头...'}
        </Text>
      )}
    </ScrollView>
  )
}

export default InvoiceCenterPage
