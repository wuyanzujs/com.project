import { markExpressQuoteStale } from './express.mutations'

import type {
  ExpressCollectionDraft,
  ExpressCollectionType,
  ExpressDraft,
  ExpressProductQuote
} from './types'

export const EXPRESS_COLLECTION_DEFAULT_LIMIT = 1000000

export interface ExpressCollectionOption {
  value: Exclude<ExpressCollectionType, ''>
  label: string
  summary: string
}

export const EXPRESS_COLLECTION_OPTIONS: ExpressCollectionOption[] = [
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

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

function normalizeAccount(value?: string | null) {
  return normalizeText(value).replace(/\s+/g, '')
}

export function parseExpressCollectionAmount(value: string | number) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0
  }

  return Math.round(parsed * 100) / 100
}

export function normalizeExpressCollectionAmountInput(value: string) {
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

  return `${integer}.${decimal}`
}

export function createExpressCollectionDraft(): ExpressCollectionDraft {
  return {
    type: '',
    amount: 0,
    account: '',
    accountName: '',
    limit: EXPRESS_COLLECTION_DEFAULT_LIMIT,
    agreementAccepted: false
  }
}

export function normalizeExpressCollectionDraft(
  value?: Partial<ExpressCollectionDraft> | null
): ExpressCollectionDraft {
  const defaults = createExpressCollectionDraft()
  const amount = parseExpressCollectionAmount(value?.amount ?? 0)
  const type =
    value?.type === 'NORMAL' || value?.type === 'INTRADAY'
      ? value.type
      : amount > 0
        ? 'NORMAL'
        : ''
  const limit = parseExpressCollectionAmount(
    value?.limit ?? EXPRESS_COLLECTION_DEFAULT_LIMIT
  )

  return {
    ...defaults,
    ...value,
    type,
    amount,
    account: normalizeAccount(value?.account),
    accountName: normalizeText(value?.accountName),
    limit: limit || EXPRESS_COLLECTION_DEFAULT_LIMIT,
    agreementAccepted: Boolean(value?.agreementAccepted)
  }
}

export function getExpressCollectionOption(type: ExpressCollectionType) {
  return (
    EXPRESS_COLLECTION_OPTIONS.find(option => option.value === type) ??
    EXPRESS_COLLECTION_OPTIONS[0]
  )
}

export function maskExpressCollectionAccount(value?: string | null) {
  const account = normalizeAccount(value)

  if (!account) {
    return ''
  }

  if (account.length <= 4) {
    return account
  }

  return `**** ${account.slice(-4)}`
}

export function getExpressCollectionFee(
  product?: ExpressProductQuote | null
) {
  const detail = product?.detail?.find(item => {
    const code = normalizeText(item.priceEntryCode).toUpperCase()
    const name = normalizeText(item.priceEntryName)

    return code === 'HK' || name.includes('代收')
  })

  return detail && Number.isFinite(detail.caculateFee)
    ? Math.max(0, detail.caculateFee)
    : null
}

export function validateExpressCollection(
  collection: ExpressCollectionDraft
) {
  const normalized = normalizeExpressCollectionDraft(collection)

  if (!normalized.type) {
    return normalized.amount || normalized.account
      ? ['请重新确认代收货款服务']
      : []
  }

  const messages: string[] = []

  if (normalized.amount <= 0) {
    messages.push('请填写代收货款金额')
  } else if (normalized.amount > normalized.limit) {
    messages.push(`代收货款金额不能超过 ${normalized.limit} 元`)
  }

  if (!normalized.account) {
    messages.push('请选择代收货款收款账户')
  }

  if (!normalized.agreementAccepted) {
    messages.push('请阅读并同意代收货款服务协议')
  }

  return messages
}

export function updateExpressCollectionPricing(
  draft: ExpressDraft,
  patch: Partial<Pick<ExpressCollectionDraft, 'type' | 'amount'>>
) {
  return markExpressQuoteStale(
    {
      ...draft,
      collection: normalizeExpressCollectionDraft({
        ...draft.collection,
        ...patch
      })
    },
    '代收货款信息变化，请重新获取价格'
  )
}

export function updateExpressCollectionDetails(
  draft: ExpressDraft,
  patch: Partial<
    Pick<
      ExpressCollectionDraft,
      'account' | 'accountName' | 'limit' | 'agreementAccepted'
    >
  >
) {
  return {
    ...draft,
    collection: normalizeExpressCollectionDraft({
      ...draft.collection,
      ...patch
    })
  }
}

export function clearExpressCollection(draft: ExpressDraft) {
  const nextCollection = {
    ...createExpressCollectionDraft(),
    limit: normalizeExpressCollectionDraft(draft.collection).limit
  }

  if (!draft.collection.type && !draft.collection.amount) {
    return {
      ...draft,
      collection: nextCollection
    }
  }

  return markExpressQuoteStale(
    {
      ...draft,
      collection: nextCollection
    },
    '已取消代收货款，请重新获取价格'
  )
}
