import { NativeCapabilityError, ensureNativeCapability } from './capabilities'

export type AppNotificationScene =
  | 'orderStatus'
  | 'pickupReminder'
  | 'paymentReminder'
  | 'marketing'

export interface RequestNotificationOptions {
  source: string
  scene: AppNotificationScene
}

export interface RequestNotificationResult {
  source: string
  scene: AppNotificationScene
  granted: boolean
}

export async function requestAppNotificationPermission(
  _options: RequestNotificationOptions
): Promise<RequestNotificationResult> {
  ensureNativeCapability('notification')

  throw new NativeCapabilityError('notification')
}
