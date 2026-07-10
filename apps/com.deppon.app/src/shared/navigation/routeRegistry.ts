export const APP_ROUTE_DEFINITIONS = [
  {
    name: 'home',
    title: '寄件',
    path: 'pages/home/index',
    main: true
  },
  {
    name: 'login',
    title: '登录',
    path: 'pages/login/index'
  },
  {
    name: 'express',
    title: '寄快递',
    path: 'pages/express/index'
  },
  {
    name: 'expressSuccess',
    title: '下单成功',
    path: 'pages/express/success/index'
  },
  {
    name: 'batchExpress',
    title: '批量寄',
    path: 'pages/batch/index',
    loginRequired: true
  },
  {
    name: 'expressTemplateList',
    title: '寄件模板',
    path: 'pages/express/template/list/index',
    loginRequired: true
  },
  {
    name: 'expressTemplateCreate',
    title: '保存寄件模板',
    path: 'pages/express/template/create/index',
    loginRequired: true
  },
  {
    name: 'expressInsurance',
    title: '保价说明',
    path: 'pages/express/insurance/index'
  },
  {
    name: 'priceQuery',
    title: '价格时效',
    path: 'pages/query/price/index'
  },
  {
    name: 'dispatchQuery',
    title: '收派范围',
    path: 'pages/query/dispatch/index'
  },
  {
    name: 'stationQuery',
    title: '网点查询',
    path: 'pages/query/stations/index'
  },
  {
    name: 'stationDetail',
    title: '网点详情',
    path: 'pages/query/stations/detail/index'
  },
  {
    name: 'goodsQuery',
    title: '货物查询',
    path: 'pages/query/goods/index'
  },
  {
    name: 'accountSettings',
    title: '账号设置',
    path: 'pages/account/settings/index',
    loginRequired: true
  },
  {
    name: 'accountCancel',
    title: '注销账号',
    path: 'pages/account/cancel/index',
    loginRequired: true
  },
  {
    name: 'realNameCenter',
    title: '实名认证',
    path: 'pages/realname/center/index',
    loginRequired: true
  },
  {
    name: 'contactList',
    title: '地址簿',
    path: 'pages/contact/list/index'
  },
  {
    name: 'contactEdit',
    title: '编辑地址',
    path: 'pages/contact/edit/index'
  },
  {
    name: 'courierList',
    title: '专属快递员',
    path: 'pages/courier/list/index',
    loginRequired: true
  },
  {
    name: 'courierDetail',
    title: '快递员详情',
    path: 'pages/courier/detail/index',
    loginRequired: true
  },
  {
    name: 'orderList',
    title: '查快递',
    path: 'pages/order/list/index',
    main: true,
    loginRequired: true
  },
  {
    name: 'orderDetail',
    title: '订单详情',
    path: 'pages/order/detail/index'
  },
  {
    name: 'orderEdit',
    title: '修改订单',
    path: 'pages/order/edit/index',
    loginRequired: true
  },
  {
    name: 'orderSubscriptions',
    title: '关注运单',
    path: 'pages/order/subscriptions/index',
    loginRequired: true
  },
  {
    name: 'orderCancel',
    title: '取消订单',
    path: 'pages/order/cancel/index'
  },
  {
    name: 'orderStub',
    title: '电子存根',
    path: 'pages/order/stub/index',
    loginRequired: true
  },
  {
    name: 'paymentList',
    title: '待支付',
    path: 'pages/payment/list/index',
    loginRequired: true
  },
  {
    name: 'printCenter',
    title: '面单打印',
    path: 'pages/print/index',
    loginRequired: true
  },
  {
    name: 'couponList',
    title: '优惠券',
    path: 'pages/coupon/list/index',
    loginRequired: true
  },
  {
    name: 'couponDetail',
    title: '优惠券详情',
    path: 'pages/coupon/detail/index',
    loginRequired: true
  },
  {
    name: 'supportCenter',
    title: '客服中心',
    path: 'pages/support/center/index'
  },
  {
    name: 'customerCenter',
    title: '客户中心',
    path: 'pages/customer/center/index',
    loginRequired: true
  },
  {
    name: 'signCode',
    title: '签收码',
    path: 'pages/sign/code/index',
    loginRequired: true
  },
  {
    name: 'ecardCenter',
    title: '德邦 E 卡',
    path: 'pages/ecard/center/index',
    loginRequired: true
  },
  {
    name: 'memberCenter',
    title: '福利',
    path: 'pages/member/index/index',
    main: true,
    loginRequired: true
  },
  {
    name: 'invoiceCenter',
    title: '发票中心',
    path: 'pages/invoice/index/index',
    loginRequired: true
  },
  {
    name: 'invoiceApply',
    title: '申请发票',
    path: 'pages/invoice/apply/index',
    loginRequired: true
  },
  {
    name: 'invoiceDetail',
    title: '发票详情',
    path: 'pages/invoice/detail/index',
    loginRequired: true
  },
  {
    name: 'invoicePreview',
    title: '发票预览',
    path: 'pages/invoice/preview/index',
    loginRequired: true
  },
  {
    name: 'invoiceTaxpayerList',
    title: '发票抬头',
    path: 'pages/invoice/taxpayer/index',
    loginRequired: true
  },
  {
    name: 'invoiceTaxpayerEdit',
    title: '编辑发票抬头',
    path: 'pages/invoice/taxpayer/edit/index',
    loginRequired: true
  },
  {
    name: 'privacySettings',
    title: '隐私设置',
    path: 'pages/privacy/settings/index',
    loginRequired: true
  },
  {
    name: 'mine',
    title: '我的',
    path: 'pages/mine/index',
    main: true
  },
  {
    name: 'web',
    title: 'WebView',
    path: 'pages/web/index'
  }
] as const

export type AppRouteDefinition = (typeof APP_ROUTE_DEFINITIONS)[number]
export type AppRouteName = AppRouteDefinition['name']
export type AppRoutePath = `/${AppRouteDefinition['path']}`
export type AppMainRouteName = Extract<
  AppRouteDefinition,
  { main: true }
>['name']

export const APP_PAGE_PATHS = APP_ROUTE_DEFINITIONS.map(item => item.path)

export const APP_LOGIN_ROUTE_PATHS = APP_ROUTE_DEFINITIONS.filter(
  item => 'loginRequired' in item && item.loginRequired
).map(item => `/${item.path}` as AppRoutePath)
