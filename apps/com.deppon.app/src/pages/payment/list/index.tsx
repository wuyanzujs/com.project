import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useState } from 'react'

import { paymentService } from '../../../services/payment'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'
import { getNativeCapabilityErrorMessage } from '../../../shared/platform/capabilities'
import { payWithApp } from '../../../shared/platform/payment'

import type {
  PaymentItem,
  PaymentRole
} from '../../../services/payment'

import './index.scss'

const PAGE_SIZE = 10

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

function getPaymentTypeLabel(item: PaymentItem) {
  if (item.orderSubType === 'CR') {
    return '货款'
  }

  if (item.orderSubType === 'DVAR') {
    return '保管费'
  }

  return '运费'
}

function getPaymentAmount(item: PaymentItem) {
  const amount = Number(item.unWriteoffAmount || item.totalAmount || 0)

  return Number.isFinite(amount) ? amount : 0
}

const PaymentListPage = () => {
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
      nextKeyword = keyword
    ) => {
      if (loading) {
        return
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const response = await paymentService.queryUnpaidList({
          role: nextRole,
          pageIndex: nextPage,
          pageSize: PAGE_SIZE,
          waybillNumber: nextKeyword
        })

        if (!response.status || !response.result) {
          setErrorMessage(response.message || '暂未获取到待支付运单')
          if (nextPage === 1) {
            setPayments([])
            setTotalRows(0)
            setLoadedAmount(0)
          }
          return
        }

        setPayments((current) =>
          nextPage === 1
            ? response.result?.list ?? []
            : [...current, ...(response.result?.list ?? [])]
        )
        setPageIndex(response.result.pageIndex)
        setTotalPage(response.result.totalPage)
        setTotalRows(response.result.totalRows)
        setLoadedAmount((current) =>
          nextPage === 1
            ? response.result?.pageAmount ?? 0
            : current + (response.result?.pageAmount ?? 0)
        )
      } finally {
        setLoading(false)
      }
    },
    [keyword, loading, role]
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
    loadPayments(1, nextRole, keyword)
  }

  const handleSearch = () => {
    if (!ensurePaymentListAccess()) {
      return
    }

    setPayments([])
    setPageIndex(1)
    loadPayments(1, role, keyword)
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
          amount: getPaymentAmount(item),
          item
        }
      })

      Taro.showToast({
        title: '支付完成',
        icon: 'none'
      })
      loadPayments(1, role, keyword)
    } catch (error) {
      Taro.showToast({
        title: getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    } finally {
      setPayingKey('')
    }
  }

  return (
    <ScrollView
      className='payment-list-page'
      onScrollToLower={handleLoadMore}
      scrollY
    >
      <View className='payment-list-header'>
        <Text className='payment-list-header__label'>Payment</Text>
        <Text className='payment-list-header__title'>待支付运单</Text>
        <Text className='payment-list-header__summary'>
          先承接未核销费用查询和 App 支付入口，真实收银台由原生支付能力接入。
        </Text>
      </View>

      <View className='payment-tabs'>
        {PAYMENT_ROLE_TABS.map((tab) => (
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
          placeholder='输入运单号搜索'
          value={keyword}
          onInput={(event) => setKeyword(event.detail.value)}
        />
        <View className='payment-search__button' onClick={handleSearch}>
          <Text className='payment-search__button-text'>搜索</Text>
        </View>
      </View>

      <View className='payment-summary'>
        <View>
          <Text className='payment-summary__title'>最近一个月</Text>
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
        {payments.map((item) => (
          <View className='payment-card' key={getPaymentItemKey(item)}>
            <View className='payment-card__top'>
              <Text className='payment-card__number'>运单 {item.waybillNum}</Text>
              <Text className='payment-card__tag'>{getPaymentTypeLabel(item)}</Text>
            </View>

            <View className='payment-card__route'>
              <View className='payment-card__city-block'>
                <Text className='payment-card__city'>
                  {item.senderCityName || '--'}
                </Text>
                <Text className='payment-card__name'>{item.sender || '--'}</Text>
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
                ¥{getPaymentAmount(item).toFixed(2)}
              </Text>
            </View>

            <View className='payment-card__actions'>
              <View
                className='payment-card__outline-button'
                onClick={() => handleOpenOrder(item)}
              >
                <Text className='payment-card__outline-button-text'>
                  查看订单
                </Text>
              </View>
              <View
                className='payment-card__primary-button'
                onClick={() => handlePay(item)}
              >
                <Text className='payment-card__primary-button-text'>
                  {payingKey === getPaymentItemKey(item) ? '处理中' : '去支付'}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {!payments.length && !loading && (
          <View className='payment-empty'>
            <Text className='payment-empty__title'>
              {errorMessage || '暂无待支付运单'}
            </Text>
            <Text className='payment-empty__summary'>
              可切换寄件/收件，或按运单号搜索最近一个月费用。
            </Text>
          </View>
        )}

        {loading && (
          <Text className='payment-loading'>
            {payments.length ? '加载更多费用...' : '正在加载待支付运单...'}
          </Text>
        )}
      </View>
    </ScrollView>
  )
}

export default PaymentListPage
