export interface OrderEditContact {
  name: string
  mobile: string
  province: string
  city: string
  county: string
  town: string
  address: string
}

export type OrderEditCollectionType = 'NORMAL' | 'INTRADAY'

export interface OrderEditCollectionDraft {
  enabled: boolean
  type: OrderEditCollectionType
  amount: number
  account: string
  accountName: string
  limit: number
  agreementAccepted: boolean
}

export type OrderEditInsuranceLockedType = '' | 'QEB' | 'SXB' | 'SPECIAL'

export interface OrderEditInsuranceDraft {
  amount: number
  defaultPending: boolean
  editable: boolean
  freeCoverage: boolean
  lockedType: OrderEditInsuranceLockedType
  maxAmount: number
  productCode: string
  required: boolean
  source: string
}

export interface OrderEditPackagingDraft {
  count: number
}

export type OrderEditDeliveryMode =
  | ''
  | 'PICKNOTUPSTAIRS'
  | 'PICKUPSTAIRS'
  | 'PICKSELF'

export type OrderEditPickupTimeType = 'NORMAL' | 'NIGHT'
export type OrderEditPickupOpeningType =
  | OrderEditPickupTimeType
  | 'DISABLE'

export interface OrderEditPickupNightCapability {
  addressKey: string
  enabled: boolean
  startTime: string
  endTime: string
  checkedAt: number
}

export interface OrderEditPickupDraft {
  time: string
  endTime: string
  timeSlot: string
  type: OrderEditPickupTimeType
  pickPeriodTime?: number
  nightCapability?: OrderEditPickupNightCapability
  nightNoticeAccepted: boolean
  selectionKey: string
}

export interface OrderEditScheduleDraft {
  deliveryMode: OrderEditDeliveryMode
  initialInputKey: string
  orderChannel: string
  productCode: string
  tableType: string
  waybillNumber: string
  pickup: OrderEditPickupDraft
}

export interface OrderEditDraft {
  orderNumber: string
  sender: OrderEditContact
  receiver: OrderEditContact
  goodsName: string
  goodsNumber: number
  totalWeight: number
  totalVolume: number
  collection: OrderEditCollectionDraft
  insurance: OrderEditInsuranceDraft
  packaging: OrderEditPackagingDraft
  schedule: OrderEditScheduleDraft
  remark: string
}

export interface OrderEditPickupNightRequest {
  province: string
  city: string
  county: string
  address: string
}

export interface OrderEditPickupNightResponse {
  startTime?: string
  endTime?: string
  nightPickUpEnable?: boolean
}

export interface OrderEditPickupTimeRequest {
  sysCode: string
  provinceName: string
  cityName: string
  countyName: string
  townName?: string
  address: string
  weight: number
  volume: number
  goodsNumber: number
  priceTimeProductCode?: string
  source: 0
  nightOpening: 'Y' | 'N'
  nightStartTime: string
  nightEndTime: string
}

export interface OrderEditPickupOpeningItem {
  time: string
  text: string
  type: OrderEditPickupOpeningType
}

export interface OrderEditPickupOpeningDate {
  date: string
  dateList: OrderEditPickupOpeningItem[]
}

export interface OrderEditPickupTimeResponse {
  deptCode?: string
  deptName?: string
  startTime?: string
  endTime?: string
  serviceTime?: string
  opening?: boolean
  pickPeriodTime?: number
  openingMessage?: string
  openingList?: OrderEditPickupOpeningDate[]
  blankOpeningList?: OrderEditPickupOpeningDate[]
  nightOpeningList?: OrderEditPickupOpeningDate[]
  nightCapability?: OrderEditPickupNightCapability
}

export interface OrderModifyExtendField {
  key: string
  value: string | number | string[]
}

export interface OrderModifyRequest {
  orderNumber: string
  contactName?: string
  contactMobile?: string
  contactProvince?: string
  contactCity?: string
  contactArea?: string
  contactAddress?: string
  receiverCustName?: string
  receiverCustMobile?: string
  receiverCustProvince?: string
  receiverCustCity?: string
  receiverCustArea?: string
  receiverCustAddress?: string
  goodsName?: string
  goodsNumber?: number
  totalWeight?: number
  totalVolume?: number
  reciveLoanType?: OrderEditCollectionType
  reviceMoneyAmount?: number
  accountName?: string
  reciveLoanAccount?: string
  insuredAmount?: number
  beginAcceptTime?: string
  pickPeriodTime?: number
  deliveryMode?: OrderEditDeliveryMode
  channelType?: string
  orderExtendFields?: OrderModifyExtendField[]
  remark?: string
}

export interface OrderEditValidationResult {
  valid: boolean
  messages: string[]
}

export interface OrderModifyPreview {
  changed: boolean
  changedFields: string[]
  request: OrderModifyRequest
}
