import { getInvoiceECardTotalAmount } from '../../../services/invoice'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'

import type {
  InvoiceECardView,
  InvoiceHistoryView,
  InvoiceOrderView,
  InvoiceTab
} from '../../../services/invoice'

export interface InvoiceCenterTabItem {
  label: string
  value: InvoiceTab
}

export const INVOICE_CENTER_TABS: InvoiceCenterTabItem[] = [
  { label: '可开票', value: 'orders' },
  { label: '储值卡', value: 'ecards' },
  { label: '开票历史', value: 'history' },
  { label: '发票抬头', value: 'taxpayers' }
]

export function parseInvoiceCenterTab(value?: string): InvoiceTab {
  return value === 'ecards' || value === 'history' || value === 'taxpayers'
    ? value
    : 'orders'
}

export function createInvoiceOrderApplyUrl(order: InvoiceOrderView) {
  return createAppRouteUrl(APP_ROUTES.invoiceApply, {
    order: JSON.stringify(order)
  })
}

export function createInvoiceECardApplyUrl(items: InvoiceECardView[]) {
  return createAppRouteUrl(APP_ROUTES.invoiceApply, {
    ecards: JSON.stringify(items)
  })
}

export function createInvoicePreviewUrl(item: InvoiceHistoryView) {
  return createAppRouteUrl(APP_ROUTES.invoicePreview, {
    id: item.id,
    title: item.title,
    email: item.email
  })
}

export function createInvoiceDetailUrl(item: InvoiceHistoryView) {
  return createAppRouteUrl(APP_ROUTES.invoiceDetail, {
    data: JSON.stringify(item)
  })
}

export function getSelectedInvoiceECards(
  items: InvoiceECardView[],
  selectedIds: string[]
) {
  const selectedIdSet = new Set(selectedIds)

  return items.filter(item => selectedIdSet.has(item.id))
}

export function getSelectedInvoiceECardAmount(
  items: InvoiceECardView[],
  selectedIds: string[]
) {
  return getInvoiceECardTotalAmount(
    getSelectedInvoiceECards(items, selectedIds)
  )
}
