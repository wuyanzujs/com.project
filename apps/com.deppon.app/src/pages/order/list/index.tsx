import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useState } from 'react'

import { expressDraftBridge } from '../../../services/express'
import {
  canDeleteOrder,
  createExpressDraftFromOrderDetail,
  orderService
} from '../../../services/order'
import AppTabBar from '../../../shared/components/AppTabBar'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'

import type {
  OrderListItem,
  OrderPaymentFilter,
  OrderResendMode,
  OrderRole,
  OrderStatusFilter
} from '../../../services/order'

import './index.scss'

const PAGE_SIZE = 10

const ORDER_TABS: Array<{ label: string; value: OrderRole }> = [
  {
    label: '我寄的',
    value: 'sender'
  },
  {
    label: '我收的',
    value: 'receive'
  }
]

const ORDER_STATUS_OPTIONS: Array<{
  label: string
  value: OrderStatusFilter
}> = [
  {
    label: '全部',
    value: ''
  },
  {
    label: '待揽件',
    value: 'RECEIPTING'
  },
  {
    label: '运输中',
    value: 'IN_TRANSIT'
  },
  {
    label: '已签收',
    value: 'SIGN'
  },
  {
    label: '已取消',
    value: 'CANCEL'
  },
  {
    label: '已作废',
    value: 'INVALID'
  }
]

const ORDER_PAYMENT_OPTIONS: Array<{
  label: string
  value: OrderPaymentFilter
}> = [
  {
    label: '全部',
    value: ''
  },
  {
    label: '现付',
    value: 'MP'
  },
  {
    label: '到付',
    value: 'FC'
  },
  {
    label: '月结',
    value: 'CT'
  }
]

type OrderDateRangeDays = 7 | 30 | 90

const ORDER_DATE_RANGE_OPTIONS: Array<{
  label: string
  value: OrderDateRangeDays
}> = [
  {
    label: '近7天',
    value: 7
  },
  {
    label: '近30天',
    value: 30
  },
  {
    label: '近90天',
    value: 90
  }
]

function createQuery(params: Record<string, string>) {
  return Object.entries(params)
    .filter(([, value]) => !!value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
}

function getRouteToDetail(order: OrderListItem) {
  return `${APP_ROUTES.orderDetail}?${createQuery({
    orderNumber: order.orderNumber,
    waybillNumber: order.waybillNumber,
    role: order.role
  })}`
}

function canCancelOrder(order: OrderListItem) {
  return (
    order.role === 'sender' &&
    order.orderClass === 0 &&
    order.isAllowCancel &&
    !!order.orderNumber
  )
}

function getOrderActionKey(order: OrderListItem) {
  return `${order.role}-${order.orderNumber}-${order.waybillNumber}`
}

function canResendOrder(order: OrderListItem) {
  return canDeleteOrder(order)
}

function getResendMode(order: OrderListItem): OrderResendMode {
  return order.role === 'receive' ? 'return' : 'repeat'
}

function getResendActionText(order: OrderListItem) {
  return order.role === 'receive' ? '一键回寄' : '再来一单'
}

function getDateRangeTitle(days: OrderDateRangeDays) {
  if (days === 7) {
    return '最近7天'
  }

  if (days === 90) {
    return '最近90天'
  }

  return '最近一个月'
}

const OrderListPage = () => {
  const [role, setRole] = useState<OrderRole>('sender')
  const [rangeDays, setRangeDays] = useState<OrderDateRangeDays>(30)
  const [orderStatus, setOrderStatus] = useState<OrderStatusFilter>('')
  const [paymentType, setPaymentType] = useState<OrderPaymentFilter>('')
  const [keyword, setKeyword] = useState('')
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [pageIndex, setPageIndex] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)
  const [deletingOrderKey, setDeletingOrderKey] = useState('')
  const [resendingOrderKey, setResendingOrderKey] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const ensureOrderListAccess = useCallback(
    () =>
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.orderList,
        replace: true
      }),
    []
  )

  const loadOrders = useCallback(
    async (
      nextPage = 1,
      nextRole = role,
      nextKeyword = keyword,
      nextStatus = orderStatus,
      nextPaymentType = paymentType,
      nextRangeDays = rangeDays
    ) => {
      if (loading) {
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

        if (!response.status || !response.result) {
          setErrorMessage(response.message || '暂未获取到订单')
          if (nextPage === 1) {
            setOrders([])
          }
          return
        }

        setOrders((current) =>
          nextPage === 1
            ? response.result?.list ?? []
            : [...current, ...(response.result?.list ?? [])]
        )
        setPageIndex(response.result.pageIndex)
        setTotalPage(response.result.totalPage)
        setTotalRows(response.result.totalRows)
      } finally {
        setLoading(false)
      }
    },
    [keyword, loading, orderStatus, paymentType, rangeDays, role]
  )

  useDidShow(() => {
    if (ensureOrderListAccess()) {
      loadOrders(1)
    }
  })

  const handleChangeRole = (nextRole: OrderRole) => {
    if (!ensureOrderListAccess()) {
      return
    }

    setRole(nextRole)
    setOrders([])
    setPageIndex(1)
    loadOrders(1, nextRole, keyword, orderStatus, paymentType, rangeDays)
  }

  const handleChangeRange = (nextRangeDays: OrderDateRangeDays) => {
    if (!ensureOrderListAccess()) {
      return
    }

    setRangeDays(nextRangeDays)
    setOrders([])
    setPageIndex(1)
    loadOrders(1, role, keyword, orderStatus, paymentType, nextRangeDays)
  }

  const handleChangeStatus = (nextStatus: OrderStatusFilter) => {
    if (!ensureOrderListAccess()) {
      return
    }

    setOrderStatus(nextStatus)
    setOrders([])
    setPageIndex(1)
    loadOrders(1, role, keyword, nextStatus, paymentType, rangeDays)
  }

  const handleChangePayment = (nextPaymentType: OrderPaymentFilter) => {
    if (!ensureOrderListAccess()) {
      return
    }

    setPaymentType(nextPaymentType)
    setOrders([])
    setPageIndex(1)
    loadOrders(1, role, keyword, orderStatus, nextPaymentType, rangeDays)
  }

  const handleSearch = () => {
    if (!ensureOrderListAccess()) {
      return
    }

    loadOrders(1, role, keyword, orderStatus, paymentType, rangeDays)
  }

  const handleOpenPaymentList = () => {
    navigateToAppRoute(APP_ROUTES.paymentList, {
      login: true
    })
  }

  const handleLoadMore = () => {
    if (!ensureOrderListAccess()) {
      return
    }

    if (loading || pageIndex >= totalPage) {
      return
    }

    loadOrders(pageIndex + 1)
  }

  const handleOpenDetail = (order: OrderListItem) => {
    Taro.navigateTo({
      url: getRouteToDetail(order)
    })
  }

  const handleCancelOrder = (order: OrderListItem) => {
    if (!canCancelOrder(order)) {
      return
    }

    Taro.navigateTo({
      url: `${APP_ROUTES.orderCancel}?${createQuery({
        orderNumber: order.orderNumber,
        source: 'list'
      })}`
    })
  }

  const handleDeleteOrder = async (order: OrderListItem) => {
    if (!canDeleteOrder(order) || deletingOrderKey) {
      return
    }

    const confirmResult = await Taro.showModal({
      title: '删除订单',
      content: '删除后将从当前列表移除该订单，确认删除吗？',
      confirmText: '确认删除',
      cancelText: '暂不删除'
    })

    if (!confirmResult.confirm) {
      return
    }

    const orderKey = getOrderActionKey(order)

    setDeletingOrderKey(orderKey)

    try {
      const response = await orderService.deleteOrder({
        role: order.role,
        orderNumber: order.orderNumber,
        waybillNumber: order.waybillNumber
      })

      Taro.showToast({
        title: response.status
          ? '删除成功'
          : response.message || '删除失败，请稍后重试',
        icon: 'none'
      })

      if (response.status) {
        setOrders((current) =>
          current.filter((item) => getOrderActionKey(item) !== orderKey)
        )
        setTotalRows((current) => Math.max(0, current - 1))
      }
    } finally {
      setDeletingOrderKey('')
    }
  }

  const handleResendOrder = async (order: OrderListItem) => {
    if (!canResendOrder(order) || resendingOrderKey) {
      return
    }

    const orderKey = getOrderActionKey(order)

    setResendingOrderKey(orderKey)

    try {
      const response = await orderService.queryDetail({
        orderNumber: order.orderNumber,
        waybillNumber: order.waybillNumber
      })

      if (!response.status || !response.result) {
        Taro.showToast({
          title: response.message || '暂未获取到订单详情',
          icon: 'none'
        })
        return
      }

      expressDraftBridge.carryFromOrderResend(
        createExpressDraftFromOrderDetail(
          response.result,
          getResendMode(order)
        )
      )
      navigateToAppRoute(APP_ROUTES.express, {
        replace: true
      })
    } finally {
      setResendingOrderKey('')
    }
  }

  return (
    <>
      <ScrollView
        className='order-list-page'
        onScrollToLower={handleLoadMore}
        scrollY
      >
        <View className='order-list-header'>
          <Text className='order-list-header__label'>Order</Text>
          <Text className='order-list-header__title'>查快递</Text>
          <Text className='order-list-header__summary'>
            先承接寄件和收件订单的基础查询、搜索和详情跳转，支付、订阅和售后动作后置。
          </Text>
        </View>

        <View className='order-tabs'>
          {ORDER_TABS.map((tab) => (
            <View
              className={
                tab.value === role
                  ? 'order-tab order-tab--active'
                  : 'order-tab'
              }
              key={tab.value}
              onClick={() => handleChangeRole(tab.value)}
            >
              <Text
                className={
                  tab.value === role
                    ? 'order-tab__text order-tab__text--active'
                    : 'order-tab__text'
                }
              >
                {tab.label}
              </Text>
            </View>
          ))}
        </View>

        <View className='order-search'>
          <Input
            className='order-search__input'
            placeholder='订单号、运单号、姓名'
            value={keyword}
            onInput={(event) => setKeyword(event.detail.value)}
          />
          <View className='order-search__button' onClick={handleSearch}>
            <Text className='order-search__button-text'>搜索</Text>
          </View>
        </View>

        <View className='order-filter-panel'>
          <Text className='order-filter-panel__label'>时间</Text>
          <View className='order-filter'>
            {ORDER_DATE_RANGE_OPTIONS.map((option) => (
              <View
                className={
                  option.value === rangeDays
                    ? 'order-filter__chip order-filter__chip--active'
                    : 'order-filter__chip'
                }
                key={option.value}
                onClick={() => handleChangeRange(option.value)}
              >
                <Text
                  className={
                    option.value === rangeDays
                      ? 'order-filter__chip-text order-filter__chip-text--active'
                      : 'order-filter__chip-text'
                  }
                >
                  {option.label}
                </Text>
              </View>
            ))}
          </View>
          <Text className='order-filter-panel__label'>状态</Text>
          <View className='order-filter'>
            {ORDER_STATUS_OPTIONS.map((option) => (
              <View
                className={
                  option.value === orderStatus
                    ? 'order-filter__chip order-filter__chip--active'
                    : 'order-filter__chip'
                }
                key={option.value || 'all'}
                onClick={() => handleChangeStatus(option.value)}
              >
                <Text
                  className={
                    option.value === orderStatus
                      ? 'order-filter__chip-text order-filter__chip-text--active'
                      : 'order-filter__chip-text'
                  }
                >
                  {option.label}
                </Text>
              </View>
            ))}
          </View>
          <Text className='order-filter-panel__label'>付款</Text>
          <View className='order-filter'>
            {ORDER_PAYMENT_OPTIONS.map((option) => (
              <View
                className={
                  option.value === paymentType
                    ? 'order-filter__chip order-filter__chip--active'
                    : 'order-filter__chip'
                }
                key={option.value || 'all'}
                onClick={() => handleChangePayment(option.value)}
              >
                <Text
                  className={
                    option.value === paymentType
                      ? 'order-filter__chip-text order-filter__chip-text--active'
                      : 'order-filter__chip-text'
                  }
                >
                  {option.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className='order-list-summary'>
          <Text className='order-list-summary__title'>
            {getDateRangeTitle(rangeDays)}
          </Text>
          <View className='order-list-summary__side'>
            <Text className='order-list-summary__count'>共 {totalRows} 单</Text>
            <View
              className='order-list-summary__pay'
              onClick={handleOpenPaymentList}
            >
              <Text className='order-list-summary__pay-text'>待支付</Text>
            </View>
          </View>
        </View>

        <View className='order-list-content'>
          {orders.map((order) => (
            <View
              className='order-card'
              key={`${order.role}-${order.orderNumber}-${order.waybillNumber}`}
            >
              <View
                className='order-card__body'
                onClick={() => handleOpenDetail(order)}
              >
                <View className='order-card__top'>
                  <Text className='order-card__status'>{order.orderClassName}</Text>
                  <Text className='order-card__time'>
                    {order.orderTime || '暂无时间'}
                  </Text>
                </View>

                <View className='order-card__route'>
                  <View className='order-card__city-block'>
                    <Text className='order-card__city'>
                      {order.senderCity || '--'}
                    </Text>
                    <Text className='order-card__name'>
                      {order.senderName || '--'}
                    </Text>
                  </View>
                  <Text className='order-card__arrow'>→</Text>
                  <View className='order-card__city-block order-card__city-block--right'>
                    <Text className='order-card__city'>
                      {order.consigneeCity || '--'}
                    </Text>
                    <Text className='order-card__name'>
                      {order.consigneeName || '--'}
                    </Text>
                  </View>
                </View>

                <View className='order-card__meta'>
                  <Text className='order-card__number'>
                    {order.waybillNumber
                      ? `运单 ${order.waybillNumber}`
                      : `订单 ${order.orderNumber}`}
                  </Text>
                  {order.orderPrice > 0 && (
                    <Text className='order-card__price'>¥{order.orderPrice}</Text>
                  )}
                </View>
              </View>

              {(canCancelOrder(order) ||
                canDeleteOrder(order) ||
                canResendOrder(order)) && (
                <View className='order-card__actions'>
                  <View
                    className='order-card__outline-button'
                    onClick={() => handleOpenDetail(order)}
                  >
                    <Text className='order-card__outline-button-text'>
                      查看详情
                    </Text>
                  </View>
                  {canCancelOrder(order) && (
                    <View
                      className='order-card__danger-button'
                      onClick={() => handleCancelOrder(order)}
                    >
                      <Text className='order-card__danger-button-text'>
                        取消订单
                      </Text>
                    </View>
                  )}
                  {canResendOrder(order) && (
                    <View
                      className='order-card__outline-button'
                      onClick={() => handleResendOrder(order)}
                    >
                      <Text className='order-card__outline-button-text'>
                        {resendingOrderKey === getOrderActionKey(order)
                          ? '带入中'
                          : getResendActionText(order)}
                      </Text>
                    </View>
                  )}
                  {canDeleteOrder(order) && (
                    <View
                      className='order-card__danger-button'
                      onClick={() => handleDeleteOrder(order)}
                    >
                      <Text className='order-card__danger-button-text'>
                        {deletingOrderKey === getOrderActionKey(order)
                          ? '删除中'
                          : '删除'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}

          {!orders.length && !loading && (
            <View className='order-empty'>
              <Text className='order-empty__title'>
                {errorMessage || '暂无订单'}
              </Text>
              <Text className='order-empty__summary'>
                可尝试切换寄件/收件，或用订单号、运单号搜索。
              </Text>
            </View>
          )}

          {loading && (
            <Text className='order-loading'>
              {orders.length ? '加载更多订单...' : '正在加载订单...'}
            </Text>
          )}
        </View>
      </ScrollView>
      <AppTabBar active='orderList' />
    </>
  )
}

export default OrderListPage
