import type { PropsWithChildren } from 'react'
import { useMemo, useRef } from 'react'

import { Animated, PanResponder, View } from 'react-native'

import { designPxToDp } from './AppDesignUnits'

interface AppNativeDraggableProps extends PropsWithChildren {
  /** 允许向上拖动的最大设计稿 px。 */
  maxUp?: number
  /** 允许向下拖动的最大设计稿 px。 */
  maxDown?: number
}

/**
 * @description 右侧停靠浮窗的上下拖动基件：只有纵向位移超过触碰阈值才接管手势，
 * 轻点仍交给内部按钮，与生产端「客服浮窗可贴着右边缘上下滑动」一致。
 */
export function AppNativeDraggable({ children, maxDown = 40, maxUp = 520 }: AppNativeDraggableProps) {
  const translateY = useRef(new Animated.Value(0)).current
  const offset = useRef(0)
  const limits = useMemo(() => ({ up: -designPxToDp(maxUp), down: designPxToDp(maxDown) }), [maxDown, maxUp])

  const responder = useMemo(() => {
    const clamp = (value: number) => Math.min(limits.down, Math.max(limits.up, value))

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        translateY.stopAnimation()
        translateY.setOffset(offset.current)
        translateY.setValue(0)
      },
      onPanResponderMove: (_event, gesture) => {
        translateY.setValue(clamp(offset.current + gesture.dy) - offset.current)
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_event, gesture) => {
        const next = clamp(offset.current + gesture.dy)

        offset.current = next
        translateY.flattenOffset()
        Animated.timing(translateY, {
          toValue: next,
          duration: 120,
          useNativeDriver: true
        }).start()
      }
    })
  }, [limits.down, limits.up, translateY])

  return (
    <Animated.View style={{ transform: [{ translateY }] }} {...responder.panHandlers}>
      <View>{children}</View>
    </Animated.View>
  )
}
