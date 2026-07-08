export type MemberBenefitAction = 'COUPON_LIST' | 'WELFARE_CENTER'
export type MemberBenefitStatus = 'ready' | 'web' | 'pending'

export interface MemberLevelRaw {
  levelName?: string
  levelCode?: number
  growthValue?: number
  maxGrowthValue?: number
}

export interface MemberSvipRaw {
  button?: string
  message?: string
  points?: number
  status?: number
  url?: string
}

export interface MemberBenefitView {
  title: string
  summary: string
  status: MemberBenefitStatus
  action: MemberBenefitAction
  badgeText: string
}

export interface MemberOverviewView {
  levelName: string
  levelCode: number
  growthValue: number
  maxGrowthValue: number
  growthPercent: number
  points: number
  svipStatus: number
  svipStatusText: string
  svipButtonText: string
  svipMessage: string
  svipUrl: string
  benefits: MemberBenefitView[]
}
