import { APP_ROUTES, type AppRoutePath } from '../../shared/navigation/routes'

export interface HomeQuickAction {
  key: string
  label: string
  image: string
  route: AppRoutePath
  badge?: string
  imageSize?: 'large' | 'normal'
  behavior?: 'scan'
}

export const HOME_QUICK_ACTIONS: HomeQuickAction[] = [
  {
    key: 'scan-send',
    label: '扫码寄',
    image: 'https://ca.deppon.com.cn/ows/assets/home/3.png',
    route: APP_ROUTES.express,
    behavior: 'scan'
  },
  {
    key: 'same-day',
    label: '当日达',
    image: 'https://ca.deppon.com.cn/ows/assets/home/4.png',
    route: APP_ROUTES.express
  },
  {
    key: 'batch',
    label: '批量寄件',
    image: 'https://ca.deppon.com.cn/ows/assets/home/5.png',
    route: APP_ROUTES.batchExpress
  },
  {
    key: 'international',
    label: '寄国际',
    image: 'https://ca.deppon.com.cn/ows/assets/home/6.png',
    route: APP_ROUTES.express
  },
  {
    key: 'campus-send',
    label: '校园寄',
    image: 'https://ca.deppon.com.cn/ows/assets/home/14.png',
    route: APP_ROUTES.express
  },
  {
    key: 'online-return',
    label: '网购退货',
    image: 'https://mascdn.deppon.com/h5/img/2024/banner/1022-return.gif',
    imageSize: 'large',
    badge: '低至7折',
    route: APP_ROUTES.express
  },
  {
    key: 'collection',
    label: '代收货款',
    image: 'https://ca.deppon.com.cn/ows/assets/home/8.png',
    route: APP_ROUTES.customerCenter
  },
  {
    key: 'industry',
    label: '工业大件',
    image: 'https://ca.deppon.com.cn/ows/assets/home/35.png',
    route: APP_ROUTES.express
  },
  {
    key: 'entrusted-send',
    label: '委托寄件',
    image: 'https://ca.deppon.com.cn/ows/assets/home/10.png',
    route: APP_ROUTES.express
  },
  {
    key: 'student',
    label: '学生专享',
    image: 'https://ca.deppon.com.cn/ows/assets/home/11.png',
    route: APP_ROUTES.memberCenter
  },
  {
    key: 'recycle',
    label: '旧衣回收',
    image: 'https://ca.deppon.com.cn/ows/assets/home/43.png',
    route: APP_ROUTES.supportCenter
  },
  {
    key: 'ecard',
    label: '储值卡',
    image: 'https://ca.deppon.com.cn/ows/assets/home/13.png',
    route: APP_ROUTES.ecardCenter
  },
  {
    key: 'luggage',
    label: '发行李',
    image: 'https://ca.deppon.com.cn/ows/assets/home/37.png',
    route: APP_ROUTES.express
  },
  {
    key: 'moving',
    label: '家庭搬家',
    image: 'https://ca.deppon.com.cn/ows/assets/home/15.png',
    route: APP_ROUTES.express
  },
  {
    key: 'price',
    label: '查价格',
    image: 'https://ca.deppon.com.cn/ows/assets/home/21.png',
    route: APP_ROUTES.priceQuery
  },
  {
    key: 'station',
    label: '查网点',
    image: 'https://ca.deppon.com.cn/ows/assets/home/22.png',
    route: APP_ROUTES.stationQuery
  },
  {
    key: 'goods',
    label: '禁寄查询',
    image: 'https://ca.deppon.com.cn/ows/assets/home/24.png',
    route: APP_ROUTES.goodsQuery
  },
  {
    key: 'contact',
    label: '地址簿',
    image: 'https://ca.deppon.com.cn/ows/assets/center2412/17.png',
    route: APP_ROUTES.contactList
  },
  {
    key: 'courier',
    label: '专属快递员',
    image: 'https://ca.deppon.com.cn/ows/assets/center2412/19.png',
    route: APP_ROUTES.courierList
  },
  {
    key: 'print',
    label: '面单打印',
    image: 'https://ca.deppon.com.cn/ows/center/8.png',
    route: APP_ROUTES.printCenter
  },
  {
    key: 'coupon',
    label: '优惠券',
    image: 'https://ca.deppon.com.cn/ows/assets/center2412/40.png',
    route: APP_ROUTES.couponList
  },
  {
    key: 'invoice',
    label: '发票申请',
    image: 'https://ca.deppon.com.cn/ows/assets/center2412/21.png',
    route: APP_ROUTES.invoiceCenter
  },
  {
    key: 'customer',
    label: '客户中心',
    image: 'https://ca.deppon.com.cn/ows/center/1.png',
    route: APP_ROUTES.customerCenter
  },
  {
    key: 'realname',
    label: '实名认证',
    image: 'https://ca.deppon.com.cn/ows/center/15.png',
    route: APP_ROUTES.realNameCenter
  }
]
