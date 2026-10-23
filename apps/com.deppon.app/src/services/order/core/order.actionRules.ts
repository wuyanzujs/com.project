import { getOrderClass } from '../detail/order.detailRules'

import type { OrderResendMode } from './order.mapper'
import type { OrderDetail, OrderListItem, OrderRole } from './types'

// 订单动作判定依赖后端字段与订单状态机，统一收敛在这里；
// 页面只做调用与展示，不再各自维护一套条件。

const DELETABLE_ORDER_CLASSES = new Set([2, 3, 4, 5, 99])
const WAIT_ALLOT_ORDER_CLASS = 0
const CANCELLED_ORDER_CLASS = 4

/**
 *
 * @param role 订单角色
 * @description 判断是否寄件人视角
 */
function isSenderRole(role: OrderRole) {
  return role === 'sender'
}

/**
 *
 * @param orderNumber 订单号
 * @description 判断是否具备订单号
 */
function hasOrderNumber(orderNumber?: string | null) {
  return !!orderNumber
}

/**
 *
 * @param orderClass 订单分类码
 * @description 判断是否待分配订单分类
 */
function isWaitAllotOrderClass(orderClass: number | null) {
  return orderClass === WAIT_ALLOT_ORDER_CLASS
}

/**
 *
 * @param orderClass 订单分类码
 * @description 判断是否已取消订单分类
 */
function isCancelledOrderClass(orderClass: number | null) {
  return orderClass === CANCELLED_ORDER_CLASS
}

/**
 *
 * @param order 订单简要信息
 * @description 判断订单是否可删除（列表与详情共用）
 */
export function canDeleteOrder(order: {
  orderClass?: number
  orderClassification?: string | number
  orderNumber?: string | null
  waybillNumber?: string | null
}) {
  const orderClass = Number(order.orderClass ?? order.orderClassification)

  return DELETABLE_ORDER_CLASSES.has(orderClass) && (!!order.orderNumber || !!order.waybillNumber)
}

/**
 *
 * @param order 订单列表项
 * @description 判断列表订单是否可取消
 */
export function canCancelOrder(order: Pick<OrderListItem, 'role' | 'orderClass' | 'isAllowCancel' | 'orderNumber'>) {
  return isSenderRole(order.role) && isWaitAllotOrderClass(order.orderClass) && order.isAllowCancel && hasOrderNumber(order.orderNumber)
}

/**
 *
 * @param order 订单列表项
 * @description 判断列表订单是否可修改
 */
export function canModifyOrder(order: Pick<OrderListItem, 'role' | 'orderClass' | 'isAllowCancel' | 'orderNumber'>) {
  return isSenderRole(order.role) && isWaitAllotOrderClass(order.orderClass) && order.isAllowCancel && hasOrderNumber(order.orderNumber)
}

/**
 *
 * @param role 订单角色
 * @description 取再寄模式：收件人回寄，其余重复下单
 */
export function getOrderResendMode(role: OrderRole): OrderResendMode {
  return role === 'receive' ? 'return' : 'repeat'
}

/**
 *
 * @param role 订单角色
 * @description 取再寄按钮文案
 */
export function getOrderResendActionText(role: OrderRole) {
  return role === 'receive' ? '一键回寄' : '再来一单'
}

/**
 *
 * @param detail 订单详情
 * @param publicTrackMode 公开物流态
 * @description 判断详情订单是否可取消
 */
export function canCancelOrderDetail(detail: OrderDetail | null, publicTrackMode: boolean) {
  if (!detail || publicTrackMode || !hasOrderNumber(detail.orderNumber)) {
    return false
  }

  return isWaitAllotOrderClass(getOrderClass(detail)) && detail.modifyFlag !== false
}

/**
 *
 * @param detail 订单详情
 * @param publicTrackMode 公开物流态
 * @description 判断详情订单是否可删除
 */
export function canDeleteOrderDetail(detail: OrderDetail | null, publicTrackMode: boolean) {
  return !publicTrackMode && !!detail && canDeleteOrder(detail)
}

/**
 *
 * @param detail 订单详情
 * @param publicTrackMode 公开物流态
 * @description 判断详情订单是否已取消
 */
export function isCancelledOrderDetail(detail: OrderDetail | null, publicTrackMode: boolean) {
  return !publicTrackMode && !!detail && isCancelledOrderClass(getOrderClass(detail))
}

const EVALUATABLE_ORDER_CLASSES = new Set([0, 1, 4])

/**
 *
 * @param order 订单列表项
 * @description 判断列表订单是否展示去评价入口
 */
export function canEvaluateOrder(order: Pick<OrderListItem, 'orderClass' | 'orderNumber' | 'waybillNumber'>) {
  return EVALUATABLE_ORDER_CLASSES.has(order.orderClass) && (!!order.orderNumber || !!order.waybillNumber)
}

/**
 *
 * @param order 订单列表项
 * @description 判断列表订单是否展示通知收件人入口
 */
export function canNotifyRecipient(order: Pick<OrderListItem, 'role' | 'orderClass' | 'waybillNumber'>) {
  return isSenderRole(order.role) && isWaitAllotOrderClass(order.orderClass) && !!order.waybillNumber
}

function padTime(value: number) {
  return String(value).padStart(2, '0')
}

function formatChineseDateTime(date: Date) {
  return `${date.getFullYear()}年${padTime(date.getMonth() + 1)}月${padTime(date.getDate())}日 ${padTime(date.getHours())}:${padTime(date.getMinutes())}`
}

function parseOrderTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value)

  if (!match) {
    return null
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]))

  return Number.isNaN(date.getTime()) ? null : date
}

function getOrderListTimeLabel(order: Pick<OrderListItem, 'orderClass' | 'viewTextFlag'>) {
  if (isCancelledOrderClass(order.orderClass)) {
    return '取消时间'
  }

  if (isWaitAllotOrderClass(order.orderClass)) {
    return order.viewTextFlag === 'Y' ? '预计上门时间' : '下单时间'
  }

  if (order.orderClass === 2) {
    return '签收时间'
  }

  if (order.orderClass === 3) {
    return '下单时间'
  }

  return '开单时间'
}

/**
 *
 * @param order 订单列表项
 * @description 按订单状态生成列表底部时间文案
 */
export function getOrderListTimeText(order: Pick<OrderListItem, 'orderClass' | 'orderTime' | 'viewTextFlag'>) {
  const label = getOrderListTimeLabel(order)
  const start = parseOrderTime(order.orderTime)

  if (!start) {
    return `${label}：${order.orderTime || '--'}`
  }

  if (label !== '预计上门时间') {
    return `${label}：${formatChineseDateTime(start)}`
  }

  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  const sameDay = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate()
  const endText = sameDay ? `${padTime(end.getHours())}:${padTime(end.getMinutes())}` : `次日 ${padTime(end.getHours())}:${padTime(end.getMinutes())}`

  return `${label}：${formatChineseDateTime(start)}-${endText}`
}
