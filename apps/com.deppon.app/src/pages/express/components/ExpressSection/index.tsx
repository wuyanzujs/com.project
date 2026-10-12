import { Image, Text, View } from '@tarojs/components'

import type { PropsWithChildren } from 'react'

import { AppPressable } from '@/shared/components'
import { APP_IMAGE_ICONS } from '@/shared/components/AppIcon'

import './index.scss'

interface ExpressSectionProps extends PropsWithChildren {
  expanded?: boolean
  hint?: string
  plain?: boolean
  summary?: string
  // 未填写的占位摘要用灰色常规字重，已填写的摘要用近黑加粗。
  summaryMuted?: boolean
  title: string
  onHeaderPress?: () => void
}

export function ExpressSection({
  children,
  expanded = false,
  hint,
  plain = false,
  summary,
  summaryMuted = false,
  title,
  onHeaderPress
}: ExpressSectionProps) {
  // 基础信息卡里的行按生产端 82px 行高，卡片内的折叠段沿用原来的紧凑行高。
  const headClassName = plain
    ? 'express-section__head express-section__head--row'
    : 'express-section__head'

  const header = (
    <>
      <Text className='express-section__title'>{title}</Text>
      {hint ? <Text className='express-section__hint'>{hint}</Text> : null}
      {summary ? (
        <Text
          className={
            summaryMuted
              ? 'express-section__summary express-section__summary--muted'
              : 'express-section__summary'
          }
        >
          {summary}
        </Text>
      ) : null}
      {onHeaderPress ? (
        <Image
          className={
            expanded
              ? 'express-section__arrow express-section__arrow--expanded'
              : 'express-section__arrow'
          }
          mode='aspectFit'
          src={APP_IMAGE_ICONS.arrowRightGrey}
        />
      ) : null}
    </>
  )

  return (
    <View
      className={
        plain ? 'express-section' : 'express-section express-section--card'
      }
    >
      {onHeaderPress ? (
        <AppPressable
          accessibilityLabel={expanded ? `收起${title}` : `展开${title}`}
          block
          className={headClassName}
          layout='row-start'
          onPress={onHeaderPress}
        >
          {header}
        </AppPressable>
      ) : (
        <View className={headClassName}>{header}</View>
      )}
      {children}
    </View>
  )
}
