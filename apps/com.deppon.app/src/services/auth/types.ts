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

export interface LoginRequest {
  account: string
  verifyCode: string
  loginType: string
  sysCode: string
}

export interface SendSmsRequest {
  mobile: string
  sysCode: string
  messageType: 'login' | 'bindcuscode' | 'canceluser'
}

export interface GenerateTmpTokenRequest {
  source: string
}
