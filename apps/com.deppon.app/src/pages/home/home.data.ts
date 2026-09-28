import { APP_ROUTES, type AppRoutePath } from '@/shared/navigation/routes'

export interface HomeQuickAction {
  key: string
  label: string
  desc?: string
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
    desc: '轻松扫码，即日出发',
    image: 'https://ca.deppon.com.cn/ows/assets/home/3.png',
    route: APP_ROUTES.express,
    behavior: 'scan'
  },
  {
    key: 'batch',
    label: '批量寄件',
    desc: '提高效率，快速寄多件',
    image: 'https://ca.deppon.com.cn/ows/assets/home/5.png',
    route: APP_ROUTES.batchExpress
  },
  {
    key: 'student',
    label: '学生专区',
    desc: '学生注册，月月福利',
    image: 'https://ca.deppon.com.cn/ows/assets/home/11.png',
    route: APP_ROUTES.memberCenter
  },
  {
    key: 'campus-send',
    label: '校园寄',
    desc: '师生寄递，德邦相伴',
    image: 'https://ca.deppon.com.cn/ows/assets/home/14.png',
    route: APP_ROUTES.express
  },
  {
    key: 'online-return',
    label: '网购退货',
    desc: '7折起，大件轻松退',
    image: 'https://mascdn.deppon.com/h5/img/2024/banner/1022-return.gif',
    imageSize: 'large',
    route: APP_ROUTES.express
  },
  {
    key: 'ecard',
    label: '储值卡',
    desc: '一次充值，次次省钱',
    image: 'https://ca.deppon.com.cn/ows/assets/home/13.png',
    route: APP_ROUTES.ecardCenter
  },
  {
    key: 'collection',
    label: '代收货款',
    desc: '快速退款，安全到账',
    image: 'https://ca.deppon.com.cn/ows/assets/home/8.png',
    route: APP_ROUTES.customerCenter
  },
  {
    key: 'industry',
    label: '工业大件',
    desc: '全程可视，不止安全',
    image: 'https://ca.deppon.com.cn/ows/assets/home/35.png',
    route: APP_ROUTES.express
  },
  {
    key: 'international',
    label: '寄国际',
    desc: '全球220+国 轻松触达',
    image: 'https://ca.deppon.com.cn/ows/assets/home/6.png',
    route: APP_ROUTES.express
  },
  {
    key: 'hongkong-macao-taiwan',
    label: '港澳台',
    desc: '专业清关，省心省时',
    image: 'https://ca.deppon.com.cn/ows/assets/home/48.png',
    route: APP_ROUTES.express
  },
  {
    key: 'entrusted-send',
    label: '委托寄件',
    desc: '专注嘱托，保护隐私',
    image: 'https://ca.deppon.com.cn/ows/assets/home/10.png',
    route: APP_ROUTES.express
  },
  {
    key: 'recycle',
    label: '旧衣回收',
    desc: '回收利旧，不止于爱',
    image: 'https://ca.deppon.com.cn/ows/assets/home/43.png',
    route: APP_ROUTES.supportCenter
  },
  {
    key: 'luggage',
    label: '行李搬家',
    desc: '行李寄递，轻松出行',
    image: 'https://ca.deppon.com.cn/ows/assets/home/37.png',
    route: APP_ROUTES.express
  },
  {
    key: 'skiing',
    label: '雪具达',
    desc: '直达雪场，专业包装',
    image: 'https://ca.deppon.com.cn/ows/assets/home/45.gif',
    imageSize: 'large',
    route: APP_ROUTES.express
  },
  {
    key: 'exhibition',
    label: '展会寄',
    desc: '专业送展  撤展无忧',
    image: 'https://ca.deppon.com.cn/ows/assets/home/52.png',
    route: APP_ROUTES.express
  }
]
