import { type PropsWithChildren } from 'react'

import { View, type ViewStyle } from 'react-native'

import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { designPxToDp } from './AppDesignUnits'

interface AppElevatedViewProps extends PropsWithChildren {
  backgroundColor?: string
  /** 设计稿圆角，内部换算成 dp。 */
  borderRadius?: number
  /** 用多层低透明度圆角层模拟大半径软阴影（RN 0.73 的 elevation 只有硬边）。 */
  shadow?: boolean
  style?: ViewStyle
}

const SHADOW_LAYERS = [
  { color: APP_STYLE_COLORS.overlay.cardShadowSoft, spread: 18 },
  { color: APP_STYLE_COLORS.overlay.cardShadowMid, spread: 10 },
  { color: APP_STYLE_COLORS.overlay.cardShadowStrong, spread: 4 }
] as const

// 页面不能直接 import react-native，卡片阴影统一从这里出去。
export function AppElevatedView({ backgroundColor = APP_STYLE_COLORS.surface.card, borderRadius = 0, children, shadow = false, style }: AppElevatedViewProps) {
  const radius = designPxToDp(borderRadius)

  return (
    <View style={style}>
      {shadow &&
        SHADOW_LAYERS.map(layer => {
          const spread = designPxToDp(layer.spread)

          return (
            <View
              key={layer.spread}
              style={{
                position: 'absolute',
                top: -spread,
                right: -spread,
                bottom: -spread,
                left: -spread,
                backgroundColor: layer.color,
                borderRadius: radius + spread
              }}
            />
          )
        })}
      <View style={{ backgroundColor, borderRadius: radius, overflow: 'hidden' }}>{children}</View>
    </View>
  )
}
