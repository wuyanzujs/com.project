import type { AppRoutePath } from '../../shared/navigation/routes'
import type { AppWebSource } from '../../shared/webview/appWeb'

export type SupportEntryKind = 'web' | 'phone' | 'route' | 'pending'

export type SupportEntryTone = 'primary' | 'success' | 'warning' | 'neutral'

export interface SupportEntryView {
  id: string
  title: string
  summary: string
  kind: SupportEntryKind
  tone: SupportEntryTone
  badgeText?: string
  route?: AppRoutePath
  webSource?: AppWebSource
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

export interface SupportSurveyConfig {
  image?: string
  url?: string
}
