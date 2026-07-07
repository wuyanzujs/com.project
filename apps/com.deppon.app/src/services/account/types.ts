import type { AppUser } from '../auth'

export interface AccountOverviewView {
  user: AppUser | null
  displayName: string
  mobile: string
  maskedMobile: string
  loggedIn: boolean
}

export interface AccountCancelRequest {
  code: string
  mobile: string
  password: string
  sysCode: string
  validType: 1 | 2
}
