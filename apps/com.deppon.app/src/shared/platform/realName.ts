import { NativeCapabilityError, ensureNativeCapability } from './capabilities'

export interface RealNameVerifyOptions {
  source: string
  scene: string
  payload?: Record<string, unknown>
}

export interface RealNameVerifyResult {
  source: string
  scene: string
  verified: boolean
  rawResult?: unknown
}

export async function verifyRealName(
  _options: RealNameVerifyOptions
): Promise<RealNameVerifyResult> {
  ensureNativeCapability('realName')

  throw new NativeCapabilityError('realName')
}
