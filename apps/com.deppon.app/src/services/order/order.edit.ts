import { orderApi } from './order.api'
import { validateContact } from '../contact'
import { createServiceFailure } from '../serviceResponse'

import type { Contact } from '../contact'
import type {
  OrderDetail,
  OrderEditContact,
  OrderEditDraft,
  OrderEditValidationResult,
  OrderModifyPreview,
  OrderModifyRequest
} from './types'

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNumber(value: unknown, fallback: number) {
  const number = Number(value)

  return Number.isFinite(number) ? number : fallback
}

function createEditContact(
  detail: OrderDetail,
  role: 'sender' | 'receiver'
): OrderEditContact {
  if (role === 'sender') {
    return {
      name: normalizeText(detail.contactName),
      mobile: normalizeText(detail.contactMobile),
      province: normalizeText(detail.contactProvince),
      city: normalizeText(detail.contactCity),
      county: normalizeText(detail.contactArea),
      town: normalizeText(detail.contactTown),
      address: normalizeText(detail.contactAddress)
    }
  }

  return {
    name: normalizeText(detail.receiverName),
    mobile: normalizeText(detail.receiverMobile),
    province: normalizeText(detail.receiverProvince),
    city: normalizeText(detail.receiverCity),
    county: normalizeText(detail.receiverArea),
    town: normalizeText(detail.receiverTown),
    address: normalizeText(detail.receiverAddress)
  }
}

function toContact(contact: OrderEditContact, type: 0 | 1): Contact {
  return {
    name: contact.name,
    telephone: contact.mobile,
    province: contact.province,
    city: contact.city,
    county: contact.county,
    town: contact.town,
    address: contact.address,
    type,
    defaultAddress: '0',
    regionType: ''
  }
}

function addressesEqual(left: OrderEditContact, right: OrderEditContact) {
  return (
    normalizeText(left.province) === normalizeText(right.province) &&
    normalizeText(left.city) === normalizeText(right.city) &&
    normalizeText(left.county) === normalizeText(right.county) &&
    normalizeText(left.address) === normalizeText(right.address)
  )
}

export function createOrderEditDraft(detail: OrderDetail): OrderEditDraft {
  return {
    orderNumber: normalizeText(detail.orderNumber),
    sender: createEditContact(detail, 'sender'),
    receiver: createEditContact(detail, 'receiver'),
    goodsName: normalizeText(detail.goodsName),
    goodsNumber: Math.max(1, normalizeNumber(detail.goodsNumber, 1)),
    totalWeight: Math.max(0.1, normalizeNumber(detail.totalWeight, 1)),
    totalVolume: Math.max(0, normalizeNumber(detail.totalVolume, 0)),
    remark: normalizeText(detail.remark)
  }
}

export function validateOrderEditDraft(
  draft: OrderEditDraft
): OrderEditValidationResult {
  const messages: string[] = []
  const senderValidation = validateContact(toContact(draft.sender, 0))
  const receiverValidation = validateContact(toContact(draft.receiver, 1))

  if (!draft.orderNumber.trim()) {
    messages.push('缺少订单号')
  }

  messages.push(
    ...senderValidation.messages.map(message => `寄件人：${message}`),
    ...receiverValidation.messages.map(message => `收件人：${message}`)
  )

  if (addressesEqual(draft.sender, draft.receiver)) {
    messages.push('寄件和收件地址不能相同')
  }

  if (!draft.goodsName.trim()) {
    messages.push('请填写货物名称')
  } else if (draft.goodsName.trim().length > 30) {
    messages.push('货物名称不能超过30个字符')
  }

  if (!Number.isFinite(draft.goodsNumber) || draft.goodsNumber < 1) {
    messages.push('货物件数至少为1件')
  }

  if (!Number.isFinite(draft.totalWeight) || draft.totalWeight <= 0) {
    messages.push('请填写正确的货物重量')
  }

  if (!Number.isFinite(draft.totalVolume) || draft.totalVolume < 0) {
    messages.push('请填写正确的货物体积')
  }

  if (draft.remark.length > 100) {
    messages.push('备注不能超过100个字符')
  }

  return {
    valid: messages.length === 0,
    messages
  }
}

function setChangedText(
  request: OrderModifyRequest,
  changedFields: string[],
  key: keyof OrderModifyRequest,
  label: string,
  value: string,
  originValue: string
) {
  const normalizedValue = value.trim()

  if (normalizedValue !== originValue.trim()) {
    Object.assign(request, { [key]: normalizedValue })
    changedFields.push(label)
  }
}

export function buildOrderModifyRequest(
  draft: OrderEditDraft,
  origin: OrderEditDraft
): OrderModifyPreview {
  const request: OrderModifyRequest = {
    orderNumber: draft.orderNumber.trim()
  }
  const changedFields: string[] = []

  setChangedText(
    request,
    changedFields,
    'contactName',
    '寄件人姓名',
    draft.sender.name,
    origin.sender.name
  )
  setChangedText(
    request,
    changedFields,
    'contactMobile',
    '寄件人手机号',
    draft.sender.mobile,
    origin.sender.mobile
  )

  if (
    draft.sender.province.trim() !== origin.sender.province.trim() ||
    draft.sender.city.trim() !== origin.sender.city.trim() ||
    draft.sender.county.trim() !== origin.sender.county.trim()
  ) {
    request.contactProvince = draft.sender.province.trim()
    request.contactCity = draft.sender.city.trim()
    request.contactArea = draft.sender.county.trim()
    changedFields.push('寄件地区')
  }

  setChangedText(
    request,
    changedFields,
    'contactAddress',
    '寄件详细地址',
    draft.sender.address,
    origin.sender.address
  )
  setChangedText(
    request,
    changedFields,
    'receiverCustName',
    '收件人姓名',
    draft.receiver.name,
    origin.receiver.name
  )
  setChangedText(
    request,
    changedFields,
    'receiverCustMobile',
    '收件人手机号',
    draft.receiver.mobile,
    origin.receiver.mobile
  )

  if (
    draft.receiver.province.trim() !== origin.receiver.province.trim() ||
    draft.receiver.city.trim() !== origin.receiver.city.trim() ||
    draft.receiver.county.trim() !== origin.receiver.county.trim()
  ) {
    request.receiverCustProvince = draft.receiver.province.trim()
    request.receiverCustCity = draft.receiver.city.trim()
    request.receiverCustArea = draft.receiver.county.trim()
    changedFields.push('收件地区')
  }

  setChangedText(
    request,
    changedFields,
    'receiverCustAddress',
    '收件详细地址',
    draft.receiver.address,
    origin.receiver.address
  )
  setChangedText(
    request,
    changedFields,
    'goodsName',
    '货物名称',
    draft.goodsName,
    origin.goodsName
  )

  if (draft.goodsNumber !== origin.goodsNumber) {
    request.goodsNumber = draft.goodsNumber
    changedFields.push('货物件数')
  }

  if (draft.totalWeight !== origin.totalWeight) {
    request.totalWeight = draft.totalWeight
    changedFields.push('货物重量')
  }

  if (draft.totalVolume !== origin.totalVolume) {
    request.totalVolume = draft.totalVolume
    changedFields.push('货物体积')
  }

  if (draft.remark !== origin.remark) {
    request.remark = draft.remark.trim()
    changedFields.push('备注')
  }

  return {
    changed: changedFields.length > 0,
    changedFields,
    request
  }
}

export const orderEditService = {
  async submit(draft: OrderEditDraft, origin: OrderEditDraft) {
    const validation = validateOrderEditDraft(draft)

    if (!validation.valid) {
      return createServiceFailure<null>(validation.messages[0])
    }

    const preview = buildOrderModifyRequest(draft, origin)

    if (!preview.changed) {
      return createServiceFailure<null>('您还没有修改订单信息')
    }

    const response = await orderApi.modifyOrder(preview.request)

    if (!response.status || response.result === false) {
      return createServiceFailure<null>(
        response.message || '修改失败，请稍后再试'
      )
    }

    return {
      ...response,
      result: null
    }
  }
}
