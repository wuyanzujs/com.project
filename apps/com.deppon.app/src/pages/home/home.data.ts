import { APP_ROUTES, type AppRoutePath } from '../../shared/navigation/routes'

export interface HomeQuickAction {
  key: string
  label: string
  description: string
  route: AppRoutePath | string
  tone: 'primary' | 'success' | 'warning' | 'neutral'
}

export interface HomeServiceCard {
  key: string
  title: string
  summary: string
  route?: AppRoutePath | string
}

export const HOME_QUICK_ACTIONS: HomeQuickAction[] = [
  {
    key: 'send',
    label: '寄快递',
    description: '下单寄件与地址填写',
    route: APP_ROUTES.express,
    tone: 'primary'
  },
  {
    key: 'query',
    label: '查快递',
    description: '订单轨迹与运单查询',
    route: APP_ROUTES.orderList,
    tone: 'success'
  },
  {
    key: 'price',
    label: '查价格',
    description: '时效、价格和产品预估',
    route: APP_ROUTES.priceQuery,
    tone: 'warning'
  },
  {
    key: 'dispatch',
    label: '收派范围',
    description: '查询快递与零担覆盖',
    route: APP_ROUTES.dispatchQuery,
    tone: 'neutral'
  },
  {
    key: 'station',
    label: '查网点',
    description: '查附近营业部信息',
    route: APP_ROUTES.stationQuery,
    tone: 'success'
  },
  {
    key: 'goods',
    label: '禁寄查询',
    description: '确认货物收寄限制',
    route: APP_ROUTES.goodsQuery,
    tone: 'warning'
  }
]

export const HOME_SERVICE_CARDS: HomeServiceCard[] = [
  {
    key: 'order',
    title: '订单中心',
    summary: '首期承接订单列表、基础详情和物流轨迹。'
  },
  {
    key: 'member',
    title: '会员权益',
    summary: '查看会员等级、成长值、积分和福利中心。',
    route: APP_ROUTES.memberCenter
  },
  {
    key: 'support',
    title: '客服中心',
    summary: '在线客服、95353 热线、投诉理赔和自助查询统一承接。',
    route: APP_ROUTES.supportCenter
  }
]
