import { ScrollView, Text, View } from '@tarojs/components'

import { EXPRESS_NIGHT_PICKUP_NOTICE } from '../../../services/express'
import { AppPressable } from '../../../shared/components'

import type { ExpressDraft } from '../../../services/express'
import type { ExpressPickupTimeController } from '../hooks/useExpressPickupTime'

import './ExpressPickupTimeCard.scss'

interface ExpressPickupTimeCardProps {
  controller: ExpressPickupTimeController
  pickup: ExpressDraft['pickup']
}

export function ExpressPickupTimeCard({
  controller,
  pickup
}: ExpressPickupTimeCardProps) {
  const selectedDateOption = controller.dateOptions.find(
    option => option.value === controller.selectedDate
  )
  const activeDate =
    selectedDateOption ?? controller.dateOptions[0] ?? undefined

  return (
    <View className='express-pickup-time-card'>
      <View className='express-pickup-time-card__header'>
        <View className='express-pickup-time-card__heading'>
          <Text className='express-pickup-time-card__title'>取件时段</Text>
          <Text className='express-pickup-time-card__summary'>
            {pickup.timeSlot || '请选择上门取件时间'}
          </Text>
        </View>
        <AppPressable
          accessibilityLabel='刷新取件时段'
          className='express-pickup-time-card__refresh'
          disabled={controller.loading}
          onPress={controller.onQuery}
        >
          <Text className='express-pickup-time-card__refresh-text'>
            {controller.loading ? '查询中' : '刷新'}
          </Text>
        </AppPressable>
      </View>

      {controller.dateOptions.length ? (
        <View className='express-pickup-time-card__content'>
          <Text className='express-pickup-time-card__label'>日期</Text>
          <ScrollView
            className='express-pickup-time-card__scroll'
            scrollX
          >
            <View className='express-pickup-time-card__track'>
              {controller.dateOptions.map(option => (
                <AppPressable
                  accessibilityLabel={`选择${option.label}${option.weekday}`}
                  className={
                    option.value === activeDate?.value
                      ? 'express-pickup-time-card__date express-pickup-time-card__date--active'
                      : 'express-pickup-time-card__date'
                  }
                  key={option.value}
                  selected={option.value === activeDate?.value}
                  onPress={() => controller.onDateChange(option.value)}
                >
                  <Text className='express-pickup-time-card__date-text'>
                    {option.label}
                  </Text>
                  <Text className='express-pickup-time-card__weekday'>
                    {option.weekday}
                  </Text>
                </AppPressable>
              ))}
            </View>
          </ScrollView>

          <Text className='express-pickup-time-card__label'>时段</Text>
          <View className='express-pickup-time-card__time-list'>
            {(activeDate?.timeOptions ?? []).map(option => (
              <AppPressable
                accessibilityLabel={`${option.disabled ? '不可用' : '选择'}${option.label}`}
                className={
                  option.disabled
                    ? 'express-pickup-time-card__time express-pickup-time-card__time--disabled'
                    : option.time === controller.selectedTime &&
                        option.type === pickup.type
                      ? 'express-pickup-time-card__time express-pickup-time-card__time--active'
                      : 'express-pickup-time-card__time'
                }
                disabled={option.disabled}
                key={`${option.time}-${option.type}`}
                selected={
                  option.time === controller.selectedTime &&
                  option.type === pickup.type
                }
                onPress={() =>
                  controller.onTimeChange(activeDate.value, option.time)
                }
              >
                <Text className='express-pickup-time-card__time-text'>
                  {option.label}
                </Text>
                {option.night ? (
                  <Text className='express-pickup-time-card__night-fee'>
                    夜揽费
                  </Text>
                ) : null}
              </AppPressable>
            ))}
          </View>
        </View>
      ) : (
        <Text className='express-pickup-time-card__empty'>
          {controller.loading
            ? '正在查询可用取件时段'
            : '请先查询取件时段，夜间揽收以地址能力为准'}
        </Text>
      )}

      {controller.showNightNotice ? (
        <View className='express-pickup-time-card__notice'>
          <Text className='express-pickup-time-card__notice-text'>
            {EXPRESS_NIGHT_PICKUP_NOTICE}
          </Text>
          <AppPressable
            accessibilityLabel='确认夜间揽收费用提示'
            className='express-pickup-time-card__notice-action'
            onPress={controller.onAcceptNightNotice}
          >
            <Text className='express-pickup-time-card__notice-action-text'>
              我已知晓费用提示
            </Text>
          </AppPressable>
        </View>
      ) : null}

      {controller.message ? (
        <Text className='express-pickup-time-card__message'>
          {controller.message}
        </Text>
      ) : null}
    </View>
  )
}
