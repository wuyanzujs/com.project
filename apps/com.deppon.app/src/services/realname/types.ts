export interface RealNameAuthRaw {
  name?: string
  idCardNo?: string
}

export interface RealNameAuthRequest {
  name: string
  idCardNo: string
  idCardType: '01'
  type: 0 | 2
}

export interface PoliceRealNameRequest {
  realName: string
  idCardNo: string
}

export interface NetworkIdAuthRequest {
  bizSeq: string
  idCardAuthData: string
}

export interface RealNameAuthView {
  authenticated: boolean
  name: string
  idCardNo: string
  maskedIdCardNo: string
  statusText: string
  summary: string
}

export interface RealNameValidationResult {
  valid: boolean
  message: string
  name: string
  idCardNo: string
}
