import { View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useState } from 'react'

import { getCurrentUser } from '@/services/auth'
import { expressDraftBridge } from '@/services/express'
import {
  canCancelOrder,
  canDeleteOrder,
  canModifyOrder,
  createExpressDraftFromOrderDetail,
  getOrderResendActionText,
  getOrderResendMode,
  orderService
} from '@/services/order'
import type { OrderListItem, OrderPaymentFilter, OrderRole, OrderStatusFilter } from '@/services/order'
import { AppPage, AppSupportFloat } from '@/shared/components'
import AppTabBar from '@/shared/components/AppTabBar'
import { AppVirtualList } from '@/shared/native'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { ensureAuthenticated } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { appendRouteQuery, createAppRouteUrl } from '@/shared/navigation/routeUrl'
import { shareWithApp } from '@/shared/platform/share'
import { createAppWebUrl } from '@/shared/webview/appWeb'

import { OrderCard, OrderListFooter } from './components/OrderListCards'
import { OrderFilterPanel, OrderRoleTabs, OrderSearchBar } from './components/OrderListSections'
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

function getOrderActionKey(order: OrderListItem) {
  return `${order.role}-${order.orderNumber}-${order.waybillNumber}`
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

  const handleShare = () => {
    shareWithApp({
      source: 'ORDER_LIST',
      title: '德邦快递',
      description: '我的德邦快递订单'
    }).catch(() => undefined)
  }

  const handleEvaluateOrder = (order: OrderListItem) => {
    const scene = order.orderClass === 0 || order.orderClass === 3 ? 'S0206' : 'S0601'
    const rowData = encodeURIComponent(
      JSON.stringify([
        {
          field: 'orderNumber',
          data: order.orderNumber
        },
        {
          field: 'waybillNumber',
          data: order.waybillNumber
        }
      ])
    )
    const uri = appendRouteQuery('/depponmobile/survey/land', {
      scene,
      channel: 'OWS',
      mobile: getCurrentUser()?.mobile || '',
      rowData
    })

    navigateToAppRoute(createAppWebUrl({ source: 'ORDER_DETAIL_EVALUATE', title: '服务评价', uri }), { login: true })
  }

  const handleNotifyOrder = async (order: OrderListItem) => {
    if (!order.waybillNumber) {
      return
    }

    const confirmResult = await Taro.showModal({
      title: '通知收件人',
      content: '是否通知收件人安排派送？',
      confirmText: '通知',
      cancelText: '暂不通知'
    })

    if (!confirmResult.confirm) {
      return
    }

    const response = await orderService.notifyWaybill(order.waybillNumber)

    Taro.showToast({
      title: response.status ? '已通知' : response.message || '通知失败，请稍后再试',
      icon: 'none'
    })
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
    if (!canDeleteOrder(order) || resendingOrderKey) {
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

      expressDraftBridge.carryFromOrderResend(createExpressDraftFromOrderDetail(response.result, getOrderResendMode(order.role)))
      navigateToAppRoute(APP_ROUTES.express, {
        replace: true
      })
    } finally {
      setResendingOrderKey('')
    }
  }

  return (
    <AppPage className='order-list-shell' footer={<AppTabBar active='orderList' />} safeArea='top' statusBar='dark'>
      <View className='order-list-page'>
        <OrderRoleTabs
          activeCount={listData.totalRows}
          role={role}
          onChange={handleChangeRole}
          onOpenPayment={handleOpenPaymentList}
          onOpenSubscriptions={handleOpenSubscriptions}
          onShare={handleShare}
        />
        <OrderSearchBar
          filterVisible={filterVisible}
          keyword={keyword}
          onKeywordChange={setKeyword}
          onSearch={handleSearch}
          onToggleFilter={() => setFilterVisible(current => !current)}
        />
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
        <AppVirtualList
          extraData={`${role}|${deletingOrderKey}|${resendingOrderKey}`}
          footer={
            <OrderListFooter
              emptyTitle={role === 'sender' ? '近三个月没有我寄的快递' : '近三个月没有我收的快递'}
              errorMessage={listData.errorMessage}
              loading={listData.loading}
              orders={listData.orders}
            />
          }
          items={listData.orders}
          keyExtractor={getOrderActionKey}
          paddingBottom={0}
          paddingHorizontal={0}
          paddingTop={18}
          renderItem={order => (
            <View className='order-list-item'>
              <OrderCard
                deletingOrderKey={deletingOrderKey}
                getOrderActionKey={getOrderActionKey}
                getResendActionText={getOrderResendActionText}
                order={order}
                resendingOrderKey={resendingOrderKey}
                onCancelOrder={handleCancelOrder}
                onDeleteOrder={handleDeleteOrder}
                onEvaluateOrder={handleEvaluateOrder}
                onModifyOrder={handleModifyOrder}
                onNotifyOrder={handleNotifyOrder}
                onOpenDetail={handleOpenDetail}
                onResendOrder={handleResendOrder}
              />
            </View>
          )}
          onEndReached={handleLoadMore}
        />
      </View>
      <AppSupportFloat onPress={() => navigateToAppRoute(APP_ROUTES.supportCenter)} />
    </AppPage>
  )
}

export default OrderListPage
