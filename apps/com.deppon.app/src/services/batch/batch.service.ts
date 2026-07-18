import { buildBatchCreateOrderRequest } from './batch.payload'
import { quoteBatchDraft } from './batch.quote.service'
import { APP_ROUTES } from '../../shared/navigation/routes'
import { expressApi } from '../express/express.api'
import { createServiceFailure as createFailureResponse } from '../serviceResponse'

import type {
  BatchAddressRecognitionResult,
  BatchContact,
  BatchDraft,
  BatchEntryView,
  BatchQuoteItem,
  BatchRecognizedConsignee,
  BatchSubmitSummary,
  BatchValidationResult
} from './types'
import type { DepponResponse } from '../../request/deppon'
import type {
  CreateExpressOrderResponse
} from '../express/types'

export const BATCH_MAX_CONSIGNEE_COUNT = 10
export const BATCH_EXCEL_URL =
  'https://www.deppon.com/batchorder?source=APP_BATCHORDER'

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

function createFailure(
  step: BatchValidationResult['step'],
  message: string,
  consigneeIndex = -1
): BatchValidationResult {
  return {
    valid: false,
    step,
    consigneeIndex,
    message
  }
}

function createSuccess(): BatchValidationResult {
  return {
    valid: true,
    step: 'ready',
    consigneeIndex: -1,
    message: ''
  }
}

function isValidContactPhone(value: string) {
  const phone = normalizeText(value)

  return /^1[3-9]\d{9}$/.test(phone) || /^0\d{2,3}-?\d{7,8}$/.test(phone)
}

function isCompleteContact(contact: BatchContact) {
  return [
    contact.name,
    contact.province,
    contact.city,
    contact.county,
    contact.address
  ].every((value) => !!normalizeText(value))
}

function createAddressKey(contact: BatchContact) {
  return [
    contact.province,
    contact.city,
    contact.county,
    contact.address
  ].map(normalizeText).join('|')
}

function splitBatchAddressLine(line: string) {
  const delimiterParts = line
    .split(/[\t,，|]+/)
    .map(normalizeText)
    .filter(Boolean)

  if (delimiterParts.length >= 7) {
    return delimiterParts
  }

  return line.split(/\s+/).map(normalizeText).filter(Boolean)
}

function createRecognizeFailure(
  lineNumber: number,
  rawText: string,
  message: string
): BatchRecognizedConsignee {
  return {
    lineNumber,
    rawText,
    status: 'error',
    message,
    contact: null,
    goodsName: ''
  }
}

function createRecognizedConsignee(
  lineNumber: number,
  rawText: string,
  parts: string[]
): BatchRecognizedConsignee {
  if (parts.length < 7) {
    return createRecognizeFailure(
      lineNumber,
      rawText,
      '请按“姓名 手机 省 市 区 详细地址 货物”填写'
    )
  }

  const [name, mobile, province, city, county, ...restParts] = parts
  const goodsName = restParts[restParts.length - 1]
  const address = restParts.slice(0, -1).join('')

  if (!name) {
    return createRecognizeFailure(lineNumber, rawText, '缺少收货人姓名')
  }

  if (!isValidContactPhone(mobile)) {
    return createRecognizeFailure(lineNumber, rawText, '收货人手机号格式不正确')
  }

  if (!province || !city || !county || !address) {
    return createRecognizeFailure(lineNumber, rawText, '收货地址信息不完整')
  }

  if (!goodsName) {
    return createRecognizeFailure(lineNumber, rawText, '缺少货物名称')
  }

  return {
    lineNumber,
    rawText,
    status: 'ready',
    message: '已识别',
    contact: {
      name,
      mobile,
      province,
      city,
      county,
      address
    },
    goodsName
  }
}

export function recognizeBatchAddressText(
  value: string
): BatchAddressRecognitionResult {
  const lines = value
    .split(/\r?\n/)
    .map(normalizeText)
    .filter(Boolean)
  const items = lines.slice(0, BATCH_MAX_CONSIGNEE_COUNT).map((line, index) =>
    createRecognizedConsignee(index + 1, line, splitBatchAddressLine(line))
  )

  return {
    totalLines: lines.length,
    acceptedCount: items.filter((item) => item.status === 'ready').length,
    rejectedCount: items.filter((item) => item.status === 'error').length,
    ignoredCount: Math.max(0, lines.length - BATCH_MAX_CONSIGNEE_COUNT),
    items
  }
}

function isSpecialRegion(province?: string | null) {
  const value = normalizeText(province)

  return value.includes('香港') || value.includes('澳门') || value.includes('台湾')
}

export function shouldBlockSpecialRegionBatchOrder(
  senderProvince?: string | null,
  consigneeProvince?: string | null
) {
  const sender = normalizeText(senderProvince)
  const consignee = normalizeText(consigneeProvince)
  const senderSpecial = isSpecialRegion(sender)
  const consigneeSpecial = isSpecialRegion(consignee)

  if (senderSpecial && consigneeSpecial) {
    return !(sender.includes('澳门') && consignee.includes('澳门'))
  }

  return senderSpecial && sender.includes('台湾')
}

export function validateBatchDraft(
  draft: BatchDraft,
  options: { requireProduct?: boolean } = {}
): BatchValidationResult {
  if (!draft.sender?.name) {
    return createFailure('sender', '请选择发货人')
  }

  if (!isCompleteContact(draft.sender)) {
    return createFailure('sender', '请完善发货人地址信息')
  }

  if (!draft.consignees.length) {
    return createFailure('consignee', '请至少添加 1 个收货人')
  }

  if (draft.consignees.length > BATCH_MAX_CONSIGNEE_COUNT) {
    return createFailure(
      'consignee',
      `最多只能添加 ${BATCH_MAX_CONSIGNEE_COUNT} 个收货人`
    )
  }

  if (!isValidContactPhone(draft.sender.mobile)) {
    return createFailure('senderPhone', '请输入正确的寄件人手机号')
  }

  const senderAddress = createAddressKey(draft.sender)

  for (let index = 0; index < draft.consignees.length; index += 1) {
    const item = draft.consignees[index]

    if (!item.contact || !isCompleteContact(item.contact)) {
      return createFailure('consignee', `第 ${index + 1} 个收货人信息不完整`, index)
    }

    if (!isValidContactPhone(item.contact.mobile)) {
      return createFailure(
        'consigneePhone',
        `第 ${index + 1} 个收货人手机号格式不正确`,
        index
      )
    }

    if (senderAddress === createAddressKey(item.contact)) {
      return createFailure(
        'address',
        `第 ${index + 1} 个收货人地址与发货人地址一致`,
        index
      )
    }

    if (!normalizeText(item.goods.name)) {
      return createFailure(
        'goods',
        `第 ${index + 1} 个收货人缺少货物名称`,
        index
      )
    }

    if (!Number.isFinite(item.goods.count) || item.goods.count < 1) {
      return createFailure(
        'goodsCount',
        `第 ${index + 1} 个收货人的货物件数不正确`,
        index
      )
    }

    if (!Number.isFinite(item.goods.weight) || item.goods.weight <= 0) {
      return createFailure(
        'goodsWeight',
        `第 ${index + 1} 个收货人的货物重量不正确`,
        index
      )
    }

    if (options.requireProduct && !item.productCode) {
      return createFailure(
        'product',
        `第 ${index + 1} 个收货人尚未获取产品价格`,
        index
      )
    }

    if (draft.requireWaybillNumber && !normalizeText(item.waybillNumber)) {
      return createFailure(
        'waybill',
        `第 ${index + 1} 个收货人缺少运单号`,
        index
      )
    }

    if (
      shouldBlockSpecialRegionBatchOrder(
        draft.sender.province,
        item.contact.province
      )
    ) {
      return createFailure(
        'specialRegion',
        '港澳台互寄服务请联系营业部 0755-36360474/82',
        index
      )
    }
  }

  return createSuccess()
}

export function validateBatchSubmitDraft(draft: BatchDraft) {
  return validateBatchDraft(draft, { requireProduct: true })
}

export function createBatchSubmitSummary(
  result: CreateExpressOrderResponse
): BatchSubmitSummary {
  const successCount = Math.max(
    result.orderNumbers?.length ?? 0,
    result.waybillNumbers?.length ?? 0,
    result.waybillNumber ? 1 : 0
  )
  const failedItems = result.orderErrorInfo ?? []
  const failedCount = failedItems.length
  const firstFailure = failedItems[0]
  const failureMessage = firstFailure
    ? `第 ${firstFailure.index + 1} 票：${firstFailure.errorMessage}`
    : ''

  if (failedCount && successCount) {
    return {
      status: 'partial',
      successCount,
      failedCount,
      message: `成功 ${successCount} 票，失败 ${failedCount} 票。${failureMessage}`
    }
  }

  if (failedCount || !successCount) {
    return {
      status: 'failure',
      successCount: 0,
      failedCount,
      message: failureMessage || '批量订单未创建，请检查后重试'
    }
  }

  return {
    status: 'success',
    successCount,
    failedCount: 0,
    message: `已成功提交 ${successCount} 票`
  }
}

export const batchService = {
  getEntryView(): BatchEntryView {
    return {
      title: '批量寄',
      summary: '一次添加多个收货人，统一获取价格并确认后提交。',
      maxConsigneeCount: BATCH_MAX_CONSIGNEE_COUNT,
      excelUrl: BATCH_EXCEL_URL,
      actions: [
        {
          key: 'singleExpress',
          title: '先寄一票',
          summary: '只寄一个收货人时使用单票寄件。',
          status: 'ready',
          statusText: 'App',
          route: APP_ROUTES.express
        },
        {
          key: 'addressRecognition',
          title: '批量识别',
          summary: '粘贴多行地址，快速生成收货清单。',
          status: 'ready',
          statusText: '本页',
          disabledReason: '请先在下方输入地址文本'
        },
        {
          key: 'excelImport',
          title: 'Excel 寄件',
          summary: '在电脑端使用 Excel 模板导入多票地址。',
          status: 'copy',
          statusText: '复制网址',
          copyText: BATCH_EXCEL_URL
        },
        {
          key: 'print',
          title: '批量打印',
          summary: '从订单列表选择已提交的运单打印面单。',
          status: 'pending',
          statusText: '待接入',
          disabledReason: '打印机连接能力暂不可用'
        }
      ],
      rules: [
        `每次最多添加 ${BATCH_MAX_CONSIGNEE_COUNT} 个收货人`,
        '批量识别支持“姓名 手机 省 市 区 详细地址 货物”格式',
        '发货人与收货人地址不能完全一致',
        '每个收货人都必须填写货物名称',
        '港澳台互寄服务保留营业部人工承接'
      ]
    }
  },

  validateDraft: validateBatchDraft,

  validateSubmitDraft: validateBatchSubmitDraft,

  recognizeAddressText: recognizeBatchAddressText,

  shouldBlockSpecialRegionOrder: shouldBlockSpecialRegionBatchOrder,

  async quoteDraft(
    draft: BatchDraft
  ): Promise<DepponResponse<BatchQuoteItem[]>> {
    const validation = validateBatchDraft(draft)

    if (!validation.valid) {
      return createFailureResponse(validation.message)
    }

    return quoteBatchDraft(draft)
  },

  async submitDraft(
    draft: BatchDraft
  ): Promise<DepponResponse<CreateExpressOrderResponse>> {
    const validation = validateBatchSubmitDraft(draft)

    if (!validation.valid) {
      return createFailureResponse(validation.message)
    }

    const intercept = await expressApi.checkCanCreateOrder()

    if (!intercept.status) {
      return createFailureResponse(intercept.message || '暂时无法提交批量订单')
    }

    if (intercept.result?.orderFlag === 'N') {
      return createFailureResponse('当前账号存在未完成拦截，请稍后再试')
    }

    return expressApi.createOrder(buildBatchCreateOrderRequest(draft))
  }
}
