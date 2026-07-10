import { APP_RUNTIME_CONFIG } from '../config/runtime'
import { APP_ROUTES } from '../navigation/routes'
import { createAppRouteUrl } from '../navigation/routeUrl'

export interface AppWebRouteOptions {
  source: AppWebSource
  uri?: string
  title?: string
  auth?: boolean
}

export interface AppWebTarget {
  source: string
  title: string
  url: string
  auth: boolean
  allowed: boolean
  message: string
}

interface KnownWebTarget {
  title: string
  url: string
  auth?: boolean
}

export const APP_WEB_TARGETS = {
  AUTH_LOGIN_SERVICE_PROTOCOL: {
    title: '服务协议',
    url: '/depponmobile/protocol/service',
    auth: false
  },
  LOGIN_SERVICE_PROTOCOL: {
    title: '服务协议',
    url: '/depponmobile/protocol/service',
    auth: false
  },
  AUTH_LOGIN_PRIVACY_PROTOCOL: {
    title: '隐私政策',
    url: '/depponmobile/protocol/policy/index',
    auth: false
  },
  LOGIN_PRIVACY_POLICY: {
    title: '隐私政策',
    url: '/depponmobile/protocol/policy/index',
    auth: false
  },
  MINE_CUSTOMER_SERVICE: {
    title: '在线客服',
    url: APP_RUNTIME_CONFIG.serviceWebURL
  },
  MINE_ABOUT_US: {
    title: '关于德邦',
    url: '/depponmobile/h5/index#/homePackagePages/companyOverview/index',
    auth: false
  },
  ACCOUNT_PREFERENCES: {
    title: '偏好设置',
    url: '/depponmobile/mow/center/accountSet'
  },
  ORDER_DETAIL_SERVICE: {
    title: '在线客服',
    url: APP_RUNTIME_CONFIG.serviceWebURL
  },
  ORDER_DETAIL_COMPLAINT: {
    title: '订单投诉',
    url: '/depponmobile/complaint/apply/index'
  },
  ORDER_DETAIL_CLAIM: {
    title: '在线理赔',
    url: '/depponmobile/h5/index#/claimPackagePages/index'
  },
  ORDER_DETAIL_WAYBILL_MODIFY: {
    title: '修改运单',
    url: '/depponmobile/mow/order/modifyNew/index'
  },
  ORDER_DETAIL_URGE_PROGRESS: {
    title: '催单进度',
    url: '/depponmobile/mow/order/urgeProgress'
  },
  ORDER_DETAIL_EVALUATE: {
    title: '服务评价',
    url: '/depponmobile/survey/land'
  },
  PAYMENT_EVALUATE: {
    title: '服务评价',
    url: '/depponmobile/survey/land'
  },
  ORDER_DETAIL_DELIVERY: {
    title: '收件方式',
    url: '/depponmobile/orderStayTmp'
  },
  ORDER_STUB_CONTRACT_PREVIEW: {
    title: '电子合同',
    url: '/gwapi/onlineService/eco/online/secure/contractPreview'
  },
  SUPPORT_ONLINE_SERVICE: {
    title: '在线客服',
    url: APP_RUNTIME_CONFIG.serviceWebURL
  },
  SUPPORT_CHAT_LIST: {
    title: '服务消息',
    url: '/depponmobile/h5/index#/chatPackagePages/chatList/index'
  },
  SUPPORT_SURVEY: {
    title: '体验调研',
    url: '',
    auth: false
  },
  SUPPORT_COMPLAINT: {
    title: '投诉',
    url: '/depponmobile/complaint/list'
  },
  SUPPORT_CLAIM: {
    title: '在线理赔',
    url: '/depponmobile/h5/index#/claimPackagePages/index'
  },
  CUSTOMER_CENTER: {
    title: '客户中心',
    url: '/depponmobile/mow/customer'
  },
  CUSTOMER_BIND: {
    title: '绑定客户编码',
    url: '/depponmobile/mow/customer/bind'
  },
  CUSTOMER_MONTHLY_CENTER: {
    title: '月结中心',
    url: '/depponmobile/mow/customer/dshkCenter'
  },
  CUSTOMER_PRIVATE_BILL: {
    title: '隐私面单',
    url: '/depponmobile/mow/customer/privateSetting'
  },
  CUSTOMER_PHONE_PROTECT: {
    title: '号码保护',
    url: '/depponmobile/h5/index#/partsPackagePages/customer/phoneProtect'
  },
  ECARD_CENTER: {
    title: '德邦 E 卡',
    url: ''
  },
  ECARD_RECHARGE: {
    title: 'E 卡充值',
    url: ''
  },
  ECARD_BILL: {
    title: 'E 卡账单',
    url: ''
  },
  MEMBER_WELFARE_CENTER: {
    title: '会员权益',
    url: APP_RUNTIME_CONFIG.memberWebURL
  },
  MEMBER_CENTER_HOME: {
    title: '会员中心',
    url: ''
  },
  MEMBER_POINTS_CENTER: {
    title: '积分中心',
    url: ''
  },
  MEMBER_SVIP_CENTER: {
    title: 'SVIP 权益',
    url: ''
  },
  MEMBER_STUDENT_CENTER: {
    title: '学生专区',
    url: ''
  },
  PRIVACY_SETTINGS_POLICY: {
    title: '隐私政策',
    url: '/depponmobile/protocol/policy/index',
    auth: false
  },
  PRIVACY_SETTINGS_PERSONAL_INFO: {
    title: '个人信息清单',
    url: '/depponmobile/h5/index#/homePackagePages/privacy/personalInformationList',
    auth: false
  },
  PRIVACY_SETTINGS_SERVICE_PROTOCOL: {
    title: '电子运单服务协议',
    url: '/depponmobile/protocol/service',
    auth: false
  },
  PRIVACY_SETTINGS_PARTNER_LIST: {
    title: '合作方清单',
    url: '/depponmobile/h5/index#/homePackagePages/privacy/partnersList',
    auth: false
  },
  PRIVACY_SETTINGS_PERMISSION_LIST: {
    title: '权限调用清单',
    url: '/depponmobile/h5/index#/homePackagePages/privacy/permissionCall',
    auth: false
  },
  PRIVACY_SETTINGS_CLAIM_LIST: {
    title: '已签署免赔协议',
    url: '/depponmobile/protocol/deductibleAgreementList'
  }
} as const satisfies Record<string, KnownWebTarget>

export type AppWebSource = keyof typeof APP_WEB_TARGETS

export function isAppWebSource(source: string): source is AppWebSource {
  return source in APP_WEB_TARGETS
}

function decodeRouteValue(value?: string) {
  if (!value) {
    return ''
  }

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function toAbsoluteWebUrl(url: string) {
  if (!url) {
    return ''
  }

  if (/^https?:\/\//.test(url)) {
    return url
  }

  if (url.startsWith('/')) {
    return `${APP_RUNTIME_CONFIG.webBaseURL}${url}`
  }

  return url
}

export function isAllowedAppWebUrl(url: string) {
  try {
    const parsed = new URL(url)

    return (
      parsed.protocol === 'https:' &&
      APP_RUNTIME_CONFIG.webAllowedHosts.includes(parsed.hostname)
    )
  } catch {
    return false
  }
}

export function createAppWebUrl(options: AppWebRouteOptions) {
  const knownTarget: KnownWebTarget = APP_WEB_TARGETS[options.source]
  const uri = options.uri || knownTarget?.url || ''
  const title = options.title || knownTarget?.title || ''
  const auth =
    options.auth === undefined
      ? knownTarget?.auth !== false
      : Boolean(options.auth)

  return createAppRouteUrl(APP_ROUTES.web, {
    source: options.source,
    uri,
    title,
    auth: auth ? 'Y' : 'N'
  })
}

export function resolveAppWebTarget(
  params: Partial<Record<string, string>>
): AppWebTarget {
  const source = decodeRouteValue(params.source) || 'UNKNOWN'
  const knownTarget: KnownWebTarget | null = isAppWebSource(source)
    ? APP_WEB_TARGETS[source]
    : null
  const routeUri = decodeRouteValue(params.uri || params.url)
  const rawUrl = routeUri || knownTarget?.url || ''
  const url = toAbsoluteWebUrl(rawUrl)
  const title = decodeRouteValue(params.title) || knownTarget?.title || '服务承接'
  const auth =
    params.auth === undefined
      ? knownTarget?.auth !== false
      : decodeRouteValue(params.auth) !== 'N'
  const allowed = isAllowedAppWebUrl(url)

  return {
    source,
    title,
    url,
    auth,
    allowed,
    message: url ? '当前链接暂未允许访问' : '当前入口暂未配置承接地址'
  }
}
