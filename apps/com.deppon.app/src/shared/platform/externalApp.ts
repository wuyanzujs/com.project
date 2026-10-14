import { NativeCapabilityError, ensureNativeCapability } from './capabilities'

export type ExternalAppTarget = 'wechatMiniProgram' | 'alipayMiniProgram' | 'url'

export interface OpenExternalAppOptions {
  source: string
  target: ExternalAppTarget
  appId?: string
  path?: string
  url?: string
  extraData?: Record<string, unknown>
}

export async function openExternalApp(_options: OpenExternalAppOptions) {
  ensureNativeCapability('externalApp')

  throw new NativeCapabilityError('externalApp')
}
