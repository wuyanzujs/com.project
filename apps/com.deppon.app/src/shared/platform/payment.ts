import { NativeCapabilityError, ensureNativeCapability } from './capabilities'

export type AppPaymentChannel = 'wechat' | 'alipay' | 'h5Cashier'

export interface AppPaymentOptions {
  source: string
  channel: AppPaymentChannel
  orderNumber: string
  payload: Record<string, unknown>
}

export interface AppPaymentResult {
  source: string
  channel: AppPaymentChannel
  orderNumber: string
  paid: boolean
  transactionId?: string
  rawResult?: unknown
}

export async function payWithApp(
  _options: AppPaymentOptions
): Promise<AppPaymentResult> {
  ensureNativeCapability('payment')

  throw new NativeCapabilityError('payment')
}
