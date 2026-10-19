// CDN 位图地址集中维护，避免在组件内重复定义。
export const APP_IMAGE_ICONS = {
  /** 行尾通用灰色右箭头。 */
  arrowRightGrey: 'https://ca.deppon.com.cn/ows/assets/common/next_grey_100.png',
  /** 「明细」展开箭头（展开时旋转 180° 指向下）。 */
  arrowUpGrey: 'https://ca.deppon.com.cn/ows/assets/common/up_grey_100.png',
  /** 期望上门时间弹窗中夜间揽收时段的月亮角标。 */
  nightPickupMoon: 'https://ca.deppon.com.cn/ows/assets/express/16.png'
} as const
