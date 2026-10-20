import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { appendRouteQuery } from '@/shared/navigation/routeUrl'
import { APP_WEB_TARGETS } from '@/shared/webview/appWeb'

import { supportApi } from './support.api'
import { getCurrentEcoToken } from '../auth'

import type { SupportEntryView, SupportSectionView, SupportSurveyConfig } from './types'

type SurveyConfigList = SupportSurveyConfig[]

/**
 *
 * @param path 网页 path
 * @param source 来源标识
 * @description 拼带 token 的安全 WebView 路径
 */
function createSecureWebPath(path: string, source: string) {
  return appendRouteQuery(path, {
    sonSource: source,
    ecoToken: getCurrentEcoToken(),
    pageSource: APP_RUNTIME_CONFIG.systemCode
  })
}

/**
 *
 * @param item 问卷配置
 * @description 判断问卷配置是否可用
 */
function isValidSurveyConfig(item: SupportSurveyConfig): item is Required<Pick<SupportSurveyConfig, 'url'>> & SupportSurveyConfig {
  return typeof item.url === 'string' && item.url.trim().startsWith('https://')
}

/**
 *
 * @param item 问卷配置
 * @param index 问卷序号
 * @description 转问卷入口展示数据
 */
function mapSurveyConfigToEntry(item: SupportSurveyConfig, index: number): SupportEntryView {
  return {
    id: `survey-${index}`,
    title: index === 0 ? '体验调研' : `体验调研 ${index + 1}`,
    summary: '参与服务体验问卷，帮助我们优化寄件体验。',
    kind: 'web',
    tone: 'primary',
    webSource: 'SUPPORT_SURVEY',
    webUri: item.url,
    loginRequired: false
  }
}

export const supportService = {
  /**
   *
   * @param path 网页 path
   * @param source 来源标识
   * @description 创建带 token 的安全 WebView 路径
   */
  createSecureWebUri(path: string, source = 'APP_SUPPORT_CENTER') {
    return createSecureWebPath(path, source)
  },

  /**
   *
   * @description 查询配置中心下发的问卷入口
   */
  async querySurveyEntries(): Promise<SupportEntryView[]> {
    try {
      const response = await supportApi.fetchSwitchConfig<SurveyConfigList>(APP_RUNTIME_CONFIG.supportSurveyConfigKey, false)

      if (!response.status || !response.result?.length) {
        return []
      }

      return response.result.filter(isValidSurveyConfig).map(mapSurveyConfigToEntry)
    } catch {
      return []
    }
  },

  /**
   *
   * @param surveyEntries 问卷入口列表
   * @description 组装支持中心分区列表
   */
  getSections(surveyEntries: SupportEntryView[] = []): SupportSectionView[] {
    return [
      {
        title: '常用服务',
        summary: '',
        entries: [
          {
            id: 'express',
            icon: 'packagePlus',
            title: '我要寄件',
            summary: '',
            kind: 'route',
            tone: 'primary',
            route: APP_ROUTES.express
          },
          {
            id: 'price',
            icon: 'clock',
            title: '运费时效',
            summary: '',
            kind: 'route',
            tone: 'primary',
            route: APP_ROUTES.priceQuery
          },
          {
            id: 'invoice',
            icon: 'receipt',
            title: '开具发票',
            summary: '',
            kind: 'route',
            tone: 'primary',
            route: APP_ROUTES.invoiceCenter,
            loginRequired: true
          },
          {
            id: 'station',
            icon: 'building',
            title: '网点查询',
            summary: '',
            kind: 'route',
            tone: 'primary',
            route: APP_ROUTES.stationQuery
          },
          {
            id: 'goods',
            icon: 'shieldCheck',
            title: '收寄标准',
            summary: '',
            kind: 'route',
            tone: 'primary',
            route: APP_ROUTES.goodsQuery
          }
        ]
      },
      {
        title: '售后服务',
        summary: '',
        entries: [
          {
            id: 'complaint',
            icon: 'shieldAlert',
            title: '我要投诉',
            summary: '快件时效/服务/费用相关问题',
            kind: 'web',
            tone: 'warning',
            webSource: 'SUPPORT_COMPLAINT',
            webPath: APP_WEB_TARGETS.SUPPORT_COMPLAINT.url,
            webParamSource: 'APP_SUPPORT_CENTER',
            loginRequired: true
          },
          {
            id: 'claim',
            icon: 'fileCheck',
            title: '我要理赔',
            summary: '快件丢了、坏了怎么办',
            kind: 'web',
            tone: 'warning',
            webSource: 'SUPPORT_CLAIM',
            webPath: APP_WEB_TARGETS.SUPPORT_CLAIM.url,
            webParamSource: 'APP_SUPPORT_CENTER',
            loginRequired: true
          },
          {
            id: 'complaint-record',
            icon: 'clock',
            title: '投诉进展',
            summary: '',
            kind: 'web',
            tone: 'neutral',
            webSource: 'SUPPORT_COMPLAINT_RECORD',
            webPath: APP_WEB_TARGETS.SUPPORT_COMPLAINT_RECORD.url,
            webParamSource: 'APP_SUPPORT_CENTER',
            loginRequired: true
          },
          {
            id: 'claim-processing',
            icon: 'wallet',
            title: '理赔进展',
            summary: '',
            kind: 'web',
            tone: 'neutral',
            webSource: 'SUPPORT_CLAIM_PROCESSING',
            webPath: APP_WEB_TARGETS.SUPPORT_CLAIM_PROCESSING.url,
            webParamSource: 'APP_SUPPORT_CENTER',
            loginRequired: true
          }
        ]
      },
      ...(surveyEntries.length
        ? [
            {
              title: '体验反馈',
              summary: '',
              entries: surveyEntries
            }
          ]
        : []),
      {
        title: '帮助中心',
        summary: '',
        entries: [
          {
            id: 'urge',
            title: '我要催促快件',
            summary: '在订单详情一键催单',
            kind: 'route',
            tone: 'primary',
            badgeText: 'HOT',
            route: APP_ROUTES.orderList,
            loginRequired: true
          },
          {
            id: 'courier-phone',
            title: '收派员电话多少',
            summary: '查看派送员联系方式',
            kind: 'route',
            tone: 'primary',
            badgeText: 'HOT',
            route: APP_ROUTES.courierList,
            loginRequired: true
          },
          {
            id: 'cancel-order',
            title: '怎么取消订单？',
            summary: '在订单列表取消未取件订单',
            kind: 'route',
            tone: 'primary',
            badgeText: 'HOT',
            route: APP_ROUTES.orderList,
            loginRequired: true
          },
          {
            id: 'billing-rule',
            title: '寄件计费规则？',
            summary: '体积重量与实际重量的换算',
            kind: 'route',
            tone: 'primary',
            route: APP_ROUTES.priceQuery
          },
          {
            id: 'payment-ways',
            title: '支付运费的方式有哪些？',
            summary: '寄付现结、到付、月结可选',
            kind: 'route',
            tone: 'primary',
            route: APP_ROUTES.priceQuery
          },
          {
            id: 'pickup',
            title: '需要快递员上门取件',
            summary: '下单时选择上门取件时间',
            kind: 'route',
            tone: 'primary',
            route: APP_ROUTES.express
          },
          {
            id: 'modify-address',
            title: '如何更改快件的地址(转寄)',
            summary: '下单后可申请改址转寄',
            kind: 'web',
            tone: 'primary',
            webSource: 'ORDER_DETAIL_WAYBILL_MODIFY',
            webPath: APP_WEB_TARGETS.ORDER_DETAIL_WAYBILL_MODIFY.url,
            webParamSource: 'APP_SUPPORT_CENTER',
            loginRequired: true
          },
          {
            id: 'missing-waybill',
            title: '为什么找不到运单',
            summary: '按运单号在订单列表查询',
            kind: 'route',
            tone: 'primary',
            route: APP_ROUTES.orderList,
            loginRequired: true
          }
        ]
      }
    ]
  }
}
