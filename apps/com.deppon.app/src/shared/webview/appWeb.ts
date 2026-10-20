import { APP_RUNTIME_CONFIG } from '../config/runtime'
import { APP_ROUTES } from '../navigation/routes'
import { createAppRouteUrl } from '../navigation/routeUrl'

export interface AppWebRouteOptions {
  source: AppWebSource
  uri?: string
  title?: string
  auth?: boolean
  messageContext?: string
}

export interface AppWebTarget {
  source: string
  title: string
  url: string
  auth: boolean
  allowed: boolean
  message: string
  messageContext: string
}

interface KnownWebTarget {
  title: string
  url: string
  auth?: boolean
}

export function requiresAppWebLogin(target: Pick<AppWebTarget, 'allowed' | 'auth'>, authenticated: boolean) {
  return target.allowed && target.auth && !authenticated
}

// 会员/福利相关 H5 都在 mas 域：会员中心、积分乐园、学生会员走 cms-h5，SVIP 走老 cms 路径。
// 这里跟随运行时 memberWebURL 的域名，避免测试/生产环境串域。
function memberWebOrigin() {
  try {
    return new URL(APP_RUNTIME_CONFIG.memberWebURL).origin
  } catch {
    return ''
  }
}

function memberCmsUrl(style: 'cms-h5' | 'cms', hashPath: string) {
  const base = APP_RUNTIME_CONFIG.memberWebURL.split('#')[0]

  if (!base) {
    return ''
  }

  const scoped = style === 'cms-h5' ? base : base.replace('/cms-h5/', '/cms/')

  return `${scoped}${hashPath}`
}

function memberActivityUrl(activity: string, code: string) {
  const origin = memberWebOrigin()

  return origin ? `${origin}/crm-api/mp/base/activity/ui/${activity}?code=${code}` : ''
}

export const APP_WEB_TARGETS = {
  EXPRESS_SERVICE_PROTOCOL: {
    title: '电子运单服务协议',
    url: '/depponmobile/protocol/service',
    auth: false
  },
  EXPRESS_BILLING_RULES: {
    title: '计费规则',
    url: '/depponmobile/billingRules',
    auth: false
  },
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
    url: '/depponmobile/mow/center/accountSet?pageSource=APP&sonSource=CENTER_USER_SETTING'
  },
  ORDER_DETAIL_ACCOUNT_PREFERENCES: {
    title: '偏好设置',
    url: '/depponmobile/mow/center/accountSet?pageSource=APP&sonSource=ORDER_DETAIL_USER_SETTING'
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
  // 「我的 → 客服中心」入口是 H5：/depponmobile/h5/index#/partsPackagePages/customer/index
  CUSTOMER_SERVICE_CENTER: {
    title: '客服中心',
    url: '/depponmobile/h5/index#/partsPackagePages/customer/index'
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
  SUPPORT_COMPLAINT_RECORD: {
    title: '投诉记录',
    url: '/depponmobile/complaint/record'
  },
  SUPPORT_CLAIM: {
    title: '在线理赔',
    url: '/depponmobile/h5/index#/claimPackagePages/index'
  },
  SUPPORT_CLAIM_PROCESSING: {
    title: '理赔处理中',
    url: '/depponmobile/h5/index#/claimPackagePages/list?tab=2'
  },
  SUPPORT_CLAIM_COMPLETED: {
    title: '理赔已完成',
    url: '/depponmobile/h5/index#/claimPackagePages/list?tab=3'
  },
  STATION_FEEDBACK: {
    title: '网点反馈',
    url: '/depponmobile/survey/noStarEvaluate'
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
  EXPRESS_COLLECTION_ACCOUNT: {
    title: '选择收款账户',
    url: '/depponmobile/h5/index#/customerCenterPackagePages/dshk/tkzh/list?from=EXPRESS_SERVICE'
  },
  ORDER_EDIT_COLLECTION_ACCOUNT: {
    title: '选择收款账户',
    url: '/depponmobile/h5/index#/customerCenterPackagePages/dshk/tkzh/list?from=EXPRESS_SERVICE'
  },
  EXPRESS_COLLECTION_RULES: {
    title: '代收货款服务协议',
    url: '/depponmobile/h5/index#/queryPackagePages/service/detail/index?value=COLLECTION',
    auth: false
  },
  EXPRESS_WAREHOUSE: {
    title: '送货进仓',
    url: '/depponmobile/mow/send/warehouse/index'
  },
  EXPRESS_WAREHOUSE_RULES: {
    title: '送货进仓服务说明',
    url: '/depponmobile/h5/index#/queryPackagePages/service/detail/index?value=WAREHOUSE',
    auth: false
  },
  EXPRESS_RETURN_BILL_CLOUD_SIGN: {
    title: '电子云签',
    url: '/depponmobile/electronCloudSign/index'
  },
  CUSTOMER_PRIVATE_BILL: {
    title: '隐私设置',
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
    url: memberCmsUrl('cms-h5', '#/member/home')
  },
  MEMBER_POINTS_CENTER: {
    title: '积分乐园',
    url: memberCmsUrl('cms-h5', '#/points-center/home')
  },
  MEMBER_SVIP_CENTER: {
    title: 'SVIP会员',
    url: memberCmsUrl('cms', '#/svip-member/home')
  },
  MEMBER_STUDENT_CENTER: {
    title: '学生会员',
    url: memberCmsUrl('cms-h5', '#/student-member/center')
  },
  GROUP_BENEFIT: {
    title: '入群有礼',
    url: '/depponmobile/h5/index#/pages/groupBenefit/index'
  },
  EXPERIENCE_SURVEY: {
    title: '德邦快递客户体验调研',
    url: '/depponmobile/survey/center'
  },
  ENTERPRISE_WELFARE: {
    title: '企业福利',
    url: memberActivityUrl('24-QYJ', '50d8eefd867f40d38d36b577b45891b7')
  },
  PREFERENTIAL_CERT: {
    title: '优待证优惠',
    url: memberActivityUrl('24-JRYD', '054ef1baca474f27a08a440976c5b2d1')
  },
  PROTOCOL_RECORD: {
    title: '法律条款与隐私政策',
    url: '/depponmobile/protocol/record'
  },
  PRIVACY_SETTINGS_POLICY: {
    title: '隐私政策',
    url: '/depponmobile/h5/index#/homePackagePages/privacy/index',
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

    return parsed.protocol === 'https:' && APP_RUNTIME_CONFIG.webAllowedHosts.includes(parsed.hostname)
  } catch {
    return false
  }
}

export function getAppWebWarehouseStagingId(url: string) {
  try {
    return new URL(url).searchParams.get('warehouseId')?.trim() ?? ''
  } catch {
    return ''
  }
}

export function getAppWebReturnBillFileCode(url: string) {
  try {
    return new URL(url).searchParams.get('fileCode')?.trim() ?? ''
  } catch {
    return ''
  }
}

const MESSAGE_SOURCE_TARGETS = new Set<AppWebSource>([
  'EXPRESS_COLLECTION_ACCOUNT',
  'ORDER_EDIT_COLLECTION_ACCOUNT',
  'EXPRESS_WAREHOUSE',
  'EXPRESS_RETURN_BILL_CLOUD_SIGN'
])

export function isAllowedAppWebTargetUrl(source: string, url: string) {
  if (!isAllowedAppWebUrl(url)) {
    return false
  }

  if (!isAppWebSource(source) || !MESSAGE_SOURCE_TARGETS.has(source)) {
    return true
  }

  try {
    const target = new URL(toAbsoluteWebUrl(APP_WEB_TARGETS[source].url))
    const candidate = new URL(url)
    const targetHashPath = target.hash.split('?')[0]
    const candidateHashPath = candidate.hash.split('?')[0]

    return candidate.origin === target.origin && candidate.pathname === target.pathname && (!targetHashPath || candidateHashPath === targetHashPath)
  } catch {
    return false
  }
}

export function createAppWebUrl(options: AppWebRouteOptions) {
  const knownTarget: KnownWebTarget = APP_WEB_TARGETS[options.source]
  const uri = options.uri || knownTarget?.url || ''
  const title = options.title || knownTarget?.title || ''
  const auth = options.auth === undefined ? knownTarget?.auth !== false : Boolean(options.auth)

  return createAppRouteUrl(APP_ROUTES.web, {
    source: options.source,
    uri,
    title,
    auth: auth ? 'Y' : 'N',
    messageContext: options.messageContext
  })
}

export function resolveAppWebTarget(params: Partial<Record<string, string>>): AppWebTarget {
  const source = decodeRouteValue(params.source) || 'UNKNOWN'
  const knownTarget: KnownWebTarget | null = isAppWebSource(source) ? APP_WEB_TARGETS[source] : null
  const routeUri = decodeRouteValue(params.uri || params.url)
  const rawUrl = routeUri || knownTarget?.url || ''
  const url = toAbsoluteWebUrl(rawUrl)
  const title = decodeRouteValue(params.title) || knownTarget?.title || '服务承接'
  const auth = params.auth === undefined ? knownTarget?.auth !== false : decodeRouteValue(params.auth) !== 'N'
  const rawMessageContext = decodeRouteValue(params.messageContext).trim()
  const messageContext = rawMessageContext.length <= 256 ? rawMessageContext : ''
  const allowed = isAllowedAppWebTargetUrl(source, url)

  return {
    source,
    title,
    url,
    auth,
    allowed,
    messageContext,
    message: url ? '当前链接暂未允许访问' : '当前入口暂未配置承接地址'
  }
}
