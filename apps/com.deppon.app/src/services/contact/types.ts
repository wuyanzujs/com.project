export type ContactRegionType = '' | 'GAT'
export type ContactDefaultFlag = '0' | '1'
export type ContactRole = 0 | 1

export interface Contact {
  id?: string
  name: string
  telephone: string
  fixedPhone?: string
  extension?: string
  province: string
  city: string
  county: string
  town?: string
  address: string
  company?: string
  type: ContactRole
  defaultAddress: ContactDefaultFlag
  regionType: ContactRegionType
  saveStatus?: boolean
  saveToBook?: boolean
}

export interface ContactListRequest {
  pageIndex: number
  pageSize: number
  filterContent: string
  regionType: ContactRegionType
  sysCode: string
}

export interface ContactListResponse {
  list: Contact[]
  pageNum: number
  pageSize: number
  totalPage: number
  totalRows: number
}

export interface ContactQueryRequest {
  province: string
  city: string
  county: string
  address: string
}

export type ContactQueryResponse = string[]

export interface ContactAnalysis {
  proCityName: string | null
  town: string | null
  address: string | null
  name: string | null
  telephone: string | null
  addressType: string | null
  extension: string | null
}

export interface ContactAnalysis4Request {
  province?: string
  city?: string
  county?: string
  detailAddress: string
}

export interface ContactAnalysis4 {
  province: string
  provinceCode: string
  city: string
  cityCode: string
  county: string
  countyCode: string
  town: string
  townCode: string
  detailAddress: string
  addressType: string
}

export interface ContactTownListRequest {
  provinceName: string
  cityName: string
  countyName: string
}

export interface ContactTownItem {
  provinceName: string
  provinceCode: string
  cityName: string
  cityCode: string
  countyName: string
  countyCode: string
  townName: string
  townCode: string
}

export interface ContactAddressHint {
  province: string
  city: string
  county: string
  town: string
  address: string
  raw: string
}

export interface ContactAddressCheckRequest {
  province: string
  city: string
  county: string
  address: string
}

export interface ContactListOptions {
  pageIndex?: number
  pageSize?: number
  keyword?: string
  regionType?: ContactRegionType
}

export interface ContactValidationResult {
  valid: boolean
  messages: string[]
}
