import { toFiniteNumber } from './invoice.shared'

import type {
  InvoiceApplyDraft,
  InvoiceApplyPreview,
  InvoiceApplySubmitRequest
} from './types'

const EXPRESS_APPLY_SYSTEM = {
  applyType: '241',
  sourceType: '24',
  SourceSystem: 'XCX'
} as const

export function validateEmail(email: string) {
  if (!email.trim()) {
    return '请输入接收邮箱'
  }

  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
    return '邮箱格式不正确'
  }

  return ''
}

function getApplyBillCategoryText(category: InvoiceApplyDraft['billCategory']) {
  return category === '13' ? '电子专票' : '电子普票'
}

export function createApplyPreview(
  draft: InvoiceApplyDraft
): InvoiceApplyPreview {
  const emailMessage = validateEmail(draft.email)
  let message = ''

  if (!draft.order.canApply) {
    message = draft.order.statusText || '当前运单暂不可开票'
  } else if (!draft.order.id || !draft.order.waybillNumber) {
    message = '缺少开票运单号'
  } else if (!draft.taxpayer) {
    message = '请选择发票抬头'
  } else if (draft.billCategory === '13' && draft.taxpayer.customerType !== '1') {
    message = '电子专票需要选择单位抬头'
  } else if (draft.billCategory === '13' && !draft.order.electronSupported) {
    message = '当前运单暂未开通电子专票'
  } else if (draft.order.amount <= 0) {
    message = '当前运单暂无可开票金额'
  } else if (emailMessage) {
    message = emailMessage
  }

  return {
    waybillNumber: draft.order.waybillNumber,
    amount: draft.order.amount,
    billCategoryText: getApplyBillCategoryText(draft.billCategory),
    taxpayerName: draft.taxpayer?.name || '',
    taxpayerTypeText: draft.taxpayer?.typeText || '',
    email: draft.email.trim(),
    remark: draft.remark.trim(),
    canSubmit: !message,
    message
  }
}

export function createApplySubmitPayload(
  draft: InvoiceApplyDraft
): InvoiceApplySubmitRequest {
  const taxpayer = draft.taxpayer
  const amount = toFiniteNumber(draft.order.amount)
  const openAmount = draft.billCategory === '06' ? 0 : amount
  const includeCompanyInfo = taxpayer?.customerType === '1'

  return {
    TaskDetailList: [
      {
        payNo: '',
        payFlag: true,
        orderNo: draft.order.id,
        sourceBillNo: draft.order.waybillNumber,
        amount,
        unverAmount: toFiniteNumber(draft.order.unverAmount),
        paymentType: draft.order.paymentType,
        electricSpecialTicketAuth: draft.order.electronSupported
      }
    ],
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
      ...EXPRESS_APPLY_SYSTEM,
      taxNo: taxpayer?.taxNumber ?? '',
      taxName: taxpayer?.name ?? '',
      customerType: taxpayer?.customerType ?? '0',
      taxTelephone: includeCompanyInfo ? taxpayer?.phone ?? '' : '',
      taxAddress: includeCompanyInfo ? taxpayer?.address ?? '' : '',
      taxBankName: includeCompanyInfo ? taxpayer?.bank ?? '' : '',
      taxBankNumber: includeCompanyInfo ? taxpayer?.bankAccount ?? '' : '',
      openAmount,
      totalAmount: openAmount,
      open_amount: openAmount,
      unit: draft.unit.trim(),
      email: draft.email.trim(),
      taxEmail: draft.email.trim(),
      billCategory: draft.billCategory,
      isPrintSaleList: 'N',
      remark: draft.remark.trim(),
      invoiceContent: ''
    }
  }
}
