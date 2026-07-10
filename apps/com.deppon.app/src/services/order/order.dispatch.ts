import { orderApi } from './order.api'
import {
  getOrderNumberField,
  getOrderTextField,
  isSenderDetail,
  isServicePointOrder,
  isWaitAllotOrder
} from './order.detailRules'
import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'
import { createServiceFailure } from '../serviceResponse'

import type {
  OrderDispatchRequest,
  OrderPickupDateView,
  OrderPickupScheduleView,
  OrderPickupTimeRequest,
  OrderPickupTimeResponse,
  OrderPickupTimeSlotRaw,
  OrderPickupSlotView
} from './order.dispatch.types'
import type { OrderDetail, OrderDetailActionOptions } from './types'
import type { DepponResponse } from '../../request/deppon'

const PICKUP_TIME_SOURCE = 4 as const

function hasPickedUpGoods(order: OrderDetail) {
  return (
    order.isPickupGoods === true ||
    order.isPickupGoods === 'Y' ||
    order.isPickupGoods === '1'
  )
}

function normalizePickupSlot(
  slot: OrderPickupTimeSlotRaw
): OrderPickupSlotView | null {
  const time = slot.time?.trim()

  if (!time || slot.type === 'DISABLE') {
    return null
  }

  return {
    time,
    text:
      slot.text?.trim() === '现在发货' ? '一小时内' : slot.text?.trim() || time,
    type: slot.type
  }
}

function normalizePickupDate(
  date: string,
  slots: OrderPickupTimeSlotRaw[]
): OrderPickupDateView | null {
  const normalizedSlots = slots
    .map(normalizePickupSlot)
    .filter((slot): slot is OrderPickupSlotView => !!slot)

  if (!normalizedSlots.length) {
    return null
  }

  const normalizedDate = date?.trim() || normalizedSlots[0].time.split(' ')[0]

  return {
    date: normalizedDate,
    label: normalizedDate,
    slots: normalizedSlots
  }
}

export function canScheduleOrderPickup(
  order: OrderDetail,
  options: OrderDetailActionOptions = {}
) {
  return (
    !options.publicTrackMode &&
    isSenderDetail(order, options.role) &&
    isWaitAllotOrder(order) &&
    !!order.orderNumber &&
    order.modifyFlag !== false &&
    !isServicePointOrder(order) &&
    !hasPickedUpGoods(order)
  )
}

export function buildOrderPickupTimeRequest(
  order: OrderDetail
): OrderPickupTimeRequest | null {
  const provinceName = getOrderTextField(order, [
    'contactProvince',
    'senderProvince',
    'senderProvinceName'
  ])
  const cityName = getOrderTextField(order, ['contactCity', 'senderCity'])
  const countyName = getOrderTextField(order, [
    'contactArea',
    'senderCounty',
    'senderDistrictName'
  ])
  const address = getOrderTextField(order, [
    'contactAddress',
    'senderAddress',
    'contactAddressWechat'
  ])

  if (!provinceName || !cityName || !countyName || !address) {
    return null
  }

  return {
    sysCode: APP_RUNTIME_CONFIG.systemCode,
    provinceName,
    cityName,
    countyName,
    townName:
      getOrderTextField(order, [
        'contactTown',
        'senderTown',
        'senderTownName'
      ]) || undefined,
    address,
    weight: getOrderNumberField(order, ['totalWeight', 'weight']),
    volume: getOrderNumberField(order, ['totalVolume', 'volume', 'cubage']),
    goodsNumber: getOrderNumberField(order, ['goodsNumber', 'pieces']) || 1,
    source: PICKUP_TIME_SOURCE
  }
}

export function createOrderPickupScheduleView(
  order: OrderDetail,
  response: OrderPickupTimeResponse
): OrderPickupScheduleView {
  const dates = (response.openingList ?? [])
    .map(item => normalizePickupDate(item.date, item.dateList ?? []))
    .filter((item): item is OrderPickupDateView => !!item)

  return {
    orderNumber: order.orderNumber,
    currentTime: getOrderTextField(order, ['beginAcceptTime']),
    message:
      response.openingMessage?.trim() ||
      (response.opening ? '请选择期望上门时间' : '当前地址暂无可预约时间'),
    dates
  }
}

export async function queryOrderPickupSchedule(
  order: OrderDetail,
  options: OrderDetailActionOptions = {}
): Promise<DepponResponse<OrderPickupScheduleView>> {
  if (!canScheduleOrderPickup(order, options)) {
    return createServiceFailure('当前订单暂不支持修改上门时间')
  }

  const request = buildOrderPickupTimeRequest(order)

  if (!request) {
    return createServiceFailure('寄件地址不完整，暂无法获取上门时间')
  }

  const response = await orderApi.queryPickupTimes(request)

  if (!response.status || !response.result) {
    return createServiceFailure(response.message || '暂未获取到可预约时间')
  }

  const result = createOrderPickupScheduleView(order, response.result)

  if (!response.result.opening || !result.dates.length) {
    return createServiceFailure(result.message || '当前地址暂无可预约时间')
  }

  return {
    ...response,
    result
  }
}

export function dispatchOrderPickup(
  data: OrderDispatchRequest
): Promise<DepponResponse<boolean>> {
  const orderNumber = data.orderNumber.trim()
  const beginAcceptTime = data.beginAcceptTime.trim()

  if (!orderNumber) {
    return Promise.resolve(createServiceFailure('缺少订单号，无法预约上门'))
  }

  if (!beginAcceptTime) {
    return Promise.resolve(createServiceFailure('请选择期望上门时间'))
  }

  return orderApi.dispatchOrder({
    orderNumber,
    beginAcceptTime,
    queryFlag: data.queryFlag
  })
}
