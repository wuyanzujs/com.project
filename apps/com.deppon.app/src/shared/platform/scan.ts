import { NativeCapabilityError, ensureNativeCapability } from './capabilities'

export type ScanCodeType = 'qrCode' | 'barCode' | 'unknown'

export interface ScanCodeOptions {
  source: string
  scanTypes?: ScanCodeType[]
}

export interface ScanCodeResult {
  source: string
  type: ScanCodeType
  value: string
  rawValue: string
}

export interface WaybillScanResult extends ScanCodeResult {
  waybillNumber: string
}

export class ScanCodeParseError extends Error {
  constructor(message = '未识别到有效运单号') {
    super(message)
    this.name = 'ScanCodeParseError'
    Object.setPrototypeOf(this, ScanCodeParseError.prototype)
  }
}

function decodeScanValue(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizeWaybillNumber(value: string) {
  return value.replace(/\s/g, '').toUpperCase()
}

export function extractWaybillNumberFromScanValue(value: string) {
  const decodedValue = decodeScanValue(value.trim())
  const queryMatch = decodedValue.match(
    /(?:waybillNumber|waybillNo|waybillNum|billNo)=([^&#]+)/i
  )
  const candidate = queryMatch ? decodeScanValue(queryMatch[1]) : decodedValue
  const normalized = normalizeWaybillNumber(candidate)

  if (/^[A-Z0-9]{6,32}$/.test(normalized)) {
    return normalized
  }

  return ''
}

export async function scanCode(
  _options: ScanCodeOptions
): Promise<ScanCodeResult> {
  ensureNativeCapability('scan')

  throw new NativeCapabilityError('scan')
}

export async function scanWaybillCode(source: string) {
  const result = await scanCode({
    source,
    scanTypes: ['qrCode', 'barCode']
  })
  const waybillNumber = extractWaybillNumberFromScanValue(result.value)

  if (!waybillNumber) {
    throw new ScanCodeParseError()
  }

  return {
    ...result,
    waybillNumber
  }
}
