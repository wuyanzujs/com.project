import type { ExpressReturnBillType } from './types'

export interface ExpressReturnBillOption {
  label: string
  summary: string
  value: ExpressReturnBillType
}

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
    summary: '使用线上签收单能力，签署范围和可用性以后端校验为准。',
    value: 'RETURNBILL_TYPE_ONLINE'
  }
]

export function getExpressReturnBillOption(value: ExpressReturnBillType) {
  return (
    expressReturnBillOptions.find((option) => option.value === value) ??
    expressReturnBillOptions[0]
  )
}
