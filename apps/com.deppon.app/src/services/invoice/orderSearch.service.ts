import type { DepponResponse } from '@/request/deppon'

import { invoiceApi } from './invoice.api'
import { normalizeInvoiceOrder } from './order.mapper'
import { createServiceFailure as createFailure } from '../serviceResponse'

import type {
  InvoiceOrderAuthChallenge,
  InvoiceOrderAuthCodeCheckRequest,
  InvoiceOrderAuthCodeRequest,
  InvoiceOrderAuthPhoneRequest,
  InvoiceOrderListResponse,
  InvoiceOrderQueryRequest,
  InvoiceOrderRaw,
  InvoiceOrderSearchView
} from './types'

/**
 *
 * @param value 待处理的文本或数字
 * @description 转成去掉首尾空格的字符串
 */
function normalizeText(value?: string | number | null) {
  return String(value ?? '').trim()
}

/**
 *
 * @param item 开票运单原始数据
 * @description 判断运单是否需要身份验证
 */
function isOrderAuthRequired(item: InvoiceOrderRaw) {
  return !!item.option && item.option !== '01'
}

/**
 *
 * @param item 开票运单原始数据
 * @description 按验证方式生成运单验证挑战信息
 */
function createOrderAuthChallenge(item: InvoiceOrderRaw): InvoiceOrderAuthChallenge | null {
  if (!isOrderAuthRequired(item)) {
    return null
  }

  const authType = item.option as InvoiceOrderAuthChallenge['authType']
  const waybillNumber = normalizeText(item.sourceBillNo)
  const phone = normalizeText(item.paymentPhone)
  const paymentType = normalizeText(item.paymentType)

  if (authType === '02') {
    return {
      waybillNumber,
      phone,
      paymentType,
      authType,
      maxLength: 4,
      inputType: 'number',
      placeholder: '请输入付款人手机后四位',
      summary: `登录用户与付款用户信息不一致，需要输入运单号${waybillNumber}的付款人手机号后四位进行验证`
    }
  }

  if (authType === '03') {
    const contactRole = paymentType === 'FC' ? '收货人' : '发货人'

    return {
      waybillNumber,
      phone,
      paymentType,
      authType,
      maxLength: 20,
      inputType: 'text',
      placeholder: `请输入${contactRole}电话`,
      summary: `登录用户与付款用户（${contactRole}）信息不一致，需要输入运单号${waybillNumber}的${contactRole}电话号码进行验证`
    }
  }

  return {
    waybillNumber,
    phone,
    paymentType,
    authType,
    maxLength: 6,
    inputType: 'number',
    placeholder: '请输入验证码',
    summary: `登录用户与付款用户信息不一致，需要向运单号${waybillNumber}的付款手机号${phone}发送验证码进行验证`
  }
}

/**
 *
 * @param list 开票运单原始列表
 * @description 生成查询结果，需要验证时只返回挑战信息
 */
function normalizeOrderSearchResult(list: InvoiceOrderRaw[]): InvoiceOrderSearchView {
  const authItem = list.find(isOrderAuthRequired)
  const auth = authItem ? createOrderAuthChallenge(authItem) : null

  return {
    list: auth ? [] : list.map(normalizeInvoiceOrder),
    auth
  }
}

export const invoiceOrderSearchService = {
  /**
   *
   * @param waybillNumber 运单号
   * @description 按运单号查询可开票运单
   */
  async queryByWaybill(waybillNumber: string): Promise<DepponResponse<InvoiceOrderSearchView>> {
    const keyword = normalizeText(waybillNumber)

    if (!keyword) {
      return createFailure('请输入运单号')
    }

    const response = await invoiceApi.request<InvoiceOrderListResponse, InvoiceOrderQueryRequest>(
      'tradeQueryBySourceBillNo',
      {
        sourceBillNo: keyword
      },
      false,
      30000
    )

    const list = response.result?.list ?? []

    if (!response.status || !list.length) {
      return createFailure(response.message || '未查询到可开票运单')
    }

    return {
      ...response,
      result: normalizeOrderSearchResult(list)
    }
  },

  /**
   *
   * @param waybillNumber 运单号
   * @param value 验证信息
   * @description 校验付款人验证信息
   */
  async verifyPhone(waybillNumber: string, value: string): Promise<DepponResponse<InvoiceOrderSearchView>> {
    const normalizedWaybill = normalizeText(waybillNumber)
    const normalizedValue = normalizeText(value)

    if (!normalizedWaybill) {
      return createFailure('缺少运单号')
    }

    if (!normalizedValue) {
      return createFailure('请输入验证信息')
    }

    const response = await invoiceApi.request<InvoiceOrderListResponse, InvoiceOrderAuthPhoneRequest>(
      'checkSourcePaymentNumber',
      {
        sourceBillNo: normalizedWaybill,
        inspectPhone: normalizedValue
      },
      false,
      30000
    )

    const list = response.result?.list ?? []

    if (!response.status || !list.length) {
      return createFailure(response.message || '验证失败，请重新确认信息')
    }

    return {
      ...response,
      result: normalizeOrderSearchResult(list)
    }
  },

  /**
   *
   * @param waybillNumber 运单号
   * @description 发送运单验证短信验证码
   */
  async sendAuthCode(waybillNumber: string): Promise<DepponResponse<null>> {
    const normalizedWaybill = normalizeText(waybillNumber)

    if (!normalizedWaybill) {
      return createFailure('缺少运单号')
    }

    const response = await invoiceApi.request<null, InvoiceOrderAuthCodeRequest>('sendCheckCode', {
      sourceBillNo: normalizedWaybill
    })

    if (!response.status) {
      return createFailure(response.message || '发送失败，请稍后再试')
    }

    return {
      ...response,
      result: null
    }
  },

  /**
   *
   * @param waybillNumber 运单号
   * @param code 短信验证码
   * @description 校验运单短信验证码
   */
  async verifyAuthCode(waybillNumber: string, code: string): Promise<DepponResponse<null>> {
    const normalizedWaybill = normalizeText(waybillNumber)
    const normalizedCode = normalizeText(code)

    if (!normalizedWaybill) {
      return createFailure('缺少运单号')
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      return createFailure('请输入正确的短信验证码')
    }

    const response = await invoiceApi.request<null, InvoiceOrderAuthCodeCheckRequest>('checkVerificationCode', {
      sourceBillNo: normalizedWaybill,
      checkTestCode: normalizedCode
    })

    if (!response.status) {
      return createFailure(response.message || '验证失败，请稍后再试')
    }

    return {
      ...response,
      result: null
    }
  }
}
