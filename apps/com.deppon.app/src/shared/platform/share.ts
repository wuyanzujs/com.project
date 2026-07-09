import { NativeCapabilityError, ensureNativeCapability } from './capabilities'

export interface AppSharePayload {
  source: string
  title: string
  description?: string
  url?: string
  imageUrl?: string
  extra?: Record<string, string | number | boolean | null | undefined>
}

export interface AppShareResult {
  completed: boolean
  channel?: string
}

export async function shareWithApp(
  payload: AppSharePayload
): Promise<AppShareResult> {
  if (!payload.source.trim()) {
    throw new Error('缺少分享来源')
  }

  if (!payload.title.trim()) {
    throw new Error('缺少分享标题')
  }

  ensureNativeCapability('share')

  throw new NativeCapabilityError('share')
}
