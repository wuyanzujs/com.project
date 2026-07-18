import { useDidShow } from '@tarojs/taro'

import { useMemo, useState } from 'react'

import { useOrderPickupSchedule } from './useOrderPickupSchedule'
import { useOrderSubscription } from './useOrderSubscription'
import {
  orderService
} from '../../../../services/order'
import { paymentService } from '../../../../services/payment'
import { ensureAuthenticated } from '../../../../shared/navigation/authGuard'
import {
  createOrderDetailViewModel,
  getOrderDetailRole,
  getOrderDetailRouteUrl,
  type OrderDetailRouteParams
} from '../orderDetailViewModel'

import type {
  OrderDetail,
  OrderDetailActionView,
  OrderStubEntryView,
  WaybillTrackItem
} from '../../../../services/order'
import type { PaymentSummary } from '../../../../services/payment'
import type { OrderDetailUrgePanelState } from '../components/OrderUrgePanel'

export function useOrderDetailData(routeParams: OrderDetailRouteParams) {
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [tracks, setTracks] = useState<WaybillTrackItem[]>([])
  const [trackState, setTrackState] = useState('')
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [urgeAction, setUrgeAction] = useState<OrderDetailActionView | null>(
    null
  )
  const [urgePanel, setUrgePanel] = useState<OrderDetailUrgePanelState | null>(
    null
  )
  const {
    action: subscriptionAction,
    loadStatus: loadSubscriptionStatus,
    reset: resetSubscription,
    toggle: toggleSubscription
  } = useOrderSubscription()
  const pickupSchedule = useOrderPickupSchedule()
  const viewModel = useMemo(
    () => createOrderDetailViewModel(routeParams, detail),
    [detail, routeParams]
  )
  const stubEntry = useMemo<OrderStubEntryView | null>(() => {
    if (!detail) {
      return null
    }

    return orderService.getStubEntry(detail, {
      publicTrackMode: viewModel.publicTrackMode,
      role: viewModel.detailRole
    })
  }, [detail, viewModel.detailRole, viewModel.publicTrackMode])
  const detailActions = useMemo(() => {
    if (!detail) {
      return []
    }

    const actions = orderService.getDetailActions(detail, {
      publicTrackMode: viewModel.publicTrackMode,
      role: viewModel.detailRole
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
    pickupSchedule.loading,
    subscriptionAction,
    urgeAction,
    viewModel.detailRole,
    viewModel.publicTrackMode
  ])

  const loadDetail = async () => {
    if (!viewModel.publicTrackMode) {
      const redirectUrl = getOrderDetailRouteUrl(routeParams, 'secure')

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
      if (viewModel.publicTrackMode) {
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

      const nextRole = getOrderDetailRole(nextDetail, routeParams.role)
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
    void loadDetail()
  })

  return {
    detail,
    tracks,
    trackState,
    paymentSummary,
    loading,
    errorMessage,
    urgeAction,
    urgePanel,
    publicTrackMode: viewModel.publicTrackMode,
    cancelable: viewModel.cancelable,
    deletable: viewModel.deletable,
    detailRole: viewModel.detailRole,
    resendActionText: viewModel.resendActionText,
    stubEntry,
    detailActions,
    pickupSchedule,
    toggleSubscription,
    setUrgeAction,
    setUrgePanel,
    loadDetail
  }
}
