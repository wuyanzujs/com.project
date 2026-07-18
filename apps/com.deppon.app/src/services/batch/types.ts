import type { AppRoutePath } from '../../shared/navigation/routes'
import type {
  ExpressCollectionType,
  ExpressDeliveryMode,
  ExpressFlag,
  ExpressPaymentType,
  ExpressProductCode,
  ExpressReturnBillType,
  ExpressScanContext
} from '../express/types'

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
  goods: BatchGoodsDraft
  service: BatchServiceDraft
  productCode: ExpressProductCode
  productName: string
  estimatedFee: number | null
  deliveryMode: ExpressDeliveryMode
  couponNumber: string
  remark: string
  waybillNumber: string
  receiveGoods: boolean
}

export interface BatchGoodsDraft {
  name: string
  count: number
  weight: number
  volume: number
}

export interface BatchServiceDraft {
  insuredAmount: number
  reciveLoanType: ExpressCollectionType
  reciveLoanAccount: string
  reviceMoneyAmount: number
  returnBillType: ExpressReturnBillType
  returnRequirement: string
  accountName: string
  privacyProtection: ExpressFlag
}

export interface BatchPickupDraft {
  dispatch: ExpressFlag
  time: string
  endTime?: string
  stationCode: string
  stationName: string
  pickPeriodTime?: number
}

export interface BatchDraft {
  sender: BatchContact | null
  consignees: BatchConsigneeDraft[]
  paymentType: ExpressPaymentType
  needContact: ExpressFlag
  pickup: BatchPickupDraft
  scanContext?: ExpressScanContext
  requireWaybillNumber: boolean
}

export interface BatchValidationResult {
  valid: boolean
  step:
    | 'sender'
    | 'consignee'
    | 'senderPhone'
    | 'consigneePhone'
    | 'address'
    | 'goods'
    | 'goodsCount'
    | 'goodsWeight'
    | 'product'
    | 'waybill'
    | 'specialRegion'
    | 'ready'
  consigneeIndex: number
  message: string
}

export interface BatchSubmitSummary {
  status: 'success' | 'partial' | 'failure'
  successCount: number
  failedCount: number
  message: string
}

export interface BatchQuoteItem {
  consigneeIndex: number
  productCode: ExpressProductCode
  productName: string
  estimatedFee: number | null
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
