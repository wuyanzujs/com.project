import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'
import { appendRouteQuery, createRouteQuery } from '@/shared/navigation/routeUrl'

import { getCurrentEcoToken } from '../auth'

import type { OrderDetail, OrderRole } from './types'

const ORDER_DETAIL_WEB_PARAM_SOURCE = 'APP_ORDER_DETAIL'

export const DEFAULT_SERVICE_PHONE = '95353'

/**
 *
 * @param params query 参数
 * @description 创建路由 query
 */
export function createQuery(params: Record<string, string>) {
  return createRouteQuery(params)
}

/**
 *
 * @param path H5 路径
 * @param params 额外 query 参数
 * @description 拼接带通用参数的 H5 地址
 */
export function createOrderDetailWebUri(path: string, params: Record<string, string> = {}) {
  return appendRouteQuery(path, {
    sonSource: ORDER_DETAIL_WEB_PARAM_SOURCE,
    ecoToken: getCurrentEcoToken(),
    pageSource: APP_RUNTIME_CONFIG.systemCode,
    ...params
  })
}

/**
 *
 * @param route 路由路径
 * @param params query 参数
 * @description 拼接带 query 的路由地址
 */
export function createRouteUrl(route: string, params: Record<string, string>) {
  return appendRouteQuery(route, params)
}

/**
 *
 * @param order 订单详情
 * @param keys 候选字段名
 * @description 按顺序取首个非空文本字段
 */
export function getOrderTextField(order: OrderDetail, keys: string[]) {
  for (const key of keys) {
    const value = order[key]

    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value)

      if (text) {
        return text
      }
    }
  }

  return ''
}

/**
 *
 * @param order 订单详情
 * @param keys 候选字段名
 * @description 按顺序取首个正数数值字段
 */
export function getOrderNumberField(order: OrderDetail, keys: string[]) {
  for (const key of keys) {
    const value = order[key]
    const numberValue = Number(value)

    if (Number.isFinite(numberValue) && numberValue > 0) {
      return numberValue
    }
  }

  return 0
}

/**
 *
 * @param order 订单详情
 * @description 取订单分类码，非法值返回 null
 */
export function getOrderClass(order: OrderDetail) {
  const orderClass = Number(order.orderClassification)

  return Number.isFinite(orderClass) ? orderClass : null
}

/**
 *
 * @param order 订单详情
 * @description 拼接订单分类名与状态文案
 */
export function getOrderStatusText(order: OrderDetail) {
  return [order.orderClassName, order.orderStatus].filter((item): item is string => typeof item === 'string').join('')
}

/**
 *
 * @param order 订单详情
 * @description 取运单号，缺失时返回空串
 */
export function getDetailWaybillNumber(order: OrderDetail) {
  return order.waybillNumber || ''
}

/**
 *
 * @param order 订单详情
 * @description 取订单表类型标识
 */
export function getOrderTableType(order: OrderDetail) {
  return getOrderTextField(order, ['orderTableType', 'tableType'])
}

/**
 *
 * @param order 订单详情
 * @description 取订单渠道类型标识
 */
function getOrderChannelType(order: OrderDetail) {
  return getOrderTextField(order, ['orderChannelType', 'channelType'])
}

/**
 *
 * @param order 订单详情
 * @description 取主子单标识
 */
function getOrderSlaveFlag(order: OrderDetail) {
  return getOrderTextField(order, ['isSlave', 'isMasterSlave'])
}

/**
 *
 * @param order 订单详情
 * @description 取联系电话，兜底客服热线
 */
export function getOrderContactPhone(order: OrderDetail) {
  return getOrderTextField(order, ['postmanPhone', 'courierMobile', 'exDepartureCourierPhone', 'stationPhone', 'departmentPhone']) || DEFAULT_SERVICE_PHONE
}

/**
 *
 * @param order 订单详情
 * @description 取营业部编码
 */
export function getOrderStationCode(order: OrderDetail) {
  return getOrderTextField(order, ['stationCode', 'acceptDeptCode', 'departmentCode', 'deptCode', 'senderStation', 'consigneeStation'])
}

/**
 *
 * @param order 订单详情
 * @description 取营业部电话
 */
export function getOrderStationPhone(order: OrderDetail) {
  return getOrderTextField(order, ['stationPhone', 'acceptPhone', 'departmentPhone'])
}

/**
 *
 * @param order 订单详情
 * @description 判断是否待分配订单
 */
export function isWaitAllotOrder(order: OrderDetail) {
  return getOrderClass(order) === 0
}

/**
 *
 * @param order 订单详情
 * @description 判断是否运输中订单
 */
export function isTransitOrder(order: OrderDetail) {
  return getOrderClass(order) === 1
}

/**
 *
 * @param order 订单详情
 * @description 判断是否已作废订单
 */
export function isInvalidOrder(order: OrderDetail) {
  return getOrderClass(order) === 5
}

/**
 *
 * @param order 订单详情
 * @description 判断是否主单
 */
export function isMasterOrder(order: OrderDetail) {
  return getOrderSlaveFlag(order) !== '1'
}

/**
 *
 * @param order 订单详情
 * @description 判断是否快递订单
 */
export function isExpressOrder(order: OrderDetail) {
  const tableType = getOrderTableType(order)

  return !tableType || tableType === '2' || tableType === 'EXPRESS'
}

/**
 *
 * @param order 订单详情
 * @description 判断是否服务点订单
 */
export function isServicePointOrder(order: OrderDetail) {
  return getOrderChannelType(order) === 'ServicePoint'
}

/**
 *
 * @param order 订单详情
 * @param role 当前页面角色
 * @description 判断是否为寄件人视角
 */
export function isSenderDetail(order: OrderDetail, role?: OrderRole) {
  return role === 'sender' || (role !== 'receive' && order.isSender === 'Y')
}

/**
 *
 * @param order 订单详情
 * @param role 当前页面角色
 * @description 判断是否为收件人视角
 */
export function isReceiverDetail(order: OrderDetail, role?: OrderRole) {
  return role === 'receive' || (role !== 'sender' && order.isReceiver === 'Y')
}

/**
 *
 * @param order 订单详情
 * @description 判断订单是否已签收
 */
export function isSignedOrder(order: OrderDetail) {
  return getOrderClass(order) === 2 || getOrderStatusText(order).includes('签收')
}
