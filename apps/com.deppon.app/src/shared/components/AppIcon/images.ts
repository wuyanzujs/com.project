// 生产端部分箭头是 CDN 位图（与 AppIcon 字体图标并存），地址统一在此维护，勿在组件内重复定义。
export const APP_IMAGE_ICONS = {
  /** 行尾通用灰色右箭头。 */
  arrowRightGrey: 'https://ca.deppon.com.cn/ows/assets/common/next_grey_100.png',
  /** 「明细」展开箭头（展开时旋转 180° 指向下）。 */
  arrowUpGrey: 'https://ca.deppon.com.cn/ows/assets/common/up_grey_100.png',
  /** 期望上门时间弹窗里夜揽时段的月亮角标（mp 同源资产）。 */
  nightPickupMoon: 'https://ca.deppon.com.cn/ows/assets/express/16.png'
} as const
