import { APP_NATIVE_CAPABILITIES } from './capabilities'

export type AppAnalyticsProperty = string | number | boolean | null | undefined

export interface AppAnalyticsEvent {
  name: string
  source?: string
  properties?: Record<string, AppAnalyticsProperty>
}

export function isAppAnalyticsReady() {
  return APP_NATIVE_CAPABILITIES.analytics === 'ready'
}

export function trackAppEvent(event: AppAnalyticsEvent) {
  const name = event.name.trim()

  if (!name || !isAppAnalyticsReady()) {
    return false
  }

  return false
}
