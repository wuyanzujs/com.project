import { View } from '@tarojs/components'

import { useRef, type CSSProperties } from 'react'

import { Defs, LinearGradient as SvgLinearGradient, Rect, Stop, Svg } from 'react-native-svg'

interface AppLinearGradientProps {
  className?: string
  colors: string[]
  end?: { x: number; y: number }
  /** 与 colors 等长的停点序列（0~1），缺省均匀分布。 */
  locations?: number[]
  start?: { x: number; y: number }
  style?: CSSProperties
}

let gradientSeq = 0

// RN 无 CSS 渐变，SVG 铺底是不引入原生模块的唯一方案；调用方 className 与 style 由 Taro View 解析。
export function AppLinearGradient({ className, colors, end = { x: 1, y: 0 }, locations, start = { x: 0, y: 0 }, style }: AppLinearGradientProps) {
  const id = useRef(`app-linear-gradient-${(gradientSeq += 1)}`).current
  const offsets = locations ?? colors.map((_, index) => index / (colors.length - 1))

  return (
    <View style={style}>
      <Svg height='100%' width='100%'>
        <Defs>
          <SvgLinearGradient id={id} x1={start.x} x2={end.x} y1={start.y} y2={end.y}>
            {offsets.map((offset, index) => (
              <Stop key={index} offset={String(offset)} stopColor={colors[index]} />
            ))}
          </SvgLinearGradient>
        </Defs>
        <Rect fill={`url(#${id})`} height='100%' width='100%' />
      </Svg>
    </View>
  )
}
