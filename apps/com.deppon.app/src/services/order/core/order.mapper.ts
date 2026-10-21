import { createExpressDraft } from '../../express'

import type { ConsigneeOrderItem, OrderDetail, OrderListItem, SenderOrderItem, WaybillDetailRaw } from './types'
import type { ExpressCollectionType, ExpressContact, ExpressDeliveryMode, ExpressDraft, ExpressPaymentType, ExpressProductCode } from '../../express'

export type OrderResendMode = 'repeat' | 'return'

const ORDER_CLASS_LABELS: Record<number, string> = {
  [-1]: '异常',
  0: '待揽件',
  1: '运输中',
  2: '已签收',
  3: '已退回',
  4: '已撤销',
  5: '已作废',
  6: '派送中',
  99: '已失效'
}

const CONSIGNEE_STATUS_TO_CLASS: Record<string, number> = {
  待揽收: 0,
  运输中: 1,
  已签收: 2,
  已退回: 3,
  已取消: 4,
  已作废: 5
}

const EXPRESS_PRODUCT_CODES = new Set<ExpressProductCode>(['', 'PACKAGE', 'DEAP', 'RCP', 'PCP', 'DCZP', 'DJBK', 'DJTK', 'XJBK', 'XJTK', 'XJTH', 'DJTH', 'YTY'])

const EXPRESS_PAYMENT_TYPES = new Set<ExpressPaymentType>(['MP', 'PAY_ARIIVE', 'MONTH_PAY'])

const EXPRESS_DELIVERY_MODES = new Set<ExpressDeliveryMode>(['', 'PICKNOTUPSTAIRS', 'PICKSELF', 'PICKUPSTAIRS', 'BIGUPSTAIRS'])

const EXPRESS_COLLECTION_TYPES = new Set<ExpressCollectionType>(['', 'NORMAL', 'INTRADAY'])

/**
 *
 * @param value 数字
 * @description 数字补零为两位字符串
 */
function pad(value: number) {
  return String(value).padStart(2, '0')
}

/**
 *
 * @param value 时间值
 * @description 格式化为 yyyy-MM-dd HH:mm
 */
function formatDateTime(value: string | number | Date | null | undefined) {
  if (!value) {
    return ''
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 *
 * @param orderClass 订单分类码
 * @param fallback 兜底文案
 * @description 取订单分类对应文案
 */
export function getOrderClassLabel(orderClass: number, fallback?: string) {
  return ORDER_CLASS_LABELS[orderClass] || fallback || '未知状态'
}

/**
 *
 * @param statusName 状态文案
 * @description 收件状态文案转订单分类码
 */
function getConsigneeOrderClass(statusName: string) {
  return CONSIGNEE_STATUS_TO_CLASS[statusName] ?? 1
}

/**
 *
 * @param value 产品 code
 * @description 校验并归一寄件产品 code
 */
function asExpressProductCode(value: unknown): ExpressProductCode {
  return typeof value === 'string' && EXPRESS_PRODUCT_CODES.has(value as ExpressProductCode) ? (value as ExpressProductCode) : ''
}

/**
 *
 * @param value 付款方式
 * @param fallback 兜底付款方式
 * @description 校验并归一付款方式
 */
function asExpressPaymentType(value: unknown, fallback: ExpressPaymentType): ExpressPaymentType {
  return typeof value === 'string' && EXPRESS_PAYMENT_TYPES.has(value as ExpressPaymentType) ? (value as ExpressPaymentType) : fallback
}

/**
 *
 * @param value 送货方式
 * @param fallback 兜底送货方式
 * @description 校验并归一送货方式
 */
function asExpressDeliveryMode(value: unknown, fallback: ExpressDeliveryMode): ExpressDeliveryMode {
  return typeof value === 'string' && EXPRESS_DELIVERY_MODES.has(value as ExpressDeliveryMode) ? (value as ExpressDeliveryMode) : fallback
}

/**
 *
 * @param value 代收货款类型
 * @param fallback 兜底类型
 * @description 校验并归一代收货款类型
 */
function asExpressCollectionType(value: unknown, fallback: ExpressCollectionType): ExpressCollectionType {
  return typeof value === 'string' && EXPRESS_COLLECTION_TYPES.has(value as ExpressCollectionType) ? (value as ExpressCollectionType) : fallback
}

/**
 *
 * @param value 待转换值
 * @param fallback 兜底数值
 * @description 转为数字，非法值取兜底
 */
export function asNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : fallback
}

/**
 *
 * @param value 待转换值
 * @description 非字符串值统一返回空串
 */
function asText(value: unknown) {
  return typeof value === 'string' ? value : ''
}

/**
 *
 * @param item 寄件订单原始数据
 * @description 归一寄件订单为列表项
 */
export function normalizeSenderOrder(item: SenderOrderItem): OrderListItem {
  const orderClass = Number(item.orderClassification)

  return {
    role: 'sender',
    senderCity: item.contactCity,
    senderName: item.contactName,
    consigneeCity: item.receiverCustCity,
    consigneeName: item.receiveName,
    waybillNumber: item.waybillNumber,
    orderNumber: item.orderNumber,
    orderStatus: item.orderStatus,
    orderClass,
    orderClassName: getOrderClassLabel(orderClass),
    orderTime: formatDateTime(item.newOrderTime || item.orderTime),
    orderPrice: item.totalFee ?? 0,
    isExpress: item.tableType === 'EXPRESS' || item.tableType === '2',
    isDispatch: item.dispatchFlag === 'Y',
    isAllowCancel: !!item.modifyFlag
  }
}

/**
 *
 * @param item 收件订单原始数据
 * @description 归一收件订单为列表项
 */
export function normalizeConsigneeOrder(item: ConsigneeOrderItem): OrderListItem {
  const orderClass = getConsigneeOrderClass(item.statustype)

  return {
    role: 'receive',
    senderCity: item.sendcity,
    senderName: item.sender,
    consigneeCity: item.consigncity,
    consigneeName: item.consignee,
    waybillNumber: item.billno,
    orderNumber: item.orderNo || '',
    orderStatus: item.currentStatus,
    orderClass,
    orderClassName: getOrderClassLabel(orderClass, item.currentStatus),
    orderTime: formatDateTime(item.newStatusTime || item.statusTime),
    orderPrice: 0,
    isExpress: true,
    isDispatch: true,
    isAllowCancel: false
  }
}

/**
 *
 * @param detail 运单详情原始数据
 * @description 归一运单详情字段
 */
export function normalizeWaybillDetail(detail: WaybillDetailRaw): OrderDetail {
  return {
    ...detail,
    signTime: detail.signTime ?? detail.signVoucherTime ?? null,
    signVoucherTime: detail.signVoucherTime ?? detail.signTime ?? null,
    paymentType: detail.payment,
    goodsNumber: detail.pieces,
    totalVolume: detail.cubage,
    transportMode: detail.transportMode,
    contactProvince: detail.senderProvinceName,
    contactArea: detail.senderDistrictName,
    contactTown: detail.senderTownName,
    contactAddress: detail.contactAddressWechat,
    receiverName: detail.receiverCustName,
    receiverMobile: detail.receiveMobile,
    receiverProvince: detail.consigneeProvinceName,
    receiverCity: detail.receiveCity,
    receiverArea: detail.consigneeDistrictName,
    receiverTown: detail.receiverTownName,
    receiverAddress: detail.receiveAddressWechat,
    courierName: detail.exDepartureCourierName,
    courierMobile: detail.exDepartureCourierPhone,
    modifyFlag: detail.productCodeFlag
  }
}

/**
 *
 * @param order 订单详情
 * @description 构造寄件人联系信息
 */
function createOrderSenderContact(order: OrderDetail): ExpressContact {
  return {
    name: asText(order.contactName),
    mobile: asText(order.contactMobile),
    province: asText(order.contactProvince),
    city: asText(order.contactCity),
    county: asText(order.contactArea),
    town: asText(order.contactTown),
    address: asText(order.contactAddress)
  }
}

/**
 *
 * @param order 订单详情
 * @description 构造收件人联系信息
 */
function createOrderReceiverContact(order: OrderDetail): ExpressContact {
  return {
    name: asText(order.receiverName),
    mobile: asText(order.receiverMobile),
    province: asText(order.receiverProvince),
    city: asText(order.receiverCity),
    county: asText(order.receiverArea),
    town: asText(order.receiverTown),
    address: asText(order.receiverAddress)
  }
}

/**
 *
 * @param order 订单详情
 * @param mode 重下单模式
 * @description 由订单详情生成寄件草稿
 */
export function createExpressDraftFromOrderDetail(order: OrderDetail, mode: OrderResendMode = 'repeat'): ExpressDraft {
  const draft = createExpressDraft()
  const productCode = asExpressProductCode(order.transportMode)
  const sender = createOrderSenderContact(order)
  const consignee = createOrderReceiverContact(order)
  const isReturn = mode === 'return'

  return {
    ...draft,
    sender: isReturn ? consignee : sender,
    consignee: isReturn ? sender : consignee,
    goods: {
      ...draft.goods,
      name: asText(order.goodsName),
      count: Math.max(1, asNumber(order.goodsNumber, draft.goods.count)),
      weight: Math.max(1, asNumber(order.totalWeight, draft.goods.weight)),
      volume: Math.max(0, asNumber(order.totalVolume, draft.goods.volume)),
      insuredAmount: Math.max(0, asNumber(order.insuredAmount))
    },
    service: {
      ...draft.service,
      transportMode: productCode,
      deliveryMode: asExpressDeliveryMode(order.deliveryType, draft.service.deliveryMode),
      paymentType: asExpressPaymentType(order.paymentType, draft.service.paymentType)
    },
    collection: isReturn
      ? draft.collection
      : {
          ...draft.collection,
          type: asExpressCollectionType(order.reciveLoanType, draft.collection.type),
          amount: Math.max(0, asNumber(order.reviceMoneyAmount)),
          account: asText(order.reciveLoanAccount),
          accountName: asText(order.reciveLoanAccountName)
        },
    quoteStaleReason: isReturn ? '一键回寄，请重新获取价格' : '再来一单，请重新获取价格'
  }
}
