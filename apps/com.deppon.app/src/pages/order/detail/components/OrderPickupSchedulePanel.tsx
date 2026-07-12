import { ScrollView, Text, View } from '@tarojs/components'

import { OrderPickupScheduleOptions } from './OrderPickupScheduleOptions'
import { AppPressable } from '../../../../shared/components'

import type { OrderPickupScheduleView } from '../../../../services/order'

import './OrderPickupSchedulePanel.scss'

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
          <AppPressable
            accessibilityLabel='关闭预约上门时间'
            className='order-pickup-card__close'
            onPress={props.onClose}
          >
            <Text className='order-pickup-card__close-text'>×</Text>
          </AppPressable>
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
          <OrderPickupScheduleOptions
            schedule={props.schedule}
            selectedDate={props.selectedDate}
            selectedTime={props.selectedTime}
            onSelectDate={props.onSelectDate}
            onSelectTime={props.onSelectTime}
          />
        </ScrollView>

        <AppPressable
          accessibilityLabel={
            props.submitting ? '正在提交预约' : '确认预约'
          }
          block
          className={
            props.selectedTime
              ? 'order-pickup-card__confirm'
              : 'order-pickup-card__confirm order-pickup-card__confirm--disabled'
          }
          onPress={props.onConfirm}
        >
          <Text className='order-pickup-card__confirm-text'>
            {props.submitting ? '提交中' : '确认预约'}
          </Text>
        </AppPressable>
      </View>
    </View>
  )
}
