import type { AppIconName } from '@/shared/components/AppIcon'
import type { AppRoutePath } from '@/shared/navigation/routes'
import type { AppWebSource } from '@/shared/webview/appWeb'

export type SupportEntryKind = 'web' | 'phone' | 'route' | 'pending'

export type SupportEntryTone = 'primary' | 'success' | 'warning' | 'neutral'

export interface SupportEntryView {
  id: string
  title: string
  summary: string
  kind: SupportEntryKind
  tone: SupportEntryTone
  badgeText?: string
  /** 客服中心入口为彩色图标,未配置时回退为标题首字。 */
  icon?: AppIconName
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
