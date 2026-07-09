import type { AppRoutePath } from '../../shared/navigation/routes'

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
