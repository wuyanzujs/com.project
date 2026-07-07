export type SupportEntryKind = 'web' | 'phone' | 'route' | 'pending'

export type SupportEntryTone = 'primary' | 'success' | 'warning' | 'neutral'

export interface SupportEntryView {
  id: string
  title: string
  summary: string
  kind: SupportEntryKind
  tone: SupportEntryTone
  badgeText?: string
  route?: string
  webSource?: string
  webUri?: string
  webPath?: string
  webParamSource?: string
  phoneNumber?: string
  loginRequired?: boolean
}

export interface SupportSectionView {
  title: string
  summary: string
  entries: SupportEntryView[]
}
