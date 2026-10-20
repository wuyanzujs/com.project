import { ScrollView, Text, View } from '@tarojs/components'

import type { PropsWithChildren, ReactNode } from 'react'

import { AppIcon } from '@/shared/components/AppIcon'
import { AppNativeModalSheet, AppNativePressable, useAppSafeAreaBottomInset } from '@/shared/native'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

export type ExpressSheetTitleSize = 36 | 40 | 42

export interface ExpressSheetProps extends PropsWithChildren {
  visible: boolean
  title: string
  /** 副标题（如付款方式弹窗的资金安全提示）。 */
  subtitle?: string
  /** 标题字号（设计稿 px）：付款 36、上门时间 40、优惠券 42。 */
  titleSize?: ExpressSheetTitleSize
  /** 主体区域附加类（如优惠券弹窗的灰底列表区）。 */
  bodyClassName?: string
  /** 主体不做滚动（内容自己管理滚动时关闭）。 */
  bodyScroll?: boolean
  /** 面板底色覆盖（如付款弹窗的淡蓝底）；走内联样式避免类合并顺序问题。 */
  panelBackgroundColor?: string
  footer?: ReactNode
  onClose: () => void
}

export function ExpressSheet({
  bodyClassName,
  bodyScroll = true,
  children,
  footer,
  onClose,
  panelBackgroundColor,
  subtitle,
  title,
  titleSize = 36,
  visible
}: ExpressSheetProps) {
  const bottomInset = useAppSafeAreaBottomInset()

  const body = <View className='express-sheet__content'>{children}</View>

  return (
    <AppNativeModalSheet accessibilityLabel={`关闭${title}`} visible={visible} onRequestClose={onClose}>
      <View
        className='express-sheet__panel'
        style={{ paddingBottom: bottomInset, ...(panelBackgroundColor ? { backgroundColor: panelBackgroundColor } : null) }}
      >
        <View className='express-sheet__header'>
          <View className='express-sheet__heading'>
            <Text className={`express-sheet__title express-sheet__title--${titleSize}`}>{title}</Text>
            {subtitle ? <Text className='express-sheet__subtitle'>{subtitle}</Text> : null}
          </View>
          <AppNativePressable accessibilityLabel={`关闭${title}`} onPress={onClose}>
            <View className='express-sheet__close'>
              <AppIcon color={APP_STYLE_COLORS.text.placeholder} name='close' size={40} />
            </View>
          </AppNativePressable>
        </View>

        {bodyScroll ? (
          <ScrollView className={bodyClassName ? `express-sheet__scroll ${bodyClassName}` : 'express-sheet__scroll'} scrollY>
            {body}
          </ScrollView>
        ) : (
          body
        )}

        {footer ? <View className='express-sheet__footer'>{footer}</View> : null}
      </View>
    </AppNativeModalSheet>
  )
}
