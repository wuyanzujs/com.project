import { orderApi } from './order.api'
import {
  createOrderDetailActions,
  createOrderUrgeContext,
  createUrgeProgressWebUri
} from './order.detailActions'
import {
  asNumber,
  getOrderClassLabel,
  normalizeConsigneeOrder,
  normalizeSenderOrder,
  normalizeWaybillDetail
} from './order.mapper'
import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'
import { APP_ROUTES } from '../../shared/navigation/routes'
import { getCurrentEcoToken } from '../auth'

import type {
  OrderDetail,
  OrderDetailActionOptions,
  OrderDetailActionView,
  OrderContractStatus,
  OrderDepartmentPhoneActionView,
  OrderDetailUrgeActionView,
  OrderDetailUrgePanelView,
  OrderInvalidWaybillResult,
  OrderListOptions,
  OrderListResult,
  OrderRole,
  OrderServiceImageScene,
  OrderStubEntryView,
  OrderStubFieldView,
  OrderStubImageGroupView,
  OrderStubImagesView,
  OrderStubImageView,
  OrderStubDocumentView,
  OrderStubPackageFeeGroupView,
  OrderStubPackageFeeItemView,
  OrderStubPackageFeeView,
  OrderStubNoticeView,
  OrderStubPartyRole,
  OrderStubPartyView,
  OrderStubSectionView,
  OrderStubView,
  OrderUrgeButtonRaw,
  WaybillTrackListResponse
} from './types'
import type { DepponResponse } from '../../request/deppon'

export {
  createExpressDraftFromOrderDetail,
  getOrderClassLabel
} from './order.mapper'

export type { OrderResendMode } from './order.mapper'

interface OrderTrackQueryOptions {
  loading?: boolean
  login?: boolean
}

const DEFAULT_PAGE_SIZE = 10
const DEFAULT_RANGE_DAYS = 30

const DELETABLE_ORDER_CLASSES = new Set([2, 3, 4, 5, 99])
const ORDER_DETAIL_WEB_PARAM_SOURCE = 'APP_ORDER_DETAIL'
const WAYBILL_MODIFY_WEB_PATH = '/depponmobile/mow/order/modifyNew/index'
const INVALID_TO_MODIFY_MESSAGE =
  '货物已经出发，不可作废，可在运单修改中操作拦截'
const DEFAULT_SERVICE_PHONE = '95353'

const EXPRESS_SERVICE_IMAGE_SCENES: Record<OrderServiceImageScene, string> = {
  1: 'RETURNBILLTYPE_FAX',
  2: 'SUBSIDY_PHOTO',
  3: 'OPEN_PACKING',
  4: 'CHECK_CODE_GOODS',
  5: 'PASTING_SERVER_PICTURE',
  6: 'DOUBLE_DELIVERY_PHOTO',
  7: 'PICKUP_TAKE_PHOTO'
}

const LOGISTICS_SERVICE_IMAGE_SCENES: Record<OrderServiceImageScene, string> = {
  1: 'PDC_RETURNBILL',
  2: '7',
  3: '4',
  4: '6',
  5: 'PASTING_SERVER_PICTURE',
  6: 'DOUBLE_DELIVERY_PHOTO',
  7: 'PICKUP_TAKE_PHOTO'
}

const ORDER_CONTRACT_STATUS_LABELS: Record<string, string> = {
  SENT: '合同签署中',
  REJECT: '合同已拒签',
  COMPLETE: '合同已完成',
  REVOKE_CANCEL: '合同已撤回',
  OVERDUE: '合同逾期未签',
  IN_SEND_APPROVAL: '合同发送前审批中',
  SEND_APPROVAL_NOT_PASSED: '合同审批被驳回',
  INVALID: '合同已作废'
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatRequestDateTime(date: Date) {
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`
}

export function getOrderDateRange(days = DEFAULT_RANGE_DAYS) {
  const endDate = new Date()
  const startDate = new Date()
  const rangeDays =
    Number.isFinite(days) && days > 0 ? days : DEFAULT_RANGE_DAYS

  endDate.setHours(23, 59, 59, 0)
  startDate.setDate(startDate.getDate() - rangeDays)
  startDate.setHours(0, 0, 0, 0)

  return {
    startTime: formatRequestDateTime(startDate),
    endTime: formatRequestDateTime(endDate)
  }
}

function getDefaultDateRange() {
  return getOrderDateRange()
}

function createFailure<TResult>(message: string): DepponResponse<TResult> {
  return {
    status: false,
    message,
    result: null
  }
}

function hasText(value: unknown) {
  return (
    (typeof value === 'string' && value.trim() !== '') ||
    typeof value === 'number'
  )
}

function toDisplayText(value: unknown, fallback = '--') {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : fallback
  }

  if (typeof value === 'string') {
    const text = value.trim()

    return text || fallback
  }

  return fallback
}

function getOrderTextField(order: OrderDetail, keys: string[]) {
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

function getOrderNumberField(order: OrderDetail, keys: string[]) {
  for (const key of keys) {
    const value = order[key]
    const numberValue = Number(value)

    if (Number.isFinite(numberValue) && numberValue > 0) {
      return numberValue
    }
  }

  return 0
}

function formatMeasure(value: unknown, unit: string) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return '--'
  }

  return `${numberValue}${unit}`
}

function formatAmount(value: unknown) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return ''
  }

  return `¥${numberValue.toFixed(2)}`
}

function formatPlainAmount(value: unknown) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return ''
  }

  return numberValue.toFixed(2)
}

function maskMobile(value: string | null | undefined) {
  if (!value) {
    return '--'
  }

  const text = value.trim()

  if (!text || text.includes('*')) {
    return text || '--'
  }

  const digits = text.replace(/\D/g, '')

  if (digits.length >= 11) {
    return text.replace(digits, `${digits.slice(0, 3)}****${digits.slice(-4)}`)
  }

  if (digits.length >= 7) {
    return text.replace(digits, `${digits.slice(0, 2)}***${digits.slice(-2)}`)
  }

  return text
}

function isEncryptedText(value: string | null | undefined) {
  return !!value && value.includes('*')
}

function createQuery(params: Record<string, string>) {
  return Object.entries(params)
    .filter(([, value]) => value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
}

function appendQuery(path: string, params: Record<string, string>) {
  const query = createQuery(params)

  if (!query) {
    return path
  }

  return `${path}${path.includes('?') ? '&' : '?'}${query}`
}

function createOrderDetailWebUri(
  path: string,
  params: Record<string, string> = {}
) {
  return appendQuery(path, {
    sonSource: ORDER_DETAIL_WEB_PARAM_SOURCE,
    ecoToken: getCurrentEcoToken(),
    pageSource: APP_RUNTIME_CONFIG.systemCode,
    ...params
  })
}

function createRouteUrl(route: string, params: Record<string, string>) {
  const query = createQuery(params)

  return query ? `${route}?${query}` : route
}

function getOrderClass(order: OrderDetail) {
  const orderClass = Number(order.orderClassification)

  return Number.isFinite(orderClass) ? orderClass : null
}

function getOrderStatusText(order: OrderDetail) {
  return [order.orderClassName, order.orderStatus]
    .filter((item): item is string => typeof item === 'string')
    .join('')
}

function isSignedOrder(order: OrderDetail) {
  return getOrderClass(order) === 2 || getOrderStatusText(order).includes('签收')
}

function getDetailWaybillNumber(order: OrderDetail) {
  return order.waybillNumber || ''
}

function getOrderTableType(order: OrderDetail) {
  return getOrderTextField(order, ['orderTableType', 'tableType'])
}

function isWaitAllotOrder(order: OrderDetail) {
  return getOrderClass(order) === 0
}

function isTransitOrder(order: OrderDetail) {
  return getOrderClass(order) === 1
}

function isExpressOrder(order: OrderDetail) {
  const tableType = getOrderTableType(order)

  return !tableType || tableType === '2' || tableType === 'EXPRESS'
}

function createUrgePanel(
  content: string,
  menus: OrderUrgeButtonRaw[] | null | undefined
): OrderDetailUrgePanelView {
  return {
    content,
    menus: menus?.length
      ? menus
      : [
          {
            buttonCode: 'CONFIRM',
            buttonName: '确定'
          }
        ]
  }
}

async function queryOrderUrgeAction(
  order: OrderDetail,
  options: OrderDetailActionOptions = {}
): Promise<OrderDetailActionView | null> {
  const urgeContext = createOrderUrgeContext(order, options)

  if (!urgeContext) {
    return null
  }

  const response = await orderApi.queryUrgeButtons(
    {
      waybillNo: urgeContext.voucherNumber,
      urgeType: urgeContext.urgeType
    },
    false
  )
  const button = response.result?.buttonList?.[0]

  if (!response.status || !button) {
    return null
  }

  const isProgress = button.buttonCode === 'VIEW_PROGRESS'

  return {
    kind: 'urge',
    title: button.buttonName || (isProgress ? '催单进度' : '我要催单'),
    summary: isProgress
      ? '查看当前催单处理进度'
      : '催促当前订单尽快处理',
    target: 'urge',
    tone: 'warning',
    badgeText: isProgress ? '进度' : '催单',
    webSource: 'ORDER_DETAIL_URGE_PROGRESS',
    webUri: createUrgeProgressWebUri(urgeContext),
    urge: {
      ...urgeContext,
      buttonCode: button.buttonCode
    },
    loginRequired: true
  }
}

async function queryOrderUrgePanel(
  urge: OrderDetailUrgeActionView
): Promise<DepponResponse<OrderDetailUrgePanelView>> {
  const response = await orderApi.queryUrgeMenus({
    waybillNo: urge.voucherNumber,
    urgeType: urge.urgeType
  })

  if (!response.status || !response.result?.speech) {
    return createFailure(response.message || '暂未获取到催单提示')
  }

  return {
    ...response,
    result: createUrgePanel(
      response.result.speech,
      response.result.buttonList
    )
  }
}

async function submitOrderUrge(
  urge: OrderDetailUrgeActionView
): Promise<DepponResponse<string>> {
  const response = await orderApi.submitUrge({
    caseNo: urge.voucherNumber,
    reportScene: urge.urgeType
  })
  const message =
    response.result?.errorMsg ||
    response.message ||
    (response.status ? '催单已提交' : '催单失败，请稍后再试')

  return {
    ...response,
    message,
    result: message
  }
}

async function notifyOrderDeliver(
  order: OrderDetail
): Promise<DepponResponse<boolean>> {
  const waybillNo = getDetailWaybillNumber(order)

  if (!waybillNo) {
    return Promise.resolve(createFailure<boolean>('缺少运单号，暂无法通知派送'))
  }

  return orderApi.notifyDeliver({
    waybillNo
  })
}

async function invalidOrderWaybill(
  order: OrderDetail
): Promise<DepponResponse<OrderInvalidWaybillResult>> {
  const waybillNumber = getDetailWaybillNumber(order)

  if (!waybillNumber) {
    return Promise.resolve(
      createFailure<OrderInvalidWaybillResult>('缺少运单号，暂无法拦截作废')
    )
  }

  const response = await orderApi.invalidWaybill({
    waybillNumber
  })
  const message =
    response.message ||
    (response.status ? '拦截作废成功' : '拦截作废失败，请稍后再试')
  const shouldModifyIntercept = message === INVALID_TO_MODIFY_MESSAGE

  return {
    ...response,
    message,
    result: {
      message,
      shouldModifyIntercept,
      modifyWebUri: createOrderDetailWebUri(WAYBILL_MODIFY_WEB_PATH, {
        waybillNumber
      })
    }
  }
}

async function resolveDepartmentPhone(
  department: OrderDepartmentPhoneActionView
): Promise<DepponResponse<string>> {
  if (department.phoneNumber) {
    return Promise.resolve({
      status: true,
      message: '',
      result: department.phoneNumber
    })
  }

  if (!department.stationCode) {
    return Promise.resolve({
      status: true,
      message: '',
      result: DEFAULT_SERVICE_PHONE
    })
  }

  const response = await orderApi.queryDepartmentPhone(department.stationCode)

  if (response.status && response.result) {
    return response
  }

  return {
    ...response,
    status: true,
    message: response.message || '暂未查询到营业部电话，已转服务热线',
    result: DEFAULT_SERVICE_PHONE
  }
}

function getFullAddress(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join('')
}

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
  if (!hasText(value)) {
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

function createOrderStubEntry(
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

function createOrderStubView(order: OrderDetail): OrderStubView {
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

function getOrderContractFileCode(order: OrderDetail) {
  return getOrderTextField(order, ['returnFileId', 'fileCode'])
}

function getOrderContractStatusText(status: OrderContractStatus) {
  return ORDER_CONTRACT_STATUS_LABELS[status] || '合同签署中'
}

function createContractPreviewUri(fileCode: string, waybillNumber: string) {
  return createRouteUrl(
    '/gwapi/onlineService/eco/online/secure/contractPreview',
    {
      fileCode,
      waybillNumber
    }
  )
}

function createContractPreviewRoute(fileCode: string, waybillNumber: string) {
  return createRouteUrl(APP_ROUTES.web, {
    source: 'ORDER_STUB_CONTRACT_PREVIEW',
    title: '电子合同',
    auth: 'Y',
    uri: createContractPreviewUri(fileCode, waybillNumber)
  })
}

function createOrderStubDocumentView(
  order: OrderDetail,
  status: OrderContractStatus
): OrderStubDocumentView {
  const fileCode = getOrderContractFileCode(order)
  const waybillNumber = getDetailWaybillNumber(order)
  const statusText = getOrderContractStatusText(status)
  const canPreview = status === 'COMPLETE' && !!fileCode && !!waybillNumber

  return {
    available: !!fileCode && !!waybillNumber,
    title: '电子合同.PDF',
    statusText,
    summary: canPreview
      ? '电子合同已签署，文件存储时间为 3 个月，请及时查看。'
      : '到达派送环节收件人签署单据后，可查看带签名的签收回单。',
    actionText: canPreview ? '查看合同' : '暂不可查看',
    canPreview,
    route: canPreview ? createContractPreviewRoute(fileCode, waybillNumber) : '',
    fileCode,
    waybillNumber
  }
}

async function queryOrderStubDocument(
  order: OrderDetail
): Promise<DepponResponse<OrderStubDocumentView>> {
  const contractId = getOrderContractFileCode(order)
  const waybillNumber = getDetailWaybillNumber(order)

  if (!contractId || !waybillNumber) {
    return Promise.resolve({
      status: true,
      message: '当前运单暂无电子合同票证',
      result: null
    })
  }

  const response = await orderApi.queryContractDetail({
    contractId,
    waybillNumber
  })
  const status = response.result?.status || 'SENT'

  return {
    ...response,
    status: true,
    message: response.message || '',
    result: createOrderStubDocumentView(order, status)
  }
}

function createPackageFeeGroup(
  title: string,
  nameTitle: string,
  countTitle: string,
  amountTitle: string
): OrderStubPackageFeeGroupView {
  return {
    title,
    nameTitle,
    countTitle,
    amountTitle,
    items: []
  }
}

function createPackageFeeItem(
  name: string,
  count: string,
  amount: unknown
): OrderStubPackageFeeItemView | null {
  const value = formatPlainAmount(amount)

  if (!value) {
    return null
  }

  return {
    name,
    count: count || '--',
    amount: `¥${value}`
  }
}

function addPackageFeeItem(
  group: OrderStubPackageFeeGroupView,
  item: OrderStubPackageFeeItemView | null
) {
  if (item) {
    group.items.push(item)
  }
}

function getOrderPackageCharge(order: OrderDetail) {
  const directCharge = getOrderNumberField(order, ['pickCharge'])

  if (directCharge) {
    return directCharge
  }

  const serviceChargeList = Array.isArray(order.serviceChargeList)
    ? order.serviceChargeList
    : []
  const pickCharge = serviceChargeList.find((item) => {
    return (
      !!item &&
      typeof item === 'object' &&
      (item as Record<string, unknown>).feeAttribute === 'pickCharge'
    )
  }) as Record<string, unknown> | undefined

  return pickCharge ? asNumber(pickCharge.feeMoney) : 0
}

async function queryOrderStubPackageFee(
  order: OrderDetail
): Promise<DepponResponse<OrderStubPackageFeeView>> {
  const waybillNumber = getDetailWaybillNumber(order)
  const packageCharge = getOrderPackageCharge(order)

  if (!waybillNumber || packageCharge <= 0) {
    return Promise.resolve({
      status: true,
      message: '当前运单暂无包装费用明细',
      result: {
        available: false,
        message: '当前运单暂无包装费用明细',
        totalAmount: '',
        groups: []
      }
    })
  }

  const response = await orderApi.queryPackagingFee({
    waybillNumber
  })

  if (!response.status || !response.result) {
    return {
      ...response,
      result: {
        available: false,
        message: response.message || '暂未查询到包装费用明细',
        totalAmount: formatAmount(packageCharge),
        groups: []
      }
    }
  }

  const detail = response.result
  const woodenGroup = createPackageFeeGroup(
    '木包装',
    '包装类型',
    '规格',
    '金额'
  )
  const cartonGroup = createPackageFeeGroup(
    '非木包装',
    '包装类型',
    '件数',
    '金额'
  )
  let totalPrice = 0

  if (detail.woodenFrameFee) {
    totalPrice += detail.woodenFrameFee
    addPackageFeeItem(
      woodenGroup,
      createPackageFeeItem(
        '木架',
        detail.standVolume ? `${detail.standVolume}m³` : '--',
        detail.woodenFrameFee
      )
    )
  }

  if (detail.woodenCaseFee) {
    totalPrice += detail.woodenCaseFee
    addPackageFeeItem(
      woodenGroup,
      createPackageFeeItem(
        '木箱',
        detail.boxVolume ? `${detail.boxVolume}m³` : '--',
        detail.woodenCaseFee
      )
    )
  }

  if (detail.swoodenPalletFee) {
    totalPrice += detail.swoodenPalletFee
    addPackageFeeItem(
      woodenGroup,
      createPackageFeeItem(
        '标准木托',
        detail.salverNum ? String(detail.salverNum) : '--',
        detail.swoodenPalletFee
      )
    )
  }

  if (detail.nwoodenPalletFee) {
    totalPrice += detail.nwoodenPalletFee
    addPackageFeeItem(
      woodenGroup,
      createPackageFeeItem(
        '非标准木托',
        detail.nonSalverNum ? String(detail.nonSalverNum) : '--',
        detail.nwoodenPalletFee
      )
    )
  }

  ;(detail.waybillPackageList ?? []).forEach((item) => {
    if (!item.thirdClassName || !item.calcAmount) {
      return
    }

    totalPrice += item.calcAmount
    addPackageFeeItem(
      cartonGroup,
      createPackageFeeItem(
        item.thirdClassName,
        item.packageTotal ? String(item.packageTotal) : '--',
        item.calcAmount
      )
    )
  })

  if (totalPrice > packageCharge) {
    return {
      ...response,
      status: true,
      result: {
        available: false,
        message: '包装费用明细暂未匹配当前运单金额',
        totalAmount: formatAmount(packageCharge),
        groups: []
      }
    }
  }

  if (totalPrice < packageCharge) {
    addPackageFeeItem(
      cartonGroup,
      createPackageFeeItem(
        '其他',
        '1',
        Math.floor((packageCharge - totalPrice) * 100) / 100
      )
    )
  }

  const groups = [woodenGroup, cartonGroup].filter(
    (group) => group.items.length > 0
  )

  return {
    ...response,
    status: true,
    result: {
      available: groups.length > 0,
      message: groups.length ? '' : '暂未查询到包装费用明细',
      totalAmount: formatAmount(packageCharge),
      groups
    }
  }
}

function normalizeImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const urls = value
    .map((item) => {
      if (typeof item !== 'string') {
        return ''
      }

      const url = item.trim()

      if (!url) {
        return ''
      }

      return url.startsWith('http://')
        ? url.replace('http://', 'https://')
        : url
    })
    .filter(Boolean)

  return Array.from(new Set(urls))
}

function createOrderStubImageGroup(
  kind: OrderStubImageGroupView['kind'],
  title: string,
  summary: string,
  urls: string[]
): OrderStubImageGroupView | null {
  if (!urls.length) {
    return null
  }

  return {
    kind,
    title,
    summary,
    images: urls.map<OrderStubImageView>((url, index) => ({
      id: `${kind}-${index}-${url}`,
      url
    }))
  }
}

function createEmptyImageResponse(): DepponResponse<string[]> {
  return {
    status: true,
    message: '',
    result: []
  }
}

function getOrderServiceImageScene(
  scene: OrderServiceImageScene,
  isLogistics: boolean
) {
  return isLogistics
    ? LOGISTICS_SERVICE_IMAGE_SCENES[scene]
    : EXPRESS_SERVICE_IMAGE_SCENES[scene]
}

function queryServiceImagesByScene(
  wayBill: string,
  scene: OrderServiceImageScene,
  isLogistics: boolean
) {
  const imageScene = getOrderServiceImageScene(scene, isLogistics)

  return orderApi.queryServiceImages(
    {
      wayBill,
      imageScene
    },
    isLogistics
  )
}

function normalizePackageImageUrls(value: unknown) {
  if (!value || typeof value !== 'object' || !('list' in value)) {
    return []
  }

  const list = (value as { list?: Array<{ savePath?: string | null }> | null })
    .list

  return normalizeImageUrls(
    Array.isArray(list) ? list.map((item) => item.savePath || '') : []
  )
}

function getSettledResponse<TResult>(
  result: PromiseSettledResult<DepponResponse<TResult>>
) {
  return result.status === 'fulfilled' ? result.value : null
}

async function queryOrderStubImages(
  order: OrderDetail
): Promise<DepponResponse<OrderStubImagesView>> {
  const wayBill = getDetailWaybillNumber(order)

  if (!wayBill) {
    return Promise.resolve({
      status: true,
      message: '缺少运单号，暂无法查询揽收/签收照片',
      result: {
        available: false,
        message: '缺少运单号，暂无法查询揽收/签收照片',
        groups: []
      }
    })
  }

  if (!isTransitOrder(order) && !isSignedOrder(order)) {
    return Promise.resolve({
      status: true,
      message: '运输中或已签收后可查看揽收/签收照片',
      result: {
        available: false,
        message: '运输中或已签收后可查看揽收/签收照片',
        groups: []
      }
    })
  }

  const isLogistics = !isExpressOrder(order)
  const [
    pickupResult,
    reweighResult,
    receiptResult,
    signResult,
    returnBillResult,
    subsidyResult,
    openPackingResult,
    checkCodeGoodsResult,
    pastingResult,
    homeDecorationResult,
    powerOnResult,
    doubleDeliveryResult,
    woodenPackageResult,
    homeExchangeResult,
    pickupServiceResult
  ] = await Promise.allSettled([
    orderApi.queryOpenBoxImages({ wayBill }),
    orderApi.queryOpenBoxImages({ wayBill, operationType: '10' }),
    orderApi.queryReceiptImages({ wayBill }),
    isLogistics
      ? queryServiceImagesByScene(wayBill, 2, isLogistics)
      : orderApi.querySignImages({ wayBill }),
    orderApi.queryReturnBillImages({ waybillNo: wayBill }),
    isLogistics
      ? Promise.resolve(createEmptyImageResponse())
      : queryServiceImagesByScene(wayBill, 2, isLogistics),
    queryServiceImagesByScene(wayBill, 3, isLogistics),
    queryServiceImagesByScene(wayBill, 4, isLogistics),
    queryServiceImagesByScene(wayBill, 5, isLogistics),
    orderApi.queryDecorationImages({ wayBill }),
    orderApi.queryPowerOnImages({ wayBill }, isLogistics),
    queryServiceImagesByScene(wayBill, 6, isLogistics),
    orderApi.queryPackageImages({ wayBill }),
    orderApi.queryHomeImages({ wayBill }),
    queryServiceImagesByScene(wayBill, 7, isLogistics)
  ])

  const pickupResponse = getSettledResponse(pickupResult)
  const reweighResponse = getSettledResponse(reweighResult)
  const receiptResponse = getSettledResponse(receiptResult)
  const signResponse = getSettledResponse(signResult)
  const returnBillResponse = getSettledResponse(returnBillResult)
  const subsidyResponse = getSettledResponse(subsidyResult)
  const openPackingResponse = getSettledResponse(openPackingResult)
  const checkCodeGoodsResponse = getSettledResponse(checkCodeGoodsResult)
  const pastingResponse = getSettledResponse(pastingResult)
  const homeDecorationResponse = getSettledResponse(homeDecorationResult)
  const powerOnResponse = getSettledResponse(powerOnResult)
  const doubleDeliveryResponse = getSettledResponse(doubleDeliveryResult)
  const woodenPackageResponse = getSettledResponse(woodenPackageResult)
  const homeExchangeResponse = getSettledResponse(homeExchangeResult)
  const pickupServiceResponse = getSettledResponse(pickupServiceResult)
  const failedMessage =
    [
      pickupResponse,
      reweighResponse,
      receiptResponse,
      signResponse,
      returnBillResponse,
      subsidyResponse,
      openPackingResponse,
      checkCodeGoodsResponse,
      pastingResponse,
      homeDecorationResponse,
      powerOnResponse,
      doubleDeliveryResponse,
      woodenPackageResponse,
      homeExchangeResponse,
      pickupServiceResponse
    ].find((item) => !!item?.message)?.message || ''
  const groups = [
    createOrderStubImageGroup(
      'pickup',
      '取货照片',
      '揽收、取货或开箱环节留存',
      normalizeImageUrls(pickupResponse?.result)
    ),
    createOrderStubImageGroup(
      'reweigh',
      '复磅照片',
      '复核重量或体积时留存',
      normalizeImageUrls(reweighResponse?.result)
    ),
    createOrderStubImageGroup(
      'delivered',
      '送达照片',
      '签收底单或送达凭证',
      normalizeImageUrls(receiptResponse?.result?.signList)
    ),
    createOrderStubImageGroup(
      'signed',
      '签收照片',
      '拍照签收环节留存',
      normalizeImageUrls(signResponse?.result)
    ),
    createOrderStubImageGroup(
      'returnBill',
      '签回单',
      '回单或返单照片凭证',
      normalizeImageUrls(returnBillResponse?.result)
    ),
    createOrderStubImageGroup(
      'subsidy',
      '国补信息采集',
      '国补信息采集环节留存',
      normalizeImageUrls(subsidyResponse?.result)
    ),
    createOrderStubImageGroup(
      'openPacking',
      '拆包装',
      '拆包装服务环节留存',
      normalizeImageUrls(openPackingResponse?.result)
    ),
    createOrderStubImageGroup(
      'checkCodeGoods',
      '清点码货',
      '清点码货服务环节留存',
      normalizeImageUrls(checkCodeGoodsResponse?.result)
    ),
    createOrderStubImageGroup(
      'pastingService',
      '贴码服务',
      '贴码服务环节留存',
      normalizeImageUrls(pastingResponse?.result)
    ),
    createOrderStubImageGroup(
      'homeDecoration',
      '家装完工',
      '家装完工或安装完成后留存',
      normalizeImageUrls(homeDecorationResponse?.result)
    ),
    createOrderStubImageGroup(
      'powerOn',
      '简易安装/通电验机',
      '简易安装或通电验机环节留存',
      normalizeImageUrls(powerOnResponse?.result)
    ),
    createOrderStubImageGroup(
      'doubleDelivery',
      '双人派送',
      '双人派送服务环节留存',
      normalizeImageUrls(doubleDeliveryResponse?.result)
    ),
    createOrderStubImageGroup(
      'woodenPackage',
      '代打木包装',
      '木包装或代打包装服务留存',
      normalizePackageImageUrls(woodenPackageResponse?.result)
    ),
    createOrderStubImageGroup(
      'homeExchange',
      '送新取旧',
      '送新取旧服务环节留存',
      normalizeImageUrls(homeExchangeResponse?.result)
    ),
    createOrderStubImageGroup(
      'pickupService',
      '揽收拍照',
      '揽收拍照服务环节留存',
      normalizeImageUrls(pickupServiceResponse?.result)
    )
  ].filter((item): item is OrderStubImageGroupView => !!item)
  const message = groups.length
    ? ''
    : failedMessage || '暂未查询到揽收/签收照片'

  return {
    status: true,
    message,
    result: {
      available: groups.length > 0,
      message,
      groups
    }
  }
}

export function canDeleteOrder(order: {
  orderClass?: number
  orderClassification?: string | number
  orderNumber?: string | null
  waybillNumber?: string | null
}) {
  const orderClass = Number(order.orderClass ?? order.orderClassification)

  return (
    DELETABLE_ORDER_CLASSES.has(orderClass) &&
    (!!order.orderNumber || !!order.waybillNumber)
  )
}

export const orderService = {
  getDefaultDateRange,
  getDateRange: getOrderDateRange,
  getDetailActions: createOrderDetailActions,
  getStubEntry: createOrderStubEntry,
  getStubView: createOrderStubView,
  queryStubDocument: queryOrderStubDocument,
  queryStubImages: queryOrderStubImages,
  queryStubPackageFee: queryOrderStubPackageFee,
  queryUrgeAction: queryOrderUrgeAction,
  queryUrgePanel: queryOrderUrgePanel,
  submitUrge: submitOrderUrge,
  notifyDeliver: notifyOrderDeliver,
  invalidWaybill: invalidOrderWaybill,
  resolveDepartmentPhone,

  async queryList(
    options: OrderListOptions = {}
  ): Promise<DepponResponse<OrderListResult>> {
    const range = getDefaultDateRange()
    const role: OrderRole = options.role ?? 'sender'
    const pageIndex = options.pageIndex ?? 1
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
    const baseData = {
      pageIndex,
      pageSize,
      startTime: options.startTime ?? range.startTime,
      endTime: options.endTime ?? range.endTime,
      sysCode: APP_RUNTIME_CONFIG.systemCode,
      owsOrderListKeyword: options.keyword ?? '',
      orderStatus: options.orderStatus ?? '',
      paymentType: options.paymentType ?? ''
    }

    if (role === 'receive') {
      const response = await orderApi.queryConsigneeList({
        ...baseData,
        type: 1,
        status: 0
      })

      if (!response.status || !response.result) {
        return createFailure(response.message || '暂未获取到收件订单')
      }

      return {
        ...response,
        result: {
          list: (response.result.row ?? []).map(normalizeConsigneeOrder),
          pageIndex: response.result.pageIndex || pageIndex,
          pageSize: response.result.pageSize || pageSize,
          totalPage: Math.max(
            1,
            Math.ceil((response.result.total || 0) / pageSize)
          ),
          totalRows: response.result.total || 0
        }
      }
    }

    const response = await orderApi.querySenderList({
      ...baseData,
      ordersort: 0
    })

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未获取到寄件订单')
    }

    return {
      ...response,
      result: {
        list: (response.result.queryOrderList ?? []).map(normalizeSenderOrder),
        pageIndex: response.result.pageNum || pageIndex,
        pageSize: response.result.pageSize || pageSize,
        totalPage: response.result.totalPage || 1,
        totalRows: response.result.totalRows || 0
      }
    }
  },

  async queryDetail(data: {
    orderNumber?: string
    waybillNumber?: string
  }): Promise<DepponResponse<OrderDetail>> {
    if (data.waybillNumber) {
      const response = await orderApi.queryWaybillDetail({
        waybillNumber: data.waybillNumber,
        sysCode: APP_RUNTIME_CONFIG.systemCode
      })
      const detail = response.result?.orderDetails

      if (!response.status || !detail) {
        return createFailure(response.message || '暂未获取到运单详情')
      }

      const normalizedDetail = normalizeWaybillDetail(detail)
      const orderClass = Number(normalizedDetail.orderClassification)

      return {
        ...response,
        result: {
          ...normalizedDetail,
          orderClassName: getOrderClassLabel(orderClass)
        }
      }
    }

    if (data.orderNumber) {
      const response = await orderApi.queryOrderDetail({
        orderNumber: data.orderNumber,
        sysCode: APP_RUNTIME_CONFIG.systemCode
      })

      if (!response.status || !response.result) {
        return createFailure(response.message || '暂未获取到订单详情')
      }

      const orderClass = Number(response.result.orderClassification)

      return {
        ...response,
        result: {
          ...response.result,
          orderClassName: getOrderClassLabel(orderClass)
        }
      }
    }

    return createFailure('缺少订单号或运单号')
  },

  queryTrackList(
    waybillNumber?: string | null,
    options: OrderTrackQueryOptions = {}
  ): Promise<DepponResponse<WaybillTrackListResponse>> {
    if (!waybillNumber) {
      return Promise.resolve(createFailure('缺少运单号，暂无法查询轨迹'))
    }

    return orderApi.queryTrackList(waybillNumber, options)
  },

  cancelOrder(orderNumber: string, cancelReason = '用户取消') {
    if (!orderNumber) {
      return Promise.resolve(createFailure<boolean>('缺少订单号，无法取消'))
    }

    return orderApi.cancelOrder({
      orderNumber,
      cancelReason,
      sysCode: APP_RUNTIME_CONFIG.systemCode
    })
  },

  deleteOrder(data: {
    role: OrderRole
    orderNumber?: string | null
    waybillNumber?: string | null
  }) {
    if (!data.orderNumber && !data.waybillNumber) {
      return Promise.resolve(createFailure<boolean>('缺少订单号或运单号，无法删除'))
    }

    return orderApi.deleteOrder({
      orderSource: data.role === 'receive' ? '2' : '1',
      orderListType: data.role,
      orderNumber: data.orderNumber || '',
      waybillNumber: data.waybillNumber || '',
      sysCode: APP_RUNTIME_CONFIG.systemCode
    })
  }
}
