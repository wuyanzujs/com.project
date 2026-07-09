import { APP_ROUTES } from '../../shared/navigation/routes'

import type {
  BatchAddressRecognitionResult,
  BatchContact,
  BatchDraft,
  BatchEntryView,
  BatchRecognizedConsignee,
  BatchValidationResult
} from './types'

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

export function validateBatchDraft(draft: BatchDraft): BatchValidationResult {
  if (!draft.sender?.name) {
    return createFailure('sender', '请选择发货人')
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

    if (!item.contact) {
      return createFailure('consignee', `第 ${index + 1} 个收货人信息不完整`, index)
    }

    if (senderAddress === createAddressKey(item.contact)) {
      return createFailure(
        'address',
        `第 ${index + 1} 个收货人地址与发货人地址一致`,
        index
      )
    }

    if (!normalizeText(item.goodsName)) {
      return createFailure(
        'goods',
        `第 ${index + 1} 个收货人缺少货物名称`,
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

export const batchService = {
  getEntryView(): BatchEntryView {
    return {
      title: '批量寄',
      summary:
        '首期先承接批量寄入口、校验规则和能力边界；完整批量下单、Excel 导入和打印后续按原生能力切片接入。',
      maxConsigneeCount: BATCH_MAX_CONSIGNEE_COUNT,
      excelUrl: BATCH_EXCEL_URL,
      actions: [
        {
          key: 'singleExpress',
          title: '先寄一票',
          summary: '当前 App 已支持单票寄件，可先完成发货人、收货人和货物信息。',
          status: 'ready',
          statusText: 'App',
          route: APP_ROUTES.express
        },
        {
          key: 'addressRecognition',
          title: '批量识别',
          summary: '可在下方粘贴多行地址文本，先做本地识别和校验预览。',
          status: 'ready',
          statusText: '本页',
          disabledReason: '可在下方批量识别区域粘贴文本'
        },
        {
          key: 'excelImport',
          title: 'Excel 寄件',
          summary: 'Excel 批量寄首期提供官网入口，可复制网址后在电脑浏览器继续。',
          status: 'copy',
          statusText: '复制网址',
          copyText: BATCH_EXCEL_URL
        },
        {
          key: 'print',
          title: '批量打印',
          summary: '电子面单、蓝牙打印和打印状态依赖 App 原生打印能力。',
          status: 'pending',
          statusText: '待接入',
          disabledReason: '打印能力待接入 App 原生模块'
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

  recognizeAddressText: recognizeBatchAddressText,

  shouldBlockSpecialRegionOrder: shouldBlockSpecialRegionBatchOrder
}
