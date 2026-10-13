import type { DepponResponse } from '@/request/deppon'
import { verifyRealName } from '@/shared/platform/realName'

import { realNameApi } from './realname.api'
import { createServiceFailure as createFailure } from '../serviceResponse'

import type {
  RealNameAuthRaw,
  RealNameAuthView,
  RealNameValidationResult
} from './types'

const ID_CARD_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const ID_CARD_CHECK_CODES = [
  '1',
  '0',
  'X',
  '9',
  '8',
  '7',
  '6',
  '5',
  '4',
  '3',
  '2'
]

/**
 *
 * @param value 文本，可为空
 * @description 归一文本为去空格字符串
 */
function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

/**
 *
 * @param idCardNo 身份证号
 * @description 身份证号保留前 6 位后 4 位，中间打码
 */
function maskIdCardNo(idCardNo: string) {
  const value = normalizeText(idCardNo)

  if (!value) {
    return ''
  }

  if (value.length < 10) {
    return value
  }

  return `${value.slice(0, 6)}********${value.slice(-4)}`
}

/**
 *
 * @param value 身份证号
 * @description 校验身份证号中的出生日期
 */
function isValidBirthday(value: string) {
  const year = Number(value.slice(6, 10))
  const month = Number(value.slice(10, 12))
  const day = Number(value.slice(12, 14))
  const date = new Date(year, month - 1, day)

  return (
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day &&
    year >= 1900 &&
    date.getTime() <= Date.now()
  )
}

/**
 *
 * @param idCardNo 身份证号
 * @description 按校验位规则校验身份证号
 */
export function isValidIdCardNo(idCardNo: string) {
  const value = normalizeText(idCardNo).toUpperCase()

  if (!/^\d{17}[\dX]$/.test(value) || !isValidBirthday(value)) {
    return false
  }

  const sum = value
    .slice(0, 17)
    .split('')
    .reduce(
      (total, item, index) => total + Number(item) * ID_CARD_WEIGHTS[index],
      0
    )

  return ID_CARD_CHECK_CODES[sum % 11] === value[17]
}

/**
 *
 * @param name 姓名
 * @description 校验姓名长度与字符，返回错误文案
 */
function validateName(name: string) {
  const value = normalizeText(name)

  if (value.length < 2 || value.length > 20) {
    return '请输入 2-20 个字符的真实姓名'
  }

  if (!/^[\u4e00-\u9fa5·.\sA-Za-z]+$/.test(value)) {
    return '姓名包含不支持的字符'
  }

  return ''
}

/**
 *
 * @param raw 实名信息原始数据，可为空
 * @description 组装实名状态展示结构
 */
function toRealNameView(raw?: RealNameAuthRaw | null): RealNameAuthView {
  const name = normalizeText(raw?.name)
  const idCardNo = normalizeText(raw?.idCardNo).toUpperCase()
  const authenticated = !!name && !!idCardNo

  return {
    authenticated,
    name,
    idCardNo,
    maskedIdCardNo: maskIdCardNo(idCardNo),
    statusText: authenticated ? '已完成实名认证' : '待实名认证',
    summary: authenticated
      ? '本人寄件时仅需出示有效身份证件供查验，无需重复采集实名信息。'
      : '根据实名收寄要求，寄件前需完成身份信息登记或核验。'
  }
}

/**
 *
 * @param view 实名状态
 * @description 取未打码的身份证号
 */
function getRawIdCardNo(view: RealNameAuthView | null) {
  const idCardNo = view?.idCardNo ?? ''

  return idCardNo.includes('*') ? '' : idCardNo
}

export const realNameService = {
  /**
   *
   * @param name 姓名
   * @param idCardNo 身份证号
   * @description 校验实名信息并返回归一结果
   */
  validate(name: string, idCardNo: string): RealNameValidationResult {
    const nextName = normalizeText(name)
    const nextIdCardNo = normalizeText(idCardNo).toUpperCase()
    const nameMessage = validateName(nextName)

    if (nameMessage) {
      return {
        valid: false,
        message: nameMessage,
        name: nextName,
        idCardNo: nextIdCardNo
      }
    }

    if (!isValidIdCardNo(nextIdCardNo)) {
      return {
        valid: false,
        message: '请填写正确的二代身份证号码',
        name: nextName,
        idCardNo: nextIdCardNo
      }
    }

    return {
      valid: true,
      message: '',
      name: nextName,
      idCardNo: nextIdCardNo
    }
  },

  maskIdCardNo,

  /**
   *
   * @description 查询实名认证状态
   */
  async query(): Promise<DepponResponse<RealNameAuthView>> {
    const response = await realNameApi.queryRealNameAuth(false)

    if (!response.status) {
      return createFailure(response.message || '暂未获取到实名状态')
    }

    return {
      ...response,
      result: toRealNameView(response.result)
    }
  },

  /**
   *
   * @param name 姓名
   * @param idCardNo 身份证号
   * @description 校验后提交手工实名认证
   */
  async submitManual(
    name: string,
    idCardNo: string
  ): Promise<DepponResponse<boolean>> {
    const validation = realNameService.validate(name, idCardNo)

    if (!validation.valid) {
      return createFailure(validation.message)
    }

    return realNameApi.submitRealNameAuth({
      type: 0,
      name: validation.name,
      idCardNo: validation.idCardNo,
      idCardType: '01'
    })
  },

  /**
   *
   * @param current 当前实名信息
   * @description 删除实名认证信息
   */
  async deleteRealName(
    current: RealNameAuthView | null
  ): Promise<DepponResponse<boolean>> {
    if (!current?.authenticated) {
      return createFailure('当前账号暂无实名信息')
    }

    return realNameApi.submitRealNameAuth({
      type: 2,
      name: current.name,
      idCardNo: getRawIdCardNo(current),
      idCardType: '01'
    })
  },

  /**
   *
   * @description 发起网络身份认证并提交凭证
   */
  async startNetworkIdentityAuth(): Promise<DepponResponse<boolean>> {
    const bizSeqResponse = await realNameApi.fetchBizSeq()

    if (!bizSeqResponse.status || !bizSeqResponse.result) {
      return createFailure(bizSeqResponse.message || '获取实名凭证失败')
    }

    const authResult = await verifyRealName({
      source: 'REAL_NAME_CENTER',
      scene: 'NETWORK_ID',
      payload: {
        bizSeq: bizSeqResponse.result
      }
    })

    if (!authResult.verified) {
      return createFailure('实名授权未完成')
    }

    const rawResult = authResult.rawResult
    const idCardAuthData =
      rawResult &&
      typeof rawResult === 'object' &&
      'idCardAuthData' in rawResult
        ? String(rawResult.idCardAuthData || '')
        : ''

    if (!idCardAuthData) {
      return createFailure('实名授权结果缺少凭证')
    }

    return realNameApi.submitNetworkIdAuth({
      bizSeq: bizSeqResponse.result,
      idCardAuthData
    })
  }
}
