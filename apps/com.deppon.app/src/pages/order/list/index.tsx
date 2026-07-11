import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useRef, useState } from 'react'

import { OrderListContent } from './components/OrderListCards'
import {
  OrderFilterPanel,
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
import { LatestRequestCoordinator } from '../../../shared/async/latestRequest'
import { AppIcon } from '../../../shared/components/AppIcon'
import AppTabBar from '../../../shared/components/AppTabBar'
import { AppSafeAreaView, AppStatusBar } from '../../../shared/native'
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

function canModifyOrder(order: OrderListItem) {
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
  const [rangeDays, setRangeDays] = useState<OrderDateRangeDays>(90)
  const [orderStatus, setOrderStatus] = useState<OrderStatusFilter>('')
  const [paymentType, setPaymentType] = useState<OrderPaymentFilter>('')
  const [keyword, setKeyword] = useState('')
  const [filterVisible, setFilterVisible] = useState(false)
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [pageIndex, setPageIndex] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)
  const [deletingOrderKey, setDeletingOrderKey] = useState('')
  const [resendingOrderKey, setResendingOrderKey] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const requestCoordinator = useRef(new LatestRequestCoordinator()).current
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

  const handleOpenSubscriptions = () => {
    navigateToAppRoute(APP_ROUTES.orderSubscriptions, {
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
    navigateToAppRoute(getRouteToDetail(order), { login: true })
  }

  const handleCancelOrder = (order: OrderListItem) => {
    if (!canCancelOrder(order)) {
      return
    }

    navigateToAppRoute(
      createAppRouteUrl(APP_ROUTES.orderCancel, {
        orderNumber: order.orderNumber,
        source: 'list'
      }),
      { login: true }
    )
  }

  const handleModifyOrder = (order: OrderListItem) => {
    if (!canModifyOrder(order)) {
      return
    }

    navigateToAppRoute(
      createAppRouteUrl(APP_ROUTES.orderEdit, {
        orderNumber: order.orderNumber,
        source: 'ORDER_LIST'
      }),
      {
        login: true
      }
    )
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
        setOrders(current =>
          current.filter(item => getOrderActionKey(item) !== orderKey)
        )
        setTotalRows(current => Math.max(0, current - 1))
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
        createExpressDraftFromOrderDetail(response.result, getResendMode(order))
      )
      navigateToAppRoute(APP_ROUTES.express, {
        replace: true
      })
    } finally {
      setResendingOrderKey('')
    }
  }

  return (
    <AppSafeAreaView backgroundColor='#f4f7fb' edges={[]}>
      <AppStatusBar />
      <AppSafeAreaView backgroundColor='#eef6ff' edges={['top']} fill={false}>
        <OrderRoleTabs
          role={role}
          onChange={handleChangeRole}
          onOpenPayment={handleOpenPaymentList}
          onOpenSubscriptions={handleOpenSubscriptions}
        />
        <OrderSearchBar
          filterVisible={filterVisible}
          keyword={keyword}
          onKeywordChange={setKeyword}
          onSearch={handleSearch}
          onToggleFilter={() => setFilterVisible(current => !current)}
        />
      </AppSafeAreaView>
      {filterVisible && (
        <OrderFilterPanel
          orderStatus={orderStatus}
          paymentType={paymentType}
          rangeDays={rangeDays}
          onPaymentChange={handleChangePayment}
          onRangeChange={handleChangeRange}
          onStatusChange={handleChangeStatus}
        />
      )}
      <ScrollView
        className='order-list-page'
        onScrollToLower={handleLoadMore}
        scrollY
      >
        {(orders.length > 0 || loading) && (
          <OrderListSummary
            rangeDays={rangeDays}
            totalRows={totalRows}
            onOpenPaymentList={handleOpenPaymentList}
            onOpenSubscriptions={handleOpenSubscriptions}
          />
        )}
        <OrderListContent
          canCancelOrder={canCancelOrder}
          canDeleteOrder={canDeleteOrder}
          canModifyOrder={canModifyOrder}
          canResendOrder={canResendOrder}
          deletingOrderKey={deletingOrderKey}
          emptyTitle={
            role === 'sender'
              ? '近三个月没有我寄的快递'
              : '近三个月没有我收的快递'
          }
          errorMessage={errorMessage}
          getOrderActionKey={getOrderActionKey}
          getResendActionText={getResendActionText}
          loading={loading}
          orders={orders}
          resendingOrderKey={resendingOrderKey}
          onCancelOrder={handleCancelOrder}
          onDeleteOrder={handleDeleteOrder}
          onModifyOrder={handleModifyOrder}
          onOpenDetail={handleOpenDetail}
          onResendOrder={handleResendOrder}
        />
      </ScrollView>
      <View
        className='order-support-float'
        onClick={() => navigateToAppRoute(APP_ROUTES.supportCenter)}
      >
        <AppIcon
          color='#16181a'
          name='headphones'
          size={34}
          strokeWidth={2.1}
        />
        <Text className='order-support-float__text'>客服中心</Text>
      </View>
      <AppTabBar active='orderList' />
    </AppSafeAreaView>
  )
}

export default OrderListPage
