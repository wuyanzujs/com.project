import type {
  OrderDetail,
  OrderEditCollectionDraft,
  OrderEditCollectionType,
  OrderModifyRequest
} from './types'

export const ORDER_EDIT_COLLECTION_DEFAULT_LIMIT = 1000000

export const ORDER_EDIT_COLLECTION_OPTIONS: Array<{
  value: OrderEditCollectionType
  label: string
  summary: string
}> = [
  {
    value: 'NORMAL',
    label: '三日退',
    summary: '签收后第三天返款，周末及法定节假日顺延。'
  },
  {
    value: 'INTRADAY',
    label: '即日退',
    summary: '签收后 24 小时返款，法定节假日顺延。'
  }
]

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeAccount(value: unknown) {
  return normalizeText(value).replace(/\s+/g, '')
}

export function normalizeOrderEditCollectionType(
  value: unknown
): OrderEditCollectionType {
  const type = normalizeText(value).toUpperCase()

  return type === 'INTRADAY' || type === 'R1' || type === '即日退'
    ? 'INTRADAY'
    : 'NORMAL'
}

export function parseOrderEditCollectionAmount(value: unknown) {
  const amount = Number(value)

  if (!Number.isFinite(amount) || amount <= 0) {
    return 0
  }

  return Math.round(amount * 100) / 100
}

export function normalizeOrderEditCollectionAmountInput(value: string) {
  const sanitized = value.replace(/[^\d.]/g, '')
  const hasDecimalPoint = sanitized.includes('.')
  const [integerPart = '', ...decimalParts] = sanitized.split('.')
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '')

  if (!hasDecimalPoint) {
    return normalizedInteger.slice(0, 11)
  }

  const integer = (normalizedInteger || '0').slice(0, 10)
  const decimal = decimalParts
    .join('')
    .slice(0, Math.min(2, 10 - integer.length))

  return integer + '.' + decimal
}

export function normalizeOrderEditCollection(
  value?: Partial<OrderEditCollectionDraft> | null
): OrderEditCollectionDraft {
  const limit =
    parseOrderEditCollectionAmount(value?.limit) ||
    ORDER_EDIT_COLLECTION_DEFAULT_LIMIT

  return {
    enabled: Boolean(value?.enabled),
    type: normalizeOrderEditCollectionType(value?.type),
    amount: parseOrderEditCollectionAmount(value?.amount),
    account: normalizeAccount(value?.account),
    accountName: normalizeText(value?.accountName),
    limit,
    agreementAccepted: Boolean(value?.agreementAccepted)
  }
}

export function createOrderEditCollectionDraft(
  detail: OrderDetail
): OrderEditCollectionDraft {
  const amount = parseOrderEditCollectionAmount(
    detail.receiverMoneyAmount ?? detail.reviceMoneyAmount
  )
  const account = normalizeAccount(detail.reciveLoanAccount)
  const enabled = amount > 0 || Boolean(account)

  return normalizeOrderEditCollection({
    enabled,
    type: normalizeOrderEditCollectionType(
      detail.receiverLoanType ?? detail.reciveLoanType
    ),
    amount,
    account,
    accountName: normalizeText(detail.reciveLoanAccountName),
    agreementAccepted: enabled
  })
}

export function updateOrderEditCollection(
  collection: OrderEditCollectionDraft,
  patch: Partial<OrderEditCollectionDraft>
) {
  return normalizeOrderEditCollection({
    ...collection,
    ...patch
  })
}

export function clearOrderEditCollection(
  collection: OrderEditCollectionDraft
) {
  return normalizeOrderEditCollection({
    enabled: false,
    type: 'NORMAL',
    amount: 0,
    account: '',
    accountName: '',
    limit: collection.limit,
    agreementAccepted: false
  })
}

export function validateOrderEditCollection(
  collection: OrderEditCollectionDraft
) {
  const normalized = normalizeOrderEditCollection(collection)

  if (!normalized.enabled) {
    return []
  }

  const messages: string[] = []

  if (normalized.amount <= 0) {
    messages.push('请填写代收货款金额')
  } else if (normalized.amount > normalized.limit) {
    messages.push('代收货款金额不能超过 ' + normalized.limit + ' 元')
  }

  if (!normalized.account || !normalized.accountName) {
    messages.push('请选择代收货款收款账户')
  }

  if (!normalized.agreementAccepted) {
    messages.push('请阅读并同意代收货款服务协议')
  }

  return messages
}

export type OrderEditCollectionRequestFields = Required<
  Pick<
    OrderModifyRequest,
    | 'reciveLoanType'
    | 'reviceMoneyAmount'
    | 'accountName'
    | 'reciveLoanAccount'
  >
>

export function createOrderEditCollectionRequestFields(
  collection: OrderEditCollectionDraft
): OrderEditCollectionRequestFields {
  const normalized = normalizeOrderEditCollection(collection)

  return normalized.enabled
    ? {
        reciveLoanType: normalized.type,
        reviceMoneyAmount: normalized.amount,
        accountName: normalized.accountName,
        reciveLoanAccount: normalized.account
      }
    : {
        reciveLoanType: 'NORMAL',
        reviceMoneyAmount: 0,
        accountName: '',
        reciveLoanAccount: ''
      }
}

export function isOrderEditCollectionChanged(
  collection: OrderEditCollectionDraft,
  origin: OrderEditCollectionDraft
) {
  const currentFields = createOrderEditCollectionRequestFields(collection)
  const originFields = createOrderEditCollectionRequestFields(origin)

  return (
    currentFields.reciveLoanType !== originFields.reciveLoanType ||
    currentFields.reviceMoneyAmount !== originFields.reviceMoneyAmount ||
    currentFields.accountName !== originFields.accountName ||
    currentFields.reciveLoanAccount !== originFields.reciveLoanAccount
  )
}

export function maskOrderEditCollectionAccount(value: unknown) {
  const account = normalizeAccount(value)

  if (!account || account.length <= 4) {
    return account
  }

  return '**** ' + account.slice(-4)
}
