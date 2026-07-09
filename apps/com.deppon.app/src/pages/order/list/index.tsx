import { ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useState } from 'react'

import { OrderListContent } from './components/OrderListCards'
import {
  OrderFilterPanel,
  OrderListHeader,
  OrderListSummary,
  OrderRoleTabs,
  OrderSearchBar
} from './components/OrderListSections'
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
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'

import type { OrderDateRangeDays } from './components/OrderListSections'
import type {
  OrderListItem,
  OrderPaymentFilter,
  OrderResendMode,
  OrderRole,
  OrderStatusFilter
} from '../../../services/order'

import './index.scss'

const PAGE_SIZE = 10

function getRouteToDetail(order: OrderListItem) {
  return createAppRouteUrl(APP_ROUTES.orderDetail, {
    orderNumber: order.orderNumber,
    waybillNumber: order.waybillNumber,
    role: order.role
  })
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
      url: createAppRouteUrl(APP_ROUTES.orderCancel, {
        orderNumber: order.orderNumber,
        source: 'list'
      })
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
        <OrderListHeader />
        <OrderRoleTabs role={role} onChange={handleChangeRole} />
        <OrderSearchBar
          keyword={keyword}
          onKeywordChange={setKeyword}
          onSearch={handleSearch}
        />
        <OrderFilterPanel
          orderStatus={orderStatus}
          paymentType={paymentType}
          rangeDays={rangeDays}
          onPaymentChange={handleChangePayment}
          onRangeChange={handleChangeRange}
          onStatusChange={handleChangeStatus}
        />
        <OrderListSummary
          rangeDays={rangeDays}
          totalRows={totalRows}
          onOpenPaymentList={handleOpenPaymentList}
        />
        <OrderListContent
          canCancelOrder={canCancelOrder}
          canDeleteOrder={canDeleteOrder}
          canResendOrder={canResendOrder}
          deletingOrderKey={deletingOrderKey}
          errorMessage={errorMessage}
          getOrderActionKey={getOrderActionKey}
          getResendActionText={getResendActionText}
          loading={loading}
          orders={orders}
          resendingOrderKey={resendingOrderKey}
          onCancelOrder={handleCancelOrder}
          onDeleteOrder={handleDeleteOrder}
          onOpenDetail={handleOpenDetail}
          onResendOrder={handleResendOrder}
        />
      </ScrollView>
      <AppTabBar active='orderList' />
    </>
  )
}

export default OrderListPage
