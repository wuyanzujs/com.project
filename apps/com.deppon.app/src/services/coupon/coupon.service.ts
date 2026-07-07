import { couponApi } from './coupon.api'

import type {
  CouponCardView,
  CouponDetailView,
  CouponExchangeResponse,
  CouponItem,
  CouponListResult,
  CouponStatus
} from './types'
import type { DepponResponse } from '../../request/deppon'

const WEEKDAY_TEXT: Record<string, string> = {
  Sunday: '日',
  Monday: '一',
  Tuesday: '二',
  Wednesday: '三',
  Thursday: '四',
  Friday: '五',
  Saturday: '六'
}

function createFailure<TResult>(message: string): DepponResponse<TResult> {
  return {
    status: false,
    message,
    result: null
  }
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : fallback
}

function trimNumberText(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, '')
}

function formatCentAmount(value: unknown) {
  return trimNumberText(toFiniteNumber(value) / 100)
}

function formatDiscount(value: unknown) {
  return trimNumberText(toFiniteNumber(value) / 10)
}

function formatDate(value?: string | null) {
  if (!value) {
    return ''
  }

  const matched = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)

  if (matched) {
    return `${matched[1]}.${matched[2].padStart(2, '0')}.${matched[3].padStart(
      2,
      '0'
    )}`
  }

  const date = new Date(value.replace(/-/g, '/').replace('T', ' '))

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}.${String(date.getDate()).padStart(2, '0')}`
}

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

function getThresholdText(coupon: CouponItem) {
  if (coupon.discountType === '2') {
    return `满${formatCentAmount(coupon.useFee)}元可用`
  }

  if (coupon.discountType === '3') {
    return `每满${formatCentAmount(coupon.useFee)}元减${formatCentAmount(
      coupon.subFee
    )}元`
  }

  if (coupon.discountType === '4') {
    return coupon.limitDiscountFee
      ? `最高减免${formatCentAmount(coupon.limitDiscountFee)}元`
      : '折扣优惠'
  }

  if (coupon.discountFee) {
    return `可抵扣${formatCentAmount(coupon.discountFee)}元`
  }

  return '优惠规则以结算页为准'
}

function getUsageTimeText(fitWeek?: string | null) {
  if (!fitWeek) {
    return ''
  }

  const weekdays = fitWeek
    .split(',')
    .map((item) => WEEKDAY_TEXT[item.trim()])
    .filter(Boolean)
    .join('')

  return weekdays ? `限周${weekdays}使用` : ''
}

function getValidityText(coupon: CouponItem, status: CouponStatus) {
  const startTime = formatDate(coupon.startTime)
  const endTime = formatDate(coupon.endTime)

  if (status === 'USABLE' && startTime && endTime) {
    return `${startTime}-${endTime} 有效`
  }

  return endTime ? `有效期至 ${endTime}` : '有效期以券详情为准'
}

function getStatusText(coupon: CouponItem, status: CouponStatus) {
  if (status === 'USED') {
    return '已使用'
  }

  if (status === 'EXPIRED') {
    return coupon.businessStatus === '2' ? '已转赠' : '已过期'
  }

  return '可使用'
}

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

function createTags(
  coupon: CouponItem,
  usageTimeText: string,
  labelText: string
) {
  return [
    labelText,
    usageTimeText,
    ...(coupon.fitCouponTagList ?? [])
  ].filter(Boolean).slice(0, 4)
}

function splitDescription(value?: string | null) {
  return (value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeCouponDetail(raw: {
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

  const limits = (raw.limit ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
  const descriptions = splitDescription(raw.couponDescribe)
  const fitProduct = (raw.fitProduct ?? '').trim()

  return {
    code: raw.couponCode ?? '',
    fitProduct,
    limits,
    descriptions,
    senderAddresses,
    consigneeAddresses,
    hasDetail: Boolean(
      fitProduct ||
        limits.length ||
        descriptions.length ||
        senderAddresses.length ||
        consigneeAddresses.length
    )
  }
}

export const couponService = {
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
      canUse: status === 'USABLE' && coupon.businessStatus !== '1',
      raw: coupon
    }
  },

  async queryUserCoupons(
    status: CouponStatus,
    loading = false
  ): Promise<DepponResponse<CouponListResult>> {
    const response = await couponApi.queryUserCouponList(
      {
        type: status
      },
      loading
    )

    if (!response.status) {
      return createFailure(response.message || '暂未获取到优惠券')
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

  async exchangeCoupon(
    code: string
  ): Promise<DepponResponse<CouponExchangeResponse>> {
    const exchangeCouponCode = code.trim()

    if (!exchangeCouponCode) {
      return createFailure('请输入兑换码')
    }

    const response = await couponApi.exchangeCoupon(exchangeCouponCode)

    if (!response.status || !response.result?.data) {
      return createFailure(
        response.result?.msg || response.message || '兑换失败，请稍后再试'
      )
    }

    return response
  },

  async queryCouponDetail(
    couponCode: string
  ): Promise<DepponResponse<CouponDetailView>> {
    const code = couponCode.trim()

    if (!code) {
      return createFailure('缺少优惠券券码')
    }

    const response = await couponApi.queryCouponDetail(code)

    if (!response.status || !response.result) {
      return createFailure(response.message || '查询优惠券详情失败')
    }

    return {
      ...response,
      result: normalizeCouponDetail(response.result)
    }
  }
}
