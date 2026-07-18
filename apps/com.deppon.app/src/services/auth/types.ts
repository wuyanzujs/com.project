export interface AppUser {
  id?: string
  mobile?: string
  mobileEncrypt?: string
  nickName?: string
  openId?: string
  originalOpenId?: string
  unionId?: string
  userName?: string
  avatarUrl?: string
  customerCode?: string
  contactCode?: string
  allUserNames?: string[]
  thirdBindUserName?: string
  [key: string]: unknown
}

export interface LoginRegisterRecord {
  lanuchScene: string
  lanuchPage: string
  marketClass: string
  marketScene: string
  marketPage: string
  registerPage: string
  envVersion: string
  platform: string
  system: string
  brand: string
  model: string
  version: string
  sdkVersion: string
  language: string
  benchmarkLevel: number
  type: string
  latitude: string
  longitude: string
  appId: string
  sysCode: string
}

export interface LoginRequest {
  account: string
  verifyCode: string
  loginType: string
  sysCode: string
  registerRecord: LoginRegisterRecord
}

export interface SendSmsRequest {
  mobile: string
  sysCode: string
  messageType: 'login' | 'bindcuscode' | 'canceluser'
}

export interface GenerateTmpTokenRequest {
  source: string
}
