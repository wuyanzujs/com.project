import { Text, View } from '@tarojs/components'

import type { PropsWithChildren } from 'react'

import { AppPressable } from '../../../shared/components'
import { AppIcon } from '../../../shared/components/AppIcon'
import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../styles/nativeTokens'

import './ExpressSection.scss'

interface ExpressSectionProps extends PropsWithChildren {
  expanded?: boolean
  hint?: string
  summary?: string
  title: string
  onHeaderPress?: () => void
}

export function ExpressSection({
  children,
  expanded = false,
  hint,
  summary,
  title,
  onHeaderPress
}: ExpressSectionProps) {
  const header = (
    <>
      <Text className='express-section__title'>{title}</Text>
      {hint ? <Text className='express-section__hint'>{hint}</Text> : null}
      {summary ? (
        <Text className='express-section__summary'>{summary}</Text>
      ) : null}
      {onHeaderPress ? (
        <AppIcon
          color={APP_STYLE_COLORS.text.supporting}
          name={expanded ? 'chevronUp' : 'chevronDown'}
          size={APP_NATIVE_TOKENS.icon.small}
        />
      ) : null}
    </>
  )

  return (
    <View className='express-section'>
      {onHeaderPress ? (
        <AppPressable
          accessibilityLabel={expanded ? `收起${title}` : `展开${title}`}
          block
          className='express-section__head'
          layout='row-start'
          onPress={onHeaderPress}
        >
          {header}
        </AppPressable>
      ) : (
        <View className='express-section__head'>{header}</View>
      )}
      {children}
    </View>
  )
}
