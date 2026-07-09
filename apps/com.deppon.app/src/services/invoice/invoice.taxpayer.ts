import { getFieldLength, normalizeText } from './invoice.shared'

import type {
  InvoiceTaxpayerForm,
  InvoiceTaxpayerRaw,
  InvoiceTaxpayerSaveRequest,
  InvoiceTaxpayerView
} from './types'

export function normalizeTaxpayer(
  item: InvoiceTaxpayerRaw
): InvoiceTaxpayerView {
  return {
    id: item.id,
    name: normalizeText(item.acceptTinName),
    taxNumber: normalizeText(item.acceptTinCode),
    typeText: item.customerType === '1' ? '单位' : '个人/事业单位',
    phone: normalizeText(item.phone),
    address: normalizeText(item.address),
    bank: normalizeText(item.openBank),
    bankAccount: normalizeText(item.bankNo),
    isDefault: item.isDefault === '1',
    customerType: item.customerType === '1' ? '1' : '0',
    remark: normalizeText(item.remark)
  }
}

export function createTaxpayerPayload(
  form: InvoiceTaxpayerForm
): InvoiceTaxpayerSaveRequest {
  return {
    id: form.id || undefined,
    customerType: form.customerType,
    acceptTinName: form.name.trim(),
    acceptTinCode: form.taxNumber.trim(),
    address: form.address.trim(),
    phone: form.phone.trim(),
    openBank: form.bank.trim(),
    bankNo: form.bankAccount.trim(),
    remark: form.remark.trim(),
    isDefault: form.isDefault ? '1' : '0'
  }
}

export function createFormFromTaxpayer(
  taxpayer?: InvoiceTaxpayerView | null
): InvoiceTaxpayerForm {
  return {
    id: taxpayer?.id,
    customerType: taxpayer?.customerType ?? '0',
    name: taxpayer?.name ?? '',
    taxNumber: taxpayer?.taxNumber ?? '',
    phone: taxpayer?.phone ?? '',
    address: taxpayer?.address ?? '',
    bank: taxpayer?.bank ?? '',
    bankAccount: taxpayer?.bankAccount ?? '',
    remark: taxpayer?.remark ?? '',
    isDefault: taxpayer?.isDefault ?? false
  }
}

export function validateTaxpayer(form: InvoiceTaxpayerForm) {
  const name = form.name.trim()
  const taxNumber = form.taxNumber.trim()
  const sensitiveWords = ['代开', '专票', '发票', '贷开', '發票', '微信']

  if (!name) {
    return '请输入发票抬头'
  }

  if (name.length < 6 && form.customerType === '1') {
    return '单位抬头不能少于6个字'
  }

  if (getFieldLength(name) > 100) {
    return '发票抬头过长，请删减信息'
  }

  if (sensitiveWords.some((item) => name.includes(item))) {
    return '抬头信息可能无法通过审核，请确认填写信息真实有效'
  }

  if (!taxNumber && form.customerType === '1') {
    return '请输入企业税号'
  }

  if (
    taxNumber &&
    form.customerType === '1' &&
    !/^([0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}|[1-9]\d{14})$/.test(
      taxNumber
    )
  ) {
    return '税号格式错误，请输入正确的企业纳税人识别号'
  }

  if (getFieldLength(`${form.phone}${form.address}`) > 100) {
    return '地址/电话过长，请删减信息'
  }

  if (getFieldLength(`${form.bank}${form.bankAccount}`) > 70) {
    return '银行信息过长，请删减信息'
  }

  return ''
}

