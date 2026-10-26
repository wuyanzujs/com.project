// 页面直接以 <Image> 引用的 CDN 位图（行箭头、角标等装饰图），不走 AppIcon 渲染。
export const APP_IMAGE_ICONS = {
  /** 行尾通用灰色右箭头。 */
  arrowRightGrey: 'https://ca.deppon.com.cn/ows/assets/common/next_grey_100.png',
  /** 计费规则等蓝色链接右箭头。 */
  arrowRightBlue: 'https://ca.deppon.com.cn/ows/assets/common/next_blue_08.png',
  /** 「明细」展开箭头（展开时旋转 180° 指向下）。 */
  arrowUpGrey: 'https://ca.deppon.com.cn/ows/assets/common/up_grey_100.png',
  /** 期望上门时间弹窗中夜间揽收时段的月亮角标。 */
  nightPickupMoon: 'https://ca.deppon.com.cn/ows/assets/express/16.png',
  /** 保价横幅的琥珀色盾牌（生产同源 CDN 资产）。 */
  insuranceFullShield: 'https://ca.deppon.com.cn/ows/insurance/2.png',
  /** 基础保行首的蓝勾盾牌。 */
  insuranceBasicShield: 'https://ca.deppon.com.cn/ows/assets/express/34.png'
} as const
