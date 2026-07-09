import {
  formatDateTime,
  normalizeText,
  toFiniteNumber,
  truncateText
} from './invoice.shared'

import type {
  InvoiceHistoryRaw,
  InvoiceHistoryView,
  InvoiceHistoryWaybillRaw,
  InvoiceHistoryWaybillView,
  InvoicePreviewRaw,
  InvoicePreviewView,
  InvoiceStatusClass
} from './types'

function normalizeTimestamp(value?: number | null) {
  if (!value) {
    return null
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

  return formatDateTime(date)
}

function getHistoryStatusName(status: number) {
  switch (status) {
    case 0:
      return '待受理'
    case 1:
      return '待审核'
    case 2:
      return '不通过'
    case 3:
      return '待开具'
    case 4:
      return '已开具'
    case 5:
      return '已寄送'
    case 6:
    case 7:
      return '已作废'
    case 14:
      return '开具中'
    case 15:
      return '寄送中'
    case 16:
    case 17:
      return '作废中'
    case 24:
      return '开具失败'
    case 25:
      return '寄送失败'
    case 31:
      return '已撤销'
    default:
      return '待受理'
  }
}

function getHistoryStatusClass(status: number): InvoiceStatusClass {
  if (status === 6 || status === 31) {
    return 'Cancel'
  }

  if (status === 4 || status === 5 || status === 15 || status === 21) {
    return 'Success'
  }

  if (status === 2 || status === 7 || (status >= 23 && status <= 28)) {
    return 'Error'
  }

  return 'Process'
}

function getBillCategoryName(category?: string) {
  switch (category) {
    case '01':
      return '纸质专票'
    case '06':
    case '14':
      return '电子普票'
    case '13':
      return '电子专票'
    default:
      return '增值税专用发票'
  }
}

export function normalizeHistory(
  item: InvoiceHistoryRaw
): InvoiceHistoryView {
  const status = Number.parseInt(normalizeText(item.status), 10)
  const normalizedStatus = Number.isFinite(status) ? status : 0
  const title = normalizeText(item.acceptTinName)

  return {
    id: normalizeText(item.applyNo || item.id),
    title: truncateText(title || '发票抬头', 18),
    taxNumber: normalizeText(item.acceptTinCode),
    amount: toFiniteNumber(item.billAmount),
    typeText: getBillCategoryName(item.billCategory),
    statusText: getHistoryStatusName(normalizedStatus),
    statusClass: getHistoryStatusClass(normalizedStatus),
    applyTime: formatTimestamp(item.applyTime),
    email: normalizeText(item.email),
    remark: normalizeText(item.remark),
    previewUrl: normalizeText(item.elecLinkAdress),
    canPreview: Boolean(item.elecLinkAdress)
  }
}

export function normalizeHistoryWaybills(
  raw: InvoiceHistoryWaybillRaw
): InvoiceHistoryWaybillView[] {
  return Object.entries(raw)
    .map(([waybillNumber, amount]) => ({
      waybillNumber: normalizeText(waybillNumber),
      amount: toFiniteNumber(amount)
    }))
    .filter((item) => item.waybillNumber && item.amount > 0)
}

function createPreviewFile(title: string, pdfUrl?: string, imageUrl?: string) {
  const normalizedPdfUrl = normalizeText(pdfUrl)
  const normalizedImageUrl = normalizeText(imageUrl)

  return {
    title,
    pdfUrl: normalizedPdfUrl,
    imageUrl: normalizedImageUrl,
    displayUrl: normalizedImageUrl || normalizedPdfUrl,
    hasPdf: !!normalizedPdfUrl,
    hasImage: !!normalizedImageUrl
  }
}

export function normalizePreview(
  raw: InvoicePreviewRaw,
  applyNo: string,
  title: string
): InvoicePreviewView {
  const invoice = createPreviewFile(
    '发票文件',
    raw.elecLinkAdress,
    raw.elecLinkAdressPicture
  )
  const reversal = createPreviewFile(
    '已作废发票',
    raw.redElecLinkAdress,
    raw.redElecLinkAdressPicture
  )
  const hasPreview = !!(invoice.displayUrl || reversal.displayUrl)

  return {
    applyNo,
    title,
    billCategoryText: getBillCategoryName(raw.billCategory),
    invoice,
    reversal,
    hasPreview,
    message: hasPreview ? '' : '暂无发票预览信息'
  }
}

