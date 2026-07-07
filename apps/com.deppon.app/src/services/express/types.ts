export type ExpressFlag = 'Y' | 'N'
export type ExpressPaymentType = 'MP' | 'PAY_ARIIVE' | 'MONTH_PAY'
export type ExpressDeliveryMode =
  | ''
  | 'PICKNOTUPSTAIRS'
  | 'PICKSELF'
  | 'PICKUPSTAIRS'
  | 'BIGUPSTAIRS'
export type ExpressReturnBillType =
  | 'NO_RETURN_SIGNED'
  | 'CUSTOMER_SIGNED_FAX'
  | 'CUSTOMER_SIGNED_ORIGINAL'
  | 'RETURNBILL_TYPE_ONLINE'
export type ExpressCollectionType = '' | 'NORMAL' | 'INTRADAY'
export type ExpressProductCode =
  | ''
  | 'PACKAGE'
  | 'DEAP'
  | 'RCP'
  | 'PCP'
  | 'DCZP'
  | 'DJBK'
  | 'DJTK'
  | 'XJBK'
  | 'XJTK'
  | 'XJTH'
  | 'DJTH'
  | 'YTY'

export type ExpressContactTarget = 'sender' | 'consignee'

export type ExpressInsuranceRuleType = 'NORMAL' | 'QEB' | 'SXB'

export interface ExpressContact {
  id?: string
  name: string
  mobile: string
  fixedPhone?: string
  province: string
  city: string
  county: string
  town?: string
  address: string
  company?: string
  regionType?: '' | 'GAT'
}

export interface ExpressGoods {
  name: string
  count: number
  weight: number
  volume: number
  insuredAmount: number
  reviceMoneyAmount: number
}

export interface ExpressServiceOptions {
  transportMode: ExpressProductCode
  deliveryMode: ExpressDeliveryMode
  paymentType: ExpressPaymentType
  returnBillType: ExpressReturnBillType
  reciveLoanType: ExpressCollectionType
  passwordSigning: ExpressFlag
  needContact: ExpressFlag
  privacyProtection: ExpressFlag
}

export interface ExpressPickup {
  dispatch: ExpressFlag
  time: string
  endTime?: string
  timeSlot?: string
  type: 0
  stationCode: string
  stationName: string
  pickPeriodTime?: number
}

export interface ExpressPriceDetail {
  priceEntryCode: string
  priceEntryName: string
  caculateFee: number
  discountFee?: string | number
}

export interface ExpressProductQuote {
  productName: string
  producteCode?: string
  omsProductCode: ExpressProductCode
  days: string | null
  daysFormat?: string | null
  arriveDate: string | null
  message: string | null
  label: string
  totalfee: number | null
  detail: ExpressPriceDetail[] | null
  billWeight: number | null
}

export interface ExpressDraft {
  sender: ExpressContact | null
  consignee: ExpressContact | null
  goods: ExpressGoods
  service: ExpressServiceOptions
  pickup: ExpressPickup
  selectedProduct: ExpressProductQuote | null
  couponNumber: string
  remark: string
  agreementAccepted: boolean
  quoteStaleReason: string
}

export interface ExpressInsuranceRuleTableRow {
  cells: string[]
  tone?: 'normal' | 'warning'
}

export interface ExpressInsuranceRuleTable {
  title: string
  headers: string[]
  rows: ExpressInsuranceRuleTableRow[]
  note?: string
}

export interface ExpressInsuranceRuleSection {
  title: string
  content: string[]
  table?: ExpressInsuranceRuleTable
}

export interface ExpressInsuranceRuleView {
  type: ExpressInsuranceRuleType
  title: string
  summary: string
  badgeText: string
  sections: ExpressInsuranceRuleSection[]
}

export interface ExpressValidationResult {
  valid: boolean
  messages: string[]
}

export interface ExpressGoodsNameRequest {
  keyWord: string
  pageIndex: number
  pageSize: number
}

export interface ExpressGoodsItem {
  productKeyWord: string
  firstCategory: string
  secondCategory: string
  goodsLabelList?: ExpressGoodsLabel[]
}

export interface ExpressGoodsNameResponse {
  pageSize: number
  pageNum: number
  totalPage: number
  totalRows: number
  list: ExpressGoodsItem[] | null
}

export type ExpressGoodsLabelType =
  | ''
  | 'other_category'
  | '3c_category'
  | 'fragile_articles'
  | 'high_value_category'
  | 'fresh_category'
  | 'unknow_category'
  | 'contraband_category'
  | 'battery_category'
  | 'limitation_insure'
  | 'worry_free_protection'

export type ExpressGoodsDisplayType = null | 'alert' | 'tips' | 'addprice' | 'forbid'

export interface ExpressGoodsLabel {
  tip: string
  goodsRemarkCode: ExpressGoodsLabelType
  displayType: ExpressGoodsDisplayType
}

export interface ExpressGoodsLabelRequest {
  goodsName: string
  senderProvinceName?: string
  senderCityName?: string
  senderCountyName?: string
  arriveProvinceName?: string
  arriveCityName?: string
  arriveCountyName?: string
}

export type ExpressGoodsCheckStatus = 'ok' | 'risk' | 'unknown' | 'forbid'

export interface ExpressGoodsCheckResult {
  goodsName: string
  status: ExpressGoodsCheckStatus
  canExpress: boolean
  title: string
  message: string
  labels: ExpressGoodsLabel[]
}

export interface ExpressFreightRequest {
  channel?: string
  insuredAmount: number
  originalsStreet: string
  receiverAddress: string
  originalsaddress: string
  shipperAddress: string
  reciveLoanType: '' | 'R1' | 'R3'
  returnBillType: 'NONE' | 'FAX' | 'ORIGINAL' | 'ONLINE'
  receiveMethod: '' | 'DELIVER_NOUP' | 'SELF_PICKUP' | 'DELIVER_UP' | 'LARGE_DELIVER_UP'
  reviceMoneyAmount: number
  totalVolume: number
  totalWeight: number
  goodsName?: string
  client: boolean
  detail: boolean
  sendDateTime: string
  promotionsCode?: string
  pickUpToDoor: boolean
  passwordSigning: ExpressFlag
  passProductCode: ExpressProductCode
}

export interface ExpressPickupTimeRequest {
  sysCode?: string
  provinceName: string
  provinceCode?: string
  cityName: string
  cityCode?: string
  countyName: string
  countyCode?: string
  townName?: string
  townCode?: string
  address: string
  weight: number
  volume: number
  goodsNumber?: number
  originalsaddress?: string
  originalsStreet?: string
  priceTimeProductCode?: ExpressProductCode
  source: 0
}

export interface ExpressPickupTimeOpeningDate {
  time: string
  text: string
  type: 'NORMAL' | 'NIGHT' | 'DISABLE'
}

export interface ExpressPickupTimeOpening {
  date: string
  dateList: ExpressPickupTimeOpeningDate[]
}

export interface ExpressPickupTimeResponse {
  deptCode?: string
  deptName?: string
  startTime?: string
  endTime?: string
  serviceTime: string
  opening: boolean
  pickPeriodTime?: number
  openingMessage?: string
  openingList: ExpressPickupTimeOpening[]
  blankOpeningList?: ExpressPickupTimeOpening[]
  nightOpeningList?: ExpressPickupTimeOpening[]
}

export interface ExpressInsurancePriceRequest {
  pricingEntryCode: 'BF'
  productCode: ExpressProductCode
  statements: number[] | string[]
  subType: string
  weight: number
  volume: number
}

export interface ExpressInsurancePriceResponse {
  data?: Record<string, number>
  price?: number
  fixedProtectionName?: string
}

export interface ExpressInsuranceQuote {
  amount: number
  price: number
  name?: string
}

export interface ExpressFilterRequest {
  contactAddress: string
  contactMobile: string
  contactName: string
  receiverAddress: string
  receiverName: string
  receiverMobile: string
  goodsName: string
  totalWeight: number
  transportMode: ExpressProductCode
  deliveryMode: ExpressDeliveryMode
  customerCode?: string
  limitCust?: 0 | 1
}

export interface ExpressFilterResponse {
  reason: string
  type: 0 | 1 | 2 | 3 | 4
  depotType?: string
}

export interface ExpressReceiveOrder {
  receiverCustName: string
  receiverCustMobile: string
  receiverCustAddress: string
  receiverCustAddressDetail: string
  receiverCustProvince: string
  receiverCustCity: string
  receiverCustArea: string
  goodsName: string
  goodsNumber: number
  totalVolume: number
  totalWeight: number
  transportMode: ExpressProductCode
  deliveryMode: ExpressDeliveryMode
  paymentType: ExpressPaymentType
  returnBillType: ExpressReturnBillType
  reciveLoanType: ExpressCollectionType
  reciveLoanAccount: string
  couponNumber: string
  encryptInfo: ExpressFlag
  remark: string
  isRecieveGoods: 0 | 1
  reviceMoneyAmount: number
  insuredAmount: number
  beginAcceptTime: string
  endAcceptTime?: string
  accountName: string
  receivingToPoint: string
  receivingToPointName: string
  waybillNumber: string
  appointmentDeliveryTime: string
  returnRequirement: string
  customReturnRequirement: string
  pickPeriodTime?: number
}

export interface CreateExpressOrderRequest {
  contactIdList: string[]
  isAgreement?: ExpressFlag
  isContact: ExpressFlag
  clientChannel: string
  contactName: string
  contactMobile: string
  contactProvince: string
  contactCity: string
  contactArea: string
  contactAddress: string
  contactAddressDetail: string
  startStation: string
  startStationName: string
  acceptDept: string
  shipperNumber: string
  pickupManId: string
  dispatchFlag: ExpressFlag
  passwordSigning: ExpressFlag
  receive: ExpressReceiveOrder[]
}

export interface CreateExpressOrderResponse {
  orderNumbers: string[] | null
  waybillNumbers: string[] | null
  waybillNumber: string | null
  orderErrorInfo?: Array<{
    index: number
    errorMessage: string
  }>
}

export interface ExpressCreateInterceptResponse {
  orderFlag?: ExpressFlag
  waybillNos?: string[]
}

export interface ExpressOrderDetailRequest {
  orderNumber?: string
  waybillNumber?: string
  sysCode?: string
}

export interface ExpressOrderDetail {
  orderNumber?: string
  waybillNumber?: string
  orderStatus?: string
  contactName?: string
  receiverName?: string
  [key: string]: unknown
}

export interface ExpressOrderCancelRequest {
  orderNumber: string
  cancelReason?: string
  sysCode?: string
}
