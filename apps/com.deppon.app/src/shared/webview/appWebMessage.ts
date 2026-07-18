export interface AppWebCollectionAccount {
  account: string
  accountName: string
}

export type AppWebCollectionAccountSource =
  | 'EXPRESS_COLLECTION_ACCOUNT'
  | 'ORDER_EDIT_COLLECTION_ACCOUNT'

export interface AppWebCollectionAccountContext {
  source: AppWebCollectionAccountSource
  messageContext: string
}

export interface AppWebCollectionAccountResult {
  context: AppWebCollectionAccountContext
  account: AppWebCollectionAccount
}

export type AppWebWarehouseType = '' | '1' | '2' | '3' | '4' | '5' | '6'
export type AppWebWarehouseWay = '' | 'APSF' | 'AGXSF'

export interface AppWebWarehouseFile {
  previewPath: string
}

export interface AppWebWarehouseDraftPatch {
  enabled: boolean
  fileList: AppWebWarehouseFile[]
  warehouseNo: string
  warehouseTime: string
  warehouseType: AppWebWarehouseType
  deliverWarehouseWay: AppWebWarehouseWay
  warehouseProcess: string
  warehouseCode: string
  warehouseRemark: string
}

export interface AppWebWarehouseContext {
  inputKey: string
  stagingId: string
}

export interface AppWebWarehouseResult {
  context: AppWebWarehouseContext
  warehouse: AppWebWarehouseDraftPatch
}

export interface AppWebOnlineSignContext {
  messageContext: string
}

export interface AppWebOnlineSignResult {
  context: AppWebOnlineSignContext
  fileCode: string
}

export interface AppWebMessageStageContext {
  stagingId?: string
  messageContext?: string
}

export interface AppWebMessage {
  event: string
  args: Record<string, unknown>
}

export interface AppWebMessageStageResult {
  handled: boolean
  closeAfterReceive: boolean
}

const MAX_MESSAGE_LENGTH = 32 * 1024
const MAX_WAREHOUSE_PAYLOAD_LENGTH = 24 * 1024
const MAX_WAREHOUSE_FILE_COUNT = 9
const MAX_WAREHOUSE_FILE_URL_LENGTH = 2048
const WAREHOUSE_PAYLOAD_KEYS = new Set([
  'fileList',
  'warehouseNo',
  'warehouseTime',
  'warehouseType',
  'deliverWarehouseWay',
  'warehouseProcess',
  'warehouseCode',
  'warehouseRemark'
])

let expectedCollectionAccountContext: AppWebCollectionAccountContext | null =
  null
let pendingCollectionAccount: AppWebCollectionAccountResult | null = null
let expectedWarehouseContext: AppWebWarehouseContext | null = null
let pendingWarehouse: AppWebWarehouseResult | null = null
let expectedOnlineSignContext: AppWebOnlineSignContext | null = null
let pendingOnlineSign: AppWebOnlineSignResult | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function decodeMessageValue(value: unknown, depth = 0): unknown {
  if (depth > 3) {
    return null
  }

  if (typeof value === 'string') {
    if (value.length > MAX_MESSAGE_LENGTH) {
      return null
    }

    try {
      return decodeMessageValue(JSON.parse(value), depth + 1)
    } catch {
      return null
    }
  }

  if (Array.isArray(value)) {
    return decodeMessageValue(value[0], depth + 1)
  }

  if (isRecord(value) && typeof value.event === 'string') {
    return value
  }

  if (isRecord(value) && 'data' in value) {
    return decodeMessageValue(value.data, depth + 1)
  }

  return null
}

export function parseAppWebMessage(value: unknown): AppWebMessage | null {
  const decoded = decodeMessageValue(value)

  if (!isRecord(decoded) || typeof decoded.event !== 'string') {
    return null
  }

  return {
    event: decoded.event.trim(),
    args: isRecord(decoded.args) ? decoded.args : {}
  }
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeCollectionAccount(
  args: Record<string, unknown>
): AppWebCollectionAccount | null {
  const account = normalizeText(args.bankAccount || args.account).replace(
    /\s+/g,
    ''
  )
  const accountName = normalizeText(args.countName || args.accountName)

  if (account.length < 4 || account.length > 64 || !accountName) {
    return null
  }

  return {
    account,
    accountName
  }
}

function normalizeBoundedText(value: unknown, maxLength: number) {
  if (value === undefined) {
    return ''
  }

  if (typeof value !== 'string') {
    return null
  }

  const text = value.trim()

  return text.length <= maxLength ? text : null
}

function normalizeOnlineSignMessage(value: unknown) {
  const message = parseAppWebMessage(value)

  if (
    message?.event !== 'ONLINE_SIGN' ||
    Object.keys(message.args).some(key => key !== 'value')
  ) {
    return ''
  }

  return normalizeBoundedText(message.args.value, 256) || ''
}

function isSafeWarehouseFileUrl(value: string) {
  if (!value || value.length > MAX_WAREHOUSE_FILE_URL_LENGTH) {
    return false
  }

  try {
    const url = new URL(value)

    return (
      url.protocol === 'https:' &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}

function normalizeWarehouseFiles(
  value: unknown
): AppWebWarehouseFile[] | null {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value) || value.length > MAX_WAREHOUSE_FILE_COUNT) {
    return null
  }

  const files: AppWebWarehouseFile[] = []

  for (const item of value) {
    if (
      !isRecord(item) ||
      Object.keys(item).length !== 1 ||
      !hasOwn(item, 'previewPath')
    ) {
      return null
    }

    const previewPath = normalizeBoundedText(
      item.previewPath,
      MAX_WAREHOUSE_FILE_URL_LENGTH
    )

    if (!previewPath || !isSafeWarehouseFileUrl(previewPath)) {
      return null
    }

    files.push({ previewPath })
  }

  return files
}

function normalizeWarehouseType(value: unknown): AppWebWarehouseType | null {
  const type = normalizeBoundedText(value, 1)

  return type === '' ||
    type === '1' ||
    type === '2' ||
    type === '3' ||
    type === '4' ||
    type === '5' ||
    type === '6'
    ? type
    : null
}

function normalizeWarehouseWay(value: unknown): AppWebWarehouseWay | null {
  const way = normalizeBoundedText(value, 5)

  return way === '' || way === 'APSF' || way === 'AGXSF' ? way : null
}

function parseWarehousePayload(value: unknown) {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > MAX_WAREHOUSE_PAYLOAD_LENGTH
  ) {
    return null
  }

  let payload: unknown

  try {
    payload = JSON.parse(value)
  } catch {
    return null
  }

  if (
    !isRecord(payload) ||
    Object.keys(payload).some(key => !WAREHOUSE_PAYLOAD_KEYS.has(key))
  ) {
    return null
  }

  const fileList = normalizeWarehouseFiles(payload.fileList)
  const warehouseNo = normalizeBoundedText(payload.warehouseNo, 128)
  const warehouseTime = normalizeBoundedText(payload.warehouseTime, 64)
  const warehouseType = normalizeWarehouseType(payload.warehouseType)
  const deliverWarehouseWay = normalizeWarehouseWay(
    payload.deliverWarehouseWay
  )
  const warehouseProcess = normalizeBoundedText(payload.warehouseProcess, 512)
  const warehouseCode = normalizeBoundedText(payload.warehouseCode, 128)
  const warehouseRemark = normalizeBoundedText(payload.warehouseRemark, 500)

  if (
    !fileList ||
    warehouseNo === null ||
    warehouseTime === null ||
    warehouseType === null ||
    deliverWarehouseWay === null ||
    warehouseProcess === null ||
    warehouseCode === null ||
    warehouseRemark === null
  ) {
    return null
  }

  return {
    fileList,
    warehouseNo,
    warehouseTime,
    warehouseType,
    deliverWarehouseWay,
    warehouseProcess,
    warehouseCode,
    warehouseRemark
  }
}

function createEmptyWarehouseDraftPatch(): AppWebWarehouseDraftPatch {
  return {
    enabled: false,
    fileList: [],
    warehouseNo: '',
    warehouseTime: '',
    warehouseType: '',
    deliverWarehouseWay: '',
    warehouseProcess: '',
    warehouseCode: '',
    warehouseRemark: ''
  }
}

function normalizeWarehouseMessage(
  value: unknown
): AppWebWarehouseDraftPatch | null {
  const decoded = decodeMessageValue(value)

  if (
    !isRecord(decoded) ||
    decoded.event !== 'SEND_WAREHOUSE' ||
    !isRecord(decoded.args)
  ) {
    return null
  }

  const args = decoded.args
  const argKeys = Object.keys(args)
  const isWarehousingService = args.isWarehousingService

  if (
    argKeys.some(
      key => key !== 'isWarehousingService' && key !== 'payload'
    ) ||
    !hasOwn(args, 'isWarehousingService') ||
    (isWarehousingService !== 'Y' && isWarehousingService !== 'N')
  ) {
    return null
  }

  if (
    isWarehousingService === 'N' &&
    (!hasOwn(args, 'payload') ||
      args.payload === '' ||
      args.payload === null ||
      args.payload === undefined)
  ) {
    return createEmptyWarehouseDraftPatch()
  }

  if (!hasOwn(args, 'payload')) {
    return null
  }

  const payload = parseWarehousePayload(args.payload)

  if (!payload) {
    return null
  }

  if (isWarehousingService === 'N') {
    return createEmptyWarehouseDraftPatch()
  }

  return {
    enabled: true,
    ...payload
  }
}

function createUnhandledStageResult(): AppWebMessageStageResult {
  return {
    handled: false,
    closeAfterReceive: false
  }
}

export const appWebMessageBridge = {
  expectCollectionAccount(context: AppWebCollectionAccountContext) {
    const messageContext = normalizeBoundedText(context.messageContext, 256)

    if (!messageContext) {
      expectedCollectionAccountContext = null
      pendingCollectionAccount = null
      return false
    }

    expectedCollectionAccountContext = {
      source: context.source,
      messageContext
    }
    pendingCollectionAccount = null
    return true
  },

  expectWarehouse(context: AppWebWarehouseContext) {
    const inputKey = normalizeBoundedText(context.inputKey, 4096)
    const stagingId = normalizeBoundedText(context.stagingId, 256)

    if (!inputKey || !stagingId) {
      expectedWarehouseContext = null
      return false
    }

    expectedWarehouseContext = { inputKey, stagingId }
    pendingWarehouse = null
    return true
  },

  expectOnlineSign(context: AppWebOnlineSignContext) {
    const messageContext = normalizeBoundedText(context.messageContext, 256)

    if (!messageContext) {
      expectedOnlineSignContext = null
      pendingOnlineSign = null
      return false
    }

    expectedOnlineSignContext = { messageContext }
    pendingOnlineSign = null
    return true
  },

  stage(
    source: string,
    value: unknown,
    context?: AppWebMessageStageContext
  ): AppWebMessageStageResult {
    if (source === 'EXPRESS_RETURN_BILL_CLOUD_SIGN') {
      const messageContext = normalizeBoundedText(
        context?.messageContext,
        256
      )

      if (
        !expectedOnlineSignContext ||
        !messageContext ||
        expectedOnlineSignContext.messageContext !== messageContext
      ) {
        return createUnhandledStageResult()
      }

      const fileCode = normalizeOnlineSignMessage(value)

      if (!fileCode) {
        return createUnhandledStageResult()
      }

      pendingOnlineSign = {
        context: { ...expectedOnlineSignContext },
        fileCode
      }
      expectedOnlineSignContext = null

      return {
        handled: true,
        closeAfterReceive: true
      }
    }

    if (source === 'EXPRESS_WAREHOUSE') {
      const activeStagingId = normalizeBoundedText(context?.stagingId, 256)

      if (
        !expectedWarehouseContext ||
        !activeStagingId ||
        activeStagingId !== expectedWarehouseContext.stagingId
      ) {
        return createUnhandledStageResult()
      }

      const warehouse = normalizeWarehouseMessage(value)

      if (!warehouse) {
        return createUnhandledStageResult()
      }

      pendingWarehouse = {
        context: { ...expectedWarehouseContext },
        warehouse
      }
      expectedWarehouseContext = null

      return {
        handled: true,
        closeAfterReceive: true
      }
    }

    if (
      source !== 'EXPRESS_COLLECTION_ACCOUNT' &&
      source !== 'ORDER_EDIT_COLLECTION_ACCOUNT'
    ) {
      return createUnhandledStageResult()
    }

    const messageContext = normalizeBoundedText(
      context?.messageContext,
      256
    )

    if (
      !expectedCollectionAccountContext ||
      expectedCollectionAccountContext.source !== source ||
      !messageContext ||
      expectedCollectionAccountContext.messageContext !== messageContext
    ) {
      return createUnhandledStageResult()
    }

    const message = parseAppWebMessage(value)

    if (message?.event !== 'COLLECTION_CHANGE') {
      return createUnhandledStageResult()
    }

    const account = normalizeCollectionAccount(message.args)

    if (!account) {
      return createUnhandledStageResult()
    }

    pendingCollectionAccount = {
      context: { ...expectedCollectionAccountContext },
      account
    }
    expectedCollectionAccountContext = null

    return {
      handled: true,
      closeAfterReceive: true
    }
  },

  consumeCollectionAccount(context: AppWebCollectionAccountContext) {
    const messageContext = normalizeBoundedText(context.messageContext, 256)

    if (
      !pendingCollectionAccount ||
      pendingCollectionAccount.context.source !== context.source ||
      !messageContext ||
      pendingCollectionAccount.context.messageContext !== messageContext
    ) {
      return null
    }

    const account = pendingCollectionAccount.account

    pendingCollectionAccount = null
    return account
  },

  cancelCollectionAccount(context: AppWebCollectionAccountContext) {
    const messageContext = normalizeBoundedText(context.messageContext, 256)

    if (
      expectedCollectionAccountContext?.source === context.source &&
      messageContext &&
      expectedCollectionAccountContext.messageContext === messageContext
    ) {
      expectedCollectionAccountContext = null
    }

    if (
      pendingCollectionAccount?.context.source === context.source &&
      messageContext &&
      pendingCollectionAccount.context.messageContext === messageContext
    ) {
      pendingCollectionAccount = null
    }
  },

  consumeOnlineSign(context: AppWebOnlineSignContext) {
    const messageContext = normalizeBoundedText(context.messageContext, 256)

    if (
      !pendingOnlineSign ||
      !messageContext ||
      pendingOnlineSign.context.messageContext !== messageContext
    ) {
      return null
    }

    const result = pendingOnlineSign

    pendingOnlineSign = null
    return result
  },

  cancelOnlineSign(context: AppWebOnlineSignContext) {
    const messageContext = normalizeBoundedText(context.messageContext, 256)

    if (
      messageContext &&
      expectedOnlineSignContext?.messageContext === messageContext
    ) {
      expectedOnlineSignContext = null
    }

    if (
      messageContext &&
      pendingOnlineSign?.context.messageContext === messageContext
    ) {
      pendingOnlineSign = null
    }
  },

  consumeWarehouse() {
    const warehouse = pendingWarehouse

    pendingWarehouse = null
    return warehouse
  },

  cancelWarehouse() {
    expectedWarehouseContext = null
    pendingWarehouse = null
  },

  clear() {
    expectedCollectionAccountContext = null
    pendingCollectionAccount = null
    expectedWarehouseContext = null
    pendingWarehouse = null
    expectedOnlineSignContext = null
    pendingOnlineSign = null
  }
}
