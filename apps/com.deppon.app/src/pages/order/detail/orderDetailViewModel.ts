import { canCancelOrderDetail, canDeleteOrderDetail, getOrderResendActionText, isCancelledOrderDetail } from '@/services/order'
import type { OrderDetail, OrderRole } from '@/services/order'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'

export type OrderDetailViewMode = 'public' | 'secure'

export interface OrderDetailRouteParams {
  orderNumber: string
  waybillNumber: string
  role: string
  source: string
  view: OrderDetailViewMode
}

export interface OrderDetailViewModel {
  publicTrackMode: boolean
  cancelable: boolean
  deletable: boolean
  cancelled: boolean
  detailRole: OrderRole
  resendActionText: string
}

function getViewMode(value?: string): OrderDetailViewMode {
  return value === 'secure' ? 'secure' : 'public'
}

export function getOrderDetailRouteParams(params: Record<string, string | undefined>): OrderDetailRouteParams {
  return {
    orderNumber: params.orderNumber || params.orderNo || '',
    waybillNumber: params.waybillNumber || params.waybillNo || '',
    role: params.role || '',
    source: params.source || '',
    view: getViewMode(params.view)
  }
}

export function isPublicOrderTrackMode(params: OrderDetailRouteParams) {
  return params.view !== 'secure' && !!params.waybillNumber && !params.orderNumber && !params.role
}

export function getOrderDetailRole(detail: OrderDetail, routeRole: string): OrderRole {
  if (routeRole === 'receive') {
    return 'receive'
  }

  if (routeRole === 'sender') {
    return 'sender'
  }

  return detail.isReceiver === 'Y' && detail.isSender !== 'Y' ? 'receive' : 'sender'
}

export function getOrderDetailRouteUrl(params: OrderDetailRouteParams, view: OrderDetailViewMode = params.view) {
  return createAppRouteUrl(APP_ROUTES.orderDetail, {
    orderNumber: params.orderNumber,
    waybillNumber: params.waybillNumber,
    role: params.role,
    source: params.source,
    view
  })
}

export function createOrderDetailViewModel(params: OrderDetailRouteParams, detail: OrderDetail | null): OrderDetailViewModel {
  const publicTrackMode = isPublicOrderTrackMode(params)
  const detailRole = detail ? getOrderDetailRole(detail, params.role) : 'sender'

  return {
    publicTrackMode,
    cancelable: canCancelOrderDetail(detail, publicTrackMode),
    deletable: canDeleteOrderDetail(detail, publicTrackMode),
    cancelled: isCancelledOrderDetail(detail, publicTrackMode),
    detailRole,
    resendActionText: getOrderResendActionText(detailRole)
  }
}
