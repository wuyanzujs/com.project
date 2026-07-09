import { ecardApi } from './ecard.api'
import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'
import { createServiceFailure } from '../serviceResponse'

import type {
  ECardLinkRequest,
  ECardOverviewView,
  ECardPromotionRaw,
  ECardTargetPage,
  ECardType
} from './types'
import type { DepponResponse } from '../../request/deppon'

function toFiniteNumber(value: unknown) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : 0
}

function formatMoney(value: number) {
  return Number.isInteger(value) ? `¥${value}` : `¥${value.toFixed(2)}`
}

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

function normalizePromotions(raw?: ECardPromotionRaw | null) {
  return (raw?.configList ?? [])
    .map((item) => {
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

function createLinkRequest(
  targetPage: ECardTargetPage,
  options: {
    type?: ECardType
    source?: string
    postmanId?: string
    activityCode?: string
  } = {}
): ECardLinkRequest {
  return {
    sysCode: APP_RUNTIME_CONFIG.ecardPmcSystemCode,
    targetPage,
    type: options.type,
    source: options.source,
    postmanId: options.postmanId,
    activityCode: options.activityCode
  }
}

export const ecardService = {
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
      message:
        balanceResponse?.message ||
        promotionResponse?.message ||
        'E 卡信息已同步',
      result: {
        balance,
        balanceText: formatMoney(balance),
        hasCard,
        passwordSet,
        statusText: hasCard ? '已开通储值卡' : '未开通储值卡',
        securityText: passwordSet ? '已设置支付密码' : '暂未设置支付密码',
        rechargeDesc:
          normalizeText(rawBalance?.rechargeDesc) ||
          '充值、开通和账单能力由 E 卡页面承接',
        promotions: normalizePromotions(promotionResponse?.result)
      }
    }
  },

  async createCenterUrl(targetPage: ECardTargetPage = 'HOME') {
    const response = await ecardApi.createECardLink(
      createLinkRequest(targetPage, {
        source: 'APP_ECARD_CENTER'
      }),
      false
    )

    if (!response.status || !response.result?.form) {
      return createServiceFailure<string>(
        response.message || '暂未获取到 E 卡页面'
      )
    }

    return {
      ...response,
      result: response.result.form
    }
  },

  async createPreviewUrl() {
    const response = await ecardApi.createECardPreviewLink({
      sysCode: APP_RUNTIME_CONFIG.ecardPmcSystemCode
    })

    if (!response.status || !response.result?.form) {
      return createServiceFailure<string>(
        response.message || '暂未获取到 E 卡页面'
      )
    }

    return {
      ...response,
      result: response.result.form
    }
  }
}
