export type PaymentOrderType = 'OR' | 'DR' | 'CR' | 'PFCR' | 'DVAR'
export type PaymentWriteOffStatus = 0 | 1
export type PaymentRole = 'sender' | 'receive'

export interface PaymentListRequest {
  orderSource: string
  startTime: string
  endTime: string
  pageIndex: number
  pageSize: number
  writeOffStatus: PaymentWriteOffStatus
  waybillNo?: string
  customerProperty?: PaymentOrderType
}

export interface PaymentItem {
  active?: boolean
  accountDate?: string
  accountStatementDetailNo: string
  arriveCity: string | null
  businessDate: string
  cargoName?: string
  collectionDeptCode?: string
  collectionDeptId?: string
  collectionDeptName?: string
  consignee: string
  customerId?: string
  customerName?: string
  customerType?: string
  orderSubType: PaymentOrderType
  payType?: string
  sender: string | null
  senderCityName: string | null
  totalAmount: number
  unWriteoffAmount: number
  waybillNum: string
  writeoffAmount?: number
  isJdPay?: null | 'Y' | 'N'
  paymentMethod?: 'FC' | 'DT' | null
  dshk?: number
  totalCharge?: number
  publishCharge?: number
  transferFee?: number
  insurance?: number
  refundFee?: number
  pickCharge?: number
  consignCharge?: number
  deliveryCharge?: number
  totalWeight?: number
}

export interface PaymentListResponse {
  errorMsg: string | null
  isError: 'YES' | 'NO' | null
  pageNum: number | null
  pageSize: number | null
  totalRows: number | null
  totalPage: number | null
  list: PaymentItem[] | null
}

export interface PaymentSummary {
  waybillNumber: string
  count: number
  amount: number
  items: PaymentItem[]
  canPay: boolean
  disabledReason?: string
}

export interface QueryUnpaidPaymentOptions {
  role: PaymentRole
  waybillNumber?: string | null
  pageSize?: number
  loading?: boolean
}

export interface QueryUnpaidPaymentListOptions {
  role?: PaymentRole
  waybillNumber?: string
  pageIndex?: number
  pageSize?: number
  loading?: boolean
}

export interface PaymentListResult {
  list: PaymentItem[]
  pageIndex: number
  pageSize: number
  totalPage: number
  totalRows: number
  pageAmount: number
}
