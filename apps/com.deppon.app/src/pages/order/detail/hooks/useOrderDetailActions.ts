import Taro from '@tarojs/taro'

import { useState } from 'react'

import { useOrderDetailServiceActions } from './useOrderDetailServiceActions'
import { expressDraftBridge } from '../../../../services/express'
import {
  createExpressDraftFromOrderDetail,
  getOrderCopyNumber,
  orderService
} from '../../../../services/order'
import { createPaymentCheckoutUrl } from '../../../../services/payment'
import { navigateToAppRoute } from '../../../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../../shared/navigation/routeUrl'
import { getNativeCapabilityErrorMessage } from '../../../../shared/platform/capabilities'
import { copyTextToClipboard } from '../../../../shared/platform/clipboard'
import { PhoneNumberError, dialPhone } from '../../../../shared/platform/phone'
import { createAppWebUrl } from '../../../../shared/webview/appWeb'
import { getOrderDetailRouteUrl } from '../orderDetailViewModel'

import type { useOrderPickupSchedule } from './useOrderPickupSchedule'
import type {
  OrderDetail,
  OrderDetailActionView,
  OrderRole,
  OrderStubEntryView
} from '../../../../services/order'
import type { PaymentSummary } from '../../../../services/payment'
import type { OrderDetailUrgePanelState } from '../components/OrderUrgePanel'
import type { OrderDetailRouteParams } from '../orderDetailViewModel'

export type OrderDetailDialHandler = (
  phoneNumber?: string | null
) => Promise<void>

export type OrderPickupScheduleController = ReturnType<
  typeof useOrderPickupSchedule
>

export interface UseOrderDetailActionsOptions {
  routeParams: OrderDetailRouteParams
  detail: OrderDetail | null
  detailRole: OrderRole
  publicTrackMode: boolean
  deletable: boolean
  paymentSummary: PaymentSummary | null
  stubEntry: OrderStubEntryView | null
  urgeAction: OrderDetailActionView | null
  urgePanel: OrderDetailUrgePanelState | null
  pickupSchedule: OrderPickupScheduleController
  toggleSubscription: (waybillNumber?: string | null) => Promise<void>
  setUrgeAction: (action: OrderDetailActionView | null) => void
  setUrgePanel: (panel: OrderDetailUrgePanelState | null) => void
  loadDetail: () => Promise<void>
}

export function useOrderDetailActions(options: UseOrderDetailActionsOptions) {
  const [deleting, setDeleting] = useState(false)

  const handleRefresh = () => {
    void options.loadDetail()
  }

  const handleBackToList = () => {
    navigateToAppRoute(
      options.publicTrackMode ? APP_ROUTES.home : APP_ROUTES.orderList
    )
  }

  const handleCopyNumber = async () => {
    const value = getOrderCopyNumber(options.detail || options.routeParams)

    try {
      await copyTextToClipboard(value)
      Taro.showToast({
        title: '复制成功',
        icon: 'none'
      })
    } catch {
      Taro.showToast({
        title: value ? '复制失败，请稍后再试' : '暂无可复制单号',
        icon: 'none'
      })
    }
  }

  const handleOpenStub = () => {
    if (!options.stubEntry?.available || !options.stubEntry.route) {
      Taro.showToast({
        title: options.stubEntry?.disabledReason || '暂无法查看电子存根',
        icon: 'none'
      })
      return
    }

    navigateToAppRoute(options.stubEntry.route, {
      login: true
    })
  }

  const handleOpenSecureDetail = () => {
    const url = getOrderDetailRouteUrl(options.routeParams, 'secure')

    navigateToAppRoute(url, { login: true })
  }

  const handleDial: OrderDetailDialHandler = async phoneNumber => {
    try {
      await dialPhone(phoneNumber)
    } catch (error) {
      Taro.showToast({
        title:
          error instanceof PhoneNumberError
            ? error.message
            : getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    }
  }

  const handleCancelOrder = () => {
    if (!options.detail?.orderNumber) {
      return
    }

    navigateToAppRoute(
      createAppRouteUrl(APP_ROUTES.orderCancel, {
        orderNumber: options.detail.orderNumber,
        source: 'detail'
      }),
      { login: true }
    )
  }

  const handleDeleteOrder = async () => {
    if (!options.detail || deleting || !options.deletable) {
      return
    }

    const confirmResult = await Taro.showModal({
      title: '删除订单',
      content: '删除后将从订单列表移除该订单，确认删除吗？',
      confirmText: '确认删除',
      cancelText: '暂不删除'
    })

    if (!confirmResult.confirm) {
      return
    }

    setDeleting(true)

    try {
      const response = await orderService.deleteOrder({
        role: options.detailRole,
        orderNumber: options.detail.orderNumber,
        waybillNumber: options.detail.waybillNumber
      })

      Taro.showToast({
        title: response.status
          ? '删除成功'
          : response.message || '删除失败，请稍后重试',
        icon: 'none'
      })

      if (response.status) {
        navigateToAppRoute(APP_ROUTES.orderList)
      }
    } finally {
      setDeleting(false)
    }
  }

  const handleResendOrder = () => {
    if (!options.detail || options.publicTrackMode) {
      return
    }

    expressDraftBridge.carryFromOrderResend(
      createExpressDraftFromOrderDetail(
        options.detail,
        options.detailRole === 'receive' ? 'return' : 'repeat'
      )
    )
    navigateToAppRoute(APP_ROUTES.express, {
      replace: true
    })
  }

  const handlePayOrder = () => {
    if (
      !options.detail ||
      !options.paymentSummary ||
      !options.paymentSummary.canPay
    ) {
      return
    }

    navigateToAppRoute(
      createPaymentCheckoutUrl({
        waybillNumber: options.paymentSummary.waybillNumber,
        role: options.detailRole,
        source: 'ORDER_DETAIL'
      }),
      { login: true }
    )
  }

  const serviceActions = useOrderDetailServiceActions({
    ...options,
    handleDial
  })

  const handleDetailAction = (action: OrderDetailActionView) => {
    if (action.target === 'subscription') {
      void options.toggleSubscription(options.detail?.waybillNumber)
      return
    }

    if (action.target === 'urge') {
      void serviceActions.handleUrgeAction(action)
      return
    }

    if (action.target === 'pickupSchedule') {
      void serviceActions.handlePickupSchedule()
      return
    }

    if (action.target === 'notifyDeliver') {
      void serviceActions.handleNotifyDeliver()
      return
    }

    if (action.target === 'invalidWaybill') {
      void serviceActions.handleInvalidWaybill()
      return
    }

    if (action.target === 'departmentPhone') {
      void serviceActions.handleDepartmentPhone(action)
      return
    }

    if (action.target === 'route' && action.route) {
      navigateToAppRoute(action.route, {
        login: action.loginRequired
      })
      return
    }

    if (action.target === 'web' && action.webSource) {
      navigateToAppRoute(
        createAppWebUrl({
          source: action.webSource,
          uri: action.webUri,
          title: action.title,
          auth: action.loginRequired !== false
        }),
        {
          login: action.loginRequired
        }
      )
      return
    }

    Taro.showToast({
      title: '该服务暂不可用',
      icon: 'none'
    })
  }

  return {
    deleting,
    paying: false,
    handleRefresh,
    handleBackToList,
    handleCopyNumber,
    handleOpenStub,
    handleOpenSecureDetail,
    handleDial,
    handleCancelOrder,
    handleDeleteOrder,
    handleResendOrder,
    handlePayOrder,
    handleDetailAction,
    ...serviceActions
  }
}
