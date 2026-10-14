import { Image, ScrollView, Text, View } from '@tarojs/components'

import { useState } from 'react'

import { AppPressable } from '@/shared/components'
import { APP_IMAGE_ICONS, AppIcon } from '@/shared/components/AppIcon'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { ExpressSheet } from '../ExpressSheet'

import type { ExpressPickupTimeController } from '../../hooks/useExpressPickupTime'

import './index.scss'

interface ExpressPickupTimeSheetProps {
  visible: boolean
  controller: ExpressPickupTimeController
  onClose: () => void
}

// 生产端日期列展示完整日期加相对日括注，如「2026-09-30(今天)」。
function getRelativeDayLabel(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) {
    return ''
  }

  const target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((target - today) / 86400000)

  if (days === 0) return '今天'
  if (days === 1) return '明天'
  if (days === 2) return '后天'

  return ''
}

// 与生产一致：切日期后默认选当日第一个可选的普通时段，没有普通时段再取首个可选时段。
function getDefaultTimeOption(controller: ExpressPickupTimeController, date: string) {
  const dateOption = controller.dateOptions.find(option => option.value === date)

  if (!dateOption) {
    return undefined
  }

  return dateOption.timeOptions.find(option => !option.disabled && option.type === 'NORMAL') ?? dateOption.timeOptions.find(option => !option.disabled)
}

export function ExpressPickupTimeSheet({ controller, onClose, visible }: ExpressPickupTimeSheetProps) {
  const [dateValue, setDateValue] = useState('')
  const [timeValue, setTimeValue] = useState('')
  const [prevVisible, setPrevVisible] = useState(false)

  // 打开瞬间以当前草稿选中值作为弹窗内暂存选中，确定时才落回草稿。
  if (visible !== prevVisible) {
    setPrevVisible(visible)

    if (visible) {
      const seededDate = controller.selectedDate || controller.dateOptions[0]?.value || ''

      setDateValue(seededDate)
      setTimeValue(controller.selectedTime || getDefaultTimeOption(controller, seededDate)?.time || '')
    }
  }

  // 打开瞬间查询可能还在途（seed 时 dateOptions 为空会落空），数据到位后补一次
  // 跟随：优先草稿选中，日期无效则回退首日，时段回退当日首个可选普通时段。
  if (visible && !timeValue && controller.dateOptions.length) {
    const nextDate = controller.dateOptions.some(option => option.value === dateValue)
      ? dateValue
      : controller.selectedDate || controller.dateOptions[0]?.value || ''

    setDateValue(nextDate)
    setTimeValue(controller.selectedTime || getDefaultTimeOption(controller, nextDate)?.time || '')
  }

  const activeDate = controller.dateOptions.find(option => option.value === dateValue)
  const timeOptions = activeDate?.timeOptions ?? []

  const handleDatePress = (date: string) => {
    if (date === dateValue) {
      return
    }

    setDateValue(date)
    setTimeValue(getDefaultTimeOption(controller, date)?.time ?? '')
  }

  const handleConfirm = () => {
    if (dateValue && timeValue) {
      controller.onTimeChange(dateValue, timeValue)
    }

    onClose()
  }

  return (
    <ExpressSheet
      bodyScroll={false}
      title='期望上门时间'
      titleSize={40}
      visible={visible}
      footer={
        <AppPressable accessibilityLabel='确定期望上门时间' block className='express-pickup-time-sheet__confirm' onPress={handleConfirm}>
          <Text className='express-pickup-time-sheet__confirm-text'>确定</Text>
        </AppPressable>
      }
      onClose={onClose}
    >
      {controller.dateOptions.length ? (
        <View className='express-pickup-time-sheet__columns'>
          <ScrollView className='express-pickup-time-sheet__column express-pickup-time-sheet__column--dates' scrollY>
            {controller.dateOptions.map(option => {
              const selected = option.value === dateValue
              const relativeLabel = getRelativeDayLabel(option.value)

              return (
                <AppPressable
                  accessibilityLabel={`选择${option.value}${relativeLabel}`}
                  className={selected ? 'express-pickup-time-sheet__date express-pickup-time-sheet__date--active' : 'express-pickup-time-sheet__date'}
                  key={option.value}
                  onPress={() => handleDatePress(option.value)}
                >
                  <Text
                    className={
                      selected ? 'express-pickup-time-sheet__date-text express-pickup-time-sheet__date-text--active' : 'express-pickup-time-sheet__date-text'
                    }
                  >
                    {relativeLabel ? `${option.value}(${relativeLabel})` : option.value}
                  </Text>
                </AppPressable>
              )
            })}
          </ScrollView>

          <ScrollView className='express-pickup-time-sheet__column' scrollY>
            {timeOptions.map(option => {
              const selected = option.time === timeValue

              return (
                <AppPressable
                  accessibilityLabel={`${option.disabled ? '不可选' : '选择'}${option.label}`}
                  className='express-pickup-time-sheet__time'
                  disabled={option.disabled}
                  key={`${option.time}-${option.type}`}
                  onPress={() => setTimeValue(option.time)}
                >
                  <Text
                    className={
                      selected
                        ? 'express-pickup-time-sheet__time-text express-pickup-time-sheet__time-text--active'
                        : option.disabled
                          ? 'express-pickup-time-sheet__time-text express-pickup-time-sheet__time-text--disabled'
                          : 'express-pickup-time-sheet__time-text'
                    }
                  >
                    {option.label}
                  </Text>
                  {option.night ? <Image className='express-pickup-time-sheet__moon' mode='aspectFit' src={APP_IMAGE_ICONS.nightPickupMoon} /> : null}
                  {selected ? <AppIcon color={APP_STYLE_COLORS.brand.default} name='check' size={32} /> : null}
                </AppPressable>
              )
            })}
          </ScrollView>
        </View>
      ) : (
        <View className='express-pickup-time-sheet__empty'>
          <Text className='express-pickup-time-sheet__empty-text'>
            {controller.loading ? '正在查询可用取件时段' : controller.message || '暂未获取到取件时间'}
          </Text>
        </View>
      )}

      {controller.showNightNotice ? (
        <AppPressable accessibilityLabel='夜间揽收费用说明' className='express-pickup-time-sheet__night-banner' onPress={controller.onAcceptNightNotice}>
          <Text className='express-pickup-time-sheet__night-text'>提供夜间收件服务，24小时保障发货</Text>
          <Image className='express-pickup-time-sheet__moon' mode='aspectFit' src={APP_IMAGE_ICONS.nightPickupMoon} />
        </AppPressable>
      ) : null}
    </ExpressSheet>
  )
}
