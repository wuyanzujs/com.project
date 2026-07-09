import {
  createRouteUrl,
  getDetailWaybillNumber,
  getOrderClass,
  getOrderNumberField,
  getOrderTextField,
  isWaitAllotOrder
} from './order.detailRules'
import {
  formatAmount,
  formatMeasure,
  getFullAddress,
  hasDisplayText,
  isEncryptedText,
  maskMobile,
  toDisplayText
} from './order.display'
import { getOrderClassLabel } from './order.mapper'
import { APP_ROUTES } from '../../shared/navigation/routes'

import type {
  OrderDetail,
  OrderDetailActionOptions,
  OrderRole,
  OrderStubEntryView,
  OrderStubFieldView,
  OrderStubNoticeView,
  OrderStubPartyRole,
  OrderStubPartyView,
  OrderStubSectionView,
  OrderStubView
} from './types'

export function getOrderIdentityText(order: {
  orderNumber?: string | null
  waybillNumber?: string | null
}) {
  if (order.waybillNumber) {
    return `运单号 ${order.waybillNumber}`
  }

  if (order.orderNumber) {
    return `订单号 ${order.orderNumber}`
  }

  return '暂无单号'
}

export function getOrderCopyNumber(order: {
  orderNumber?: string | null
  waybillNumber?: string | null
}) {
  return order.waybillNumber || order.orderNumber || ''
}

export function getOrderSenderAddress(order: OrderDetail) {
  return getFullAddress([
    order.contactProvince,
    order.contactCity,
    order.contactArea,
    order.contactTown,
    order.contactAddress
  ])
}

export function getOrderReceiverAddress(order: OrderDetail) {
  return getFullAddress([
    order.receiverProvince,
    order.receiverCity,
    order.receiverArea,
    order.receiverTown,
    order.receiverAddress
  ])
}

function getOrderStubTitle(order: OrderDetail) {
  return isWaitAllotOrder(order) ? '订单详情' : '电子存根'
}

function getOrderStubStatus(order: OrderDetail) {
  const orderClass = getOrderClass(order)

  return (
    order.orderClassName ||
    order.orderStatus ||
    (orderClass === null ? '' : getOrderClassLabel(orderClass)) ||
    '订单状态'
  )
}

function getOrderStubOrderNumber(order: OrderDetail) {
  const orderNumber = order.orderNumber || ''

  if (orderNumber.includes('_')) {
    return orderNumber.split('_')[0]
  }

  return orderNumber
}

function getOrderStubParty(
  role: OrderStubPartyRole,
  order: OrderDetail
): OrderStubPartyView {
  const isSender = role === 'sender'
  const name = toDisplayText(
    isSender ? order.contactName : order.receiverName
  )
  const mobile = isSender ? order.contactMobile : order.receiverMobile
  const address = isSender
    ? getOrderSenderAddress(order)
    : getOrderReceiverAddress(order)
  const displayMobile = maskMobile(mobile)
  const copyText = [name === '--' ? '' : name, displayMobile, address]
    .filter(Boolean)
    .join(' ')

  return {
    role,
    label: isSender ? '寄件人' : '收件人',
    name,
    mobile: displayMobile,
    address: address || '--',
    copyText,
    encrypted: isEncryptedText(mobile)
  }
}

function createOrderStubField(
  label: string,
  value: unknown,
  options: Pick<OrderStubFieldView, 'copyValue' | 'important'> = {}
): OrderStubFieldView {
  return {
    label,
    value: toDisplayText(value),
    ...options
  }
}

function createOptionalOrderStubField(
  label: string,
  value: unknown,
  options: Pick<OrderStubFieldView, 'copyValue' | 'important'> = {}
): OrderStubFieldView | null {
  if (!hasDisplayText(value)) {
    return null
  }

  return createOrderStubField(label, value, options)
}

function createOrderStubSection(
  title: string,
  fields: Array<OrderStubFieldView | null>
): OrderStubSectionView | null {
  const visibleFields = fields.filter(
    (item): item is OrderStubFieldView => !!item
  )

  return visibleFields.length
    ? {
        title,
        fields: visibleFields
      }
    : null
}

function compactOrderStubSections(
  sections: Array<OrderStubSectionView | null>
) {
  return sections.filter((item): item is OrderStubSectionView => !!item)
}

function createOrderStubRoute(order: OrderDetail, role?: OrderRole) {
  return createRouteUrl(APP_ROUTES.orderStub, {
    orderNumber: order.orderNumber || '',
    waybillNumber: getDetailWaybillNumber(order),
    role: role || '',
    source: 'ORDER_DETAIL'
  })
}

export function createOrderStubEntry(
  order: OrderDetail,
  options: OrderDetailActionOptions = {}
): OrderStubEntryView {
  if (options.publicTrackMode) {
    return {
      available: false,
      title: '电子存根',
      summary: '公开轨迹暂不展示完整订单存根',
      route: '',
      disabledReason: '公开轨迹暂不展示完整订单存根'
    }
  }

  if (!order.orderNumber && !getDetailWaybillNumber(order)) {
    return {
      available: false,
      title: '电子存根',
      summary: '缺少订单号或运单号，暂无法查看',
      route: '',
      disabledReason: '缺少订单号或运单号'
    }
  }

  return {
    available: true,
    title: getOrderStubTitle(order),
    summary: '查看寄收信息、货物明细、费用和订单编号',
    route: createOrderStubRoute(order, options.role)
  }
}

function createOrderStubBasicSection(order: OrderDetail) {
  const chargeWeight = getOrderNumberField(order, [
    'orderChargeWeight',
    'chargedWeight'
  ])
  const chargeType = getOrderTextField(order, [
    'orderChargeType',
    'chargingType'
  ])

  return createOrderStubSection('货物信息', [
    createOrderStubField('货物名称', order.goodsName),
    createOrderStubField(
      '货物件数',
      formatMeasure(order.goodsNumber, '件')
    ),
    createOrderStubField('货物重量', formatMeasure(order.totalWeight, 'kg')),
    createOrderStubField('货物体积', formatMeasure(order.totalVolume, 'm³')),
    createOptionalOrderStubField(
      '计费重量',
      chargeWeight ? `${chargeWeight}kg` : ''
    ),
    createOptionalOrderStubField('计费方式', chargeType),
    createOptionalOrderStubField(
      '产品类型',
      getOrderTextField(order, ['productName', 'transportMode', 'tranProperty'])
    ),
    createOptionalOrderStubField(
      '付款方式',
      getOrderTextField(order, ['paymentName', 'paymentType', 'payment'])
    ),
    createOptionalOrderStubField(
      '提货方式',
      getOrderTextField(order, ['deliveryName', 'deliveryType'])
    ),
    createOptionalOrderStubField(
      '签收单',
      getOrderTextField(order, ['returnName', 'returnTypeName'])
    )
  ])
}

function createOrderStubChargeSection(order: OrderDetail) {
  const serviceChargeList = Array.isArray(order.serviceChargeList)
    ? order.serviceChargeList
    : []
  const serviceFields = serviceChargeList
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const record = item as Record<string, unknown>
      const label = toDisplayText(record.feeName, '')
      const amount = formatAmount(record.feeMoney)

      return label && amount ? createOrderStubField(label, amount) : null
    })
    .filter((item): item is OrderStubFieldView => !!item)

  return createOrderStubSection('费用信息', [
    createOptionalOrderStubField(
      '基础费用',
      formatAmount(getOrderNumberField(order, ['totalCharge', 'totalFee']))
    ),
    createOptionalOrderStubField(
      '保价',
      formatAmount(getOrderNumberField(order, ['insurance', 'insuredAmount']))
    ),
    createOptionalOrderStubField(
      '代收货款',
      formatAmount(
        getOrderNumberField(order, ['collectionAmount', 'reviceMoneyAmount'])
      )
    ),
    ...serviceFields,
    createOptionalOrderStubField(
      '费用合计',
      formatAmount(getOrderNumberField(order, ['orderCharge', 'totalFee'])),
      {
        important: true
      }
    )
  ])
}

function createOrderStubOrderSection(order: OrderDetail) {
  const orderNumber = getOrderStubOrderNumber(order)
  const waybillNumber = getDetailWaybillNumber(order)

  return createOrderStubSection('订单信息', [
    createOptionalOrderStubField('运单号', waybillNumber, {
      copyValue: waybillNumber,
      important: true
    }),
    createOptionalOrderStubField('订单号', orderNumber, {
      copyValue: orderNumber
    }),
    createOptionalOrderStubField(
      '开单时间',
      getOrderTextField(order, ['billingTime', 'openBillTime'])
    ),
    createOptionalOrderStubField(
      '下单时间',
      getOrderTextField(order, ['orderCreateTime', 'orderTime'])
    ),
    createOptionalOrderStubField(
      '给快递员捎话',
      getOrderTextField(order, ['message', 'remark'])
    )
  ])
}

function createOrderStubNotices(order: OrderDetail): OrderStubNoticeView[] {
  const notices: OrderStubNoticeView[] = []

  if (
    isEncryptedText(order.contactMobile) ||
    isEncryptedText(order.receiverMobile) ||
    order.isEncry === true
  ) {
    notices.push({
      title: '隐私保护',
      content: '此单包含隐私保护信息，页面会按后端返回和 App 规则隐藏部分内容。',
      tone: 'warning'
    })
  }

  notices.push({
    title: '存根范围',
    content: '首期展示结构化订单存根、照片凭证和电子合同状态；合同完成后可通过受控 WebView 查看，保存下载后续由 App 文件能力承接。',
    tone: 'info'
  })

  return notices
}

function createOrderStubSizeView(order: OrderDetail) {
  const rawSize = getOrderTextField(order, ['goodsSize'])
  const parts = rawSize
    .split('+')
    .map((item) => item.trim())
    .filter(Boolean)

  if (!parts.length) {
    return {
      available: false,
      rows: [],
      notice: ''
    }
  }

  return {
    available: true,
    rows:
      parts.length > 1
        ? parts.map(
            (item, index) =>
              `尺寸${index + 1}：${item}${index === 0 ? '（单位cm）' : ''}`
          )
        : [`尺寸：${parts[0]}（单位cm）`],
    notice: '若代打木箱/木架，“1.4”为打包装后膨胀体积系数。'
  }
}

export function createOrderStubView(order: OrderDetail): OrderStubView {
  const waybillNumber = getDetailWaybillNumber(order)
  const orderNumber = getOrderStubOrderNumber(order)

  return {
    title: getOrderStubTitle(order),
    subtitle: getOrderIdentityText(order),
    statusText: getOrderStubStatus(order),
    barcodeText: waybillNumber || orderNumber || 'NO-DATA',
    copyNumber: getOrderCopyNumber(order),
    orderNumber: orderNumber || '--',
    waybillNumber: waybillNumber || '--',
    sender: getOrderStubParty('sender', order),
    receiver: getOrderStubParty('receiver', order),
    size: createOrderStubSizeView(order),
    sections: compactOrderStubSections([
      createOrderStubBasicSection(order),
      createOrderStubChargeSection(order),
      createOrderStubOrderSection(order)
    ]),
    notices: createOrderStubNotices(order)
  }
}
