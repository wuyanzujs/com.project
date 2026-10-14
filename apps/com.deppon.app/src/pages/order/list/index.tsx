import { ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useState } from 'react'

import { expressDraftBridge } from '@/services/express'
import { canDeleteOrder, createExpressDraftFromOrderDetail, orderService } from '@/services/order'
import type { OrderListItem, OrderPaymentFilter, OrderResendMode, OrderRole, OrderStatusFilter } from '@/services/order'
import { AppPage } from '@/shared/components'
import AppTabBar from '@/shared/components/AppTabBar'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { ensureAuthenticated } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'

import { OrderListContent } from './components/OrderListCards'
import { OrderFilterPanel, OrderListSummary, OrderRoleTabs, OrderSearchBar } from './components/OrderListSections'
import { OrderSupportFloat } from './components/OrderSupportFloat'
import { useOrderListData } from './hooks/useOrderListData'

import type { OrderDateRangeDays } from './components/OrderListSections'

import './index.scss'

function getRouteToDetail(order: OrderListItem) {
  return createAppRouteUrl(APP_ROUTES.orderDetail, {
    orderNumber: order.orderNumber,
    waybillNumber: order.waybillNumber,
    role: order.role
  })
}

function canCancelOrder(order: OrderListItem) {
  return order.role === 'sender' && order.orderClass === 0 && order.isAllowCancel && !!order.orderNumber
}

function canModifyOrder(order: OrderListItem) {
  return order.role === 'sender' && order.orderClass === 0 && order.isAllowCancel && !!order.orderNumber
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
  const [deletingOrderKey, setDeletingOrderKey] = useState('')
  const [resendingOrderKey, setResendingOrderKey] = useState('')
  const ensureOrderListAccess = useCallback(
    () =>
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.orderList,
        replace: true
      }),
    []
  )

  const listData = useOrderListData({
    role,
    keyword,
    orderStatus,
    paymentType,
    rangeDays
  })

  useDidShow(() => {
    if (ensureOrderListAccess()) {
      listData.loadOrders(1)
    }
  })

  const handleChangeRole = (nextRole: OrderRole) => {
    if (!ensureOrderListAccess()) {
      return
    }

    setRole(nextRole)
    listData.resetOrders()
    listData.loadOrders(1, nextRole, keyword, orderStatus, paymentType, rangeDays)
  }

  const handleChangeRange = (nextRangeDays: OrderDateRangeDays) => {
    if (!ensureOrderListAccess()) {
      return
    }

    setRangeDays(nextRangeDays)
    listData.resetOrders()
    listData.loadOrders(1, role, keyword, orderStatus, paymentType, nextRangeDays)
  }

  const handleChangeStatus = (nextStatus: OrderStatusFilter) => {
    if (!ensureOrderListAccess()) {
      return
    }

    setOrderStatus(nextStatus)
    listData.resetOrders()
    listData.loadOrders(1, role, keyword, nextStatus, paymentType, rangeDays)
  }

  const handleChangePayment = (nextPaymentType: OrderPaymentFilter) => {
    if (!ensureOrderListAccess()) {
      return
    }

    setPaymentType(nextPaymentType)
    listData.resetOrders()
    listData.loadOrders(1, role, keyword, orderStatus, nextPaymentType, rangeDays)
  }

  const handleSearch = () => {
    if (!ensureOrderListAccess()) {
      return
    }

    listData.resetOrders()
    listData.loadOrders(1, role, keyword, orderStatus, paymentType, rangeDays)
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

    if (listData.loading || listData.pageIndex >= listData.totalPage) {
      return
    }

    listData.loadOrders(listData.pageIndex + 1)
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
        title: response.status ? '删除成功' : response.message || '删除失败，请稍后重试',
        icon: 'none'
      })

      if (response.status) {
        listData.removeOrder(item => getOrderActionKey(item) === orderKey)
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

      expressDraftBridge.carryFromOrderResend(createExpressDraftFromOrderDetail(response.result, getResendMode(order)))
      navigateToAppRoute(APP_ROUTES.express, {
        replace: true
      })
    } finally {
      setResendingOrderKey('')
    }
  }

  return (
    <AppPage className='order-list-shell' footer={<AppTabBar active='orderList' />} safeArea='top' statusBar='dark'>
      <>
        <OrderRoleTabs role={role} onChange={handleChangeRole} onOpenPayment={handleOpenPaymentList} onOpenSubscriptions={handleOpenSubscriptions} />
        <OrderSearchBar
          filterVisible={filterVisible}
          keyword={keyword}
          onKeywordChange={setKeyword}
          onSearch={handleSearch}
          onToggleFilter={() => setFilterVisible(current => !current)}
        />
      </>
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
      <ScrollView className='order-list-page' onScrollToLower={handleLoadMore} scrollY>
        {(listData.orders.length > 0 || listData.loading) && (
          <OrderListSummary
            rangeDays={rangeDays}
            totalRows={listData.totalRows}
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
          emptyTitle={role === 'sender' ? '近三个月没有我寄的快递' : '近三个月没有我收的快递'}
          errorMessage={listData.errorMessage}
          getOrderActionKey={getOrderActionKey}
          getResendActionText={getResendActionText}
          loading={listData.loading}
          orders={listData.orders}
          resendingOrderKey={resendingOrderKey}
          onCancelOrder={handleCancelOrder}
          onDeleteOrder={handleDeleteOrder}
          onModifyOrder={handleModifyOrder}
          onOpenDetail={handleOpenDetail}
          onResendOrder={handleResendOrder}
        />
      </ScrollView>
      <OrderSupportFloat onPress={() => navigateToAppRoute(APP_ROUTES.supportCenter)} />
    </AppPage>
  )
}

export default OrderListPage
