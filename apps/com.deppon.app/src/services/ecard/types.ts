export type ECardType = '' | 'SC' | 'YC'
export type ECardTargetPage =
  | 'HOME'
  | 'BILL'
  | 'RECHARGE'
  | 'HOME_AUTO_REGISTER'
  | 'PAY_RECHARGE'
  | 'PAY_SETTING'

export interface ECardCenterUrlOptions {
  type?: ECardType
  targetSource?: string
  postmanId?: string
  activityCode?: string
}

export interface ECardLinkRequest {
  sysCode: string
  type?: ECardType
  activityCode?: string
  targetPage?: ECardTargetPage
  source?: string
  postmanId?: string
}

export interface ECardLinkResponse {
  form: string
  payNo: string | null
}

export interface ECardBalanceRaw {
  balance: string
  existCustomer: boolean
  passwordSet: boolean
  rechargeDesc: string
}

export interface ECardPromotionRaw {
  configList?: Array<{
    rechargeAmountDesc?: string
    discountAmountDesc?: string
  }>
}

export interface ECardPromotionView {
  title: string
  summary: string
}

export interface ECardOverviewView {
  balance: number
  balanceText: string
  hasCard: boolean
  passwordSet: boolean
  statusText: string
  securityText: string
  rechargeDesc: string
  promotions: ECardPromotionView[]
}
