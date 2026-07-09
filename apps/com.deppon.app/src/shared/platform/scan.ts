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

export type AppScanWaybillRole =
  | 'raw'
  | 'waybillNumber'
  | 'ltlWaybillNumber'
  | 'skiingWaybillNumber'

export type AppScanSendRole =
  | 'pickupManId'
  | 'driverId'
  | 'acceptDept'
  | 'businessCode'
  | 'shipperNumber'

export type AppScanUnsupportedReason =
  | 'empty'
  | 'shortLink'
  | 'invalidUrl'
  | 'invalidHost'
  | 'missingQuery'
  | 'invalidWaybill'
  | 'sendQrCode'
  | 'unknown'

export interface AppWaybillScanParseResult {
  kind: 'waybill'
  role: AppScanWaybillRole
  waybillNumber: string
}

export interface AppPrintCodeScanParseResult {
  kind: 'printCode'
  role: 'printId'
  printId: string
}

export interface AppUnsupportedScanParseResult {
  kind: 'unsupported'
  reason: AppScanUnsupportedReason
  message: string
  role?: AppScanSendRole
  value?: string
}

export type AppScanParseResult =
  | AppWaybillScanParseResult
  | AppPrintCodeScanParseResult
  | AppUnsupportedScanParseResult

export type AppScanResult = ScanCodeResult & AppScanParseResult

export class ScanCodeParseError extends Error {
  constructor(message = '未识别到有效运单号') {
    super(message)
    this.name = 'ScanCodeParseError'
    Object.setPrototypeOf(this, ScanCodeParseError.prototype)
  }
}

const WAYBILL_QUERY_KEYS: Array<{
  key: string
  role: Exclude<AppScanWaybillRole, 'raw'>
}> = [
  {
    key: 'waybillnumber',
    role: 'waybillNumber'
  },
  {
    key: 'waybillno',
    role: 'waybillNumber'
  },
  {
    key: 'waybillnum',
    role: 'waybillNumber'
  },
  {
    key: 'billno',
    role: 'waybillNumber'
  },
  {
    key: 'ltlwaybillnumber',
    role: 'ltlWaybillNumber'
  },
  {
    key: 'skiingwaybillnumber',
    role: 'skiingWaybillNumber'
  }
]

const SEND_QR_QUERY_KEYS: Array<{
  key: string
  role: AppScanSendRole
}> = [
  {
    key: 'pickupmanid',
    role: 'pickupManId'
  },
  {
    key: 'driverid',
    role: 'driverId'
  },
  {
    key: 'acceptdept',
    role: 'acceptDept'
  },
  {
    key: 'businesscode',
    role: 'businessCode'
  },
  {
    key: 'shippernumber',
    role: 'shipperNumber'
  }
]

function decodeScanValue(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '))
  } catch {
    return value
  }
}

function normalizeWaybillNumber(value: string) {
  return value.replace(/\s/g, '').toUpperCase()
}

function isValidWaybillNumber(value: string) {
  return /^[A-Z0-9]{6,32}$/.test(value)
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function getUrlHost(value: string) {
  const match = value.match(/^https?:\/\/([^/?#]+)/i)
  const authority = match?.[1] || ''
  const host = authority.split('@').pop()?.split(':')[0] || ''

  return host.toLowerCase()
}

function isDepponHost(host: string) {
  return (
    host === 'deppon.com' ||
    host.endsWith('.deppon.com') ||
    host === 'deppon.com.cn' ||
    host.endsWith('.deppon.com.cn')
  )
}

function getQueryText(value: string) {
  const queryStart = value.indexOf('?')

  if (queryStart >= 0) {
    const hashStart = value.indexOf('#', queryStart)

    return value.slice(
      queryStart + 1,
      hashStart >= 0 ? hashStart : undefined
    )
  }

  if (!isHttpUrl(value) && value.includes('=')) {
    const hashStart = value.indexOf('#')

    return value.slice(0, hashStart >= 0 ? hashStart : undefined)
  }

  return ''
}

function parseQueryParams(queryText: string) {
  const params: Record<string, string> = {}

  for (const part of queryText.split('&')) {
    if (!part) {
      continue
    }

    const [rawKey, ...rawValueParts] = part.split('=')
    const key = decodeScanValue(rawKey).trim().toLowerCase()

    if (!key || key in params) {
      continue
    }

    params[key] = decodeScanValue(rawValueParts.join('=')).trim()
  }

  return params
}

function findQueryParam(
  params: Record<string, string>,
  keys: Array<{ key: string }>
) {
  const item = keys.find(({ key }) => key in params)

  if (!item) {
    return null
  }

  return {
    key: item.key,
    value: params[item.key]
  }
}

function createUnsupportedScanResult(
  reason: AppScanUnsupportedReason,
  message: string,
  patch: Pick<AppUnsupportedScanParseResult, 'role' | 'value'> = {}
): AppUnsupportedScanParseResult {
  return {
    kind: 'unsupported',
    reason,
    message,
    ...patch
  }
}

function createWaybillScanResult(
  role: AppScanWaybillRole,
  value: string
): AppWaybillScanParseResult | AppUnsupportedScanParseResult {
  const normalized = normalizeWaybillNumber(value)

  if (!isValidWaybillNumber(normalized)) {
    return createUnsupportedScanResult(
      'invalidWaybill',
      '未识别到有效运单号'
    )
  }

  return {
    kind: 'waybill',
    role: normalized.startsWith('DPL') ? 'ltlWaybillNumber' : role,
    waybillNumber: normalized
  }
}

export function parseAppScanValue(value: string): AppScanParseResult {
  const rawValue = value.trim()

  if (!rawValue) {
    return createUnsupportedScanResult('empty', '未识别到二维码内容')
  }

  const decodedValue = decodeScanValue(rawValue)
  const plainWaybill = normalizeWaybillNumber(decodedValue)

  if (
    !isHttpUrl(decodedValue) &&
    !decodedValue.includes('?') &&
    !decodedValue.includes('=') &&
    isValidWaybillNumber(plainWaybill)
  ) {
    return createWaybillScanResult('raw', plainWaybill)
  }

  if (isHttpUrl(decodedValue)) {
    const host = getUrlHost(decodedValue)

    if (!host) {
      return createUnsupportedScanResult('invalidUrl', '二维码链接格式不正确')
    }

    if (host === 'p.url.cn') {
      return createUnsupportedScanResult(
        'shortLink',
        '短链二维码暂未接入 App 解析'
      )
    }

    if (!isDepponHost(host)) {
      return createUnsupportedScanResult(
        'invalidHost',
        '非德邦二维码暂不支持识别'
      )
    }
  }

  const queryText = getQueryText(decodedValue)

  if (!queryText) {
    return createUnsupportedScanResult(
      'missingQuery',
      '二维码缺少可识别的业务参数'
    )
  }

  const params = parseQueryParams(queryText)
  const waybillParam = findQueryParam(params, WAYBILL_QUERY_KEYS)

  if (waybillParam) {
    const role =
      WAYBILL_QUERY_KEYS.find((item) => item.key === waybillParam.key)?.role ||
      'waybillNumber'

    return createWaybillScanResult(role, waybillParam.value)
  }

  const printId = params.printid?.trim()

  if (printId) {
    return {
      kind: 'printCode',
      role: 'printId',
      printId
    }
  }

  const sendQrParam = findQueryParam(params, SEND_QR_QUERY_KEYS)

  if (sendQrParam) {
    const role = SEND_QR_QUERY_KEYS.find(
      (item) => item.key === sendQrParam.key
    )?.role

    return createUnsupportedScanResult(
      'sendQrCode',
      '寄件业务二维码暂未接入 App 扫码入口',
      {
        role,
        value: sendQrParam.value
      }
    )
  }

  return createUnsupportedScanResult('unknown', '暂不支持此二维码')
}

export function extractWaybillNumberFromScanValue(value: string) {
  const result = parseAppScanValue(value)

  if (result.kind === 'waybill') {
    return result.waybillNumber
  }

  const decodedValue = decodeScanValue(value.trim())
  const queryMatch = decodedValue.match(
    /(?:waybillNumber|waybillNo|waybillNum|billNo)=([^&#]+)/i
  )
  const candidate = queryMatch ? decodeScanValue(queryMatch[1]) : decodedValue
  const normalized = normalizeWaybillNumber(candidate)

  if (isValidWaybillNumber(normalized)) {
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
  const parsed = parseAppScanValue(result.value)

  if (parsed.kind !== 'waybill') {
    throw new ScanCodeParseError(
      parsed.kind === 'unsupported'
        ? parsed.message
        : '云打印码不能用于运单查询'
    )
  }

  return {
    ...result,
    waybillNumber: parsed.waybillNumber
  }
}

export async function scanAppCode(source: string): Promise<AppScanResult> {
  const result = await scanCode({
    source,
    scanTypes: ['qrCode', 'barCode']
  })

  return {
    ...result,
    ...parseAppScanValue(result.value)
  }
}
