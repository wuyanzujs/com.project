import { Text, View } from '@tarojs/components'

import { OrderDetailSection } from './OrderDetailSection'
import { AppPressable } from '../../../../shared/components'

import type { OrderDetailActionView } from '../../../../services/order'

import './OrderServiceActions.scss'

function getDetailActionClassName(
  action: OrderDetailActionView,
  isFirst: boolean
) {
  return `order-service-action order-service-action--${action.tone}${
    isFirst ? ' order-service-action--first' : ''
  }`
}

function getDetailActionMarkClassName(action: OrderDetailActionView) {
  return `order-service-action__mark order-service-action__mark--${action.tone}`
}

interface OrderServiceActionsProps {
  actions: OrderDetailActionView[]
  onAction: (action: OrderDetailActionView) => void
}

export function OrderServiceActions({
  actions,
  onAction
}: OrderServiceActionsProps) {
  if (!actions.length) {
    return null
  }

  return (
    <OrderDetailSection hint='订单相关' title='售后服务'>
      {actions.map((action, index) => (
        <AppPressable
          accessibilityLabel={action.title}
          block
          className={getDetailActionClassName(action, index === 0)}
          key={action.kind}
          onPress={() => onAction(action)}
        >
          <Text className={getDetailActionMarkClassName(action)}>
            {action.title.slice(0, 1)}
          </Text>
          <View className='order-service-action__content'>
            <View className='order-service-action__top'>
              <Text className='order-service-action__title'>{action.title}</Text>
              {action.badgeText ? (
                <Text className='order-service-action__badge'>
                  {action.badgeText}
                </Text>
              ) : null}
            </View>
            <Text className='order-service-action__summary'>
              {action.summary}
            </Text>
          </View>
          <Text className='order-service-action__arrow'>›</Text>
        </AppPressable>
      ))}
    </OrderDetailSection>
  )
}
