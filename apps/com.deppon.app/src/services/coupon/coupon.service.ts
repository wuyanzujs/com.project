import type { DepponResponse } from '@/request/deppon'

import { couponApi } from './coupon.api'
import { createServiceFailure } from '../serviceResponse'

import type { CouponCardView, CouponDetailView, CouponExchangeResponse, CouponItem, CouponListResult, CouponStatus } from './types'

const WEEKDAY_TEXT: Record<string, string> = {
  Sunday: '日',
  Monday: '一',
  Tuesday: '二',
  Wednesday: '三',
  Thursday: '四',
  Friday: '五',
  Saturday: '六'
}

/**
 *
 * @param value 待转换值
 * @param fallback 兜底值
 * @description 转为有限数字，失败取兜底值
 */
function toFiniteNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : fallback
}

/**
 *
 * @param value 数字
 * @description 数字转文本并去掉末尾的零
 */
function trimNumberText(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

/**
 *
 * @param value 分金额
 * @description 分金额转元文本
 */
function formatCentAmount(value: unknown) {
  return trimNumberText(toFiniteNumber(value) / 100)
}

/**
 *
 * @param value 折扣值
 * @description 折扣值转折文本
 */
function formatDiscount(value: unknown) {
  return trimNumberText(toFiniteNumber(value) / 10)
}

/**
 *
 * @param value 日期文本，可为空
 * @description 归一日期为点分隔文本
 */
function formatDate(value?: string | null) {
  if (!value) {
    return ''
  }

  const matched = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)

  if (matched) {
    return `${matched[1]}.${matched[2].padStart(2, '0')}.${matched[3].padStart(2, '0')}`
  }

  const date = new Date(value.replace(/-/g, '/').replace('T', ' '))

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

/**
 *
 * @param coupon 优惠券
 * @description 取优惠券类型名称
 */
function getCouponTypeName(coupon: CouponItem) {
  switch (coupon.discountType) {
    case '2':
      return '满减券'
    case '3':
      return '每满减券'
    case '4':
      return '折扣券'
    case '5':
      return '随机立减券'
    case '8':
      return '泡比券'
    case '9':
      return '一口价'
    default:
      return '立减券'
  }
}

/**
 *
 * @param coupon 优惠券
 * @description 取优惠券面额值与单位
 */
function getCouponAmount(coupon: CouponItem) {
  if (coupon.discountType === '4') {
    return {
      amountValue: formatDiscount(coupon.discountFee),
      amountUnit: '折'
    }
  }

  if (coupon.discountType === '2') {
    return {
      amountValue: formatCentAmount(coupon.subFee),
      amountUnit: '元'
    }
  }

  if (coupon.discountType === '3') {
    return {
      amountValue: formatCentAmount(coupon.limitDiscountFee || coupon.subFee),
      amountUnit: '元'
    }
  }

  return {
    amountValue: formatCentAmount(coupon.discountFee),
    amountUnit: '元'
  }
}

/**
 *
 * @param coupon 优惠券
 * @description 生成优惠门槛文案
 */
function getThresholdText(coupon: CouponItem) {
  if (coupon.discountType === '2') {
    return `满${formatCentAmount(coupon.useFee)}元可用`
  }

  if (coupon.discountType === '3') {
    return `每满${formatCentAmount(coupon.useFee)}元减${formatCentAmount(coupon.subFee)}元`
  }

  if (coupon.discountType === '4') {
    return coupon.limitDiscountFee ? `最高减免${formatCentAmount(coupon.limitDiscountFee)}元` : '折扣优惠'
  }

  if (coupon.discountFee) {
    return `可抵扣${formatCentAmount(coupon.discountFee)}元`
  }

  return '优惠规则以结算页为准'
}

/**
 *
 * @param fitWeek 可用星期，可为空
 * @description 生成限星期使用文案
 */
function getUsageTimeText(fitWeek?: string | null) {
  if (!fitWeek) {
    return ''
  }

  const weekdays = fitWeek
    .split(',')
    .map(item => WEEKDAY_TEXT[item.trim()])
    .filter(Boolean)
    .join('')

  return weekdays ? `限周${weekdays}使用` : ''
}

/**
 *
 * @param coupon 优惠券
 * @param status 优惠券状态
 * @description 生成有效期文案
 */
function getValidityText(coupon: CouponItem, status: CouponStatus) {
  const startTime = formatDate(coupon.startTime)
  const endTime = formatDate(coupon.endTime)

  if (status === 'USABLE' && startTime && endTime) {
    return `${startTime}-${endTime} 有效`
  }

  return endTime ? `有效期至 ${endTime}` : '有效期以券详情为准'
}

/**
 *
 * @param coupon 优惠券
 * @param status 优惠券状态
 * @description 生成优惠券状态文案
 */
function getStatusText(coupon: CouponItem, status: CouponStatus) {
  if (status === 'USED') {
    return '已使用'
  }

  if (status === 'EXPIRED') {
    return coupon.businessStatus === '2' ? '已转赠' : '已过期'
  }

  return '可使用'
}

/**
 *
 * @param coupon 优惠券
 * @description 生成优惠券角标文案
 */
function getLabelText(coupon: CouponItem) {
  if (coupon.couponLabel === 'NEW') {
    return '新领取'
  }

  if (coupon.couponLabel === 'EXPIRE' || coupon.label === 'will_expire') {
    return '即将到期'
  }

  if (coupon.label === 'recommended') {
    return '推荐'
  }

  return ''
}

/**
 *
 * @param coupon 优惠券
 * @param usageTimeText 可用时间文案
 * @param labelText 角标文案
 * @description 组装优惠券标签，最多 4 个
 */
function createTags(coupon: CouponItem, usageTimeText: string, labelText: string) {
  return [labelText, usageTimeText, ...(coupon.fitCouponTagList ?? [])].filter(Boolean).slice(0, 4)
}

/**
 *
 * @param value 描述文本，可为空
 * @description 按换行拆分描述并去掉空行
 */
function splitDescription(value?: string | null) {
  return (value ?? '')
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)
}

/**
 *
 * @param code 兑换码
 * @description 校验兑换码，返回错误文案
 */
export function validateCouponExchangeCode(code: string) {
  const exchangeCouponCode = code.trim()

  if (!exchangeCouponCode) {
    return '请输入兑换码'
  }

  if (exchangeCouponCode.length < 10) {
    return '请输入正确的兑换码'
  }

  if (exchangeCouponCode.length > 20) {
    return '兑换码不能超过20个字符'
  }

  return ''
}

/**
 *
 * @param raw 券详情原始数据
 * @description 组装优惠券详情展示结构
 */
export function createCouponDetailView(raw: {
  couponCode?: string
  fitProduct?: string | null
  limit?: string[] | null
  couponDescribe?: string | null
  addressList?: Array<{ type?: string; address?: string }>
}): CouponDetailView {
  const senderAddresses: string[] = []
  const consigneeAddresses: string[] = []

  for (const item of raw.addressList ?? []) {
    const address = (item.address ?? '').trim()

    if (!address) {
      continue
    }

    if (item.type === '1') {
      senderAddresses.push(address)
    } else if (item.type === '2') {
      consigneeAddresses.push(address)
    }
  }

  const limits = (raw.limit ?? []).map(item => item.trim()).filter(Boolean)
  const descriptions = splitDescription(raw.couponDescribe)
  const fitProduct = (raw.fitProduct ?? '').trim()
  const couponCode = (raw.couponCode ?? '').trim()

  return {
    code: couponCode,
    fitProduct,
    limits,
    descriptions,
    senderAddresses,
    consigneeAddresses,
    hasDetail: Boolean(fitProduct || limits.length || descriptions.length || senderAddresses.length || consigneeAddresses.length)
  }
}

export const couponService = {
  /**
   *
   * @param coupon 优惠券
   * @param status 优惠券状态
   * @description 组装优惠券卡片展示结构
   */
  toCouponCard(coupon: CouponItem, status: CouponStatus): CouponCardView {
    const amount = getCouponAmount(coupon)
    const usageTimeText = getUsageTimeText(coupon.fitWeek)
    const labelText = getLabelText(coupon)

    return {
      code: coupon.couponCode,
      typeName: getCouponTypeName(coupon),
      amountValue: amount.amountValue,
      amountUnit: amount.amountUnit,
      title: coupon.subTitle || coupon.subtitle || getCouponTypeName(coupon),
      thresholdText: getThresholdText(coupon),
      validityText: getValidityText(coupon, status),
      usageTimeText,
      statusText: getStatusText(coupon, status),
      labelText,
      tags: createTags(coupon, usageTimeText, labelText),
      canUse: (status === 'USABLE' || status === 'AVAILABLE') && coupon.businessStatus !== '1',
      raw: coupon
    }
  },

  /**
   *
   * @param status 优惠券状态
   * @param loading 是否展示加载态
   * @description 查询用户优惠券列表
   */
  async queryUserCoupons(status: CouponStatus, loading = false): Promise<DepponResponse<CouponListResult>> {
    const response = await couponApi.queryUserCouponList(
      {
        type: status
      },
      loading
    )

    if (!response.status) {
      return createServiceFailure(response.message || '暂未获取到优惠券')
    }

    const list = Array.isArray(response.result) ? response.result : []

    return {
      ...response,
      result: {
        status,
        list,
        totalRows: list.length
      }
    }
  },

  /**
   *
   * @param code 兑换码
   * @description 校验后兑换优惠券
   */
  async exchangeCoupon(code: string): Promise<DepponResponse<CouponExchangeResponse>> {
    const exchangeCouponCode = code.trim()
    const validationMessage = validateCouponExchangeCode(exchangeCouponCode)

    if (validationMessage) {
      return createServiceFailure(validationMessage)
    }

    const response = await couponApi.exchangeCoupon(exchangeCouponCode)

    if (!response.status || !response.result?.data) {
      return createServiceFailure(response.result?.msg || response.message || '兑换失败，请稍后再试')
    }

    return response
  },

  /**
   *
   * @param couponCode 券码
   * @description 查询优惠券详情
   */
  async queryCouponDetail(couponCode: string): Promise<DepponResponse<CouponDetailView>> {
    const code = couponCode.trim()

    if (!code) {
      return createServiceFailure('缺少优惠券券码')
    }

    const response = await couponApi.queryCouponDetail(code)

    if (!response.status || !response.result) {
      return createServiceFailure(response.message || '查询优惠券详情失败')
    }

    return {
      ...response,
      result: createCouponDetailView(response.result)
    }
  },

  /**
   *
   * @description 查询即将过期优惠券数量
   */
  async queryExpireCount(): Promise<number> {
    const response = await couponApi.queryExpireCouponCount()

    if (!response.status || !response.result) {
      return 0
    }

    return toFiniteNumber(response.result, 0)
  }
}
