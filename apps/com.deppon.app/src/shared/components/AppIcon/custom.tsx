import { Circle, Path, Svg } from 'react-native-svg'

import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import type { LucideProps } from 'lucide-react-native'

// lucide 里没有与生产端一致的两个头部图标造型（弯尾前转箭头 / 六角螺母），
// 这里按生产端渲染矢量自绘，接口与 lucide 组件对齐（color/size/strokeWidth）。
// 注意 AppIcon 注册入口传入的 size 已经是 dp（入口做过设计稿 px → dp 换算），
// 与 lucide 组件同约定，这里直接使用，不能再换算一次；路径按 24 视窗尽量铺满生产端字形比例。
// 注意 LucideProps.size 是 string | number、color 是 ColorValue，这里的 props 保持同构以便注册进 APP_ICONS。
interface AppCustomIconProps {
  color?: LucideProps['color']
  size?: string | number
  strokeWidth?: string | number
}

/**
 *
 * @param color 线条颜色
 * @param size 设计稿 px（750 基准）
 * @param strokeWidth 线宽
 * @description 生产端「分享」图标：弯月形宽尾带与右侧大三角箭头一体的闭合轮廓，
 * 尾带下缘与箭头左下边之间留白缺口，按生产端逐行扫描比例重建（含尾带末端小圆钩）。
 */
export function ForwardIcon({ color = APP_STYLE_COLORS.text.heading, size = 24, strokeWidth = 2.1 }: AppCustomIconProps) {
  return (
    <Svg fill='none' height={Number(size)} viewBox='0 0 24 24' width={Number(size)}>
      <Path
        d='M12.3 3.1 20.9 10.9 12.3 19.7 12.2 14.9C9.5 16 7.3 16.9 4.9 18.3C4.7 19.9 3.3 20.2 2.9 18.2C2.9 15 4 10.4 6.6 8.9C8.4 8.2 10.2 8 12.2 8Z'
        stroke={color}
        strokeLinejoin='round'
        strokeWidth={Number(strokeWidth)}
      />
    </Svg>
  )
}

/**
 *
 * @param color 线条颜色
 * @param size 设计稿 px（750 基准）
 * @param strokeWidth 线宽
 * @description 生产端「设置」图标：圆角六角螺母轮廓 + 中心加粗圆环
 */
export function NutIcon({ color = APP_STYLE_COLORS.text.heading, size = 24, strokeWidth = 2.3 }: AppCustomIconProps) {
  return (
    <Svg fill='none' height={Number(size)} viewBox='0 0 24 24' width={Number(size)}>
      <Path d='M21.55 12 16.78 20.1 7.22 20.1 2.45 12 7.22 3.9 16.78 3.9Z' stroke={color} strokeLinejoin='round' strokeWidth={Number(strokeWidth)} />
      <Circle cx={12} cy={12} r={2.95} stroke={color} strokeWidth={2.2} />
    </Svg>
  )
}
