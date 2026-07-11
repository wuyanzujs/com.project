import { ScrollView } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useMemo, useState } from 'react'

import {
  OrderDetailFooterActions,
  OrderPickupSchedulePanel,
  OrderServiceActions,
  OrderUrgePanel
} from './components/OrderDetailActionSections'
import {
  OrderAddressSection,
  OrderDetailEmpty,
  OrderDetailHeader,
  OrderDetailLoading,
  OrderPaymentAlert,
  OrderPublicTrackActions,
  OrderStubEntryCard,
  OrderTrackSection,
  OrderTransportSection
} from './components/OrderDetailSections'
import { useOrderPickupSchedule } from './hooks/useOrderPickupSchedule'
import { useOrderSubscription } from './hooks/useOrderSubscription'
import { expressDraftBridge } from '../../../services/express'
import {
  canDeleteOrder,
  createExpressDraftFromOrderDetail,
  getOrderCopyNumber,
  getOrderIdentityText,
  orderService
} from '../../../services/order'
import { paymentService } from '../../../services/payment'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'
import { getNativeCapabilityErrorMessage } from '../../../shared/platform/capabilities'
import { copyTextToClipboard } from '../../../shared/platform/clipboard'
import { payWithApp } from '../../../shared/platform/payment'
import { PhoneNumberError, dialPhone } from '../../../shared/platform/phone'
import { createAppWebUrl } from '../../../shared/webview/appWeb'

import type { OrderDetailUrgePanelState } from './components/OrderDetailActionSections'
import type {
  OrderDetail,
  OrderDetailActionView,
  OrderUrgeButtonRaw,
  OrderResendMode,
  OrderRole,
  OrderStubEntryView,
  WaybillTrackItem
} from '../../../services/order'
import type { PaymentSummary } from '../../../services/payment'

import './index.scss'

type OrderDetailViewMode = 'public' | 'secure'

interface OrderDetailRouteParams {
  orderNumber: string
  waybillNumber: string
  role: string
  source: string
  view: OrderDetailViewMode
}

function getViewMode(value?: string): OrderDetailViewMode {
  return value === 'secure' ? 'secure' : 'public'
}

function getRouteParams(
  params: Record<string, string | undefined>
): OrderDetailRouteParams {
  return {
    orderNumber: params.orderNumber || params.orderNo || '',
    waybillNumber: params.waybillNumber || params.waybillNo || '',
    role: params.role || '',
    source: params.source || '',
    view: getViewMode(params.view)
  }
}

function isPublicTrackMode(params: OrderDetailRouteParams) {
  return (
    params.view !== 'secure' &&
    !!params.waybillNumber &&
    !params.orderNumber &&
    !params.role
  )
}

function canCancelOrder(detail: OrderDetail | null, publicTrackMode: boolean) {
  if (!detail || publicTrackMode || !detail.orderNumber) {
    return false
  }

  const orderClass = Number(detail.orderClassification)

  return orderClass === 0 && detail.modifyFlag !== false
}

function canDeleteDetail(detail: OrderDetail | null, publicTrackMode: boolean) {
  return !publicTrackMode && !!detail && canDeleteOrder(detail)
}

function getDetailRole(detail: OrderDetail, routeRole: string): OrderRole {
  if (routeRole === 'receive') {
    return 'receive'
  }

  if (routeRole === 'sender') {
    return 'sender'
  }

  return detail.isReceiver === 'Y' && detail.isSender !== 'Y'
    ? 'receive'
    : 'sender'
}

function getResendMode(role: OrderRole): OrderResendMode {
  return role === 'receive' ? 'return' : 'repeat'
}

function getResendActionText(role: OrderRole) {
  return role === 'receive' ? '一键回寄' : '再来一单'
}

function getOrderDetailUrl(
  params: OrderDetailRouteParams,
  view: OrderDetailViewMode = params.view
) {
  return createAppRouteUrl(APP_ROUTES.orderDetail, {
    orderNumber: params.orderNumber,
    waybillNumber: params.waybillNumber,
    role: params.role,
    source: params.source,
    view
  })
}

const OrderDetailPage = () => {
  const router = useRouter()
  const routeParams = useMemo(
    () => getRouteParams(router.params as Record<string, string | undefined>),
    [router.params]
  )
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [tracks, setTracks] = useState<WaybillTrackItem[]>([])
  const [trackState, setTrackState] = useState('')
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [paying, setPaying] = useState(false)
  const [notifyingDeliver, setNotifyingDeliver] = useState(false)
  const [invalidingWaybill, setInvalidingWaybill] = useState(false)
  const [urgeLoading, setUrgeLoading] = useState(false)
  const [urging, setUrging] = useState(false)
  const [urgeAction, setUrgeAction] = useState<OrderDetailActionView | null>(
    null
  )
  const [urgePanel, setUrgePanel] = useState<OrderDetailUrgePanelState | null>(
    null
  )
  const [errorMessage, setErrorMessage] = useState('')
  const {
    action: subscriptionAction,
    loadStatus: loadSubscriptionStatus,
    reset: resetSubscription,
    toggle: toggleSubscription
  } = useOrderSubscription()
  const pickupSchedule = useOrderPickupSchedule()
  const publicTrackMode = useMemo(
    () => isPublicTrackMode(routeParams),
    [routeParams]
  )
  const cancelable = canCancelOrder(detail, publicTrackMode)
  const deletable = canDeleteDetail(detail, publicTrackMode)
  const detailRole = detail ? getDetailRole(detail, routeParams.role) : 'sender'
  const resendActionText = getResendActionText(detailRole)
  const stubEntry = useMemo<OrderStubEntryView | null>(() => {
    if (!detail) {
      return null
    }

    return orderService.getStubEntry(detail, {
      publicTrackMode,
      role: detailRole
    })
  }, [detail, detailRole, publicTrackMode])
  const detailActions = useMemo(() => {
    if (!detail) {
      return []
    }

    const actions = orderService.getDetailActions(detail, {
      publicTrackMode,
      role: detailRole
    })
    const orderActions = pickupSchedule.loading
      ? actions.map(action =>
          action.target === 'pickupSchedule'
            ? {
                ...action,
                title: '正在获取时间',
                summary: '正在查询当前地址可预约的上门时段'
              }
            : action
        )
      : actions
    const visibleActions = subscriptionAction
      ? [subscriptionAction, ...orderActions]
      : orderActions

    if (!urgeAction) {
      return visibleActions
    }

    const [firstAction, ...restActions] = visibleActions

    return firstAction
      ? [firstAction, urgeAction, ...restActions]
      : [urgeAction]
  }, [
    detail,
    detailRole,
    pickupSchedule.loading,
    publicTrackMode,
    subscriptionAction,
    urgeAction
  ])

  const loadDetail = async () => {
    if (!publicTrackMode) {
      const redirectUrl = getOrderDetailUrl(routeParams, 'secure')

      if (!ensureAuthenticated({ redirectUrl, replace: true })) {
        return
      }
    }

    setLoading(true)
    setErrorMessage('')
    setPaymentSummary(null)
    resetSubscription()
    pickupSchedule.reset()
    setUrgeAction(null)
    setUrgePanel(null)

    try {
      if (publicTrackMode) {
        setDetail(null)

        const trackResponse = await orderService.queryTrackList(
          routeParams.waybillNumber,
          {
            login: false
          }
        )

        if (!trackResponse.status || !trackResponse.result) {
          setTracks([])
          setTrackState('')
          setErrorMessage(trackResponse.message || '暂未查询到物流轨迹')
          return
        }

        setTrackState(trackResponse.result.billNoState || '')
        setTracks(trackResponse.result.tracks ?? [])
        return
      }

      const response = await orderService.queryDetail(routeParams)

      if (!response.status || !response.result) {
        setDetail(null)
        setTracks([])
        setErrorMessage(response.message || '暂未获取到订单详情')
        return
      }

      const nextDetail = response.result
      const waybillNumber =
        nextDetail.waybillNumber || routeParams.waybillNumber

      setDetail(nextDetail)

      const nextRole = getDetailRole(nextDetail, routeParams.role)
      const [trackResponse, paymentResponse, nextUrgeAction] =
        await Promise.all([
          orderService.queryTrackList(waybillNumber, {
            login: false
          }),
          paymentService.queryUnpaidByWaybill({
            role: nextRole,
            waybillNumber,
            loading: false
          }),
          orderService.queryUrgeAction(nextDetail, {
            publicTrackMode: false,
            role: nextRole
          }),
          loadSubscriptionStatus(waybillNumber)
        ])

      if (trackResponse.status && trackResponse.result) {
        setTrackState(trackResponse.result.billNoState || '')
        setTracks(trackResponse.result.tracks ?? [])
      } else {
        setTrackState('')
        setTracks([])
      }

      if (paymentResponse.status && paymentResponse.result?.count) {
        setPaymentSummary(paymentResponse.result)
      }

      setUrgeAction(nextUrgeAction)
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadDetail()
  })

  const handleRefresh = () => {
    loadDetail()
  }

  const handleBackToList = () => {
    navigateToAppRoute(publicTrackMode ? APP_ROUTES.home : APP_ROUTES.orderList)
  }

  const handleCopyNumber = async () => {
    const value = getOrderCopyNumber(detail || routeParams)

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
    if (!stubEntry?.available || !stubEntry.route) {
      Taro.showToast({
        title: stubEntry?.disabledReason || '暂无法查看电子存根',
        icon: 'none'
      })
      return
    }

    navigateToAppRoute(stubEntry.route, {
      login: true
    })
  }

  const handleOpenSecureDetail = () => {
    const url = getOrderDetailUrl(routeParams, 'secure')

    navigateToAppRoute(url, { login: true })
  }

  const handleDial = async (phoneNumber?: string | null) => {
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
    if (!detail?.orderNumber) {
      return
    }

    navigateToAppRoute(
      createAppRouteUrl(APP_ROUTES.orderCancel, {
        orderNumber: detail.orderNumber,
        source: 'detail'
      }),
      { login: true }
    )
  }

  const handleDeleteOrder = async () => {
    if (!detail || deleting || !deletable) {
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
        role: getDetailRole(detail, routeParams.role),
        orderNumber: detail.orderNumber,
        waybillNumber: detail.waybillNumber
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
    if (!detail || publicTrackMode) {
      return
    }

    expressDraftBridge.carryFromOrderResend(
      createExpressDraftFromOrderDetail(detail, getResendMode(detailRole))
    )
    navigateToAppRoute(APP_ROUTES.express, {
      replace: true
    })
  }

  const handlePayOrder = async () => {
    if (!detail || !paymentSummary || paying || !paymentSummary.canPay) {
      return
    }

    setPaying(true)

    try {
      await payWithApp({
        source: 'ORDER_DETAIL',
        channel: 'h5Cashier',
        orderNumber:
          detail.orderNumber ||
          detail.waybillNumber ||
          paymentSummary.waybillNumber,
        payload: {
          role: detailRole,
          waybillNumber: paymentSummary.waybillNumber,
          amount: paymentSummary.amount,
          items: paymentSummary.items
        }
      })

      Taro.showToast({
        title: '支付完成',
        icon: 'none'
      })
      loadDetail()
    } catch (error) {
      Taro.showToast({
        title: getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    } finally {
      setPaying(false)
    }
  }

  const handleUrgeAction = async (action: OrderDetailActionView) => {
    if (!action.urge) {
      Taro.showToast({
        title: '暂未获取到催单信息',
        icon: 'none'
      })
      return
    }

    if (action.urge.buttonCode === 'VIEW_PROGRESS') {
      if (!action.webSource || !action.webUri) {
        Taro.showToast({
          title: '暂未获取到催单进度地址',
          icon: 'none'
        })
        return
      }

      navigateToAppRoute(
        createAppWebUrl({
          source: action.webSource,
          uri: action.webUri,
          title: action.title,
          auth: true
        }),
        {
          login: true
        }
      )
      return
    }

    if (urgeLoading) {
      return
    }

    setUrgeLoading(true)

    try {
      const response = await orderService.queryUrgePanel(action.urge)

      if (!response.status || !response.result) {
        Taro.showToast({
          title: response.message || '暂未获取到催单提示',
          icon: 'none'
        })
        return
      }

      setUrgePanel({
        ...response.result,
        action
      })
    } finally {
      setUrgeLoading(false)
    }
  }

  const handleCloseUrgePanel = () => {
    if (!urging) {
      setUrgePanel(null)
    }
  }

  const handleSubmitUrge = async (action: OrderDetailActionView) => {
    if (!action.urge || urging) {
      return
    }

    setUrging(true)

    try {
      const response = await orderService.submitUrge(action.urge)

      setUrgePanel(null)
      await Taro.showModal({
        title: '催单',
        content: response.result || response.message || '催单处理完成',
        showCancel: false,
        confirmText: '知道了'
      })

      if (detail) {
        const refreshedAction = await orderService.queryUrgeAction(detail, {
          publicTrackMode,
          role: detailRole
        })

        setUrgeAction(refreshedAction)
      }
    } finally {
      setUrging(false)
    }
  }

  const handleSelectUrgeMenu = (menu: OrderUrgeButtonRaw) => {
    const action = urgePanel?.action

    if (!action) {
      setUrgePanel(null)
      return
    }

    const menuAction = orderService.resolveUrgeMenuAction(menu, action)

    if (menuAction.kind === 'close') {
      setUrgePanel(null)
      return
    }

    if (menuAction.kind === 'submit') {
      handleSubmitUrge(action)
      return
    }

    if (menuAction.kind === 'dial') {
      setUrgePanel(null)
      handleDial(menuAction.phoneNumber)
      return
    }

    if (menuAction.kind === 'progress') {
      setUrgePanel(null)
      navigateToAppRoute(
        createAppWebUrl({
          source: menuAction.webSource,
          uri: menuAction.webUri,
          title: menuAction.title,
          auth: true
        }),
        {
          login: true
        }
      )
      return
    }

    setUrgePanel(null)
    Taro.showToast({
      title: menuAction.message,
      icon: 'none'
    })
  }

  const handleNotifyDeliver = async () => {
    if (!detail || notifyingDeliver) {
      return
    }

    const confirm = await Taro.showModal({
      title: '通知派送',
      content: '您的快件到达营业部后，是否需要为您安排派送？',
      cancelText: '暂不处理',
      confirmText: '为我派送'
    })

    if (!confirm.confirm) {
      return
    }

    setNotifyingDeliver(true)

    try {
      const response = await orderService.notifyDeliver(detail)

      Taro.showToast({
        title: response.status
          ? '已通知派送'
          : response.message || '通知失败，请稍后再试',
        icon: 'none'
      })

      if (response.status) {
        loadDetail()
      }
    } finally {
      setNotifyingDeliver(false)
    }
  }

  const handleInvalidWaybill = async () => {
    if (!detail || invalidingWaybill) {
      return
    }

    const confirm = await Taro.showModal({
      title: '拦截作废',
      content:
        '提交后我司核实无误会立即作废，已支付运费将按规则原路退回。如 24 小时未收到退款，请联系营业部或快递员处理。',
      cancelText: '取消',
      confirmText: '确认作废'
    })

    if (!confirm.confirm) {
      return
    }

    setInvalidingWaybill(true)

    try {
      const response = await orderService.invalidWaybill(detail)
      const result = response.result

      if (response.status) {
        Taro.showToast({
          title: result?.message || '拦截作废成功',
          icon: 'none'
        })
        loadDetail()
        return
      }

      if (result?.shouldModifyIntercept && result.modifyWebUri) {
        const redirect = await Taro.showModal({
          title: '拦截作废',
          content: result.message,
          cancelText: '取消',
          confirmText: '去拦截'
        })

        if (redirect.confirm) {
          navigateToAppRoute(
            createAppWebUrl({
              source: 'ORDER_DETAIL_WAYBILL_MODIFY',
              uri: result.modifyWebUri,
              title: '修改运单',
              auth: true
            }),
            {
              login: true
            }
          )
        }
        return
      }

      await Taro.showModal({
        title: '拦截作废',
        content:
          result?.message || response.message || '拦截作废失败，请稍后再试',
        showCancel: false,
        confirmText: '知道了'
      })
    } finally {
      setInvalidingWaybill(false)
    }
  }

  const handleDepartmentPhone = async (action: OrderDetailActionView) => {
    if (!action.departmentPhone) {
      Taro.showToast({
        title: '暂未获取到营业部联系方式',
        icon: 'none'
      })
      return
    }

    const response = await orderService.resolveDepartmentPhone(
      action.departmentPhone
    )

    if (response.message && response.result === '95353') {
      Taro.showToast({
        title: response.message,
        icon: 'none'
      })
    }

    await handleDial(response.result || '95353')
  }

  const handlePickupSchedule = async () => {
    if (!detail || pickupSchedule.loading) {
      return
    }

    const response = await pickupSchedule.open(detail, {
      publicTrackMode,
      role: detailRole
    })

    if (response && (!response.status || !response.result)) {
      Taro.showToast({
        title: response.message || '暂未获取到可预约时间',
        icon: 'none'
      })
    }
  }

  const handleConfirmPickupSchedule = async () => {
    if (!pickupSchedule.selectedTime || pickupSchedule.submitting) {
      return
    }

    const response = await pickupSchedule.submit()

    if (!response) {
      return
    }

    if (!response.status) {
      Taro.showToast({
        title: response.message || '修改上门时间失败',
        icon: 'none'
      })
      return
    }

    Taro.showToast({
      title: '修改上门时间成功',
      icon: 'none'
    })
    await loadDetail()
  }

  const handleDetailAction = (action: OrderDetailActionView) => {
    if (action.target === 'subscription') {
      toggleSubscription(detail?.waybillNumber)
      return
    }

    if (action.target === 'urge') {
      handleUrgeAction(action)
      return
    }

    if (action.target === 'pickupSchedule') {
      handlePickupSchedule()
      return
    }

    if (action.target === 'notifyDeliver') {
      handleNotifyDeliver()
      return
    }

    if (action.target === 'invalidWaybill') {
      handleInvalidWaybill()
      return
    }

    if (action.target === 'departmentPhone') {
      handleDepartmentPhone(action)
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

  return (
    <ScrollView className='order-detail-page' scrollY>
      <OrderDetailHeader
        title={
          detail?.orderClassName ||
          trackState ||
          (publicTrackMode ? '物流轨迹' : '订单详情')
        }
        identityText={
          detail
            ? getOrderIdentityText(detail)
            : getOrderIdentityText(routeParams)
        }
        onCopy={handleCopyNumber}
      />

      {!detail && !publicTrackMode && !loading && (
        <OrderDetailEmpty
          title={errorMessage || '未查询到订单'}
          buttonText='返回订单列表'
          onClick={handleBackToList}
        />
      )}

      {!detail && publicTrackMode && !loading && !tracks.length && (
        <OrderDetailEmpty
          title={errorMessage || '未查询到物流轨迹'}
          buttonText='返回首页'
          onClick={handleBackToList}
        />
      )}

      {loading && !detail && (
        <OrderDetailLoading publicTrackMode={publicTrackMode} />
      )}

      {!detail && publicTrackMode && tracks.length > 0 && (
        <>
          <OrderTrackSection
            tracks={tracks}
            hintText={trackState || '公开查询'}
          />
          <OrderPublicTrackActions
            onRefresh={handleRefresh}
            onOpenSecureDetail={handleOpenSecureDetail}
          />
        </>
      )}

      {detail && (
        <>
          <OrderPaymentAlert
            summary={paymentSummary}
            paying={paying}
            onPay={handlePayOrder}
          />
          <OrderStubEntryCard entry={stubEntry} onOpen={handleOpenStub} />
          <OrderTransportSection detail={detail} onDial={handleDial} />
          <OrderAddressSection detail={detail} onDial={handleDial} />
          <OrderServiceActions
            actions={detailActions}
            onAction={handleDetailAction}
          />
          <OrderTrackSection
            tracks={tracks}
            hintText={trackState || '基础轨迹'}
            emptyText='暂无物流轨迹，请稍后再试。'
          />
          <OrderDetailFooterActions
            resendActionText={resendActionText}
            cancelable={cancelable}
            deletable={deletable}
            deleting={deleting}
            onRefresh={handleRefresh}
            onResend={handleResendOrder}
            onCancel={handleCancelOrder}
            onDelete={handleDeleteOrder}
            onBackToList={handleBackToList}
          />
        </>
      )}

      <OrderUrgePanel
        panel={urgePanel}
        urging={urging}
        onSelect={handleSelectUrgeMenu}
        onClose={handleCloseUrgePanel}
      />
      <OrderPickupSchedulePanel
        schedule={pickupSchedule.schedule}
        selectedDate={pickupSchedule.selectedDate}
        selectedTime={pickupSchedule.selectedTime}
        submitting={pickupSchedule.submitting}
        onClose={pickupSchedule.close}
        onConfirm={handleConfirmPickupSchedule}
        onSelectDate={pickupSchedule.selectDate}
        onSelectTime={pickupSchedule.selectTime}
      />
    </ScrollView>
  )
}

export default OrderDetailPage
