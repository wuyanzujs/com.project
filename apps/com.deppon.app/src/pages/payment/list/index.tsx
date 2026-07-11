import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useRef, useState } from 'react'

import PaymentFeeRows from './components/PaymentFeeRows'
import {
  createPaymentEvaluateWebUri,
  getPaymentItemAmount,
  getPaymentOrderTypeLabel,
  paymentService
} from '../../../services/payment'
import { LatestRequestCoordinator } from '../../../shared/async/latestRequest'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'
import { getNativeCapabilityErrorMessage } from '../../../shared/platform/capabilities'
import { payWithApp } from '../../../shared/platform/payment'
import { createAppWebUrl } from '../../../shared/webview/appWeb'

import type {
  PaymentItem,
  PaymentListStatus,
  PaymentRole
} from '../../../services/payment'

import './index.scss'

const PAGE_SIZE = 10

const PAYMENT_STATUS_TABS: Array<{ label: string; value: PaymentListStatus }> =
  [
    {
      label: '待支付',
      value: 'UNPAID'
    },
    {
      label: '已支付',
      value: 'PAID'
    }
  ]

const PAYMENT_ROLE_TABS: Array<{ label: string; value: PaymentRole }> = [
  {
    label: '我寄的',
    value: 'sender'
  },
  {
    label: '我收的',
    value: 'receive'
  }
]

function getPaymentItemKey(item: PaymentItem) {
  return item.accountStatementDetailNo || item.waybillNum
}

const PaymentListPage = () => {
  const [status, setStatus] = useState<PaymentListStatus>('UNPAID')
  const [role, setRole] = useState<PaymentRole>('sender')
  const [keyword, setKeyword] = useState('')
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [pageIndex, setPageIndex] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const [loadedAmount, setLoadedAmount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [payingKey, setPayingKey] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const requestCoordinator = useRef(new LatestRequestCoordinator()).current

  const ensurePaymentListAccess = useCallback(
    () =>
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.paymentList,
        replace: true
      }),
    []
  )

  const loadPayments = useCallback(
    async (
      nextPage = 1,
      nextRole = role,
      nextKeyword = keyword,
      nextStatus = status,
      force = false
    ) => {
      const requestToken = requestCoordinator.begin(
        JSON.stringify([nextPage, nextRole, nextKeyword, nextStatus]),
        { force }
      )

      if (!requestToken) {
        return
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const response = await paymentService.queryPaymentList({
          status: nextStatus,
          role: nextRole,
          pageIndex: nextPage,
          pageSize: PAGE_SIZE,
          waybillNumber: nextKeyword
        })

        if (!requestCoordinator.isLatest(requestToken)) {
          return
        }

        if (!response.status || !response.result) {
          setErrorMessage(
            response.message ||
              (nextStatus === 'PAID'
                ? '暂未获取到支付记录'
                : '暂未获取到待支付运单')
          )
          if (nextPage === 1) {
            setPayments([])
            setTotalRows(0)
            setLoadedAmount(0)
          }
          return
        }

        setPayments(current =>
          nextPage === 1
            ? (response.result?.list ?? [])
            : [...current, ...(response.result?.list ?? [])]
        )
        setPageIndex(response.result.pageIndex)
        setTotalPage(response.result.totalPage)
        setTotalRows(response.result.totalRows)
        setLoadedAmount(current =>
          nextPage === 1
            ? (response.result?.pageAmount ?? 0)
            : current + (response.result?.pageAmount ?? 0)
        )
      } finally {
        if (requestCoordinator.finish(requestToken)) {
          setLoading(false)
        }
      }
    },
    [keyword, requestCoordinator, role, status]
  )

  useDidShow(() => {
    if (ensurePaymentListAccess()) {
      loadPayments(1)
    }
  })

  const handleChangeRole = (nextRole: PaymentRole) => {
    if (!ensurePaymentListAccess()) {
      return
    }

    setRole(nextRole)
    setPayments([])
    setPageIndex(1)
    loadPayments(1, nextRole, keyword, status)
  }

  const handleChangeStatus = (nextStatus: PaymentListStatus) => {
    if (!ensurePaymentListAccess()) {
      return
    }

    if (nextStatus === status) {
      return
    }

    setStatus(nextStatus)
    setPayments([])
    setPageIndex(1)
    setTotalRows(0)
    setLoadedAmount(0)
    setErrorMessage('')
    loadPayments(1, role, keyword, nextStatus)
  }

  const handleSearch = () => {
    if (!ensurePaymentListAccess()) {
      return
    }

    setPayments([])
    setPageIndex(1)
    loadPayments(1, role, keyword, status)
  }

  const handleLoadMore = () => {
    if (!ensurePaymentListAccess()) {
      return
    }

    if (loading || pageIndex >= totalPage) {
      return
    }

    loadPayments(pageIndex + 1)
  }

  const handleOpenOrder = (item: PaymentItem) => {
    const url = createAppRouteUrl(APP_ROUTES.orderDetail, {
      waybillNumber: item.waybillNum,
      role,
      view: 'secure'
    })

    navigateToAppRoute(url, {
      login: true
    })
  }

  const handlePay = async (item: PaymentItem) => {
    const itemKey = getPaymentItemKey(item)

    if (payingKey) {
      return
    }

    setPayingKey(itemKey)

    try {
      await payWithApp({
        source: 'PAYMENT_LIST',
        channel: 'h5Cashier',
        orderNumber: item.waybillNum,
        payload: {
          role,
          amount: getPaymentItemAmount(item, 'UNPAID'),
          item
        }
      })

      Taro.showToast({
        title: '支付完成',
        icon: 'none'
      })
      loadPayments(1, role, keyword, status, true)
    } catch (error) {
      Taro.showToast({
        title: getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    } finally {
      setPayingKey('')
    }
  }

  const handleEvaluate = (item: PaymentItem) => {
    if (!ensurePaymentListAccess()) {
      return
    }

    navigateToAppRoute(
      createAppWebUrl({
        source: 'PAYMENT_EVALUATE',
        uri: createPaymentEvaluateWebUri(item),
        title: '服务评价'
      }),
      {
        login: true
      }
    )
  }

  return (
    <ScrollView
      className='payment-list-page'
      onScrollToLower={handleLoadMore}
      scrollY
    >
      <View className='payment-status-tabs'>
        {PAYMENT_STATUS_TABS.map(tab => (
          <View
            className={
              tab.value === status
                ? 'payment-status-tab payment-status-tab--active'
                : 'payment-status-tab'
            }
            key={tab.value}
            onClick={() => handleChangeStatus(tab.value)}
          >
            <Text
              className={
                tab.value === status
                  ? 'payment-status-tab__text payment-status-tab__text--active'
                  : 'payment-status-tab__text'
              }
            >
              {tab.label}
            </Text>
          </View>
        ))}
      </View>

      <View className='payment-tabs'>
        {PAYMENT_ROLE_TABS.map(tab => (
          <View
            className={
              tab.value === role
                ? 'payment-tab payment-tab--active'
                : 'payment-tab'
            }
            key={tab.value}
            onClick={() => handleChangeRole(tab.value)}
          >
            <Text
              className={
                tab.value === role
                  ? 'payment-tab__text payment-tab__text--active'
                  : 'payment-tab__text'
              }
            >
              {tab.label}
            </Text>
          </View>
        ))}
      </View>

      <View className='payment-search'>
        <Input
          className='payment-search__input'
          placeholder='输入运单号，多个用逗号分隔'
          value={keyword}
          onInput={event => setKeyword(event.detail.value)}
        />
        <View className='payment-search__button' onClick={handleSearch}>
          <Text className='payment-search__button-text'>搜索</Text>
        </View>
      </View>

      <View className='payment-summary'>
        <View>
          <Text className='payment-summary__title'>
            {status === 'PAID' ? '最近180天' : '最近一个月'}
          </Text>
          <Text className='payment-summary__count'>共 {totalRows} 笔费用</Text>
        </View>
        <View className='payment-summary__side'>
          <Text className='payment-summary__hint'>已加载合计</Text>
          <Text className='payment-summary__amount'>
            ¥{loadedAmount.toFixed(2)}
          </Text>
        </View>
      </View>

      <View className='payment-list-content'>
        {payments.map(item => (
          <View className='payment-card' key={getPaymentItemKey(item)}>
            <View className='payment-card__top'>
              <Text className='payment-card__number'>
                运单 {item.waybillNum}
              </Text>
              <View className='payment-card__tags'>
                <Text className='payment-card__tag'>
                  {getPaymentOrderTypeLabel(item.orderSubType)}
                </Text>
                {status === 'PAID' && (
                  <Text className='payment-card__status'>已支付</Text>
                )}
              </View>
            </View>

            <View className='payment-card__route'>
              <View className='payment-card__city-block'>
                <Text className='payment-card__city'>
                  {item.senderCityName || '--'}
                </Text>
                <Text className='payment-card__name'>
                  {item.sender || '--'}
                </Text>
              </View>
              <Text className='payment-card__arrow'>→</Text>
              <View className='payment-card__city-block payment-card__city-block--right'>
                <Text className='payment-card__city'>
                  {item.arriveCity || '--'}
                </Text>
                <Text className='payment-card__name'>
                  {item.consignee || '--'}
                </Text>
              </View>
            </View>

            <View className='payment-card__meta'>
              <Text className='payment-card__time'>
                开单时间 {item.businessDate || '--'}
              </Text>
              <Text className='payment-card__amount'>
                ¥{getPaymentItemAmount(item, status).toFixed(2)}
              </Text>
            </View>

            <PaymentFeeRows item={item} />

            <View className='payment-card__actions'>
              <View
                className='payment-card__outline-button'
                onClick={() => handleOpenOrder(item)}
              >
                <Text className='payment-card__outline-button-text'>
                  查看订单
                </Text>
              </View>
              {status === 'PAID' && (
                <View
                  className='payment-card__primary-button'
                  onClick={() => handleEvaluate(item)}
                >
                  <Text className='payment-card__primary-button-text'>
                    服务评价
                  </Text>
                </View>
              )}
              {status === 'UNPAID' && (
                <View
                  className='payment-card__primary-button'
                  onClick={() => handlePay(item)}
                >
                  <Text className='payment-card__primary-button-text'>
                    {payingKey === getPaymentItemKey(item)
                      ? '处理中'
                      : '去支付'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}

        {!payments.length && !loading && (
          <View className='payment-empty'>
            <Text className='payment-empty__title'>
              {errorMessage ||
                (status === 'PAID' ? '暂无支付记录' : '暂无待支付运单')}
            </Text>
            <Text className='payment-empty__summary'>
              {status === 'PAID'
                ? '可切换寄件/收件，或按运单号搜索最近180天支付记录。'
                : '可切换寄件/收件，或按运单号搜索最近一个月费用。'}
            </Text>
          </View>
        )}

        {loading && (
          <Text className='payment-loading'>
            {payments.length
              ? '加载更多费用...'
              : status === 'PAID'
                ? '正在加载支付记录...'
                : '正在加载待支付运单...'}
          </Text>
        )}
      </View>
    </ScrollView>
  )
}

export default PaymentListPage
