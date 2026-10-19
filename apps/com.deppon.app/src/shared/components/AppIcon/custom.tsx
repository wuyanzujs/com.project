import { Circle, Path, Svg } from 'react-native-svg'

import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import type { LucideProps } from 'lucide-react-native'

// 自定义图标与 lucide 组件保持相同的属性约定。
// AppIcon 已将 size 换算为 dp，此处直接使用，避免重复换算。
// size 和 color 保持 LucideProps 的类型，便于注册到 APP_ICONS。
interface AppCustomIconProps {
  color?: LucideProps['color']
  size?: string | number
  strokeWidth?: string | number
}

/**
 *
 * @param color 线条颜色
 * @param size 图标尺寸（dp）
 * @param strokeWidth 线宽
 * @description 分享图标：弯尾前转箭头。
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
 * @param size 图标尺寸（dp）
 * @param strokeWidth 线宽
 * @description 设置图标：圆角六角螺母与中心圆环。
 */
export function NutIcon({ color = APP_STYLE_COLORS.text.heading, size = 24, strokeWidth = 2.3 }: AppCustomIconProps) {
  return (
    <Svg fill='none' height={Number(size)} viewBox='0 0 24 24' width={Number(size)}>
      <Path d='M21.55 12 16.78 20.1 7.22 20.1 2.45 12 7.22 3.9 16.78 3.9Z' stroke={color} strokeLinejoin='round' strokeWidth={Number(strokeWidth)} />
      <Circle cx={12} cy={12} r={2.95} stroke={color} strokeWidth={2.2} />
    </Svg>
  )
}
