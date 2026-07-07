import { expressApi } from './express.api'
import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'

import type { DepponResponse } from '../../request/deppon'
import type { Contact } from '../contact'
import type {
  CreateExpressOrderRequest,
  CreateExpressOrderResponse,
  ExpressContact,
  ExpressContactTarget,
  ExpressDraft,
  ExpressFilterRequest,
  ExpressFilterResponse,
  ExpressGoodsCheckResult,
  ExpressGoodsCheckStatus,
  ExpressFreightRequest,
  ExpressGoodsLabel,
  ExpressGoodsLabelRequest,
  ExpressInsurancePriceResponse,
  ExpressInsuranceQuote,
  ExpressOrderCancelRequest,
  ExpressOrderDetailRequest,
  ExpressPickupTimeRequest,
  ExpressPickupTimeResponse,
  ExpressProductQuote,
  ExpressValidationResult
} from './types'

const DEFAULT_GOODS_COUNT = 1
const DEFAULT_GOODS_WEIGHT = 1

function toFiniteNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

function trimText(value: string | undefined) {
  return (value ?? '').trim()
}

function getNowText() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')

  return [
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    `${pad(now.getHours())}:${pad(now.getMinutes())}:00`
  ].join(' ')
}

function getPpcDeliveryMode(deliveryMode: ExpressDraft['service']['deliveryMode']) {
  switch (deliveryMode) {
    case 'PICKSELF':
      return 'SELF_PICKUP'
    case 'PICKUPSTAIRS':
      return 'DELIVER_UP'
    case 'BIGUPSTAIRS':
      return 'LARGE_DELIVER_UP'
    case 'PICKNOTUPSTAIRS':
      return 'DELIVER_NOUP'
    default:
      return ''
  }
}

function getPpcReturnBillType(returnBillType: ExpressDraft['service']['returnBillType']) {
  switch (returnBillType) {
    case 'CUSTOMER_SIGNED_FAX':
      return 'FAX'
    case 'CUSTOMER_SIGNED_ORIGINAL':
      return 'ORIGINAL'
    case 'RETURNBILL_TYPE_ONLINE':
      return 'ONLINE'
    default:
      return 'NONE'
  }
}

function getPpcCollectionType(reciveLoanType: ExpressDraft['service']['reciveLoanType']) {
  switch (reciveLoanType) {
    case 'INTRADAY':
      return 'R1'
    case 'NORMAL':
      return 'R3'
    default:
      return ''
  }
}

function getDraftProductCode(draft: ExpressDraft) {
  return draft.selectedProduct?.omsProductCode || draft.service.transportMode
}

function isSameRegion(
  left: ExpressContact | null,
  right: ExpressContact | null
) {
  if (!left || !right) {
    return false
  }

  return (
    left.province === right.province &&
    left.city === right.city &&
    left.county === right.county
  )
}

function createFailure<TResult>(message: string): DepponResponse<TResult> {
  return {
    status: false,
    message,
    result: null
  }
}

function getResponseFailureMessage(response: DepponResponse<unknown>) {
  return response.message || '校验失败，请稍后再试'
}

export function createExpressDraft(): ExpressDraft {
  return {
    sender: null,
    consignee: null,
    goods: {
      name: '',
      count: DEFAULT_GOODS_COUNT,
      weight: DEFAULT_GOODS_WEIGHT,
      volume: 0,
      insuredAmount: 0,
      reviceMoneyAmount: 0
    },
    service: {
      transportMode: '',
      deliveryMode: 'PICKNOTUPSTAIRS',
      paymentType: 'MP',
      returnBillType: 'NO_RETURN_SIGNED',
      reciveLoanType: '',
      passwordSigning: 'N',
      needContact: 'Y',
      privacyProtection: 'N'
    },
    pickup: {
      dispatch: 'Y',
      time: '',
      type: 0,
      stationCode: '',
      stationName: ''
    },
    selectedProduct: null,
    couponNumber: '',
    remark: '',
    agreementAccepted: false,
    quoteStaleReason: ''
  }
}

export function mapContactToExpressContact(contact: Contact): ExpressContact {
  return {
    id: contact.id,
    name: contact.name,
    mobile: contact.telephone,
    fixedPhone: contact.fixedPhone,
    province: contact.province,
    city: contact.city,
    county: contact.county,
    town: contact.town,
    address: contact.address,
    company: contact.company,
    regionType: contact.regionType
  }
}

export function getExpressContactFullAddress(contact: ExpressContact) {
  return [
    contact.province,
    contact.city,
    contact.county,
    contact.town,
    contact.address
  ]
    .filter(Boolean)
    .join('')
}

export function getExpressContactRegion(contact: ExpressContact) {
  return [contact.province, contact.city, contact.county, contact.town]
    .filter(Boolean)
    .join('')
}

export function validateExpressContact(
  contact: ExpressContact | null,
  label: string
): string[] {
  if (!contact) {
    return [`请选择${label}`]
  }

  const messages: string[] = []
  const name = trimText(contact.name)
  const mobile = trimText(contact.mobile)
  const address = trimText(contact.address)

  if (!name) {
    messages.push(`请填写${label}姓名`)
  } else if (name.length > 20) {
    messages.push(`${label}姓名不能超过20个字符`)
  }

  if (!/^1[3-9]\d{9}$/.test(mobile)) {
    messages.push(`请填写正确的${label}手机号`)
  }

  if (!contact.province || !contact.city || !contact.county) {
    messages.push(`请选择${label}省市区`)
  }

  if (!address) {
    messages.push(`请填写${label}详细地址`)
  } else if (address.length < 4 || address.length > 100) {
    messages.push(`${label}详细地址需为4到100个字符`)
  }

  return messages
}

export function validateExpressDraft(
  draft: ExpressDraft,
  options: { requireAgreement?: boolean; requireProduct?: boolean } = {}
): ExpressValidationResult {
  const messages: string[] = [
    ...validateExpressContact(draft.sender, '寄件人'),
    ...validateExpressContact(draft.consignee, '收件人')
  ]
  const goodsName = trimText(draft.goods.name)
  const weight = toFiniteNumber(draft.goods.weight)
  const count = toFiniteNumber(draft.goods.count)

  if (draft.sender && draft.consignee) {
    const senderAddress = getExpressContactFullAddress(draft.sender)
    const consigneeAddress = getExpressContactFullAddress(draft.consignee)

    if (senderAddress === consigneeAddress) {
      messages.push('寄件地址和收件地址不能完全一致')
    }
  }

  if (!goodsName) {
    messages.push('请填写货物名称')
  }

  if (weight <= 0) {
    messages.push('请填写正确的货物重量')
  }

  if (count < 1) {
    messages.push('货物件数至少为1件')
  }

  if (options.requireProduct && !draft.selectedProduct) {
    messages.push('请先获取并选择产品价格')
  }

  if (options.requireAgreement && !draft.agreementAccepted) {
    messages.push('请先勾选电子运单协议')
  }

  return {
    valid: messages.length === 0,
    messages
  }
}

function validatePriceTimeContact(
  contact: ExpressContact | null,
  label: string
) {
  if (!contact) {
    return [`请选择${label}地址`]
  }

  const messages: string[] = []
  const address = trimText(contact.address)

  if (!contact.province || !contact.city || !contact.county) {
    messages.push(`请填写${label}省市区`)
  }

  if (!address) {
    messages.push(`请填写${label}详细地址`)
  } else if (address.length < 2 || address.length > 100) {
    messages.push(`${label}详细地址需为2到100个字符`)
  }

  return messages
}

export function validateExpressPriceTimeDraft(
  draft: ExpressDraft
): ExpressValidationResult {
  const messages: string[] = [
    ...validatePriceTimeContact(draft.sender, '寄件'),
    ...validatePriceTimeContact(draft.consignee, '收件')
  ]
  const weight = toFiniteNumber(draft.goods.weight)
  const count = toFiniteNumber(draft.goods.count)

  if (draft.sender && draft.consignee) {
    const senderAddress = getExpressContactFullAddress(draft.sender)
    const consigneeAddress = getExpressContactFullAddress(draft.consignee)

    if (senderAddress === consigneeAddress) {
      messages.push('寄件地址和收件地址不能完全一致')
    }
  }

  if (weight <= 0) {
    messages.push('请填写正确的货物重量')
  }

  if (count < 1) {
    messages.push('货物件数至少为1件')
  }

  return {
    valid: messages.length === 0,
    messages
  }
}

export function resetSenderDependencies(draft: ExpressDraft): ExpressDraft {
  return {
    ...draft,
    pickup: {
      ...draft.pickup,
      time: '',
      endTime: undefined,
      timeSlot: undefined,
      stationCode: '',
      stationName: '',
      pickPeriodTime: undefined
    },
    selectedProduct: null,
    quoteStaleReason: '寄件地址变化，请重新获取价格'
  }
}

export function resetConsigneeDependencies(draft: ExpressDraft): ExpressDraft {
  return {
    ...draft,
    selectedProduct: null,
    quoteStaleReason: '收件地址变化，请重新获取价格'
  }
}

export function markExpressQuoteStale(
  draft: ExpressDraft,
  reason: string
): ExpressDraft {
  return {
    ...draft,
    selectedProduct: null,
    quoteStaleReason: reason
  }
}

export function setExpressContact(
  draft: ExpressDraft,
  target: ExpressContactTarget,
  contact: ExpressContact
): ExpressDraft {
  const nextDraft = {
    ...draft,
    [target]: contact
  }

  return target === 'sender'
    ? resetSenderDependencies(nextDraft)
    : resetConsigneeDependencies(nextDraft)
}

export function swapExpressContacts(draft: ExpressDraft): ExpressDraft {
  const nextDraft: ExpressDraft = {
    ...draft,
    sender: draft.consignee,
    consignee: draft.sender,
    selectedProduct: null,
    quoteStaleReason: '收寄地址互换，请重新获取价格'
  }

  if (!isSameRegion(draft.sender, draft.consignee)) {
    return {
      ...nextDraft,
      pickup: {
        ...nextDraft.pickup,
        time: '',
        endTime: undefined,
        timeSlot: undefined,
        stationCode: '',
        stationName: '',
        pickPeriodTime: undefined
      }
    }
  }

  return nextDraft
}

export function buildFreightRequest(
  draft: ExpressDraft
): ExpressFreightRequest {
  if (!draft.sender || !draft.consignee) {
    throw new Error('缺少收寄件联系人')
  }

  return {
    channel: APP_RUNTIME_CONFIG.omsChannel,
    insuredAmount: toFiniteNumber(draft.goods.insuredAmount),
    originalsStreet: getExpressContactRegion(draft.consignee),
    receiverAddress: draft.consignee.address,
    originalsaddress: getExpressContactRegion(draft.sender),
    shipperAddress: draft.sender.address,
    reciveLoanType: getPpcCollectionType(draft.service.reciveLoanType),
    returnBillType: getPpcReturnBillType(draft.service.returnBillType),
    receiveMethod: getPpcDeliveryMode(draft.service.deliveryMode),
    reviceMoneyAmount: toFiniteNumber(draft.goods.reviceMoneyAmount),
    totalVolume: toFiniteNumber(draft.goods.volume),
    totalWeight: toFiniteNumber(draft.goods.weight, DEFAULT_GOODS_WEIGHT),
    goodsName: trimText(draft.goods.name),
    client: true,
    detail: true,
    sendDateTime: draft.pickup.time || getNowText(),
    promotionsCode: trimText(draft.couponNumber) || undefined,
    pickUpToDoor: draft.pickup.dispatch === 'Y',
    passwordSigning: draft.service.passwordSigning,
    passProductCode: draft.service.transportMode
  }
}

export function buildPickupTimeRequest(
  draft: ExpressDraft
): ExpressPickupTimeRequest {
  if (!draft.sender) {
    throw new Error('缺少寄件人联系人')
  }

  return {
    sysCode: APP_RUNTIME_CONFIG.systemCode,
    provinceName: draft.sender.province,
    cityName: draft.sender.city,
    countyName: draft.sender.county,
    townName: draft.sender.town,
    address: draft.sender.address,
    weight: toFiniteNumber(draft.goods.weight, DEFAULT_GOODS_WEIGHT),
    volume: toFiniteNumber(draft.goods.volume),
    goodsNumber: toFiniteNumber(draft.goods.count, DEFAULT_GOODS_COUNT),
    originalsaddress: getExpressContactRegion(draft.sender),
    originalsStreet: draft.consignee
      ? getExpressContactRegion(draft.consignee)
      : undefined,
    priceTimeProductCode:
      draft.selectedProduct?.omsProductCode ||
      draft.service.transportMode ||
      undefined,
    source: 0
  }
}

export function buildInsurancePriceRequest(draft: ExpressDraft) {
  const amount = toFiniteNumber(draft.goods.insuredAmount)
  const productCode = getDraftProductCode(draft)

  if (amount <= 0) {
    throw new Error('请填写保价金额')
  }

  if (!productCode) {
    throw new Error('请先获取并选择产品价格')
  }

  return {
    pricingEntryCode: 'BF' as const,
    productCode,
    statements: [amount],
    subType: 'QEB',
    weight: toFiniteNumber(draft.goods.weight, DEFAULT_GOODS_WEIGHT),
    volume: toFiniteNumber(draft.goods.volume)
  }
}

export function buildFilterOrderRequest(
  draft: ExpressDraft
): ExpressFilterRequest {
  if (!draft.sender || !draft.consignee) {
    throw new Error('缺少收寄件联系人')
  }

  return {
    contactAddress: `${getExpressContactRegion(draft.sender)},${draft.sender.address}`,
    contactMobile: draft.sender.mobile,
    contactName: draft.sender.name,
    receiverAddress: `${getExpressContactRegion(draft.consignee)},${draft.consignee.address}`,
    receiverMobile: draft.consignee.mobile,
    receiverName: draft.consignee.name,
    goodsName: trimText(draft.goods.name),
    totalWeight: toFiniteNumber(draft.goods.weight, DEFAULT_GOODS_WEIGHT),
    transportMode:
      draft.selectedProduct?.omsProductCode || draft.service.transportMode,
    deliveryMode: draft.service.deliveryMode,
    limitCust: draft.service.paymentType === 'MONTH_PAY' ? 1 : 0
  }
}

export function buildCreateOrderRequest(
  draft: ExpressDraft
): CreateExpressOrderRequest {
  if (!draft.sender || !draft.consignee) {
    throw new Error('缺少收寄件联系人')
  }

  const selectedProductCode =
    draft.selectedProduct?.omsProductCode || draft.service.transportMode

  return {
    contactIdList: [draft.sender.id, draft.consignee.id].filter(
      (id): id is string => !!id
    ),
    isAgreement: draft.agreementAccepted ? 'Y' : 'N',
    isContact: draft.service.needContact,
    clientChannel: APP_RUNTIME_CONFIG.appClientChannel,
    contactName: draft.sender.name,
    contactMobile: draft.sender.mobile,
    contactProvince: draft.sender.province,
    contactCity: draft.sender.city,
    contactArea: draft.sender.county,
    contactAddress: getExpressContactRegion(draft.sender),
    contactAddressDetail: draft.sender.address,
    startStation: draft.pickup.stationCode,
    startStationName: draft.pickup.stationName,
    acceptDept: '',
    shipperNumber: '',
    pickupManId: '',
    dispatchFlag: draft.pickup.dispatch,
    passwordSigning: draft.service.passwordSigning,
    receive: [
      {
        receiverCustName: draft.consignee.name,
        receiverCustMobile: draft.consignee.mobile,
        receiverCustAddress: getExpressContactRegion(draft.consignee),
        receiverCustAddressDetail: draft.consignee.address,
        receiverCustProvince: draft.consignee.province,
        receiverCustCity: draft.consignee.city,
        receiverCustArea: draft.consignee.county,
        goodsName: trimText(draft.goods.name),
        goodsNumber: toFiniteNumber(draft.goods.count, DEFAULT_GOODS_COUNT),
        totalVolume: toFiniteNumber(draft.goods.volume),
        totalWeight: toFiniteNumber(draft.goods.weight, DEFAULT_GOODS_WEIGHT),
        transportMode: selectedProductCode,
        deliveryMode: draft.service.deliveryMode,
        paymentType: draft.service.paymentType,
        returnBillType: draft.service.returnBillType,
        reciveLoanType: draft.service.reciveLoanType,
        reciveLoanAccount: '',
        couponNumber: trimText(draft.couponNumber),
        encryptInfo: draft.service.privacyProtection,
        remark: trimText(draft.remark),
        isRecieveGoods: 0,
        reviceMoneyAmount: toFiniteNumber(draft.goods.reviceMoneyAmount),
        insuredAmount: toFiniteNumber(draft.goods.insuredAmount),
        beginAcceptTime: draft.pickup.time || getNowText(),
        endAcceptTime: draft.pickup.endTime,
        accountName: '',
        receivingToPoint: '',
        receivingToPointName: '',
        waybillNumber: '',
        appointmentDeliveryTime: '',
        returnRequirement: '',
        customReturnRequirement: '',
        pickPeriodTime: draft.pickup.pickPeriodTime
      }
    ]
  }
}

function getBlockingGoodsLabel(labels: ExpressGoodsLabel[]) {
  return labels.find((label) => label.displayType === 'forbid')
}

function getGoodsLabelStatus(
  label: ExpressGoodsLabel
): ExpressGoodsCheckStatus {
  if (label.displayType === 'forbid') {
    return 'forbid'
  }

  if (label.goodsRemarkCode === 'unknow_category') {
    return 'unknown'
  }

  if (
    label.goodsRemarkCode === 'contraband_category' ||
    label.displayType === 'alert' ||
    label.displayType === 'addprice' ||
    label.displayType === 'tips'
  ) {
    return 'risk'
  }

  return 'risk'
}

function compareGoodsStatus(
  current: ExpressGoodsCheckStatus,
  next: ExpressGoodsCheckStatus
) {
  const rank: Record<ExpressGoodsCheckStatus, number> = {
    ok: 0,
    risk: 1,
    unknown: 2,
    forbid: 3
  }

  return rank[next] > rank[current] ? next : current
}

function getGoodsCheckStatus(
  labels: ExpressGoodsLabel[]
): ExpressGoodsCheckStatus {
  return labels.reduce<ExpressGoodsCheckStatus>(
    (status, label) => compareGoodsStatus(status, getGoodsLabelStatus(label)),
    'ok'
  )
}

function getGoodsCheckTitle(status: ExpressGoodsCheckStatus) {
  switch (status) {
    case 'forbid':
      return '暂不支持寄递'
    case 'unknown':
      return '需要人工确认'
    case 'risk':
      return '存在寄递提示'
    default:
      return '可正常寄递'
  }
}

function getGoodsCheckMessage(
  status: ExpressGoodsCheckStatus,
  labels: ExpressGoodsLabel[]
) {
  const message = labels.map((label) => trimText(label.tip)).find(Boolean)

  if (message) {
    return message
  }

  switch (status) {
    case 'forbid':
      return '该货物当前不支持寄递，请更换货物名称或咨询客服。'
    case 'unknown':
      return '暂未识别到明确品类，寄件前建议补充准确名称。'
    case 'risk':
      return '该货物存在包装、保价或收寄限制提示，请按页面提示确认。'
    default:
      return '未命中禁寄或特殊风险规则。'
  }
}

function normalizeGoodsCheckResult(
  goodsName: string,
  labels: ExpressGoodsLabel[]
): ExpressGoodsCheckResult {
  const status = getGoodsCheckStatus(labels)

  return {
    goodsName,
    status,
    canExpress: status !== 'forbid',
    title: getGoodsCheckTitle(status),
    message: getGoodsCheckMessage(status, labels),
    labels
  }
}

function isBlockingFilterResult(result?: ExpressFilterResponse | null) {
  return !!result && result.type !== 0 && result.type !== 1
}

function normalizeInsuranceQuote(
  response: ExpressInsurancePriceResponse | null,
  amount: number
): ExpressInsuranceQuote {
  const dataPrice = response?.data?.[String(amount)] ?? response?.data?.[amount]
  const price = dataPrice ?? response?.price ?? 0

  return {
    amount,
    price: toFiniteNumber(price),
    name: response?.fixedProtectionName
  }
}

async function checkGoodsBeforeSubmit(
  draft: ExpressDraft
): Promise<DepponResponse<boolean>> {
  const response = await expressApi.queryGoodsLabels(
    {
      goodsName: draft.goods.name,
      senderProvinceName: draft.sender?.province,
      senderCityName: draft.sender?.city,
      senderCountyName: draft.sender?.county,
      arriveProvinceName: draft.consignee?.province,
      arriveCityName: draft.consignee?.city,
      arriveCountyName: draft.consignee?.county
    },
    false
  )

  if (!response.status) {
    return createFailure(response.message || '暂未完成货物校验，请稍后再试')
  }

  const blockingLabel = getBlockingGoodsLabel(response.result ?? [])

  if (blockingLabel) {
    return createFailure(blockingLabel.tip || '该货物暂不支持寄递')
  }

  return {
    ...response,
    result: true
  }
}

async function checkGoodsByName(
  data: ExpressGoodsLabelRequest
): Promise<DepponResponse<ExpressGoodsCheckResult>> {
  const goodsName = trimText(data.goodsName)

  if (!goodsName) {
    return createFailure('请输入货物名称')
  }

  const response = await expressApi.queryGoodsLabels(
    {
      ...data,
      goodsName
    },
    false
  )

  if (!response.status) {
    return createFailure(response.message || '暂未完成货物校验，请稍后再试')
  }

  return {
    ...response,
    result: normalizeGoodsCheckResult(goodsName, response.result ?? [])
  }
}

async function checkOrderFilterBeforeSubmit(
  draft: ExpressDraft
): Promise<DepponResponse<boolean>> {
  const response = await expressApi.filterOrder(buildFilterOrderRequest(draft))

  if (!response.status) {
    return createFailure(getResponseFailureMessage(response))
  }

  if (isBlockingFilterResult(response.result)) {
    return createFailure(response.result?.reason || '当前订单暂不支持提交')
  }

  return {
    ...response,
    result: true
  }
}

async function checkBeforeSubmit(
  draft: ExpressDraft
): Promise<DepponResponse<boolean>> {
  const goodsCheck = await checkGoodsBeforeSubmit(draft)

  if (!goodsCheck.status) {
    return goodsCheck
  }

  return checkOrderFilterBeforeSubmit(draft)
}

export const expressService = {
  createDraft: createExpressDraft,

  queryGoodsNames(keyword: string, pageIndex = 1, pageSize = 20) {
    return expressApi.queryGoodsName({
      keyWord: keyword,
      pageIndex,
      pageSize
    })
  },

  queryGoodsLabels(draft: ExpressDraft) {
    return expressApi.queryGoodsLabels({
      goodsName: draft.goods.name,
      senderProvinceName: draft.sender?.province,
      senderCityName: draft.sender?.city,
      senderCountyName: draft.sender?.county,
      arriveProvinceName: draft.consignee?.province,
      arriveCityName: draft.consignee?.city,
      arriveCountyName: draft.consignee?.county
    })
  },

  checkGoodsByName,

  quote(draft: ExpressDraft) {
    const validation = validateExpressDraft(draft)

    if (!validation.valid) {
      return Promise.resolve(
        createFailure<ExpressProductQuote[]>(validation.messages[0])
      )
    }

    return expressApi.queryFreight(buildFreightRequest(draft), false)
  },

  quotePriceTime(draft: ExpressDraft) {
    const validation = validateExpressPriceTimeDraft(draft)

    if (!validation.valid) {
      return Promise.resolve(
        createFailure<ExpressProductQuote[]>(validation.messages[0])
      )
    }

    return expressApi.queryFreight(buildFreightRequest(draft), false)
  },

  async queryInsurancePrice(
    draft: ExpressDraft
  ): Promise<DepponResponse<ExpressInsuranceQuote>> {
    try {
      const request = buildInsurancePriceRequest(draft)
      const response = await expressApi.queryInsurancePrice(request)

      if (!response.status) {
        return createFailure(response.message || '暂未获取到保价费用')
      }

      return {
        ...response,
        result: normalizeInsuranceQuote(
          response.result ?? null,
          toFiniteNumber(draft.goods.insuredAmount)
        )
      }
    } catch (error) {
      return createFailure(
        error instanceof Error ? error.message : '暂未获取到保价费用'
      )
    }
  },

  queryPickupTime(draft: ExpressDraft) {
    const senderMessages = validateExpressContact(draft.sender, '寄件人')

    if (senderMessages.length) {
      return Promise.resolve(
        createFailure<ExpressPickupTimeResponse>(senderMessages[0])
      )
    }

    return expressApi.queryPickupTime(buildPickupTimeRequest(draft), false)
  },

  async submitDraft(
    draft: ExpressDraft
  ): Promise<DepponResponse<CreateExpressOrderResponse>> {
    const validation = validateExpressDraft(draft, {
      requireAgreement: true,
      requireProduct: true
    })

    if (!validation.valid) {
      return createFailure(validation.messages[0])
    }

    const submitCheck = await checkBeforeSubmit(draft)

    if (!submitCheck.status) {
      return createFailure(submitCheck.message || '暂时无法提交订单')
    }

    const intercept = await expressApi.checkCanCreateOrder()

    if (!intercept.status) {
      return createFailure(intercept.message || '暂时无法提交订单')
    }

    if (intercept.result?.orderFlag === 'N') {
      return createFailure('当前账号存在未完成拦截，请稍后再试')
    }

    return expressApi.createOrder(buildCreateOrderRequest(draft))
  },

  queryOrderDetail(data: ExpressOrderDetailRequest) {
    return expressApi.queryOrderDetail({
      ...data,
      sysCode: data.sysCode ?? APP_RUNTIME_CONFIG.systemCode
    })
  },

  cancelOrder(data: ExpressOrderCancelRequest) {
    return expressApi.cancelOrder({
      ...data,
      sysCode: data.sysCode ?? APP_RUNTIME_CONFIG.systemCode
    })
  }
}
