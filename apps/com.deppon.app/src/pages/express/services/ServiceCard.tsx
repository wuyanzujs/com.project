import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import type { PropsWithChildren } from 'react'

import { formatExpressValueAddedFee } from '@/services/express/value-added/valueAdded.quoteView'
import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './cards.scss'

interface ServiceCardProps extends PropsWithChildren {
  title: string
  description: string
  icon: string
  selected: boolean
  expanded?: boolean
  /** 无服务费或服务费未取到时留空，不渲染服务费行。 */
  fee?: number | null
  /** 通电验机标题右侧不提供说明入口。 */
  info?: boolean
  onPress: () => void
}

/** 标题行（图标/标题/说明/单选圆）在上，说明文案整宽换行在下。 */
export function ServiceCard({ children, description, expanded, fee, icon, info = true, onPress, selected, title }: ServiceCardProps) {
  const feeVisible = selected && typeof fee === 'number' && fee > 0

  return (
    <View className='express-service-card'>
      {selected ? <View className='express-service-card__ring' /> : null}
      <View className='express-service-card__head'>
        <AppPressable
          accessibilityLabel={`${expanded ? '收起' : '设置'}${title}`}
          className='express-service-card__main'
          compact
          layout='row-start'
          onPress={onPress}
        >
          <Image className='express-service-card__icon' mode='aspectFit' src={icon} />
          <Text className='express-service-card__title'>{title}</Text>
        </AppPressable>
        {info ? (
          <AppPressable
            accessibilityLabel={`查看${title}说明`}
            className='express-service-card__info'
            compact
            hitSlop={12}
            onPress={() => Taro.showModal({ title, content: description, showCancel: false })}
          >
            <AppIcon color={APP_STYLE_COLORS.text.placeholderSoft} name='info' size={31} strokeWidth={1.5} />
          </AppPressable>
        ) : null}
        <View className='express-service-card__spacer' />
        <AppPressable accessibilityLabel={`设置${title}`} className='express-service-card__select' compact hitSlop={12} onPress={onPress}>
          <View className={selected ? 'express-service-card__circle express-service-card__circle--selected' : 'express-service-card__circle'}>
            {selected ? <AppIcon color={APP_STYLE_COLORS.text.inverse} name='check' size={16} strokeWidth={3} /> : null}
          </View>
        </AppPressable>
      </View>
      <AppPressable className='express-service-card__desc' compact layout='column-start' onPress={onPress}>
        <Text className='express-service-card__description'>{description}</Text>
      </AppPressable>
      {expanded && children ? <View className='express-service-card__editor'>{children}</View> : null}
      {feeVisible ? (
        <View className='express-service-card__fee'>
          <Text className='express-service-card__fee-label'>服务费</Text>
          <Text className='express-service-card__fee-value'>{formatExpressValueAddedFee(fee)}</Text>
        </View>
      ) : null}
    </View>
  )
}
