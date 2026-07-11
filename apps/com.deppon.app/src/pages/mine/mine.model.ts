import { orderService } from '../../services/order'
import { paymentService } from '../../services/payment'
import { APP_ROUTES } from '../../shared/navigation/routes'

import type { AppRoutePath } from '../../shared/navigation/routes'
import type { AppWebSource } from '../../shared/webview/appWeb'

export type MineOrderCountKey =
  | 'all'
  | 'pickup'
  | 'payment'
  | 'transit'
  | 'signed'

export type MineOrderCounts = Record<MineOrderCountKey, number | null>

export interface MineEntry {
  title: string
  image: string
  route?: AppRoutePath
  webSource?: AppWebSource
  login?: boolean
  badge?: string
}

export interface MineOrderShortcut {
  title: string
  countKey: MineOrderCountKey
  route: AppRoutePath
}

export const EMPTY_ORDER_COUNTS: MineOrderCounts = {
  all: null,
  pickup: null,
  payment: null,
  transit: null,
  signed: null
}

export const ORDER_SHORTCUTS: MineOrderShortcut[] = [
  { title: '全部订单', countKey: 'all', route: APP_ROUTES.orderList },
  { title: '待揽收', countKey: 'pickup', route: APP_ROUTES.orderList },
  { title: '待支付', countKey: 'payment', route: APP_ROUTES.paymentList },
  { title: '运输中', countKey: 'transit', route: APP_ROUTES.orderList },
  { title: '已签收', countKey: 'signed', route: APP_ROUTES.orderList }
]

export const QUICK_ENTRIES: MineEntry[] = [
  {
    title: '地址簿',
    image: 'https://ca.deppon.com.cn/ows/assets/center2412/17.png',
    route: APP_ROUTES.contactList
  },
  {
    title: '偏好设置',
    image: 'https://ca.deppon.com.cn/ows/assets/center2412/18.png',
    webSource: 'ACCOUNT_PREFERENCES',
    login: true
  },
  {
    title: '专属快递员',
    image: 'https://ca.deppon.com.cn/ows/assets/center2412/19.png',
    route: APP_ROUTES.courierList
  },
  {
    title: '隐私设置',
    image: 'https://ca.deppon.com.cn/ows/assets/center2412/20.png',
    route: APP_ROUTES.privacySettings
  },
  {
    title: '发票申请',
    image: 'https://ca.deppon.com.cn/ows/assets/center2412/21.png',
    route: APP_ROUTES.invoiceCenter
  }
]

export const SERVICE_ENTRIES: MineEntry[] = [
  {
    title: '客户中心',
    image: 'https://ca.deppon.com.cn/ows/center/1.png',
    route: APP_ROUTES.customerCenter
  },
  {
    title: '服务查询',
    image: 'https://ca.deppon.com.cn/ows/center/2.png',
    route: APP_ROUTES.dispatchQuery
  },
  {
    title: '客服中心',
    image: 'https://ca.deppon.com.cn/ows/center/3.png',
    route: APP_ROUTES.supportCenter
  },
  {
    title: '投诉',
    image: 'https://ca.deppon.com.cn/ows/center/4.png',
    webSource: 'SUPPORT_COMPLAINT',
    login: true
  },
  {
    title: '在线理赔',
    image: 'https://ca.deppon.com.cn/ows/center/5.png',
    webSource: 'SUPPORT_CLAIM',
    login: true
  },
  {
    title: '月结中心',
    image: 'https://ca.deppon.com.cn/ows/center/6.png',
    webSource: 'CUSTOMER_MONTHLY_CENTER',
    login: true
  },
  {
    title: '代收货款',
    image: 'https://ca.deppon.com.cn/ows/center/7.png',
    route: APP_ROUTES.customerCenter
  },
  {
    title: '面单打印',
    image: 'https://ca.deppon.com.cn/ows/center/8.png',
    route: APP_ROUTES.printCenter
  },
  {
    title: '签收码',
    image: 'https://ca.deppon.com.cn/ows/center/9.png',
    route: APP_ROUTES.signCode
  },
  {
    title: '协议说明',
    image: 'https://ca.deppon.com.cn/ows/center/11.png',
    route: APP_ROUTES.privacySettings
  },
  {
    title: '优待证优惠',
    image: 'https://ca.deppon.com.cn/ows/center/12.png',
    route: APP_ROUTES.memberCenter
  },
  {
    title: '体验调研',
    image: 'https://ca.deppon.com.cn/ows/center/13.png',
    route: APP_ROUTES.supportCenter,
    badge: 'HOT'
  },
  {
    title: '企业福利',
    image: 'https://ca.deppon.com.cn/ows/center/14.png',
    route: APP_ROUTES.memberCenter
  },
  {
    title: '实名认证',
    image: 'https://ca.deppon.com.cn/ows/center/15.png',
    route: APP_ROUTES.realNameCenter
  },
  {
    title: '学生专区',
    image: 'https://ca.deppon.com.cn/ows/center/16.png',
    route: APP_ROUTES.memberCenter
  },
  {
    title: '号码保护',
    image: 'https://ca.deppon.com.cn/ows/center/19.png',
    webSource: 'CUSTOMER_PHONE_PROTECT',
    login: true,
    badge: '上新'
  },
  {
    title: '入群有礼',
    image: 'https://ca.deppon.com.cn/ows/center/22.png',
    route: APP_ROUTES.memberCenter,
    badge: '福利'
  }
]

function getTotalRows(
  response: { status: boolean; result?: { totalRows: number } | null } | null
) {
  return response?.status && response.result ? response.result.totalRows : null
}

export async function queryMineOrderCounts(): Promise<MineOrderCounts> {
  const dateRange = orderService.getDateRange(90)
  const commonOptions = {
    role: 'sender' as const,
    pageIndex: 1,
    pageSize: 1,
    startTime: dateRange.startTime,
    endTime: dateRange.endTime
  }
  const [all, pickup, payment, transit, signed] = await Promise.all([
    orderService.queryList(commonOptions).catch(() => null),
    orderService
      .queryList({ ...commonOptions, orderStatus: 'RECEIPTING' })
      .catch(() => null),
    paymentService
      .queryPaymentList({ pageIndex: 1, pageSize: 1, status: 'UNPAID' })
      .catch(() => null),
    orderService
      .queryList({ ...commonOptions, orderStatus: 'IN_TRANSIT' })
      .catch(() => null),
    orderService
      .queryList({ ...commonOptions, orderStatus: 'SIGN' })
      .catch(() => null)
  ])

  return {
    all: getTotalRows(all),
    pickup: getTotalRows(pickup),
    payment: getTotalRows(payment),
    transit: getTotalRows(transit),
    signed: getTotalRows(signed)
  }
}

export function getMemberLevelAsset(levelCode = 0) {
  const level = Math.max(1, Math.min(5, Math.round(levelCode)))

  return `https://ca.deppon.com.cn/ows/assets/center2412/${level}.png`
}

export function getMemberRightsCount(levelCode = 0) {
  return [2, 2, 4, 6, 7, 9][Math.max(0, Math.min(5, levelCode))] ?? 2
}
