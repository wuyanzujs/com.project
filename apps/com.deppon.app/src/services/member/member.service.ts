import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'
import { authService } from '../auth'
import { memberApi } from './member.api'

import type {
  MemberBenefitView,
  MemberLevelRaw,
  MemberOverviewView,
  MemberSvipRaw
} from './types'
import type { DepponResponse } from '../../request/deppon'

const DEFAULT_BENEFITS: MemberBenefitView[] = [
  {
    title: '优惠券权益',
    summary: '可在优惠券列表查看并带入寄件草稿使用',
    status: 'ready'
  },
  {
    title: '积分中心',
    summary: '积分明细和兑换活动由 MAS 福利中心承接',
    status: 'pending'
  },
  {
    title: 'SVIP 专属券',
    summary: 'SVIP 购买、续费和发券链路后续接入支付能力',
    status: 'pending'
  }
]

function toFiniteNumber(value: unknown) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : 0
}

function normalizeText(value?: string | number | null) {
  return String(value ?? '').trim()
}

function appendQuery(url: string, params: Record<string, string>) {
  const query = Object.entries(params)
    .filter(([, value]) => !!value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')

  if (!query) {
    return url
  }

  return url.includes('?') ? `${url}&${query}` : `${url}?${query}`
}

function getSvipStatusText(status: number) {
  if (status === 1) {
    return 'SVIP 生效中'
  }

  if (status === 2) {
    return 'SVIP 待续费'
  }

  return '普通会员'
}

function normalizeOverview(
  level?: MemberLevelRaw | null,
  svip?: MemberSvipRaw | null
): MemberOverviewView {
  const growthValue = toFiniteNumber(level?.growthValue)
  const maxGrowthValue = toFiniteNumber(level?.maxGrowthValue)
  const growthPercent = maxGrowthValue
    ? Math.min(100, Math.round((growthValue / maxGrowthValue) * 100))
    : 0
  const svipStatus = toFiniteNumber(svip?.status)

  return {
    levelName: normalizeText(level?.levelName) || '普通会员',
    levelCode: toFiniteNumber(level?.levelCode),
    growthValue,
    maxGrowthValue,
    growthPercent,
    points: toFiniteNumber(svip?.points),
    svipStatus,
    svipStatusText: getSvipStatusText(svipStatus),
    svipButtonText: normalizeText(svip?.button) || '查看权益',
    svipMessage: normalizeText(svip?.message) || '更多权益由福利中心承接',
    svipUrl: normalizeText(svip?.url),
    benefits: DEFAULT_BENEFITS
  }
}

function createSuccessResponse<TResult>(
  result: TResult,
  message = ''
): DepponResponse<TResult> {
  return {
    status: true,
    message,
    result
  }
}

export const memberService = {
  async queryOverview(): Promise<DepponResponse<MemberOverviewView>> {
    const [levelResponse, svipResponse] = await Promise.all([
      memberApi.queryLevel().catch(() => null),
      memberApi.querySvipInfo().catch(() => null)
    ])
    const overview = normalizeOverview(
      levelResponse?.status ? levelResponse.result : null,
      svipResponse?.status ? svipResponse.result : null
    )
    const message =
      levelResponse?.message || svipResponse?.message || '会员信息已同步'

    return createSuccessResponse(overview, message)
  },

  async createWelfareCenterUrl(source = 'MEMBER_INDEX') {
    try {
      const token = await authService.generateTmpToken(source)

      return appendQuery(APP_RUNTIME_CONFIG.memberWebURL, {
        code: token,
        source
      })
    } catch {
      return appendQuery(APP_RUNTIME_CONFIG.memberWebURL, {
        source
      })
    }
  }
}
