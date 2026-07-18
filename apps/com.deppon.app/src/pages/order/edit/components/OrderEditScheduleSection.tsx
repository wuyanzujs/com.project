import { ScrollView, Text, View } from '@tarojs/components'

import {
  ORDER_EDIT_DELIVERY_OPTIONS,
  ORDER_EDIT_NIGHT_PICKUP_NOTICE
} from '../../../../services/order'
import { AppPressable } from '../../../../shared/components'
import { AppIcon } from '../../../../shared/components/AppIcon'
import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../../styles/nativeTokens'

import type { OrderEditDraft } from '../../../../services/order'
import type { OrderEditScheduleController } from '../hooks/useOrderEditSchedule'

import './OrderEditSection.scss'
import './OrderEditScheduleSection.scss'

interface OrderEditScheduleSectionProps {
  controller: OrderEditScheduleController
  draft: OrderEditDraft
}

export function OrderEditScheduleSection({
  controller,
  draft
}: OrderEditScheduleSectionProps) {
  const pickup = draft.schedule.pickup
  const selectedDateOption = controller.dateOptions.find(
    option => option.value === controller.selectedDate
  )
  const activeDate =
    selectedDateOption ?? controller.dateOptions[0] ?? undefined

  return (
    <View className='order-edit-section order-edit-schedule'>
      <View className='order-edit-schedule__header'>
        <View className='order-edit-schedule__heading'>
          <Text className='order-edit-section__title'>上门与送货</Text>
          <Text className='order-edit-schedule__summary'>
            {pickup.timeSlot || pickup.time || '暂未选择上门时间'}
          </Text>
        </View>
        <AppPressable
          accessibilityLabel='刷新改单上门时段'
          className='order-edit-schedule__refresh'
          disabled={controller.loading}
          onPress={controller.onQuery}
        >
          <AppIcon
            color={APP_STYLE_COLORS.brand.default}
            name='refresh'
            size={APP_NATIVE_TOKENS.icon.small}
          />
        </AppPressable>
      </View>

      {controller.dateOptions.length ? (
        <View className='order-edit-schedule__picker'>
          <Text className='order-edit-schedule__label'>日期</Text>
          <ScrollView className='order-edit-schedule__scroll' scrollX>
            <View className='order-edit-schedule__date-track'>
              {controller.dateOptions.map(option => (
                <AppPressable
                  accessibilityLabel={`选择${option.label}${option.weekday}`}
                  className={
                    option.value === activeDate?.value
                      ? 'order-edit-schedule__date order-edit-schedule__date--active'
                      : 'order-edit-schedule__date'
                  }
                  key={option.value}
                  selected={option.value === activeDate?.value}
                  onPress={() => controller.onDateChange(option.value)}
                >
                  <Text className='order-edit-schedule__date-text'>
                    {option.label}
                  </Text>
                  <Text className='order-edit-schedule__weekday'>
                    {option.weekday}
                  </Text>
                </AppPressable>
              ))}
            </View>
          </ScrollView>

          <Text className='order-edit-schedule__label'>时段</Text>
          <View className='order-edit-schedule__time-list'>
            {(activeDate?.timeOptions ?? []).map(option => {
              const selected =
                option.time === controller.selectedTime &&
                option.type === pickup.type

              return (
                <AppPressable
                  accessibilityLabel={`${option.disabled ? '不可用' : '选择'}${option.label}`}
                  className={
                    option.disabled
                      ? 'order-edit-schedule__time order-edit-schedule__time--disabled'
                      : selected
                        ? 'order-edit-schedule__time order-edit-schedule__time--active'
                        : 'order-edit-schedule__time'
                  }
                  disabled={option.disabled}
                  key={`${option.time}-${option.type}`}
                  selected={selected}
                  onPress={() =>
                    controller.onTimeChange(activeDate.value, option.time)
                  }
                >
                  <Text className='order-edit-schedule__time-text'>
                    {option.label}
                  </Text>
                  {option.night ? (
                    <Text className='order-edit-schedule__night'>夜间</Text>
                  ) : null}
                </AppPressable>
              )
            })}
          </View>
        </View>
      ) : (
        <Text className='order-edit-schedule__empty'>
          {controller.loading ? '正在查询可用时段' : '暂无可用上门时段'}
        </Text>
      )}

      {controller.showNightNotice ? (
        <View className='order-edit-schedule__notice'>
          <Text className='order-edit-schedule__notice-text'>
            {ORDER_EDIT_NIGHT_PICKUP_NOTICE}
          </Text>
          <AppPressable
            accessibilityLabel='确认改单夜间揽收费用提示'
            className='order-edit-schedule__notice-action'
            onPress={controller.onAcceptNightNotice}
          >
            <Text className='order-edit-schedule__notice-action-text'>
              我已知晓
            </Text>
          </AppPressable>
        </View>
      ) : null}

      {controller.deliveryVisible ? (
        <View className='order-edit-schedule__delivery'>
          <Text className='order-edit-schedule__label'>送货方式</Text>
          <View className='order-edit-schedule__delivery-options'>
            {ORDER_EDIT_DELIVERY_OPTIONS.map(option => {
              const selected = draft.schedule.deliveryMode === option.value

              return (
                <AppPressable
                  accessibilityLabel={`选择${option.label}`}
                  className={
                    selected
                      ? 'order-edit-schedule__delivery-option order-edit-schedule__delivery-option--active'
                      : 'order-edit-schedule__delivery-option'
                  }
                  key={option.value}
                  selected={selected}
                  onPress={() =>
                    controller.onDeliveryModeChange(option.value)
                  }
                >
                  <Text className='order-edit-schedule__delivery-label'>
                    {option.label}
                  </Text>
                  <Text className='order-edit-schedule__delivery-summary'>
                    {option.summary}
                  </Text>
                </AppPressable>
              )
            })}
          </View>
        </View>
      ) : null}

      {controller.message ? (
        <Text className='order-edit-schedule__message'>
          {controller.message}
        </Text>
      ) : null}
    </View>
  )
}
