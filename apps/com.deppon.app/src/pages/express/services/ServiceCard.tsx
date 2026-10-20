import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import type { PropsWithChildren } from 'react'

import { formatExpressValueAddedFee } from '@/services/express/valueAdded.quoteView'
import { AppPressable } from '@/shared/components'

import './cards.scss'

interface ServiceCardProps extends PropsWithChildren {
  title: string
  description: string
  icon: string
  selected: boolean
  expanded?: boolean
  fee: number | null
  onPress: () => void
}

/** 原图仅负责服务图标；配置仍使用本项目已建模的服务字段。 */
export function ServiceCard({ children, description, expanded, fee, icon, onPress, selected, title }: ServiceCardProps) {
  return (
    <View className={selected ? 'express-service-card express-service-card--selected' : 'express-service-card'}>
      <View className='express-service-card__head'>
        <Image className='express-service-card__icon' mode='aspectFit' src={icon} />
        <AppPressable
          accessibilityLabel={`${expanded ? '收起' : '设置'}${title}`}
          className='express-service-card__main'
          layout='column-start'
          onPress={onPress}
        >
          <Text className='express-service-card__title'>{title}</Text>
          <Text className='express-service-card__description'>{description}</Text>
        </AppPressable>
        <AppPressable
          accessibilityLabel={`查看${title}说明`}
          className='express-service-card__info'
          onPress={() => Taro.showModal({ title, content: description, showCancel: false })}
        >
          <Text className='express-service-card__info-text'>ⓘ</Text>
        </AppPressable>
        <AppPressable accessibilityLabel={`设置${title}`} className='express-service-card__select' selected={selected} onPress={onPress}>
          <View className={selected ? 'express-service-card__circle express-service-card__circle--selected' : 'express-service-card__circle'}>
            <Text className='express-service-card__check'>{selected ? '✓' : ''}</Text>
          </View>
        </AppPressable>
      </View>
      {expanded && children ? <View className='express-service-card__editor'>{children}</View> : null}
      {selected ? (
        <View className='express-service-card__fee'>
          <Text className='express-service-card__fee-label'>服务费</Text>
          <Text className='express-service-card__fee-value'>{formatExpressValueAddedFee(fee)}</Text>
        </View>
      ) : null}
    </View>
  )
}
