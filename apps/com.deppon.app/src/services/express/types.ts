import type {
  ExpressPackageInfo,
  ExpressPackageLtlType,
  ExpressPackagingDraft,
  ExpressUnpackageLtlInfo
} from './packaging.types'

export type * from './packaging.types'

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
  | 'ORIGINAL_ONLINE'
export type ExpressReturnBillRequirement =
  | 'R1'
  | 'R2'
  | 'R3'
  | 'R4'
  | 'R5'
  | 'R6'
  | 'R7'
  | 'R8'
export type ExpressCollectionType = '' | 'NORMAL' | 'INTRADAY'
export type ExpressPickupTimeType = 'NORMAL' | 'NIGHT'
export type ExpressPickupTimeOpeningType = ExpressPickupTimeType | 'DISABLE'
export type ExpressDeliveryPreferenceType =
  | ''
  | 'SCHEDULED'
  | 'NOTIFY_SENDER'
  | 'NOTIFY_RECEIVER'
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
  | 'YTYDS'
  | 'JZKH'
  | 'JZQY_LONG'
  | 'JZZH'
  | 'NJZZH'
  | 'NZBRH'
  | 'NFLF'
  | 'NLRF'

export type ExpressProductRole =
  | ''
  | 'EXP'
  | 'CONTRACT'
  | 'UNIVERSAL'
  | 'DRIVER_QR_CODE'
export type ExpressProductSwitch =
  | 'OLD'
  | 'EXP'
  | 'CONTRACT'
  | 'UNIVERSAL'
export type ExpressProductUpgradeResult = 'N' | 'OLD' | 'NEW'
export type ExpressProductCollectMode = 'BZLS'
export type ExpressProductDeliveryMode = 'ZDZT' | 'BZPS'

export type ExpressContactTarget = 'sender' | 'consignee'

export type ExpressInsuranceType = 'NORMAL' | 'QEB' | 'SXB'
export type ExpressInsuranceRuleType = ExpressInsuranceType
export type ExpressInsurancePriceSubtype = 'QEB' | 'SXB' | 'YSB'

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
}

export interface ExpressInsuranceCapability {
  inputKey: string
  fragile: boolean
  worryFree: boolean
  disabled: boolean
}

export interface ExpressInsuranceDraft {
  type: ExpressInsuranceType
  limit: number
  capability: ExpressInsuranceCapability
}

export interface ExpressReturnBillDraft {
  type: ExpressReturnBillType
  requirements: ExpressReturnBillRequirement[]
  customRequirement: string
  returnCount: number
  fileCode: string
}

export interface ExpressServiceOptions {
  transportMode: ExpressProductCode
  deliveryMode: ExpressDeliveryMode
  paymentType: ExpressPaymentType
  returnBill: ExpressReturnBillDraft
  passwordSigning: ExpressFlag
  needContact: ExpressFlag
  privacyProtection: ExpressFlag
}

export interface ExpressCollectionDraft {
  type: ExpressCollectionType
  amount: number
  account: string
  accountName: string
  limit: number
  agreementAccepted: boolean
}

export interface ExpressDeliveryPreferenceDraft {
  type: ExpressDeliveryPreferenceType
  scheduledWindow: string
  unavailableDates: string[]
  availabilityKey: string
}

export interface ExpressDeliveryPointDraft {
  code: string
  name: string
}

export type ExpressWarehouseType = '' | '1' | '2' | '3' | '4' | '5' | '6'
export type ExpressWarehouseWay = '' | 'APSF' | 'AGXSF'
export type ExpressWarehouseScreeningType = 0 | 1 | 2 | 3 | 4

export interface ExpressWarehouseFile {
  previewPath: string
}

export interface ExpressWarehouseScreening {
  inputKey: string
  type: ExpressWarehouseScreeningType
  reason: string
  depotType: ExpressWarehouseType
  autoSelected: boolean
  acknowledged: boolean
}

export interface ExpressWarehouseDraft {
  enabled: boolean
  warehouseNo: string
  warehouseTime: string
  fileList: ExpressWarehouseFile[]
  warehouseType: ExpressWarehouseType
  deliverWarehouseWay: ExpressWarehouseWay
  warehouseProcess: string
  warehouseCode: string
  warehouseRemark: string
  screening: ExpressWarehouseScreening
}

export interface ExpressPickup {
  dispatch: ExpressFlag
  time: string
  endTime?: string
  timeSlot?: string
  type: ExpressPickupTimeType
  stationCode: string
  stationName: string
  pickPeriodTime?: number
  nightCapability?: ExpressPickupNightCapability
  nightNoticeAccepted: boolean
}

export interface ExpressPickupNightCapability {
  addressKey: string
  enabled: boolean
  startTime: string
  endTime: string
  checkedAt: number
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
  discount?: Array<{ marketCode: string; reduceFee: number }> | null
  couponRankType?: string
  billWeight: number | null
}

export type ExpressScanRole =
  | 'pickupManId'
  | 'driverId'
  | 'acceptDept'
  | 'businessCode'
  | 'shipperNumber'

export type ExpressScanExpressRole = 'PARTNER'

export interface ExpressScanContext {
  role: ExpressScanRole
  value: string
  sceneId?: string
  expressRole?: ExpressScanExpressRole
}

export interface ExpressDraft {
  sender: ExpressContact | null
  consignee: ExpressContact | null
  goods: ExpressGoods
  insurance: ExpressInsuranceDraft
  packaging: ExpressPackagingDraft
  service: ExpressServiceOptions
  collection: ExpressCollectionDraft
  deliveryPreference: ExpressDeliveryPreferenceDraft
  deliveryPoint: ExpressDeliveryPointDraft
  warehouse: ExpressWarehouseDraft
  pickup: ExpressPickup
  selectedProduct: ExpressProductQuote | null
  couponNumber: string
  remark: string
  agreementAccepted: boolean
  quoteStaleReason: string
  scanContext?: ExpressScanContext
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

export interface ExpressProductPointRequest {
  productCode: 'DCZP'
  contactAddressDetail: string
  receiverCustAddressDetail: string
}

export interface ExpressProductSwitchRequest {
  customerCode: string
  contactAddressDetail: string
  receiverCustAddressDetail: string
  ifExistContract: 0 | 1
}

export interface ExpressProductUpgradeRequest {
  customerCode: string
  isOffSiteTransfer: ExpressFlag
  pilotType: 'CUSTOMER_REGION'
  departProvinceName: string
  departCityName: string
  departCountyName: string
  arriveProvinceName: string
  arriveCityName: string
  arriveCountyName: string
}

export interface ExpressProductCustomerCapability {
  customerCode: string
  monthlyEnabled: boolean
  contractEnabled: boolean
  insuranceLimit: number | null
}

export interface ExpressProductAvailability {
  customer: ExpressProductCustomerCapability
  dczpAvailable: boolean
  goodsHasBattery: boolean
  insuranceCapability: ExpressInsuranceCapability
  isOffSiteTransfer: ExpressFlag
  passProductCode: ExpressProductRole
  productSwitch: ExpressProductSwitch
  recommendDczp: boolean
}

export interface ExpressQuoteResult {
  availability: ExpressProductAvailability
  products: ExpressProductQuote[]
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
  returnBillType: 'NONE' | 'FAX' | 'ORIGINAL' | 'ONLINE' | 'ORIGINAL_ONLINE'
  receiveMethod: '' | 'DELIVER_NOUP' | 'SELF_PICKUP' | 'DELIVER_UP' | 'LARGE_DELIVER_UP'
  reviceMoneyAmount: number
  totalVolume: number
  totalWeight: number
  goodsName?: string
  client: boolean
  detail: boolean
  sendDateTime: string
  promotionsCode?: string
  customerMobile?: string
  pickUpToDoor: boolean
  passwordSigning: ExpressFlag
  passProductCode: ExpressProductRole
  isRecommendDczp?: ExpressFlag
  collectMode?: ExpressProductCollectMode
  deliveryMode?: ExpressProductDeliveryMode
  isOffSiteTransfer: ExpressFlag
  packageInfoList?: ExpressPackageInfo[]
  nightAccept: ExpressFlag
  nightDelivery: '' | 'Y'
  appointmentDelivery: '' | 'Y'
  notifyIsDeliver?: 'N'
  isWarehousingService: ExpressFlag
  deliverWarehouseWay?: Exclude<ExpressWarehouseWay, ''>
  warehouseCode?: string
  warehouseProcess?: string
  jcType?: Exclude<ExpressWarehouseType, ''>
  customerCode?: string
  customerMonthly?: '0' | '1'
  customerContract?: '0' | '1'
  sxb?: 'Y'
  fullCoverage?: 'Y'
  isFragileArticles?: 'Y'
  packageLtlType: ExpressPackageLtlType
  unpackingNonWoodPackagingNumber: number
  unpackingWoodPackagingNumber: number
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
  nightOpening?: ExpressFlag
  nightStartTime?: string
  nightEndTime?: string
}

export interface ExpressPickupNightRequest {
  province: string
  city: string
  county: string
  address: string
}

export interface ExpressPickupNightResponse {
  startTime?: string
  endTime?: string
  nightPickUpEnable?: boolean
}

export interface ExpressPickupTimeOpeningDate {
  time: string
  text: string
  type: ExpressPickupTimeOpeningType
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
  nightCapability?: ExpressPickupNightCapability
}

export interface ExpressDeliveryAppointmentRequest {
  goodsWeight: number
  goodsVolume: number
  provinceName: string
  cityName: string
  areaName: string
  address: string
}

export interface ExpressDeliveryAppointmentResponse {
  deptCode: string
  orderCityDelivery: boolean
  orderCityTomorrow: boolean
  appointmentDelivery: boolean
}

export interface ExpressInsurancePriceRequest {
  pricingEntryCode: 'BF'
  productCode: ExpressProductCode
  statements: number[] | string[]
  subType: ExpressInsurancePriceSubtype
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
  reason?: string | null
  type?: ExpressWarehouseScreeningType | string | number | null
  depotType?: ExpressWarehouseType | string | null
}

export interface ExpressWarehouseStagingPayload {
  fileList: ExpressWarehouseFile[]
  warehouseNo: string
  warehouseTime: string
  warehouseType: ExpressWarehouseType
  deliverWarehouseWay: ExpressWarehouseWay
  warehouseProcess: string
  warehouseCode: string
  warehouseRemark: string
}

export interface ExpressWarehouseStagingRequest {
  code: ExpressProductCode
  params: ExpressFreightRequest
  warehouse: {
    isWarehousingService: ExpressFlag
    payload: ExpressWarehouseStagingPayload
  }
}

export interface ExpressWarehouseStageResult {
  stagingId: string
  uri: string
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
  packing?: string
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
  currentFirstTime?: ExpressFlag
  orderExtendFields?: ExpressOrderExtendField[]
  newOrderExtendFields?: ExpressOrderExtendField[]
}

export interface ExpressOrderExtendField {
  key: string
  value: string | number
}

export interface ExpressDeliveryToWarehouse {
  isWarehousingService: ExpressFlag
  appointmentEntryCode: string
  appointmentTime: string
  appointmentUrl: string[]
  warehouseType?: Exclude<ExpressWarehouseType, ''>
  deliverWarehouseWay?: Exclude<ExpressWarehouseWay, ''>
  warehouseProcess?: string
}

export interface CreateExpressOrderRequest {
  contactIdList: string[]
  packageInfoList?: ExpressPackageInfo[]
  unpackageLtlInfo?: ExpressUnpackageLtlInfo
  deliveryToWarehouse?: ExpressDeliveryToWarehouse
  isAgreement?: ExpressFlag
  isContact: ExpressFlag
  batch?: boolean
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
