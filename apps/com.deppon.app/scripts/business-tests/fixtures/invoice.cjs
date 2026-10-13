require('../support/register.cjs')

const invoiceOrder = {
  id: 'ORDER_001',
  waybillNumber: 'DPK123456789',
  businessTime: '2026-07-09 10:00:00',
  senderText: '上海市 张三',
  consigneeText: '深圳市 李四',
  amount: 128.5,
  unverAmount: 0,
  unpaidAmount: 0,
  paymentType: '现付',
  statusText: '可开票',
  statusClass: 'success',
  canApply: true,
  pendingPayment: false,
  electronSupported: true
}

const companyTaxpayer = {
  id: 1,
  name: '德邦测试有限公司',
  taxNumber: '91310000123456789X',
  typeText: '单位',
  phone: '021-12345678',
  address: '上海市青浦区明珠路',
  bank: '招商银行上海分行',
  bankAccount: '6222000000000000',
  isDefault: true,
  customerType: '1',
  remark: ''
}

function createInvoiceDraft(patch = {}) {
  return {
    order: { ...invoiceOrder },
    taxpayer: { ...companyTaxpayer },
    billCategory: '13',
    email: 'finance@example.com',
    unit: '票',
    remark: '开票测试',
    ...patch
  }
}

function createECardInvoiceDraft(patch = {}) {
  return {
    ecards: [
      {
        id: 'PAY_001',
        amount: 88.8,
        businessTime: '2026-07-09 10:00:00',
        timestamp: 1783562400000
      }
    ],
    taxpayer: { ...companyTaxpayer },
    billCategory: '06',
    email: 'ecard@example.com',
    unit: '次',
    remark: '',
    ...patch
  }
}

module.exports = {
  invoiceOrder,
  companyTaxpayer,
  createInvoiceDraft,
  createECardInvoiceDraft
}
