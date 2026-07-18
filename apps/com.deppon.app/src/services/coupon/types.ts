export type CouponStatus =
  | 'AVAILABLE'
  | 'UN_AVAILABLE'
  | 'USABLE'
  | 'USED'
  | 'EXPIRED'

export type CouponDiscountType = '1' | '2' | '3' | '4' | '5' | '8' | '9' | string

export interface CouponItem {
  couponCode: string
  startTime: string
  endTime: string
  discountFee: number
  useFee: number
  subFee: number
  limitDiscountFee: number
  subtitle?: string
  subTitle?: string
  discountType: CouponDiscountType
  fitWeek?: string | null
  fitChannel?: string | null
  label?: 'recommended' | 'will_expire' | string
  optimalFee?: number
  useLimit?: string[]
  status?: string
  promotionReduceFee?: number
  couponLabel?: 'NEW' | 'EXPIRE' | string
  employeeFlag?: 'Y' | 'N'
  businessStatus?: '0' | '1' | '2' | string
  fitCouponTagList?: string[]
}

export type ExpressCouponFeeType = 'FRT' | 'BF' | 'AD' | 'NMBZ'

export interface ExpressCouponFee {
  feeType: ExpressCouponFeeType
  freight: number
}

export interface ExpressCouponQueryRequest {
  freight: number
  couponCode?: string
  productCode: string
  arriveProvinceName: string
  channel: string
  mobile: string
  paymentType?: string
  sendAnAddress: string
  receivesAnAddress: string
  couponFeeList: ExpressCouponFee[]
}

export interface ExpressCouponQueryRaw {
  available?: CouponItem[] | null
  unAvailable?: CouponItem[] | null
}

export interface UserCouponListRequest {
  type: CouponStatus
}

export interface CouponExchangeRequest {
  exchangeCouponCode: string
}

export interface CouponExchangeResponse {
  data?: boolean
  msg?: string
}

export interface CouponDetailRequest {
  couponCode: string
}

export interface CouponAddress {
  type: '1' | '2' | string
  address: string
}

export interface CouponDetailRaw {
  couponCode: string
  fitProduct?: string | null
  limit?: string[] | null
  couponDescribe?: string | null
  addressList?: CouponAddress[]
}

export interface CouponListResult {
  status: CouponStatus
  list: CouponItem[]
  totalRows: number
}

export interface CouponCardView {
  code: string
  typeName: string
  amountValue: string
  amountUnit: string
  title: string
  thresholdText: string
  validityText: string
  usageTimeText: string
  statusText: string
  labelText: string
  tags: string[]
  canUse: boolean
  raw: CouponItem
}

export interface CouponDetailView {
  code: string
  fitProduct: string
  limits: string[]
  descriptions: string[]
  senderAddresses: string[]
  consigneeAddresses: string[]
  hasDetail: boolean
}

export interface ExpressCouponQueryResult {
  available: CouponCardView[]
  unavailable: CouponCardView[]
}
