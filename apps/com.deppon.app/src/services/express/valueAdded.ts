import type {
  ExpressReturnBillDraft,
  ExpressReturnBillRequirement,
  ExpressReturnBillType,
  ExpressProductCode
} from './types'

export interface ExpressReturnBillOption {
  label: string
  summary: string
  value: ExpressReturnBillType
}

export interface ExpressReturnBillRequirementOption {
  code: ExpressReturnBillRequirement
  label: string
}

export const EXPRESS_RETURN_BILL_CUSTOM_MAX_LENGTH = 20
export const EXPRESS_RETURN_BILL_COUNT_MIN = 1
export const EXPRESS_RETURN_BILL_COUNT_MAX = 99

export const expressReturnBillOptions: ExpressReturnBillOption[] = [
  {
    label: '无需返单',
    summary: '不额外返回签收单，按普通签收结果处理。',
    value: 'NO_RETURN_SIGNED'
  },
  {
    label: '电子签回单',
    summary: '收方签收后返回电子签收凭证，便于线上核对。',
    value: 'CUSTOMER_SIGNED_FAX'
  },
  {
    label: '原件返回',
    summary: '返回收方签署的纸质签收单，具体时效以后端和网点为准。',
    value: 'CUSTOMER_SIGNED_ORIGINAL'
  },
  {
    label: '电子云签',
    summary: '先完成线上签署，再提交订单；签署范围以后端校验为准。',
    value: 'RETURNBILL_TYPE_ONLINE'
  },
  {
    label: '原件+电子云签',
    summary: '同时返回纸质原件和电子云签，需先完成线上签署。',
    value: 'ORIGINAL_ONLINE'
  }
]

export const expressReturnBillRequirementOptions:
  ExpressReturnBillRequirementOption[] = [
    { code: 'R1', label: '签名' },
    { code: 'R2', label: '盖章' },
    { code: 'R3', label: '签身份证号' },
    { code: 'R4', label: '身份证复印件' },
    { code: 'R5', label: '仓库收货回执单' },
    { code: 'R6', label: '签收日期' },
    { code: 'R7', label: '签收人手机号' },
    { code: 'R8', label: '面单' }
  ]

const RETURN_BILL_TYPES = new Set<ExpressReturnBillType>(
  expressReturnBillOptions.map(option => option.value)
)
const RETURN_REQUIREMENTS = new Set<ExpressReturnBillRequirement>(
  expressReturnBillRequirementOptions.map(option => option.code)
)
const PAPER_RETURN_BILL_TYPES = new Set<ExpressReturnBillType>([
  'CUSTOMER_SIGNED_FAX',
  'CUSTOMER_SIGNED_ORIGINAL',
  'ORIGINAL_ONLINE'
])

export function createExpressReturnBillDraft(): ExpressReturnBillDraft {
  return {
    type: 'NO_RETURN_SIGNED',
    requirements: [],
    customRequirement: '',
    returnCount: 1,
    fileCode: ''
  }
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeType(value: unknown): ExpressReturnBillType {
  return RETURN_BILL_TYPES.has(value as ExpressReturnBillType)
    ? (value as ExpressReturnBillType)
    : 'NO_RETURN_SIGNED'
}

function normalizeRequirements(value: unknown) {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []

  const normalized = new Set(
    values
      .map(item => (typeof item === 'string' ? item.trim() : ''))
      .filter((item): item is ExpressReturnBillRequirement =>
        RETURN_REQUIREMENTS.has(item as ExpressReturnBillRequirement)
      )
  )

  return expressReturnBillRequirementOptions
    .map(option => option.code)
    .filter(code => normalized.has(code))
}

function normalizeReturnCount(value: unknown) {
  const count = Number(value)

  if (!Number.isFinite(count)) {
    return EXPRESS_RETURN_BILL_COUNT_MIN
  }

  return Math.min(
    EXPRESS_RETURN_BILL_COUNT_MAX,
    Math.max(EXPRESS_RETURN_BILL_COUNT_MIN, Math.trunc(count))
  )
}

function normalizeCustomRequirement(value: unknown) {
  return normalizeText(value).slice(0, EXPRESS_RETURN_BILL_CUSTOM_MAX_LENGTH)
}

export function isExpressCloudSignType(type: ExpressReturnBillType) {
  return type === 'RETURNBILL_TYPE_ONLINE' || type === 'ORIGINAL_ONLINE'
}

export function isExpressPaperReturnBillType(type: ExpressReturnBillType) {
  return PAPER_RETURN_BILL_TYPES.has(type)
}

export function isExpressReturnBillTypeSupported(
  type: ExpressReturnBillType,
  productCode?: ExpressProductCode | string
) {
  return !(productCode === 'DCZP' && isExpressCloudSignType(type))
}

export function getExpressReturnBillOptions(
  productCode?: ExpressProductCode | string
) {
  return expressReturnBillOptions.filter(option =>
    isExpressReturnBillTypeSupported(option.value, productCode)
  )
}

export function normalizeExpressReturnBillDraft(
  value?: Partial<ExpressReturnBillDraft> | Record<string, unknown> | null,
  productCode?: ExpressProductCode | string
): ExpressReturnBillDraft {
  const source = (value ?? {}) as Record<string, unknown>
  let type = normalizeType(source.type ?? source.returnBillType)

  if (!isExpressReturnBillTypeSupported(type, productCode)) {
    type = 'NO_RETURN_SIGNED'
  }

  if (type === 'NO_RETURN_SIGNED') {
    return createExpressReturnBillDraft()
  }

  const cloudSign = isExpressCloudSignType(type)
  const paperReturn = isExpressPaperReturnBillType(type)

  return {
    type,
    requirements: type === 'RETURNBILL_TYPE_ONLINE'
      ? []
      : normalizeRequirements(source.requirements ?? source.returnRequirement),
    customRequirement:
      type === 'RETURNBILL_TYPE_ONLINE'
        ? ''
        : normalizeCustomRequirement(
            source.customRequirement ?? source.customReturnRequirement
          ),
    returnCount: paperReturn
      ? normalizeReturnCount(source.returnCount ?? source.receiptCount)
      : 1,
    fileCode: cloudSign
      ? normalizeText(source.fileCode ?? source.returnFile)
      : ''
  }
}

export function updateExpressReturnBillDraft(
  draft: ExpressReturnBillDraft,
  patch: Partial<ExpressReturnBillDraft>,
  productCode?: ExpressProductCode | string
) {
  return normalizeExpressReturnBillDraft(
    {
      ...draft,
      ...patch
    },
    productCode
  )
}

export function normalizeExpressReturnBillForTemplate(
  draft: ExpressReturnBillDraft,
  productCode?: ExpressProductCode | string
) {
  const normalized = normalizeExpressReturnBillDraft(draft, productCode)

  return {
    ...normalized,
    fileCode: ''
  }
}

export function getExpressReturnBillOption(value: ExpressReturnBillType) {
  return (
    expressReturnBillOptions.find(option => option.value === value) ??
    expressReturnBillOptions[0]
  )
}

export function getExpressReturnBillPpcType(
  value: ExpressReturnBillType
): 'NONE' | 'FAX' | 'ORIGINAL' | 'ONLINE' | 'ORIGINAL_ONLINE' {
  switch (value) {
    case 'CUSTOMER_SIGNED_FAX':
      return 'FAX'
    case 'CUSTOMER_SIGNED_ORIGINAL':
      return 'ORIGINAL'
    case 'RETURNBILL_TYPE_ONLINE':
      return 'ONLINE'
    case 'ORIGINAL_ONLINE':
      return 'ORIGINAL_ONLINE'
    default:
      return 'NONE'
  }
}

export function getExpressReturnBillRequirementText(
  draft: ExpressReturnBillDraft
) {
  return normalizeExpressReturnBillDraft(draft).requirements.join(',')
}

export function validateExpressReturnBill(
  draft: ExpressReturnBillDraft,
  productCode?: ExpressProductCode | string
): string[] {
  const type = normalizeType(draft.type)

  if (type === 'NO_RETURN_SIGNED') {
    return []
  }

  const messages: string[] = []
  const requirements = normalizeRequirements(draft.requirements)

  if (!isExpressReturnBillTypeSupported(type, productCode)) {
    messages.push('当前产品不支持电子云签')
  }

  if (isExpressPaperReturnBillType(type) && requirements.length === 0) {
    messages.push('请选择至少一种签收单要求')
  }

  if (
    normalizeText(draft.customRequirement).length >
    EXPRESS_RETURN_BILL_CUSTOM_MAX_LENGTH
  ) {
    messages.push(`其他签收要求不能超过${EXPRESS_RETURN_BILL_CUSTOM_MAX_LENGTH}个字`)
  }

  if (
    isExpressPaperReturnBillType(type) &&
    (!Number.isInteger(draft.returnCount) ||
      draft.returnCount < EXPRESS_RETURN_BILL_COUNT_MIN ||
      draft.returnCount > EXPRESS_RETURN_BILL_COUNT_MAX)
  ) {
    messages.push(
      `返单张数需为${EXPRESS_RETURN_BILL_COUNT_MIN}到${EXPRESS_RETURN_BILL_COUNT_MAX}张`
    )
  }

  if (isExpressCloudSignType(type) && !normalizeText(draft.fileCode)) {
    messages.push('请先完成电子云签')
  }

  return messages
}
