export const APP_ROUTES = {
  home: '/pages/home/index',
  login: '/pages/login/index',
  express: '/pages/express/index',
  expressSuccess: '/pages/express/success/index',
  expressInsurance: '/pages/express/insurance/index',
  priceQuery: '/pages/query/price/index',
  dispatchQuery: '/pages/query/dispatch/index',
  stationQuery: '/pages/query/stations/index',
  stationDetail: '/pages/query/stations/detail/index',
  goodsQuery: '/pages/query/goods/index',
  accountSettings: '/pages/account/settings/index',
  accountCancel: '/pages/account/cancel/index',
  realNameCenter: '/pages/realname/center/index',
  contactList: '/pages/contact/list/index',
  contactEdit: '/pages/contact/edit/index',
  orderList: '/pages/order/list/index',
  orderDetail: '/pages/order/detail/index',
  orderCancel: '/pages/order/cancel/index',
  orderStub: '/pages/order/stub/index',
  paymentList: '/pages/payment/list/index',
  couponList: '/pages/coupon/list/index',
  couponDetail: '/pages/coupon/detail/index',
  supportCenter: '/pages/support/center/index',
  customerCenter: '/pages/customer/center/index',
  signCode: '/pages/sign/code/index',
  ecardCenter: '/pages/ecard/center/index',
  memberCenter: '/pages/member/index/index',
  invoiceCenter: '/pages/invoice/index/index',
  invoiceApply: '/pages/invoice/apply/index',
  invoiceDetail: '/pages/invoice/detail/index',
  invoicePreview: '/pages/invoice/preview/index',
  invoiceTaxpayerList: '/pages/invoice/taxpayer/index',
  invoiceTaxpayerEdit: '/pages/invoice/taxpayer/edit/index',
  privacySettings: '/pages/privacy/settings/index',
  mine: '/pages/mine/index',
  web: '/pages/web/index'
} as const

export type AppRouteName = keyof typeof APP_ROUTES
export type AppRoutePath = (typeof APP_ROUTES)[AppRouteName]
export type AppMainRouteName = 'home' | 'express' | 'orderList' | 'mine'

export const APP_MAIN_NAVIGATION: Array<{
  name: AppMainRouteName
  title: string
  path: AppRoutePath
}> = [
  {
    name: 'home',
    title: '首页',
    path: APP_ROUTES.home
  },
  {
    name: 'express',
    title: '寄快递',
    path: APP_ROUTES.express
  },
  {
    name: 'orderList',
    title: '查快递',
    path: APP_ROUTES.orderList
  },
  {
    name: 'mine',
    title: '我的',
    path: APP_ROUTES.mine
  }
]
