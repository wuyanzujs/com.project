import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'

import type { OrderPickupScheduleView } from '../../../../services/order'

import './OrderPickupScheduleOptions.scss'

export function OrderPickupScheduleOptions(props: {
  schedule: OrderPickupScheduleView
  selectedDate: string
  selectedTime: string
  onSelectDate: (date: string) => void
  onSelectTime: (time: string) => void
}) {
  const selectedDate = props.schedule.dates.find(
    item => item.date === props.selectedDate
  )

  return (
    <>
      <Text className='order-pickup-card__section-title'>选择日期</Text>
      <View className='order-pickup-card__dates'>
        {props.schedule.dates.map(date => {
          const selected = date.date === props.selectedDate

          return (
            <View className='order-pickup-date-slot' key={date.date}>
              <AppPressable
                accessibilityLabel={`选择日期 ${date.label}`}
                block
                className={
                  selected
                    ? 'order-pickup-date order-pickup-date--active'
                    : 'order-pickup-date'
                }
                selected={selected}
                onPress={() => props.onSelectDate(date.date)}
              >
                <Text
                  className={
                    selected
                      ? 'order-pickup-date__text order-pickup-date__text--active'
                      : 'order-pickup-date__text'
                  }
                >
                  {date.label}
                </Text>
              </AppPressable>
            </View>
          )
        })}
      </View>

      <Text className='order-pickup-card__section-title'>选择时段</Text>
      <View className='order-pickup-card__slots'>
        {(selectedDate?.slots ?? []).map(slot => {
          const selected = slot.time === props.selectedTime

          return (
            <View
              className='order-pickup-slot-slot'
              key={`${slot.type}-${slot.time}`}
            >
              <AppPressable
                accessibilityLabel={`选择时段 ${slot.text}`}
                block
                className={
                  selected
                    ? 'order-pickup-slot order-pickup-slot--active'
                    : 'order-pickup-slot'
                }
                selected={selected}
                onPress={() => props.onSelectTime(slot.time)}
              >
                <Text
                  className={
                    selected
                      ? 'order-pickup-slot__text order-pickup-slot__text--active'
                      : 'order-pickup-slot__text'
                  }
                >
                  {slot.text}
                </Text>
              </AppPressable>
            </View>
          )
        })}
      </View>
    </>
  )
}
