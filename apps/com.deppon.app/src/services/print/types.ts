import type { AppRoutePath } from '../../shared/navigation/routes'

export type PrintSearchType = '1' | '2'

export type PrintDateRangeKey =
  | 'today'
  | 'threeDays'
  | 'oneWeek'
  | 'oneMonth'
  | 'threeMonths'

export interface PrintDateRangeOption {
  key: PrintDateRangeKey
  label: string
  summary: string
  startTime: string
  endTime: string
}

export interface PrintListRequest {
  pageNum: number
  pageSize: number
  startTime: string
  endTime: string
  searchType: PrintSearchType
}

export interface PrintOrderRaw {
  id?: string | null
  waybillNumber?: string | null
  receiveName?: string | null
  receivePhone?: string | null
  receiveProvince?: string | null
  receiveCity?: string | null
  receiveArea?: string | null
  receiveAddress?: string | null
  deviceType?: '1' | '2' | null
}

export interface PrintListResponse {
  pageNum?: number | null
  pageSize?: number | null
  totalPage?: number | null
  totalRows?: number | null
  list?: PrintOrderRaw[] | null
}

export interface PrintOrderListItem {
  key: string
  id: string
  waybillNumber: string
  recipientName: string
  recipientPhone: string
  address: string
  deviceType?: '1' | '2'
}

export interface PrintListResult {
  list: PrintOrderListItem[]
  pageIndex: number
  pageSize: number
  totalPage: number
  totalRows: number
}

export interface QueryPrintListOptions {
  searchType: PrintSearchType
  rangeKey?: PrintDateRangeKey
  pageIndex?: number
  pageSize?: number
  loading?: boolean
  now?: Date
}

export interface QueryPrintCountsOptions {
  rangeKey?: PrintDateRangeKey
  loading?: boolean
  now?: Date
}

export interface PrintListCounts {
  waiting: number | null
  printed: number | null
  failedSearchTypes: PrintSearchType[]
}

export type PrintCenterActionKind =
  | 'printOrders'
  | 'printerDevice'
  | 'printConfig'
  | 'cloudPrintCode'
  | 'orderList'

export type PrintCenterActionStatus = 'ready' | 'pending'

export interface PrintCenterActionView {
  key: PrintCenterActionKind
  title: string
  summary: string
  status: PrintCenterActionStatus
  statusText: string
  route?: AppRoutePath
  disabledReason?: string
}

export interface PrintCloudCodeView {
  printId: string
  source: string
  title: string
  summary: string
  statusText: string
  disabledReason: string
}

export interface PrintCenterOptions {
  printId?: string
  source?: string
}

export interface PrintCenterView {
  title: string
  summary: string
  nativeReady: boolean
  cloudCode?: PrintCloudCodeView
  actions: PrintCenterActionView[]
  apiEndpoints: string[]
  rules: string[]
}

export interface PrintSelectionState {
  deviceConnected: boolean
  totalOrders: number
  selectedWaybillNumbers: string[]
}

export interface PrintSelectionResult {
  canPrint: boolean
  step: 'device' | 'orders' | 'selection' | 'ready'
  message: string
}
