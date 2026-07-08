import { createExpressDraft } from '../express'

import type {
  ConsigneeOrderItem,
  OrderDetail,
  OrderListItem,
  SenderOrderItem,
  WaybillDetailRaw
} from './types'
import type {
  ExpressCollectionType,
  ExpressContact,
  ExpressDeliveryMode,
  ExpressDraft,
  ExpressPaymentType,
  ExpressProductCode
} from '../express'

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

const EXPRESS_PRODUCT_CODES = new Set<ExpressProductCode>([
  '',
  'PACKAGE',
  'DEAP',
  'RCP',
  'PCP',
  'DCZP',
  'DJBK',
  'DJTK',
  'XJBK',
  'XJTK',
  'XJTH',
  'DJTH',
  'YTY'
])

const EXPRESS_PAYMENT_TYPES = new Set<ExpressPaymentType>([
  'MP',
  'PAY_ARIIVE',
  'MONTH_PAY'
])

const EXPRESS_DELIVERY_MODES = new Set<ExpressDeliveryMode>([
  '',
  'PICKNOTUPSTAIRS',
  'PICKSELF',
  'PICKUPSTAIRS',
  'BIGUPSTAIRS'
])

const EXPRESS_COLLECTION_TYPES = new Set<ExpressCollectionType>([
  '',
  'NORMAL',
  'INTRADAY'
])

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatDateTime(value: string | number | Date | null | undefined) {
  if (!value) {
    return ''
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function getOrderClassLabel(orderClass: number, fallback?: string) {
  return ORDER_CLASS_LABELS[orderClass] || fallback || '未知状态'
}

function getConsigneeOrderClass(statusName: string) {
  return CONSIGNEE_STATUS_TO_CLASS[statusName] ?? 1
}

function asExpressProductCode(value: unknown): ExpressProductCode {
  return typeof value === 'string' &&
    EXPRESS_PRODUCT_CODES.has(value as ExpressProductCode)
    ? (value as ExpressProductCode)
    : ''
}

function asExpressPaymentType(
  value: unknown,
  fallback: ExpressPaymentType
): ExpressPaymentType {
  return typeof value === 'string' &&
    EXPRESS_PAYMENT_TYPES.has(value as ExpressPaymentType)
    ? (value as ExpressPaymentType)
    : fallback
}

function asExpressDeliveryMode(
  value: unknown,
  fallback: ExpressDeliveryMode
): ExpressDeliveryMode {
  return typeof value === 'string' &&
    EXPRESS_DELIVERY_MODES.has(value as ExpressDeliveryMode)
    ? (value as ExpressDeliveryMode)
    : fallback
}

function asExpressCollectionType(
  value: unknown,
  fallback: ExpressCollectionType
): ExpressCollectionType {
  return typeof value === 'string' &&
    EXPRESS_COLLECTION_TYPES.has(value as ExpressCollectionType)
    ? (value as ExpressCollectionType)
    : fallback
}

export function asNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : fallback
}

function asText(value: unknown) {
  return typeof value === 'string' ? value : ''
}

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

export function normalizeConsigneeOrder(
  item: ConsigneeOrderItem
): OrderListItem {
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

export function normalizeWaybillDetail(detail: WaybillDetailRaw): OrderDetail {
  return {
    ...detail,
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

export function createExpressDraftFromOrderDetail(
  order: OrderDetail,
  mode: OrderResendMode = 'repeat'
): ExpressDraft {
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
      insuredAmount: Math.max(0, asNumber(order.insuredAmount)),
      reviceMoneyAmount: Math.max(0, asNumber(order.reviceMoneyAmount))
    },
    service: {
      ...draft.service,
      transportMode: productCode,
      deliveryMode: asExpressDeliveryMode(
        order.deliveryType,
        draft.service.deliveryMode
      ),
      paymentType: asExpressPaymentType(
        order.paymentType,
        draft.service.paymentType
      ),
      reciveLoanType: asExpressCollectionType(
        order.reciveLoanType,
        draft.service.reciveLoanType
      )
    },
    quoteStaleReason: isReturn
      ? '一键回寄，请重新获取价格'
      : '再来一单，请重新获取价格'
  }
}
