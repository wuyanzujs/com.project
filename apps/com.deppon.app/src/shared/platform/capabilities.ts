export type NativeCapability =
  | 'auth'
  | 'payment'
  | 'phone'
  | 'scan'
  | 'location'
  | 'map'
  | 'filePicker'
  | 'upload'
  | 'download'
  | 'documentPreview'
  | 'notification'
  | 'externalApp'
  | 'realName'
  | 'share'
  | 'analytics'

export type NativeCapabilityStatus = 'ready' | 'pending' | 'unsupported'

export const APP_NATIVE_CAPABILITIES: Record<
  NativeCapability,
  NativeCapabilityStatus
> = {
  auth: 'pending',
  payment: 'pending',
  phone: 'ready',
  scan: 'pending',
  location: 'pending',
  map: 'pending',
  filePicker: 'pending',
  upload: 'pending',
  download: 'pending',
  documentPreview: 'pending',
  notification: 'pending',
  externalApp: 'pending',
  realName: 'pending',
  share: 'pending',
  analytics: 'pending'
}

const NATIVE_CAPABILITY_LABELS: Record<NativeCapability, string> = {
  auth: '授权',
  payment: '支付',
  phone: '电话',
  scan: '扫码',
  location: '定位',
  map: '地图',
  filePicker: '文件选择',
  upload: '上传',
  download: '下载',
  documentPreview: '文件预览',
  notification: '通知',
  externalApp: '外部应用',
  realName: '实名核验',
  share: '分享',
  analytics: '埋点'
}

export class NativeCapabilityError extends Error {
  readonly capability: NativeCapability

  constructor(capability: NativeCapability) {
    super(`Native capability "${capability}" has not been wired for App runtime.`)
    this.name = 'NativeCapabilityError'
    this.capability = capability
    Object.setPrototypeOf(this, NativeCapabilityError.prototype)
  }
}

export function getNativeCapabilityLabel(capability: NativeCapability) {
  return NATIVE_CAPABILITY_LABELS[capability]
}

export function isNativeCapabilityError(
  error: unknown
): error is NativeCapabilityError {
  return error instanceof NativeCapabilityError
}

export function getNativeCapabilityErrorMessage(error: unknown) {
  if (isNativeCapabilityError(error)) {
    return `${getNativeCapabilityLabel(error.capability)}能力待接入 App 原生模块`
  }

  return 'App 原生能力暂不可用'
}

export function ensureNativeCapability(capability: NativeCapability) {
  if (APP_NATIVE_CAPABILITIES[capability] !== 'ready') {
    throw new NativeCapabilityError(capability)
  }
}
