import { validateEmail } from './invoice.apply'
import { normalizeText, toFiniteNumber } from './invoice.shared'

import type {
  InvoiceApplyPreview,
  InvoiceECardApplyDraft,
  InvoiceECardApplySubmitRequest,
  InvoiceECardRaw,
  InvoiceECardView
} from './types'

const ECARD_APPLY_SYSTEM = {
  applyType: '171',
  sourceType: '17',
  SourceSystem: 'WX'
} as const

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function normalizeTimestamp(value?: number | null) {
  if (!value) {
    return 0
  }

  return value < 10000000000 ? value * 1000 : value
}

function formatTimestamp(value?: number | null) {
  const timestamp = normalizeTimestamp(value)

  if (!timestamp) {
    return '--'
  }

  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`
}

export function normalizeInvoiceECard(raw: InvoiceECardRaw): InvoiceECardView {
  const id = normalizeText(raw.payNo || raw.orderNo || raw.id)
  const timestamp = normalizeTimestamp(
    raw.chargeAmountTime || raw.cashAmountTime || raw.modifTime
  )

  return {
    id,
    amount: toFiniteNumber(raw.unbillAmount),
    timestamp,
    businessTime: formatTimestamp(timestamp)
  }
}

export function getInvoiceECardTotalAmount(items: InvoiceECardView[]) {
  return items.reduce((total, item) => total + toFiniteNumber(item.amount), 0)
}

export function createECardApplyPreview(
  draft: InvoiceECardApplyDraft
): InvoiceApplyPreview {
  const amount = getInvoiceECardTotalAmount(draft.ecards)
  const emailMessage = validateEmail(draft.email)
  let message = ''

  if (!draft.ecards.length) {
    message = '请选择储值卡开票记录'
  } else if (draft.ecards.some((item) => !item.id)) {
    message = '储值卡记录缺少打款编码'
  } else if (!draft.taxpayer) {
    message = '请选择发票抬头'
  } else if (draft.billCategory !== '06') {
    message = '储值卡业务仅支持电子普票'
  } else if (amount <= 0) {
    message = '当前储值卡暂无可开票金额'
  } else if (emailMessage) {
    message = emailMessage
  }

  return {
    waybillNumber: draft.ecards.map((item) => item.id).join(','),
    amount,
    billCategoryText: '电子普票',
    taxpayerName: draft.taxpayer?.name || '',
    taxpayerTypeText: draft.taxpayer?.typeText || '',
    email: draft.email.trim(),
    remark: draft.remark.trim(),
    canSubmit: !message,
    message
  }
}

export function createECardApplySubmitPayload(
  draft: InvoiceECardApplyDraft
): InvoiceECardApplySubmitRequest {
  const taxpayer = draft.taxpayer
  const amount = getInvoiceECardTotalAmount(draft.ecards)
  const includeCompanyInfo = taxpayer?.customerType === '1'

  return {
    TaskDetailList: draft.ecards.map((item) => ({
      orderNo: item.id,
      sourceBillNo: item.id,
      amount: toFiniteNumber(item.amount),
      payFlag: true
    })),
    TaskInfo: {
      payNo: '',
      status: '0',
      isAllOpen: '1',
      isDomestic: '',
      sendCustomer: 11,
      phoneNo: '',
      acceptPhone: '',
      acceptArea: '',
      acceptAddress: '',
      acceptCustomer: '',
      ...ECARD_APPLY_SYSTEM,
      taxNo: taxpayer?.taxNumber ?? '',
      taxName: taxpayer?.name ?? '',
      customerType: taxpayer?.customerType ?? '0',
      taxTelephone: includeCompanyInfo ? taxpayer?.phone ?? '' : '',
      taxAddress: includeCompanyInfo ? taxpayer?.address ?? '' : '',
      taxBankName: includeCompanyInfo ? taxpayer?.bank ?? '' : '',
      taxBankNumber: includeCompanyInfo ? taxpayer?.bankAccount ?? '' : '',
      openAmount: amount,
      totalAmount: amount,
      open_amount: amount,
      unit: draft.unit.trim(),
      email: draft.email.trim(),
      taxEmail: draft.email.trim(),
      billCategory: '06',
      isPrintSaleList: 'N',
      remark: draft.remark.trim() || '收派服务费',
      invoiceContent: '预存卡销售和充值'
    }
  }
}
