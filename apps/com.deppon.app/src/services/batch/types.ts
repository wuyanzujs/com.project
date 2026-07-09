import type { AppRoutePath } from '../../shared/navigation/routes'

export type BatchEntryActionKind =
  | 'singleExpress'
  | 'addressRecognition'
  | 'excelImport'
  | 'print'

export type BatchEntryActionStatus = 'ready' | 'copy' | 'pending'

export interface BatchContact {
  id?: string
  name: string
  mobile: string
  province: string
  city: string
  county: string
  address: string
}

export interface BatchConsigneeDraft {
  contact: BatchContact | null
  goodsName: string
  waybillNumber?: string
}

export interface BatchDraft {
  sender: BatchContact | null
  consignees: BatchConsigneeDraft[]
  requireWaybillNumber?: boolean
}

export interface BatchValidationResult {
  valid: boolean
  step:
    | 'sender'
    | 'consignee'
    | 'senderPhone'
    | 'address'
    | 'goods'
    | 'waybill'
    | 'specialRegion'
    | 'ready'
  consigneeIndex: number
  message: string
}

export type BatchRecognizedConsigneeStatus = 'ready' | 'error'

export interface BatchRecognizedConsignee {
  lineNumber: number
  rawText: string
  status: BatchRecognizedConsigneeStatus
  message: string
  contact: BatchContact | null
  goodsName: string
}

export interface BatchAddressRecognitionResult {
  totalLines: number
  acceptedCount: number
  rejectedCount: number
  ignoredCount: number
  items: BatchRecognizedConsignee[]
}

export interface BatchEntryActionView {
  key: BatchEntryActionKind
  title: string
  summary: string
  status: BatchEntryActionStatus
  statusText: string
  route?: AppRoutePath
  copyText?: string
  disabledReason?: string
}

export interface BatchEntryView {
  title: string
  summary: string
  maxConsigneeCount: number
  excelUrl: string
  actions: BatchEntryActionView[]
  rules: string[]
}
