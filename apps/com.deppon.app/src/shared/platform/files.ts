import { NativeCapabilityError, ensureNativeCapability } from './capabilities'

export interface AppFile {
  uri: string
  name: string
  mimeType?: string
  size?: number
}

export interface ChooseAppFileOptions {
  source: string
  multiple?: boolean
  mimeTypes?: string[]
  maxSizeBytes?: number
}

export interface UploadAppFileOptions {
  source: string
  url: string
  file: AppFile
  fieldName?: string
  headers?: Record<string, string>
  formData?: Record<string, string>
}

export interface DownloadAppFileOptions {
  source: string
  url: string
  fileName?: string
  headers?: Record<string, string>
}

export interface DownloadAppFileResult extends AppFile {
  localPath: string
}

export interface OpenAppFileOptions {
  source: string
  file: AppFile | DownloadAppFileResult
}

export async function chooseAppFile(
  _options: ChooseAppFileOptions
): Promise<AppFile[]> {
  ensureNativeCapability('filePicker')

  throw new NativeCapabilityError('filePicker')
}

export async function uploadAppFile(_options: UploadAppFileOptions) {
  ensureNativeCapability('upload')

  throw new NativeCapabilityError('upload')
}

export async function downloadAppFile(
  _options: DownloadAppFileOptions
): Promise<DownloadAppFileResult> {
  ensureNativeCapability('download')

  throw new NativeCapabilityError('download')
}

export async function openAppFile(_options: OpenAppFileOptions) {
  ensureNativeCapability('documentPreview')

  throw new NativeCapabilityError('documentPreview')
}
