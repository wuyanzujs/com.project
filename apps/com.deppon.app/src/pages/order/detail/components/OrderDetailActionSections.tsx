import { ScrollView, Text, View } from '@tarojs/components'

import type {
  OrderDetailActionView,
  OrderPickupScheduleView,
  OrderDetailUrgePanelView,
  OrderUrgeButtonRaw
} from '../../../../services/order'

import '../index.scss'

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

export function OrderPickupSchedulePanel(props: {
  schedule: OrderPickupScheduleView | null
  selectedDate: string
  selectedTime: string
  submitting: boolean
  onSelectDate: (date: string) => void
  onSelectTime: (time: string) => void
  onConfirm: () => void
  onClose: () => void
}) {
  if (!props.schedule) {
    return null
  }

  const selectedDate = props.schedule.dates.find(
    item => item.date === props.selectedDate
  )

  return (
    <View className='order-pickup-mask'>
      <View className='order-pickup-card'>
        <View className='order-pickup-card__head'>
          <View className='order-pickup-card__heading'>
            <Text className='order-pickup-card__title'>期望上门时间</Text>
            <Text className='order-pickup-card__summary'>
              {props.schedule.message}
            </Text>
          </View>
          <View className='order-pickup-card__close' onClick={props.onClose}>
            <Text className='order-pickup-card__close-text'>×</Text>
          </View>
        </View>

        {!!props.schedule.currentTime && (
          <View className='order-pickup-card__current'>
            <Text className='order-pickup-card__current-label'>当前预约</Text>
            <Text className='order-pickup-card__current-value'>
              {props.schedule.currentTime}
            </Text>
          </View>
        )}

        <ScrollView className='order-pickup-card__body' scrollY>
          <Text className='order-pickup-card__section-title'>选择日期</Text>
          <View className='order-pickup-card__dates'>
            {props.schedule.dates.map(date => (
              <View
                className={
                  date.date === props.selectedDate
                    ? 'order-pickup-date order-pickup-date--active'
                    : 'order-pickup-date'
                }
                key={date.date}
                onClick={() => props.onSelectDate(date.date)}
              >
                <Text
                  className={
                    date.date === props.selectedDate
                      ? 'order-pickup-date__text order-pickup-date__text--active'
                      : 'order-pickup-date__text'
                  }
                >
                  {date.label}
                </Text>
              </View>
            ))}
          </View>

          <Text className='order-pickup-card__section-title'>选择时段</Text>
          <View className='order-pickup-card__slots'>
            {(selectedDate?.slots ?? []).map(slot => (
              <View
                className={
                  slot.time === props.selectedTime
                    ? 'order-pickup-slot order-pickup-slot--active'
                    : 'order-pickup-slot'
                }
                key={`${slot.type}-${slot.time}`}
                onClick={() => props.onSelectTime(slot.time)}
              >
                <Text
                  className={
                    slot.time === props.selectedTime
                      ? 'order-pickup-slot__text order-pickup-slot__text--active'
                      : 'order-pickup-slot__text'
                  }
                >
                  {slot.text}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View
          className={
            props.selectedTime
              ? 'order-pickup-card__confirm'
              : 'order-pickup-card__confirm order-pickup-card__confirm--disabled'
          }
          onClick={props.onConfirm}
        >
          <Text className='order-pickup-card__confirm-text'>
            {props.submitting ? '提交中' : '确认预约'}
          </Text>
        </View>
      </View>
    </View>
  )
}
