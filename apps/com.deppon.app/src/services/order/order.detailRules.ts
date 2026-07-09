import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'
import {
  appendRouteQuery,
  createRouteQuery
} from '../../shared/navigation/routeUrl'
import { getCurrentEcoToken } from '../auth'

import type { OrderDetail, OrderRole } from './types'

const ORDER_DETAIL_WEB_PARAM_SOURCE = 'APP_ORDER_DETAIL'

export const DEFAULT_SERVICE_PHONE = '95353'

export function createQuery(params: Record<string, string>) {
  return createRouteQuery(params)
}

export function createOrderDetailWebUri(
  path: string,
  params: Record<string, string> = {}
) {
  return appendRouteQuery(path, {
    sonSource: ORDER_DETAIL_WEB_PARAM_SOURCE,
    ecoToken: getCurrentEcoToken(),
    pageSource: APP_RUNTIME_CONFIG.systemCode,
    ...params
  })
}

export function createRouteUrl(route: string, params: Record<string, string>) {
  return appendRouteQuery(route, params)
}

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

export function getOrderClass(order: OrderDetail) {
  const orderClass = Number(order.orderClassification)

  return Number.isFinite(orderClass) ? orderClass : null
}

export function getOrderStatusText(order: OrderDetail) {
  return [order.orderClassName, order.orderStatus]
    .filter((item): item is string => typeof item === 'string')
    .join('')
}

export function getDetailWaybillNumber(order: OrderDetail) {
  return order.waybillNumber || ''
}

export function getOrderTableType(order: OrderDetail) {
  return getOrderTextField(order, ['orderTableType', 'tableType'])
}

function getOrderChannelType(order: OrderDetail) {
  return getOrderTextField(order, ['orderChannelType', 'channelType'])
}

function getOrderSlaveFlag(order: OrderDetail) {
  return getOrderTextField(order, ['isSlave', 'isMasterSlave'])
}

export function getOrderContactPhone(order: OrderDetail) {
  return (
    getOrderTextField(order, [
      'postmanPhone',
      'courierMobile',
      'exDepartureCourierPhone',
      'stationPhone',
      'departmentPhone'
    ]) || DEFAULT_SERVICE_PHONE
  )
}

export function getOrderStationCode(order: OrderDetail) {
  return getOrderTextField(order, [
    'stationCode',
    'acceptDeptCode',
    'departmentCode',
    'deptCode',
    'senderStation',
    'consigneeStation'
  ])
}

export function getOrderStationPhone(order: OrderDetail) {
  return getOrderTextField(order, [
    'stationPhone',
    'acceptPhone',
    'departmentPhone'
  ])
}

export function isWaitAllotOrder(order: OrderDetail) {
  return getOrderClass(order) === 0
}

export function isTransitOrder(order: OrderDetail) {
  return getOrderClass(order) === 1
}

export function isInvalidOrder(order: OrderDetail) {
  return getOrderClass(order) === 5
}

export function isMasterOrder(order: OrderDetail) {
  return getOrderSlaveFlag(order) !== '1'
}

export function isExpressOrder(order: OrderDetail) {
  const tableType = getOrderTableType(order)

  return !tableType || tableType === '2' || tableType === 'EXPRESS'
}

export function isServicePointOrder(order: OrderDetail) {
  return getOrderChannelType(order) === 'ServicePoint'
}

export function isSenderDetail(order: OrderDetail, role?: OrderRole) {
  return role === 'sender' || (role !== 'receive' && order.isSender === 'Y')
}

export function isReceiverDetail(order: OrderDetail, role?: OrderRole) {
  return role === 'receive' || (role !== 'sender' && order.isReceiver === 'Y')
}

export function isSignedOrder(order: OrderDetail) {
  return getOrderClass(order) === 2 || getOrderStatusText(order).includes('签收')
}
