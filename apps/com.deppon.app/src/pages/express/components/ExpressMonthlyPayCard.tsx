import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../shared/components'

import type { ExpressMonthlyPayView } from '../../../services/express'

import './ExpressMonthlyPayCard.scss'

interface ExpressMonthlyPayCardProps {
  view: ExpressMonthlyPayView
  onAction: (view: ExpressMonthlyPayView) => void
}

export function ExpressMonthlyPayCard({
  view,
  onAction
}: ExpressMonthlyPayCardProps) {
  return (
    <View className={`express-monthly-card express-monthly-card--${view.tone}`}>
      <View className='express-monthly-card__content'>
        <Text className='express-monthly-card__title'>{view.title}</Text>
        <Text className='express-monthly-card__summary'>{view.summary}</Text>
      </View>
      <AppPressable
        accessibilityLabel={view.actionText}
        className='express-monthly-card__action'
        onPress={() => onAction(view)}
      >
        <Text className='express-monthly-card__action-text'>
          {view.actionText}
        </Text>
      </AppPressable>
    </View>
  )
}
