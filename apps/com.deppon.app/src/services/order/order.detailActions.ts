import {
  createOrderDetailWebUri,
  createRouteUrl,
  getDetailWaybillNumber,
  getOrderClass,
  getOrderContactPhone,
  getOrderStationCode,
  getOrderStationPhone,
  getOrderStatusText,
  getOrderTextField,
  isExpressOrder,
  isInvalidOrder,
  isMasterOrder,
  isReceiverDetail,
  isSenderDetail,
  isServicePointOrder,
  isSignedOrder,
  isTransitOrder,
  isWaitAllotOrder
} from './order.detailRules'
import { canScheduleOrderPickup } from './order.dispatch'
import { getOrderEditUnavailableMessage } from './order.edit'
import { createOrderEvaluationRoute } from './order.evaluation.rules'
import { APP_ROUTES } from '../../shared/navigation/routes'

import type {
  OrderDetail,
  OrderDetailActionOptions,
  OrderDetailActionView,
  OrderDetailUrgeActionView,
  OrderRole
} from './types'

const COMPLAINT_ORDER_CLASSES = new Set([1, 2, 6])
const COMPLAINT_WINDOW_DAYS = 90
const URGE_PROGRESS_WEB_PATH = '/depponmobile/mow/order/urgeProgress'
const WAYBILL_MODIFY_WEB_PATH = '/depponmobile/mow/order/modifyNew/index'
const DELIVERY_PREFERENCE_WEB_PATH = '/depponmobile/orderStayTmp'

function isComplaintStatus(order: OrderDetail) {
  const orderClass = getOrderClass(order)
  const statusText = getOrderStatusText(order)

  if (orderClass === null) {
    return (
      statusText.includes('运输') ||
      statusText.includes('派送') ||
      statusText.includes('签收')
    )
  }

  return COMPLAINT_ORDER_CLASSES.has(orderClass)
}

function isWithinDays(value: string | null | undefined, days: number) {
  if (!value) {
    return true
  }

  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) {
    return true
  }

  return Date.now() - timestamp <= days * 24 * 60 * 60 * 1000
}

function canShowSecureDetailActions(
  order: OrderDetail,
  options: OrderDetailActionOptions
) {
  return (
    !options.publicTrackMode && (!!order.orderNumber || !!order.waybillNumber)
  )
}

function canCreateComplaint(order: OrderDetail) {
  return (
    !!getDetailWaybillNumber(order) &&
    isComplaintStatus(order) &&
    isWithinDays(order.orderTime, COMPLAINT_WINDOW_DAYS)
  )
}

function canModifyWaybill(order: OrderDetail, role?: OrderRole) {
  return (
    role !== 'receive' &&
    isTransitOrder(order) &&
    !!getDetailWaybillNumber(order) &&
    order.modifyFlag !== false
  )
}

function canModifyOrder(order: OrderDetail, role?: OrderRole) {
  return (
    role !== 'receive' &&
    isWaitAllotOrder(order) &&
    !!order.orderNumber &&
    !getOrderEditUnavailableMessage(order)
  )
}

function canNotifyDeliver(order: OrderDetail, role?: OrderRole) {
  return (
    isSenderDetail(order, role) &&
    isTransitOrder(order) &&
    !!getDetailWaybillNumber(order) &&
    order.isDlyNotified === 'N'
  )
}

function canInvalidWaybill(order: OrderDetail, role?: OrderRole) {
  return (
    isSenderDetail(order, role) &&
    isTransitOrder(order) &&
    !!getDetailWaybillNumber(order) &&
    order.canBeVoided === 'Y'
  )
}

function canEditDeliveryPreference(order: OrderDetail, role?: OrderRole) {
  return (
    isReceiverDetail(order, role) &&
    isTransitOrder(order) &&
    !!getDetailWaybillNumber(order)
  )
}

function canContactDepartment(order: OrderDetail) {
  return isInvalidOrder(order) && !!getOrderStationCode(order)
}

export function createOrderUrgeContext(
  order: OrderDetail,
  options: OrderDetailActionOptions
): OrderDetailUrgeActionView | null {
  if (!canShowSecureDetailActions(order, options)) {
    return null
  }

  if (
    isSenderDetail(order, options.role) &&
    isWaitAllotOrder(order) &&
    order.orderNumber &&
    !isServicePointOrder(order) &&
    isExpressOrder(order)
  ) {
    return {
      voucherNumber: order.orderNumber,
      voucherType: '0',
      urgeType: 'URGE_ORDER_NO',
      buttonCode: '',
      contactPhone: getOrderContactPhone(order)
    }
  }

  if (isMasterOrder(order) && isTransitOrder(order) && order.waybillNumber) {
    return {
      voucherNumber: order.waybillNumber,
      voucherType: '1',
      urgeType: 'URGE_BILL_NO',
      buttonCode: '',
      contactPhone: getOrderContactPhone(order)
    }
  }

  return null
}

export function createUrgeProgressWebUri(urge: OrderDetailUrgeActionView) {
  return createOrderDetailWebUri(URGE_PROGRESS_WEB_PATH, {
    voucherType: urge.voucherType,
    voucherNumber: urge.voucherNumber
  })
}

export function createOrderDetailActions(
  order: OrderDetail,
  options: OrderDetailActionOptions = {}
): OrderDetailActionView[] {
  if (!canShowSecureDetailActions(order, options)) {
    return []
  }

  const actions: OrderDetailActionView[] = [
    {
      kind: 'service',
      title: '在线客服',
      summary: '咨询订单、配送和费用问题',
      target: 'web',
      tone: 'primary',
      badgeText: '客服',
      webSource: 'ORDER_DETAIL_SERVICE',
      loginRequired: true
    }
  ]
  const waybillNumber = getDetailWaybillNumber(order)

  if (canModifyOrder(order, options.role)) {
    actions.push({
      kind: 'modifyOrder',
      title: '修改订单',
      summary: '修改收寄件、货物和备注信息',
      target: 'route',
      tone: 'neutral',
      badgeText: 'App',
      route: createRouteUrl(APP_ROUTES.orderEdit, {
        orderNumber: order.orderNumber,
        source: 'ORDER_DETAIL'
      }),
      loginRequired: true
    })
  }

  if (canScheduleOrderPickup(order, options)) {
    const currentPickupTime = getOrderTextField(order, ['beginAcceptTime'])

    actions.push({
      kind: 'pickupSchedule',
      title: currentPickupTime ? '修改上门时间' : '预约上门时间',
      summary: currentPickupTime || '选择期望的上门取件时间',
      target: 'pickupSchedule',
      tone: 'primary',
      badgeText: '预约',
      loginRequired: true
    })
  }

  if (canNotifyDeliver(order, options.role)) {
    actions.push({
      kind: 'notifyDeliver',
      title: '通知派送',
      summary: '通知营业部为当前快件安排派送',
      target: 'notifyDeliver',
      tone: 'warning',
      badgeText: '待确认',
      loginRequired: true
    })
  }

  if (canInvalidWaybill(order, options.role)) {
    actions.push({
      kind: 'invalidWaybill',
      title: '拦截作废',
      summary: '提交后由我司核实，已支付运费将按规则退回',
      target: 'invalidWaybill',
      tone: 'danger',
      badgeText: '高风险',
      loginRequired: true
    })
  }

  if (canEditDeliveryPreference(order, options.role)) {
    actions.push({
      kind: 'deliveryPreference',
      title: '收件方式',
      summary: '调整当前运单的派送偏好',
      target: 'web',
      tone: 'neutral',
      badgeText: 'H5',
      webSource: 'ORDER_DETAIL_DELIVERY',
      webUri: createOrderDetailWebUri(DELIVERY_PREFERENCE_WEB_PATH, {
        waybillNumber
      }),
      loginRequired: true
    })
  }

  if (canContactDepartment(order)) {
    actions.push({
      kind: 'departmentPhone',
      title: '联系营业部',
      summary: '联系处理当前运单的营业部',
      target: 'departmentPhone',
      tone: 'primary',
      badgeText: '电话',
      departmentPhone: {
        stationCode: getOrderStationCode(order),
        phoneNumber: getOrderStationPhone(order)
      },
      loginRequired: true
    })
  }

  const evaluationRoute = createOrderEvaluationRoute(order, options.role)

  if (evaluationRoute) {
    actions.push({
      kind: 'evaluate',
      title: '服务评价',
      summary: '对当前订单服务体验进行评价',
      target: 'route',
      tone: 'neutral',
      badgeText: 'App',
      route: evaluationRoute,
      loginRequired: true
    })
  }

  if (canCreateComplaint(order)) {
    actions.push({
      kind: 'complaint',
      title: '投诉',
      summary: '对当前运单提交服务投诉',
      target: 'web',
      tone: 'warning',
      badgeText: 'H5',
      webSource: 'ORDER_DETAIL_COMPLAINT',
      webUri: createOrderDetailWebUri('/depponmobile/complaint/apply/index', {
        waybillNumber
      }),
      loginRequired: true
    })
  }

  if (waybillNumber) {
    actions.push({
      kind: 'claim',
      title: '在线理赔',
      summary: '货损货差等理赔申请由 H5 承接',
      target: 'web',
      tone: 'neutral',
      badgeText: 'H5',
      webSource: 'ORDER_DETAIL_CLAIM',
      webUri: createOrderDetailWebUri(
        '/depponmobile/h5/index#/claimPackagePages/index',
        {
          waybillNumber
        }
      ),
      loginRequired: true
    })
  }

  if (waybillNumber && isSignedOrder(order)) {
    actions.push({
      kind: 'invoice',
      title: '去开票',
      summary: '进入 App 发票中心查询可开票运单',
      target: 'route',
      tone: 'primary',
      badgeText: 'App',
      route: createRouteUrl(APP_ROUTES.invoiceCenter, {
        source: 'ORDER_DETAIL',
        waybillNumber
      }),
      loginRequired: true
    })
  }

  if (canModifyWaybill(order, options.role)) {
    actions.push({
      kind: 'modifyWaybill',
      title: '修改运单',
      summary: '运输中运单修改由 H5 承接',
      target: 'web',
      tone: 'neutral',
      badgeText: 'H5',
      webSource: 'ORDER_DETAIL_WAYBILL_MODIFY',
      webUri: createOrderDetailWebUri(WAYBILL_MODIFY_WEB_PATH, {
        waybillNumber
      }),
      loginRequired: true
    })
  }

  return actions
}
