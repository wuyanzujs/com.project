export interface UserSignCodeRequest {
  latitude?: number
  longitude?: number
}

export interface UserSignCodeRaw {
  signCode: string
  realName: string
}

export interface SaveRealNameRequest {
  realName: string
}

export interface SignCodeView {
  hasRealName: boolean
  signCode: string
  realName: string
  statusText: string
  summary: string
  expiresText: string
}
