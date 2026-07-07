import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useMemo, useState } from 'react'

import { expressDraftBridge } from '../../../services/express'
import {
  canDeleteOrder,
  createExpressDraftFromOrderDetail,
  getOrderCopyNumber,
  getOrderIdentityText,
  getOrderReceiverAddress,
  getOrderSenderAddress,
  orderService
} from '../../../services/order'
import { paymentService } from '../../../services/payment'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { getNativeCapabilityErrorMessage } from '../../../shared/platform/capabilities'
import { copyTextToClipboard } from '../../../shared/platform/clipboard'
import { payWithApp } from '../../../shared/platform/payment'
import { PhoneNumberError, dialPhone } from '../../../shared/platform/phone'
import { createAppWebUrl } from '../../../shared/webview/appWeb'

import type {
  OrderDetail,
  OrderDetailActionView,
  OrderDetailUrgePanelView,
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

interface OrderUrgePanelState extends OrderDetailUrgePanelView {
  action: OrderDetailActionView
}

function createQuery(params: Record<string, string>) {
  return Object.entries(params)
    .filter(([, value]) => !!value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
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

function getDetailRole(
  detail: OrderDetail,
  routeRole: string
): OrderRole {
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
  return `${APP_ROUTES.orderDetail}?${createQuery({
    orderNumber: params.orderNumber,
    waybillNumber: params.waybillNumber,
    role: params.role,
    source: params.source,
    view
  })}`
}

function getDetailActionClassName(
  action: OrderDetailActionView,
  isFirst: boolean
) {
  return `order-service-action order-service-action--${action.tone}${
    isFirst ? ' order-service-action--first' : ''
  }`
}

function getDetailActionMarkClassName(action: OrderDetailActionView) {
  return `order-service-action__mark order-service-action__mark--${action.tone}`
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
  const [paymentSummary, setPaymentSummary] =
    useState<PaymentSummary | null>(null)
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
  const [urgePanel, setUrgePanel] = useState<OrderUrgePanelState | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const publicTrackMode = useMemo(() => isPublicTrackMode(routeParams), [
    routeParams
  ])
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

    if (!urgeAction) {
      return actions
    }

    const [firstAction, ...restActions] = actions

    return firstAction
      ? [firstAction, urgeAction, ...restActions]
      : [urgeAction]
  }, [detail, detailRole, publicTrackMode, urgeAction])

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
          })
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

    if (!ensureAuthenticated({ redirectUrl: url })) {
      return
    }

    Taro.navigateTo({
      url
    })
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

    Taro.navigateTo({
      url: `${APP_ROUTES.orderCancel}?${createQuery({
        orderNumber: detail.orderNumber,
        source: 'detail'
      })}`
    })
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

    if (menu.buttonCode === 'CONFIRM') {
      setUrgePanel(null)
      return
    }

    if (menu.buttonCode === 'FOLLOW_UP') {
      handleSubmitUrge(action)
      return
    }

    if (menu.buttonCode === 'CONTACT_EMPLOYEE') {
      setUrgePanel(null)
      handleDial(action.urge?.contactPhone || '95353')
      return
    }

    setUrgePanel(null)
    Taro.showToast({
      title: menu.buttonName || '该催单操作后续接入',
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
          result?.message ||
          response.message ||
          '拦截作废失败，请稍后再试',
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

  const handleDetailAction = (action: OrderDetailActionView) => {
    if (action.target === 'urge') {
      handleUrgeAction(action)
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
      title: '该服务后续接入',
      icon: 'none'
    })
  }

  return (
    <ScrollView className='order-detail-page' scrollY>
      <View className='order-detail-header'>
        <Text className='order-detail-header__label'>Order</Text>
        <Text className='order-detail-header__title'>
          {detail?.orderClassName ||
            trackState ||
            (publicTrackMode ? '物流轨迹' : '订单详情')}
        </Text>
        <View className='order-detail-header__summary-row'>
          <Text className='order-detail-header__summary'>
            {detail
              ? getOrderIdentityText(detail)
              : getOrderIdentityText(routeParams)}
          </Text>
          <View className='order-detail-header__copy' onClick={handleCopyNumber}>
            <Text className='order-detail-header__copy-text'>复制</Text>
          </View>
        </View>
      </View>

      {!detail && !publicTrackMode && !loading && (
        <View className='order-detail-empty'>
          <Text className='order-detail-empty__title'>
            {errorMessage || '未查询到订单'}
          </Text>
          <View className='order-detail-empty__button' onClick={handleBackToList}>
            <Text className='order-detail-empty__button-text'>返回订单列表</Text>
          </View>
        </View>
      )}

      {!detail && publicTrackMode && !loading && !tracks.length && (
        <View className='order-detail-empty'>
          <Text className='order-detail-empty__title'>
            {errorMessage || '未查询到物流轨迹'}
          </Text>
          <View className='order-detail-empty__button' onClick={handleBackToList}>
            <Text className='order-detail-empty__button-text'>返回首页</Text>
          </View>
        </View>
      )}

      {loading && !detail && (
        <Text className='order-detail-loading'>
          {publicTrackMode ? '正在加载物流轨迹...' : '正在加载订单详情...'}
        </Text>
      )}

      {!detail && publicTrackMode && tracks.length > 0 && (
        <>
          <View className='order-detail-section'>
            <View className='order-detail-section__head'>
              <Text className='order-detail-section__title'>物流轨迹</Text>
              <Text className='order-detail-section__hint'>
                {trackState || '公开查询'}
              </Text>
            </View>

            {tracks.map((track) => (
              <View
                className='order-track'
                key={`${track.operateTime}-${track.trackIndex}`}
              >
                <View
                  className={
                    track.trackFirst
                      ? 'order-track__dot order-track__dot--active'
                      : 'order-track__dot'
                  }
                />
                <View className='order-track__content'>
                  <Text className='order-track__text'>
                    {track.contentNoLinkLabel ||
                      track.contentOrig ||
                      track.content}
                  </Text>
                  <Text className='order-track__time'>
                    {track.date} {track.time}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View className='order-detail-actions'>
            <View className='order-detail-secondary' onClick={handleRefresh}>
              <Text className='order-detail-secondary__text'>刷新</Text>
            </View>
            <View className='order-detail-primary' onClick={handleOpenSecureDetail}>
              <Text className='order-detail-primary__text'>查看完整详情</Text>
            </View>
          </View>
        </>
      )}

      {detail && (
        <>
          {paymentSummary && (
            <View className='order-payment-alert'>
              <View className='order-payment-alert__content'>
                <Text className='order-payment-alert__title'>
                  订单存在待支付费用
                </Text>
                <Text className='order-payment-alert__summary'>
                  共 {paymentSummary.count} 笔，合计 ¥
                  {paymentSummary.amount.toFixed(2)}
                </Text>
                {paymentSummary.disabledReason && (
                  <Text className='order-payment-alert__hint'>
                    {paymentSummary.disabledReason}
                  </Text>
                )}
              </View>
              <View
                className={
                  paymentSummary.canPay
                    ? 'order-payment-alert__button'
                    : 'order-payment-alert__button order-payment-alert__button--disabled'
                }
                onClick={handlePayOrder}
              >
                <Text className='order-payment-alert__button-text'>
                  {paying
                    ? '处理中'
                    : paymentSummary.canPay
                      ? '去支付'
                      : '暂不可付'}
                </Text>
              </View>
            </View>
          )}

          {stubEntry?.available && (
            <View className='order-detail-stub-entry' onClick={handleOpenStub}>
              <View className='order-detail-stub-entry__mark'>
                <Text className='order-detail-stub-entry__mark-text'>存</Text>
              </View>
              <View className='order-detail-stub-entry__content'>
                <Text className='order-detail-stub-entry__title'>
                  {stubEntry.title}
                </Text>
                <Text className='order-detail-stub-entry__summary'>
                  {stubEntry.summary}
                </Text>
              </View>
              <Text className='order-detail-stub-entry__arrow'>›</Text>
            </View>
          )}

          <View className='order-detail-section'>
            <View className='order-detail-section__head'>
              <Text className='order-detail-section__title'>运输信息</Text>
              <Text className='order-detail-section__hint'>
                {detail.orderTime || ''}
              </Text>
            </View>

            <View className='order-detail-route'>
              <View className='order-detail-route__block'>
                <Text className='order-detail-route__city'>
                  {detail.contactCity || '--'}
                </Text>
                <Text className='order-detail-route__name'>
                  {detail.contactName || '--'}
                </Text>
              </View>
              <Text className='order-detail-route__arrow'>→</Text>
              <View className='order-detail-route__block order-detail-route__block--right'>
                <Text className='order-detail-route__city'>
                  {detail.receiverCity || '--'}
                </Text>
                <Text className='order-detail-route__name'>
                  {detail.receiverName || '--'}
                </Text>
              </View>
            </View>

            <View className='order-detail-meta-row'>
              <Text className='order-detail-meta-row__label'>货物</Text>
              <Text className='order-detail-meta-row__value'>
                {detail.goodsName || '--'}
              </Text>
            </View>
            <View className='order-detail-meta-row'>
              <Text className='order-detail-meta-row__label'>产品</Text>
              <Text className='order-detail-meta-row__value'>
                {detail.transportMode || '--'}
              </Text>
            </View>
            <View className='order-detail-meta-row'>
              <Text className='order-detail-meta-row__label'>付款方式</Text>
              <Text className='order-detail-meta-row__value'>
                {detail.paymentType || '--'}
              </Text>
            </View>
            {(detail.courierName || detail.courierMobile) && (
              <View className='order-detail-meta-row'>
                <Text className='order-detail-meta-row__label'>快递员</Text>
                <View className='order-detail-meta-row__content'>
                  <Text className='order-detail-meta-row__value'>
                    {detail.courierName || '--'} {detail.courierMobile || ''}
                  </Text>
                  {detail.courierMobile && (
                    <View
                      className='order-detail-call'
                      onClick={() => handleDial(detail.courierMobile)}
                    >
                      <Text className='order-detail-call__text'>拨打</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          <View className='order-detail-section'>
            <Text className='order-detail-section__title'>寄收信息</Text>
            <View className='order-address-card'>
              <Text className='order-address-card__tag'>寄</Text>
              <View className='order-address-card__content'>
                <View className='order-address-card__head'>
                  <Text className='order-address-card__name'>
                    {detail.contactName || '--'} {detail.contactMobile || ''}
                  </Text>
                  {detail.contactMobile && (
                    <Text
                      className='order-address-card__call'
                      onClick={() => handleDial(detail.contactMobile)}
                    >
                      拨打
                    </Text>
                  )}
                </View>
                <Text className='order-address-card__address'>
                  {getOrderSenderAddress(detail) || '--'}
                </Text>
              </View>
            </View>
            <View className='order-address-card'>
              <Text className='order-address-card__tag order-address-card__tag--receive'>
                收
              </Text>
              <View className='order-address-card__content'>
                <View className='order-address-card__head'>
                  <Text className='order-address-card__name'>
                    {detail.receiverName || '--'} {detail.receiverMobile || ''}
                  </Text>
                  {detail.receiverMobile && (
                    <Text
                      className='order-address-card__call'
                      onClick={() => handleDial(detail.receiverMobile)}
                    >
                      拨打
                    </Text>
                  )}
                </View>
                <Text className='order-address-card__address'>
                  {getOrderReceiverAddress(detail) || '--'}
                </Text>
              </View>
            </View>
          </View>

          {detailActions.length > 0 && (
            <View className='order-detail-section'>
              <View className='order-detail-section__head'>
                <Text className='order-detail-section__title'>售后服务</Text>
                <Text className='order-detail-section__hint'>订单相关</Text>
              </View>

              {detailActions.map((action, index) => (
                <View
                  className={getDetailActionClassName(action, index === 0)}
                  key={action.kind}
                  onClick={() => handleDetailAction(action)}
                >
                  <Text className={getDetailActionMarkClassName(action)}>
                    {action.title.slice(0, 1)}
                  </Text>
                  <View className='order-service-action__content'>
                    <View className='order-service-action__top'>
                      <Text className='order-service-action__title'>
                        {action.title}
                      </Text>
                      {!!action.badgeText && (
                        <Text className='order-service-action__badge'>
                          {action.badgeText}
                        </Text>
                      )}
                    </View>
                    <Text className='order-service-action__summary'>
                      {action.summary}
                    </Text>
                  </View>
                  <Text className='order-service-action__arrow'>›</Text>
                </View>
              ))}
            </View>
          )}

          <View className='order-detail-section'>
            <View className='order-detail-section__head'>
              <Text className='order-detail-section__title'>物流轨迹</Text>
              <Text className='order-detail-section__hint'>
                {trackState || '基础轨迹'}
              </Text>
            </View>

            {tracks.length ? (
              tracks.map((track) => (
                <View className='order-track' key={`${track.operateTime}-${track.trackIndex}`}>
                  <View
                    className={
                      track.trackFirst
                        ? 'order-track__dot order-track__dot--active'
                        : 'order-track__dot'
                    }
                  />
                  <View className='order-track__content'>
                    <Text className='order-track__text'>
                      {track.contentNoLinkLabel ||
                        track.contentOrig ||
                        track.content}
                    </Text>
                    <Text className='order-track__time'>
                      {track.date} {track.time}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text className='order-detail-section__empty'>
                暂无轨迹，实时地图和快递员位置后续接入。
              </Text>
            )}
          </View>

          <View className='order-detail-actions'>
            <View className='order-detail-secondary' onClick={handleRefresh}>
              <Text className='order-detail-secondary__text'>刷新</Text>
            </View>
            <View className='order-detail-secondary' onClick={handleResendOrder}>
              <Text className='order-detail-secondary__text'>
                {resendActionText}
              </Text>
            </View>
            {cancelable && (
              <View className='order-detail-danger' onClick={handleCancelOrder}>
                <Text className='order-detail-danger__text'>取消订单</Text>
              </View>
            )}
            {deletable && (
              <View className='order-detail-danger' onClick={handleDeleteOrder}>
                <Text className='order-detail-danger__text'>
                  {deleting ? '删除中' : '删除'}
                </Text>
              </View>
            )}
            <View className='order-detail-primary' onClick={handleBackToList}>
              <Text className='order-detail-primary__text'>查看订单列表</Text>
            </View>
          </View>
        </>
      )}

      {urgePanel && (
        <View className='order-urge-mask'>
          <View className='order-urge-card'>
            <Text className='order-urge-card__title'>催单提醒</Text>
            <Text className='order-urge-card__content'>
              {urgePanel.content}
            </Text>
            <View className='order-urge-card__actions'>
              {urgePanel.menus.map((menu) => (
                <View
                  className={
                    menu.buttonCode === 'FOLLOW_UP'
                      ? 'order-urge-card__button order-urge-card__button--primary'
                      : 'order-urge-card__button'
                  }
                  key={`${menu.buttonCode}-${menu.buttonName}`}
                  onClick={() => handleSelectUrgeMenu(menu)}
                >
                  <Text
                    className={
                      menu.buttonCode === 'FOLLOW_UP'
                        ? 'order-urge-card__button-text order-urge-card__button-text--primary'
                        : 'order-urge-card__button-text'
                    }
                  >
                    {urging && menu.buttonCode === 'FOLLOW_UP'
                      ? '提交中'
                      : menu.buttonName}
                  </Text>
                </View>
              ))}
            </View>
            <View className='order-urge-card__cancel' onClick={handleCloseUrgePanel}>
              <Text className='order-urge-card__cancel-text'>取消</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

export default OrderDetailPage
