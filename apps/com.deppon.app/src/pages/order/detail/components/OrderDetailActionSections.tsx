import { Text, View } from '@tarojs/components'

import type {
  OrderDetailActionView,
  OrderDetailUrgePanelView,
  OrderUrgeButtonRaw
} from '../../../../services/order'

export interface OrderDetailUrgePanelState extends OrderDetailUrgePanelView {
  action: OrderDetailActionView
}

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

export function OrderServiceActions(props: {
  actions: OrderDetailActionView[]
  onAction: (action: OrderDetailActionView) => void
}) {
  if (!props.actions.length) {
    return null
  }

  return (
    <View className='order-detail-section'>
      <View className='order-detail-section__head'>
        <Text className='order-detail-section__title'>售后服务</Text>
        <Text className='order-detail-section__hint'>订单相关</Text>
      </View>

      {props.actions.map((action, index) => (
        <View
          className={getDetailActionClassName(action, index === 0)}
          key={action.kind}
          onClick={() => props.onAction(action)}
        >
          <Text className={getDetailActionMarkClassName(action)}>
            {action.title.slice(0, 1)}
          </Text>
          <View className='order-service-action__content'>
            <View className='order-service-action__top'>
              <Text className='order-service-action__title'>{action.title}</Text>
              {!!action.badgeText && (
                <Text className='order-service-action__badge'>
                  {action.badgeText}
                </Text>
              )}
            </View>
            <Text className='order-service-action__summary'>
              {action.summary}
            </Text>
          </View>
          <Text className='order-service-action__arrow'>›</Text>
        </View>
      ))}
    </View>
  )
}

export function OrderDetailFooterActions(props: {
  resendActionText: string
  cancelable: boolean
  deletable: boolean
  deleting: boolean
  onRefresh: () => void
  onResend: () => void
  onCancel: () => void
  onDelete: () => void
  onBackToList: () => void
}) {
  return (
    <View className='order-detail-actions'>
      <View className='order-detail-secondary' onClick={props.onRefresh}>
        <Text className='order-detail-secondary__text'>刷新</Text>
      </View>
      <View className='order-detail-secondary' onClick={props.onResend}>
        <Text className='order-detail-secondary__text'>
          {props.resendActionText}
        </Text>
      </View>
      {props.cancelable && (
        <View className='order-detail-danger' onClick={props.onCancel}>
          <Text className='order-detail-danger__text'>取消订单</Text>
        </View>
      )}
      {props.deletable && (
        <View className='order-detail-danger' onClick={props.onDelete}>
          <Text className='order-detail-danger__text'>
            {props.deleting ? '删除中' : '删除'}
          </Text>
        </View>
      )}
      <View className='order-detail-primary' onClick={props.onBackToList}>
        <Text className='order-detail-primary__text'>查看订单列表</Text>
      </View>
    </View>
  )
}

export function OrderUrgePanel(props: {
  panel: OrderDetailUrgePanelState | null
  urging: boolean
  onSelect: (menu: OrderUrgeButtonRaw) => void
  onClose: () => void
}) {
  if (!props.panel) {
    return null
  }

  return (
    <View className='order-urge-mask'>
      <View className='order-urge-card'>
        <Text className='order-urge-card__title'>催单提醒</Text>
        <Text className='order-urge-card__content'>{props.panel.content}</Text>
        <View className='order-urge-card__actions'>
          {props.panel.menus.map((menu) => (
            <View
              className={
                menu.buttonCode === 'FOLLOW_UP'
                  ? 'order-urge-card__button order-urge-card__button--primary'
                  : 'order-urge-card__button'
              }
              key={`${menu.buttonCode}-${menu.buttonName}`}
              onClick={() => props.onSelect(menu)}
            >
              <Text
                className={
                  menu.buttonCode === 'FOLLOW_UP'
                    ? 'order-urge-card__button-text order-urge-card__button-text--primary'
                    : 'order-urge-card__button-text'
                }
              >
                {props.urging && menu.buttonCode === 'FOLLOW_UP'
                  ? '提交中'
                  : menu.buttonName}
              </Text>
            </View>
          ))}
        </View>
        <View className='order-urge-card__cancel' onClick={props.onClose}>
          <Text className='order-urge-card__cancel-text'>取消</Text>
        </View>
      </View>
    </View>
  )
}
