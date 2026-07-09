export interface PrivacyVersionResponse {
  lastVersionNumber: string | null
  versionNumber: string | null
}

export interface PrivacyBehaviorRequest {
  sysCode: string
  childSysCode: string
}

export interface PrivacyStatusView {
  latestVersion: string
  agreedVersion: string
  agreedLatest: boolean
  statusText: string
  summary: string
}

export interface PrivacyHomePromptView {
  key: string
  title: string
  content: string
  confirmText: string
  cancelText: string
}
