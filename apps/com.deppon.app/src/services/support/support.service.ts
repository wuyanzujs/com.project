import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'
import { APP_ROUTES } from '../../shared/navigation/routes'
import { getCurrentEcoToken } from '../auth'

import type { SupportSectionView } from './types'

function createQuery(params: Record<string, string>) {
  return Object.entries(params)
    .filter(([, value]) => value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
}

function createSecureWebPath(path: string, source: string) {
  const query = createQuery({
    sonSource: source,
    ecoToken: getCurrentEcoToken(),
    pageSource: APP_RUNTIME_CONFIG.systemCode
  })

  return query ? `${path}?${query}` : path
}

export const supportService = {
  createSecureWebUri(path: string, source = 'APP_SUPPORT_CENTER') {
    return createSecureWebPath(path, source)
  },

  getSections(): SupportSectionView[] {
    return [
      {
        title: '即时服务',
        summary: '客服和热线优先承接高频咨询。',
        entries: [
          {
            id: 'online-service',
            title: '在线客服',
            summary: '进入 App WebView 客服会话',
            kind: 'web',
            tone: 'primary',
            badgeText: 'WebView',
            webSource: 'SUPPORT_ONLINE_SERVICE'
          },
          {
            id: 'service-hotline',
            title: '95353 热线',
            summary: '通过系统电话发起呼叫',
            kind: 'phone',
            tone: 'success',
            badgeText: '电话',
            phoneNumber: '95353'
          }
        ]
      },
      {
        title: '售后处理',
        summary: '投诉、理赔先以 H5 承接，状态机后续再拆原生页。',
        entries: [
          {
            id: 'complaint',
            title: '投诉',
            summary: '提交或查看服务投诉',
            kind: 'web',
            tone: 'warning',
            badgeText: '需登录',
            webSource: 'SUPPORT_COMPLAINT',
            webPath: '/depponmobile/complaint/list',
            webParamSource: 'APP_SUPPORT_CENTER',
            loginRequired: true
          },
          {
            id: 'claim',
            title: '在线理赔',
            summary: '申请货损货差理赔',
            kind: 'web',
            tone: 'neutral',
            badgeText: '需登录',
            webSource: 'SUPPORT_CLAIM',
            webPath: '/depponmobile/h5/index#/claimPackagePages/index',
            webParamSource: 'APP_SUPPORT_CENTER',
            loginRequired: true
          }
        ]
      },
      {
        title: '自助查询',
        summary: '把旧服务查询入口拆成 App 内可用工具。',
        entries: [
          {
            id: 'dispatch',
            title: '收派范围',
            summary: '查询快递与零担覆盖',
            kind: 'route',
            tone: 'primary',
            route: APP_ROUTES.dispatchQuery
          },
          {
            id: 'station',
            title: '网点查询',
            summary: '查询营业部地址和电话',
            kind: 'route',
            tone: 'success',
            route: APP_ROUTES.stationQuery
          },
          {
            id: 'price',
            title: '价格时效',
            summary: '预估价格、时效和产品',
            kind: 'route',
            tone: 'warning',
            route: APP_ROUTES.priceQuery
          },
          {
            id: 'goods',
            title: '货物查询',
            summary: '查询禁寄限制和寄递提示',
            kind: 'route',
            tone: 'neutral',
            route: APP_ROUTES.goodsQuery
          },
          {
            id: 'orders',
            title: '订单列表',
            summary: '查询寄件、收件和轨迹',
            kind: 'route',
            tone: 'neutral',
            badgeText: '需登录',
            route: APP_ROUTES.orderList,
            loginRequired: true
          }
        ]
      }
    ]
  }
}
