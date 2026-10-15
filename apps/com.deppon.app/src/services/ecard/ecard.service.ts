import type { DepponResponse } from '@/request/deppon'
import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'

import { ecardApi } from './ecard.api'
import { createServiceFailure } from '../serviceResponse'

import type { ECardCenterUrlOptions, ECardLinkRequest, ECardOverviewView, ECardPromotionRaw, ECardTargetPage } from './types'

/**
 *
 * @param value 待转换值
 * @description 转为有限数字，失败返回 0
 */
function toFiniteNumber(value: unknown) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : 0
}

/**
 *
 * @param value 金额
 * @description 格式化为带货币符号的金额文本
 */
function formatMoney(value: number) {
  return Number.isInteger(value) ? `¥${value}` : `¥${value.toFixed(2)}`
}

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
 * @param raw 活动原始数据，可为空
 * @description 归一充值活动展示数据，最多 3 条
 */
function normalizePromotions(raw?: ECardPromotionRaw | null) {
  return (raw?.configList ?? [])
    .map(item => {
      const title = normalizeText(item.rechargeAmountDesc)
      const summary = normalizeText(item.discountAmountDesc)

      return title || summary
        ? {
            title: title || '充值优惠',
            summary: summary || '以 E 卡页面展示为准'
          }
        : null
    })
    .filter(Boolean)
    .slice(0, 3) as ECardOverviewView['promotions']
}

/**
 *
 * @param value 文本，可为空
 * @description 归一文本，空值返回 undefined
 */
function normalizeOptionalText(value?: string | null) {
  const text = normalizeText(value)

  return text || undefined
}

/**
 *
 * @param targetPage 目标页面
 * @param options 可选跳转参数
 * @description 组装 E 卡链接请求参数
 */
export function createECardLinkRequest(targetPage: ECardTargetPage = 'HOME', options: ECardCenterUrlOptions = {}): ECardLinkRequest {
  const request: ECardLinkRequest = {
    sysCode: APP_RUNTIME_CONFIG.ecardPmcSystemCode,
    targetPage
  }
  const type = normalizeOptionalText(options.type) as ECardLinkRequest['type']
  const postmanId = normalizeOptionalText(options.postmanId)
  const activityCode = normalizeOptionalText(options.activityCode)

  request.source = normalizeOptionalText(options.targetSource) || 'APP_ECARD_CENTER'

  if (type) {
    request.type = type
  }

  if (postmanId) {
    request.postmanId = postmanId
  }

  if (activityCode) {
    request.activityCode = activityCode
  }

  return request
}

export const ecardService = {
  /**
   *
   * @description 查询余额与活动，组装 E 卡概览
   */
  async queryOverview(): Promise<DepponResponse<ECardOverviewView>> {
    const [balanceResponse, promotionResponse] = await Promise.all([
      ecardApi.queryBalance('2', false).catch(() => null),
      ecardApi.queryPromotions().catch(() => null)
    ])
    const rawBalance = balanceResponse?.status ? balanceResponse.result : null
    const balance = toFiniteNumber(rawBalance?.balance)
    const hasCard = Boolean(rawBalance?.existCustomer)
    const passwordSet = Boolean(rawBalance?.passwordSet)

    return {
      status: true,
      message: balanceResponse?.message || promotionResponse?.message || 'E 卡信息已同步',
      result: {
        balance,
        balanceText: formatMoney(balance),
        hasCard,
        passwordSet,
        statusText: hasCard ? '已开通储值卡' : '未开通储值卡',
        securityText: passwordSet ? '已设置支付密码' : '暂未设置支付密码',
        rechargeDesc: normalizeText(rawBalance?.rechargeDesc) || '充值、开通和账单能力由 E 卡页面承接',
        promotions: normalizePromotions(promotionResponse?.result)
      }
    }
  },

  /**
   *
   * @description 查询储值卡数量。后端仅暴露账户级 existCustomer 标记，没有卡数量接口；
   * 储值卡账户一人一户，已开通按 1 张计，未开通按 0 张计。查询失败返回失败响应，
   * 由调用方把数量置为未知，避免把未知状态渲染成「储值卡0」。
   */
  async queryStoredCardCount(): Promise<DepponResponse<number>> {
    const response = await ecardApi.queryBalance('2', false).catch(() => null)
    const rawBalance = response?.status ? response.result : null

    if (!rawBalance) {
      return createServiceFailure<number>(response?.message || '暂未获取到储值卡信息')
    }

    return {
      status: true,
      message: '',
      result: rawBalance.existCustomer ? 1 : 0
    }
  },

  /**
   *
   * @param targetPage 目标页面
   * @param options 可选跳转参数
   * @description 创建 E 卡中心页面链接
   */
  async createCenterUrl(targetPage: ECardTargetPage = 'HOME', options: ECardCenterUrlOptions = {}) {
    const response = await ecardApi.createECardLink(createECardLinkRequest(targetPage, options), false)

    if (!response.status || !response.result?.form) {
      return createServiceFailure<string>(response.message || '暂未获取到 E 卡页面')
    }

    return {
      ...response,
      result: response.result.form
    }
  },

  /**
   *
   * @description 创建 E 卡预览页面链接
   */
  async createPreviewUrl() {
    const response = await ecardApi.createECardPreviewLink({
      sysCode: APP_RUNTIME_CONFIG.ecardPmcSystemCode
    })

    if (!response.status || !response.result?.form) {
      return createServiceFailure<string>(response.message || '暂未获取到 E 卡页面')
    }

    return {
      ...response,
      result: response.result.form
    }
  }
}
