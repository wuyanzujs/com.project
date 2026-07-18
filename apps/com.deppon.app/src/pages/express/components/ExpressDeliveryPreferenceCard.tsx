import { ScrollView, Text, View } from '@tarojs/components'

import {
  EXPRESS_DELIVERY_PREFERENCE_OPTIONS,
  getExpressDeliveryPreferenceOption,
  getExpressDeliveryPreferenceSummary
} from '../../../services/express'
import { AppPressable } from '../../../shared/components'

import type { ExpressDraft } from '../../../services/express'
import type { ExpressDeliveryPreferenceController } from '../hooks/useExpressDeliveryPreference'

import './ExpressDeliveryPreferenceCard.scss'

interface ExpressDeliveryPreferenceCardProps {
  controller: ExpressDeliveryPreferenceController
  preference: ExpressDraft['deliveryPreference']
}

export function ExpressDeliveryPreferenceCard({
  controller,
  preference
}: ExpressDeliveryPreferenceCardProps) {
  const selectedOption = getExpressDeliveryPreferenceOption(preference.type)

  return (
    <View className='express-delivery-preference'>
      <View className='express-delivery-preference__header'>
        <Text className='express-option-title'>派送偏好</Text>
        <Text className='express-delivery-preference__summary'>
          {getExpressDeliveryPreferenceSummary(preference)}
        </Text>
      </View>

      <View className='express-delivery-preference__options'>
        {EXPRESS_DELIVERY_PREFERENCE_OPTIONS.map(option => {
          const selected = preference.type === option.value

          return (
            <AppPressable
              accessibilityLabel={`选择${option.label}`}
              className={
                selected
                  ? 'express-delivery-preference__option express-delivery-preference__option--active'
                  : 'express-delivery-preference__option'
              }
              key={option.value || 'STANDARD'}
              selected={selected}
              onPress={() => controller.onTypeChange(option.value)}
            >
              <Text
                className={
                  selected
                    ? 'express-delivery-preference__option-text express-delivery-preference__option-text--active'
                    : 'express-delivery-preference__option-text'
                }
              >
                {option.label}
              </Text>
            </AppPressable>
          )
        })}
      </View>

      <Text className='express-delivery-preference__description'>
        {selectedOption.summary}
      </Text>

      {preference.type === 'SCHEDULED' ? (
        <View className='express-delivery-preference__details'>
          <Text className='express-delivery-preference__label'>派送日期</Text>
          <View className='express-delivery-preference__date-list'>
            {controller.scheduledDateOptions.map(option => {
              const selected =
                controller.selectedScheduledDate === option.value

              return (
                <AppPressable
                  accessibilityLabel={`选择${option.label}${option.weekday}`}
                  className={
                    selected
                      ? 'express-delivery-preference__date express-delivery-preference__date--active'
                      : 'express-delivery-preference__date'
                  }
                  key={option.value}
                  selected={selected}
                  onPress={() =>
                    controller.onScheduledDateChange(option.value)
                  }
                >
                  <Text
                    className={
                      selected
                        ? 'express-delivery-preference__date-text express-delivery-preference__date-text--active'
                        : 'express-delivery-preference__date-text'
                    }
                  >
                    {option.label}
                  </Text>
                  <Text className='express-delivery-preference__weekday'>
                    {option.weekday}
                  </Text>
                </AppPressable>
              )
            })}
          </View>

          <Text className='express-delivery-preference__label'>派送时段</Text>
          <View className='express-delivery-preference__time-list'>
            {controller.timeWindowOptions.map(option => {
              const selected = controller.selectedTimeWindow === option.value

              return (
                <AppPressable
                  accessibilityLabel={`选择派送时段${option.label}`}
                  className={
                    selected
                      ? 'express-delivery-preference__time express-delivery-preference__time--active'
                      : 'express-delivery-preference__time'
                  }
                  key={option.value}
                  selected={selected}
                  onPress={() =>
                    controller.onScheduledTimeChange(option.value)
                  }
                >
                  <Text
                    className={
                      selected
                        ? 'express-delivery-preference__time-text express-delivery-preference__time-text--active'
                        : 'express-delivery-preference__time-text'
                    }
                  >
                    {option.label}
                  </Text>
                  <Text className='express-delivery-preference__fee'>
                    {option.feeText}
                  </Text>
                </AppPressable>
              )
            })}
          </View>
        </View>
      ) : null}

      {preference.type === 'NOTIFY_RECEIVER' ? (
        <View className='express-delivery-preference__details'>
          <Text className='express-delivery-preference__label'>不可收货日期</Text>
          <ScrollView
            className='express-delivery-preference__date-scroll'
            scrollX
          >
            <View className='express-delivery-preference__date-track'>
              {controller.unavailableDateOptions.map(option => {
                const selected = preference.unavailableDates.includes(
                  option.value
                )

                return (
                  <AppPressable
                    accessibilityLabel={`${selected ? '取消' : '选择'}不可收货日期${option.label}`}
                    className={
                      selected
                        ? 'express-delivery-preference__unavailable express-delivery-preference__unavailable--active'
                        : 'express-delivery-preference__unavailable'
                    }
                    key={option.value}
                    selected={selected}
                    onPress={() =>
                      controller.onUnavailableDateToggle(option.value)
                    }
                  >
                    <Text
                      className={
                        selected
                          ? 'express-delivery-preference__unavailable-text express-delivery-preference__unavailable-text--active'
                          : 'express-delivery-preference__unavailable-text'
                      }
                    >
                      {option.label}
                    </Text>
                    <Text className='express-delivery-preference__weekday'>
                      {option.weekday}
                    </Text>
                  </AppPressable>
                )
              })}
            </View>
          </ScrollView>
        </View>
      ) : null}

      {(controller.availabilityLoading ||
        controller.availabilityMessage) && (
        <View className='express-delivery-preference__message'>
          <Text className='express-delivery-preference__message-text'>
            {controller.availabilityLoading
              ? '正在校验定时派送范围'
              : controller.availabilityMessage}
          </Text>
        </View>
      )}
    </View>
  )
}
