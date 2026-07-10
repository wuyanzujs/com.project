import type { Contact } from '../contact'
import type {
  ExpressContact,
  ExpressContactTarget,
  ExpressDraft,
  ExpressScanContext,
  ExpressValidationResult
} from './types'

const DEFAULT_GOODS_COUNT = 1
const DEFAULT_GOODS_WEIGHT = 1
const SCAN_CONTEXT_STALE_REASON = '扫码寄件信息变化，请重新获取价格'
const SCAN_CONTEXT_CLEAR_REASON = '扫码寄件信息已移除，请重新获取价格'

export function toFiniteNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

export function trimText(value: string | undefined) {
  return (value ?? '').trim()
}

export function getNowText() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')

  return [
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    `${pad(now.getHours())}:${pad(now.getMinutes())}:00`
  ].join(' ')
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

export function createAddressOnlyExpressContact(address: {
  province?: string
  city?: string
  county?: string
  town?: string
  address?: string
}): ExpressContact {
  return {
    name: '',
    mobile: '',
    province: trimText(address.province),
    city: trimText(address.city),
    county: trimText(address.county),
    town: trimText(address.town) || undefined,
    address: trimText(address.address)
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

function normalizeExpressScanContext(
  context: ExpressScanContext
): ExpressScanContext | null {
  const value = trimText(context.value)
  const sceneId = trimText(context.sceneId)

  if (
    !value ||
    value.toLowerCase() === 'null' ||
    value.toLowerCase() === 'undefined'
  ) {
    return null
  }

  return {
    role: context.role,
    value,
    sceneId: sceneId || undefined,
    expressRole: context.expressRole
  }
}

export function applyExpressScanContext(
  draft: ExpressDraft,
  context: ExpressScanContext
): ExpressDraft {
  const scanContext = normalizeExpressScanContext(context)

  if (!scanContext) {
    return {
      ...draft,
      scanContext: undefined
    }
  }

  return {
    ...draft,
    scanContext,
    selectedProduct: null,
    agreementAccepted: false,
    quoteStaleReason: SCAN_CONTEXT_STALE_REASON
  }
}

export function clearExpressScanContext(draft: ExpressDraft): ExpressDraft {
  if (!draft.scanContext) {
    return draft
  }

  return {
    ...draft,
    scanContext: undefined,
    selectedProduct: null,
    agreementAccepted: false,
    quoteStaleReason: SCAN_CONTEXT_CLEAR_REASON
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
