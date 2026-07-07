export type DispatchProductType = 'EXPRESS' | 'LOGISTICS'
export type StationQueryType = 'ALL' | 'LEAVE' | 'PICKUP' | 'DELIVERY'
export type StationSubType = 'EXPRESS' | 'LOGISTICS'
export type StationCityType = '' | '1' | '2' | '3' | '4'

export type DispatchRangeCode =
  | 'DELIVERY_NATURE_QJPS'
  | 'DELIVERY_NATURE_GBQYBS'
  | 'DELIVERY_NATURE_ZTBPS'
  | 'DELIVERY_NATURE_FQJPS'
  | 'DELIVERY_NATURE_ZZXPS'
  | 'DELIVERY_NATURE_CZTBPS'
  | string

export interface DispatchAddressQuery {
  rawText?: string
  province?: string
  city?: string
  county?: string
  address?: string
}

export interface DispatchAddress {
  province: string
  provinceCode: string
  city: string
  cityCode: string
  county: string
  countyCode: string
  town: string
  townCode: string
  address: string
  fullAddress: string
}

export interface DispatchStreet {
  streetCode: string
  streetName: string
  townName?: string | null
}

export interface DispatchRangeGroup {
  code: DispatchRangeCode
  name: string
  streetList: DispatchStreet[]
}

export interface DispatchRangeResult {
  productType: DispatchProductType
  address: DispatchAddress
  groups: DispatchRangeGroup[]
  matchedStreet: string
  hint: string
  canCreateExpress: boolean
}

export interface DispatchStreetRequest {
  province: string
  city: string
  county: string
  address: string
}

export interface ExpressDispatchRequest {
  cityCode: string
  countyCode: string
}

export interface ExpressDispatchItem {
  rangeTypeCode: DispatchRangeCode
  rangeTypeDesc: DispatchStreet[]
  rangeTypeName: string
}

export interface ExpressDispatchResponse {
  deliveryList: ExpressDispatchItem[] | null
}

export interface LogisticsDispatchItem {
  villageName: string
  villageCode: string
}

export interface LogisticsDispatchResponse {
  noDeliverList: LogisticsDispatchItem[] | null
  normalFarDeliveryList: LogisticsDispatchItem[] | null
  specialDeliverList: LogisticsDispatchItem[] | null
}

export interface AddressStationRequest {
  province: string
  city: string
  county: string
  otherAddress: string
  matchtypes: string[]
  transportway: string
  lat?: number
  lng?: number
  fiveKmType?: '1' | null
}

export interface AddressStationRawItem {
  deptNo: string
  deptCode: string
  deptName: string
  deptAddress: string
  distance: number | null
  contactway: string | null
  businessScope: string
  baiduLat: string
  baiduLng: string
  pickupSelf: boolean
  matchAddress: string
  startTime: string
  endTime: string
}

export interface AddressStationResponse {
  data: AddressStationRawItem[] | null
}

export interface CityStationRequest {
  level: '4'
  type: StationCityType
  provinceCode: string
  provinceName: string
  cityCode: string
  cityName: string
  countyCode: string
  countyName: string
  pageIndex: number
  pageSize: number
}

export interface CityStationRawItem {
  code: string
  unifiedCode: string
  name: string
  address: string
  businessType: string
  contactway: string
  longitude: string
  latitude: string
}

export interface CityStationResponse {
  totalRows: number | null
  netResponses: CityStationRawItem[] | null
}

export interface StationDetailRequest {
  deptCode: string
}

export interface StationDetailRaw {
  code?: string | null
  deptCode?: string | null
  unifiedCode?: string | null
  name?: string | null
  deptName?: string | null
  address?: string | null
  deptAddress?: string | null
  contactway?: string | null
  contactWay?: string | null
  businessType?: string | null
  businessScope?: string | null
  longitude?: string | null
  latitude?: string | null
  baiduLng?: string | null
  baiduLat?: string | null
  startTime?: string | null
  endTime?: string | null
}

export interface StationItem {
  id: string
  code: string
  name: string
  address: string
  phone: string
  business: string
  lng: string
  lat: string
  distance: string
  time: string
  source: 'Address' | 'City'
}

export interface StationDetailView {
  id: string
  code: string
  name: string
  address: string
  phone: string
  business: string
  lng: string
  lat: string
  distance: string
  time: string
  source: 'Detail'
  coordinateSystem: 'bd09' | 'unknown'
}

export interface StationQueryOptions extends DispatchAddressQuery {
  type?: StationQueryType
  subType?: StationSubType
  pageIndex?: number
  pageSize?: number
}

export interface StationQueryResult {
  address: DispatchAddress
  type: StationQueryType
  subType: StationSubType
  list: StationItem[]
  totalRows: number
  source: 'Address' | 'City'
}
