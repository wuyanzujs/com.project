import { createExpressDraft } from '../express/core/express.draft'
import { getExpressReturnBillRequirementText, normalizeExpressReturnBillDraft, normalizeExpressReturnBillForTemplate } from '../express/value-added/valueAdded'

import type { ExpressContact, ExpressDraft, ExpressPaymentType, ExpressProductCode, ExpressReturnBillType } from '../express'
import type { ExpressTemplateContactRaw, ExpressTemplateDraftMeta, ExpressTemplateRaw, ExpressTemplateSaveRequest, ExpressTemplateView } from './types'

const PAYMENT_LABELS: Record<ExpressPaymentType, string> = {
  MP: '现付',
  PAY_ARIIVE: '到付',
  MONTH_PAY: '月结'
}

const RETURN_LABELS: Record<ExpressReturnBillType, string> = {
  NO_RETURN_SIGNED: '无需返单',
  CUSTOMER_SIGNED_FAX: '电子签回单',
  CUSTOMER_SIGNED_ORIGINAL: '原件返回',
  RETURNBILL_TYPE_ONLINE: '电子云签',
  ORIGINAL_ONLINE: '原件+电子云签'
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
  'YTY',
  'YTYDS',
  'JZKH',
  'JZQY_LONG',
  'JZZH',
  'NJZZH',
  'NZBRH',
  'NFLF',
  'NLRF'
])

/**
 *
 * @param value 待处理文本，可为空
 * @description 归一文本，去首尾空白
 */
function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

/**
 *
 * @param value 待转换值
 * @param fallback 兜底值
 * @description 转有限数字，非法时用兜底值
 */
function toFiniteNumber(value: unknown, fallback = 0) {
  const number = Number(value)

  return Number.isFinite(number) ? number : fallback
}

/**
 *
 * @param value 付款方式 code
 * @description 归一付款方式，非法值按现付
 */
function normalizePaymentType(value?: string): ExpressPaymentType {
  return value === 'PAY_ARIIVE' || value === 'MONTH_PAY' ? value : 'MP'
}

/**
 *
 * @param value 返单类型 code
 * @description 归一返单类型，非法值按无需返单
 */
function normalizeReturnType(value?: string): ExpressReturnBillType {
  if (value === 'CUSTOMER_SIGNED_FAX' || value === 'CUSTOMER_SIGNED_ORIGINAL' || value === 'RETURNBILL_TYPE_ONLINE' || value === 'ORIGINAL_ONLINE') {
    return value
  }

  return 'NO_RETURN_SIGNED'
}

/**
 *
 * @param value 产品 code
 * @description 归一产品 code，非法值返回空字符串
 */
function normalizeProductCode(value?: string): ExpressProductCode {
  return EXPRESS_PRODUCT_CODES.has(value as ExpressProductCode) ? (value as ExpressProductCode) : ''
}

/**
 *
 * @param raw 模板联系人原始数据，可为空
 * @description 转模板联系人，全空时返回 null
 */
function mapTemplateContact(raw?: ExpressTemplateContactRaw | null): ExpressContact | null {
  if (!raw) {
    return null
  }

  const name = normalizeText(raw.name)
  const mobile = normalizeText(raw.telephone)
  const province = normalizeText(raw.province)
  const city = normalizeText(raw.city)
  const county = normalizeText(raw.county)
  const address = normalizeText(raw.address)

  if (!name && !mobile && !province && !city && !county && !address) {
    return null
  }

  return {
    id: normalizeText(raw.id) || undefined,
    name,
    mobile,
    fixedPhone: normalizeText(raw.fixedPhone) || undefined,
    province,
    city,
    county,
    town: normalizeText(raw.town) || undefined,
    address,
    company: normalizeText(raw.company) || undefined,
    regionType: raw.regionType === 'GAT' ? 'GAT' : ''
  }
}

/**
 *
 * @param contact 联系人，可为空
 * @description 生成联系人展示文案
 */
function getContactText(contact: ExpressContact | null) {
  if (!contact) {
    return '--'
  }

  return [contact.name, contact.city || contact.province].filter(Boolean).join(' · ')
}

/**
 *
 * @param contact 联系人，可为空
 * @description 转接口联系人结构，空值返回 null
 */
function mapExpressContact(contact: ExpressContact | null) {
  if (!contact) {
    return null
  }

  return {
    id: contact.id,
    name: contact.name,
    telephone: contact.mobile,
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

/**
 *
 * @param raw 模板原始数据
 * @description 模板转寄件草稿
 */
export function mapTemplateToExpressDraft(raw: ExpressTemplateRaw) {
  const draft = createExpressDraft()
  const paymentType = normalizePaymentType(raw.template.payment?.paymentType)
  const transportMode = normalizeProductCode(raw.template.product?.omsProductCode)
  const returnBill = normalizeExpressReturnBillForTemplate(
    normalizeExpressReturnBillDraft({
      type: normalizeReturnType(raw.template.addedService?.returnBillType),
      returnRequirement: raw.template.addedService?.returnRequirement,
      customReturnRequirement: raw.template.addedService?.customReturnRequirement
    }),
    transportMode
  )
  const pickupTime = normalizeText(raw.template.pickupTime?.beginAcceptTime)

  return {
    ...draft,
    sender: mapTemplateContact(raw.template.sender),
    consignee: mapTemplateContact(raw.template.receiver),
    goods: {
      ...draft.goods,
      name: normalizeText(raw.template.goodInfo?.goodsName),
      weight: Math.max(0, toFiniteNumber(raw.template.goodInfo?.weight, 1)),
      insuredAmount: Math.max(0, toFiniteNumber(raw.template.insurance?.insuranceAmount))
    },
    service: {
      ...draft.service,
      transportMode,
      paymentType,
      returnBill,
      needContact: raw.template.isContact === 'N' ? 'N' : 'Y'
    },
    pickup: {
      ...draft.pickup,
      dispatch: raw.template.pickupTime?.dispatchFlag === 'N' ? 'N' : 'Y',
      time: pickupTime === '现在发货' ? '' : pickupTime
    },
    selectedProduct: null,
    agreementAccepted: false,
    quoteStaleReason: '模板信息已带入，请重新获取价格'
  } satisfies ExpressDraft
}

/**
 *
 * @param raw 模板原始数据
 * @description 模板转列表展示数据
 */
export function normalizeExpressTemplate(raw: ExpressTemplateRaw): ExpressTemplateView {
  const draft = mapTemplateToExpressDraft(raw)
  const tags = [
    PAYMENT_LABELS[draft.service.paymentType],
    draft.service.transportMode || '',
    draft.goods.insuredAmount > 0 ? `保价${draft.goods.insuredAmount}元` : '',
    draft.service.returnBill.type !== 'NO_RETURN_SIGNED' ? RETURN_LABELS[draft.service.returnBill.type] : '',
    draft.service.needContact === 'Y' ? '电话联系' : ''
  ].filter(Boolean)

  return {
    id: normalizeText(raw.id),
    name: normalizeText(raw.templateName) || '未命名模板',
    isDefault: raw.defaultFlag === 1,
    senderText: getContactText(draft.sender),
    receiverText: getContactText(draft.consignee),
    goodsText: draft.goods.name || '未填写货物',
    weightText: `${draft.goods.weight || 0}kg`,
    tags,
    raw
  }
}

/**
 *
 * @param draft 寄件草稿
 * @description 校验模板草稿，返回错误文案
 */
export function validateTemplateDraft(draft: ExpressDraft) {
  if (!draft.sender) {
    return '请先填写寄件人'
  }

  if (!draft.goods.name.trim()) {
    return '请先填写货物名称'
  }

  if (!Number.isFinite(draft.goods.weight) || draft.goods.weight <= 0) {
    return '请先填写正确的货物重量'
  }

  return ''
}

/**
 *
 * @param meta 模板元信息
 * @description 校验模板名称和默认状态
 */
export function validateTemplateMeta(meta: ExpressTemplateDraftMeta) {
  const name = meta.name.trim()

  if (!name) {
    return '请输入模板名称'
  }

  if (name.length > 5) {
    return '模板名称不能超过5个字'
  }

  if (meta.defaultFlag !== 1 && meta.defaultFlag !== 2) {
    return '请选择模板默认状态'
  }

  return ''
}

/**
 *
 * @param template 模板展示数据
 * @param meta 模板元信息
 * @description 判断模板名称或默认状态是否变化
 */
export function isTemplateMetadataChanged(template: ExpressTemplateView, meta: ExpressTemplateDraftMeta) {
  return template.name !== meta.name.trim() || template.isDefault !== (meta.defaultFlag === 1)
}

/**
 *
 * @param template 模板展示数据
 * @param meta 模板元信息
 * @param sysCode 系统 code
 * @description 构造模板元信息保存请求
 */
export function buildTemplateMetadataSaveRequest(template: ExpressTemplateView, meta: ExpressTemplateDraftMeta, sysCode: string): ExpressTemplateSaveRequest {
  return {
    ...template.raw,
    id: template.id,
    templateName: meta.name.trim(),
    defaultFlag: meta.defaultFlag,
    sysCode
  }
}

/**
 *
 * @param templates 模板列表
 * @param id 目标模板 id
 * @param meta 模板元信息
 * @description 更新列表中的模板名称与默认状态
 */
export function applyTemplateMetadataUpdate(templates: ExpressTemplateView[], id: string, meta: ExpressTemplateDraftMeta): ExpressTemplateView[] {
  const targetId = id.trim()

  if (!targetId || !templates.some(template => template.id === targetId)) {
    return templates
  }

  const targetDefault = meta.defaultFlag === 1
  const targetName = meta.name.trim()

  return templates.map(template => {
    const target = template.id === targetId
    const isDefault = target ? targetDefault : targetDefault ? false : template.isDefault
    const name = target ? targetName : template.name
    const defaultFlag: ExpressTemplateRaw['defaultFlag'] = isDefault ? 1 : 2

    if (name === template.name && isDefault === template.isDefault) {
      return template
    }

    return {
      ...template,
      name,
      isDefault,
      raw: {
        ...template.raw,
        templateName: target ? targetName : template.raw.templateName,
        defaultFlag
      }
    }
  })
}

/**
 *
 * @param draft 寄件草稿
 * @param meta 模板元信息
 * @param sysCode 系统 code
 * @param id 模板 id，新建时为空
 * @description 构造模板保存请求
 */
export function buildTemplateSaveRequest(draft: ExpressDraft, meta: ExpressTemplateDraftMeta, sysCode: string, id = ''): ExpressTemplateSaveRequest {
  const paymentType = draft.service.paymentType
  const returnBill = normalizeExpressReturnBillForTemplate(draft.service.returnBill, draft.selectedProduct?.omsProductCode || draft.service.transportMode)
  const returnBillType = returnBill.type
  const productCode = draft.service.transportMode
  const pickupTime = draft.pickup.time || '现在发货'

  return {
    id,
    templateName: meta.name.trim(),
    defaultFlag: meta.defaultFlag,
    sysCode,
    template: {
      sender: mapExpressContact(draft.sender),
      receiver: mapExpressContact(draft.consignee),
      isContact: draft.service.needContact,
      goodInfo: {
        weight: draft.goods.weight,
        goodsName: draft.goods.name.trim(),
        isExtra: false
      },
      pickupTime: {
        dispatchFlag: draft.pickup.dispatch,
        beginAcceptTime: pickupTime,
        beginAcceptTimeText: pickupTime === '现在发货' ? '现在发货' : `每天 ${pickupTime}`,
        serviceTime: draft.pickup.timeSlot || ''
      },
      payment: {
        paymentType,
        paymentName: PAYMENT_LABELS[paymentType]
      },
      product: {
        omsProductCode: productCode,
        productCode
      },
      insurance: {
        insuranceAmount: draft.goods.insuredAmount ? String(draft.goods.insuredAmount) : ''
      },
      addedService: {
        returnBillType,
        returnBillName: RETURN_LABELS[returnBillType],
        returnRequirement: getExpressReturnBillRequirementText(returnBill),
        customReturnRequirement: returnBill.customRequirement
      }
    }
  }
}
