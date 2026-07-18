import { Input, Text, View } from '@tarojs/components'

import { useEffect, useState } from 'react'

import {
  getOrderEditPackagingFee,
  normalizeOrderEditPackagingCount,
  normalizeOrderEditPackagingCountInput,
  ORDER_EDIT_PACKAGING_MAX_COUNT,
  ORDER_EDIT_PACKAGING_MIN_COUNT,
  ORDER_EDIT_PACKAGING_UNIT_FEE
} from '../../../../services/order'
import { AppPressable } from '../../../../shared/components'
import { AppIcon } from '../../../../shared/components/AppIcon'
import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../../styles/nativeTokens'

import type { OrderEditPackagingDraft } from '../../../../services/order'

import './OrderEditPackagingSection.scss'
import './OrderEditSection.scss'

interface OrderEditPackagingSectionProps {
  packaging: OrderEditPackagingDraft
  onCountChange: (value: number) => void
}

export function OrderEditPackagingSection({
  packaging,
  onCountChange
}: OrderEditPackagingSectionProps) {
  const enabled = packaging.count > 0
  const [countText, setCountText] = useState(
    String(enabled ? packaging.count : ORDER_EDIT_PACKAGING_MIN_COUNT)
  )

  useEffect(() => {
    setCountText(
      String(enabled ? packaging.count : ORDER_EDIT_PACKAGING_MIN_COUNT)
    )
  }, [enabled, packaging.count])

  const commitCount = (value: unknown) => {
    const count = Math.max(
      ORDER_EDIT_PACKAGING_MIN_COUNT,
      normalizeOrderEditPackagingCount(value)
    )

    setCountText(String(count))
    onCountChange(count)
  }

  const handleCountInput = (value: string) => {
    const normalized = normalizeOrderEditPackagingCountInput(value)

    setCountText(normalized)

    if (Number(normalized) > 0) {
      onCountChange(normalizeOrderEditPackagingCount(normalized))
    }
  }

  const handleToggle = () => {
    if (enabled) {
      setCountText(String(ORDER_EDIT_PACKAGING_MIN_COUNT))
      onCountChange(0)
      return
    }

    commitCount(countText)
  }

  const estimatedFee = getOrderEditPackagingFee(packaging)

  return (
    <View className='order-edit-section'>
      <View className='order-edit-packaging__header'>
        <View className='order-edit-packaging__header-content'>
          <Text className='order-edit-section__title'>打包服务</Text>
          <Text className='order-edit-packaging__summary'>
            {enabled
              ? `打包 ${packaging.count} 件 · 参考 ¥${estimatedFee}`
              : '由快递员按现场难度完成打包，可按件选择'}
          </Text>
        </View>
        <AppPressable
          accessibilityLabel={enabled ? '关闭改单打包服务' : '开启改单打包服务'}
          className='order-edit-packaging-toggle'
          selected={enabled}
          onPress={handleToggle}
        >
          <View
            className={
              enabled
                ? 'order-edit-packaging-toggle__track order-edit-packaging-toggle__track--active'
                : 'order-edit-packaging-toggle__track'
            }
          >
            <View className='order-edit-packaging-toggle__thumb' />
          </View>
        </AppPressable>
      </View>

      {enabled ? (
        <View className='order-edit-packaging__body'>
          <View className='order-edit-packaging__count-row'>
            <View className='order-edit-packaging__labels'>
              <Text className='order-edit-packaging__label'>打包件数</Text>
              <Text className='order-edit-packaging__limit'>
                最多 {ORDER_EDIT_PACKAGING_MAX_COUNT} 件
              </Text>
            </View>
            <View className='order-edit-packaging-stepper'>
              <AppPressable
                accessibilityLabel='减少打包件数'
                className='order-edit-packaging-stepper__button'
                disabled={packaging.count <= ORDER_EDIT_PACKAGING_MIN_COUNT}
                onPress={() => commitCount(packaging.count - 1)}
              >
                <AppIcon
                  color={APP_STYLE_COLORS.text.body}
                  name='minus'
                  size={APP_NATIVE_TOKENS.icon.small}
                />
              </AppPressable>
              <View className='order-edit-packaging-stepper__input-wrap'>
                <Input
                  className='order-edit-packaging-stepper__input'
                  maxlength={3}
                  type='number'
                  value={countText}
                  onBlur={() => commitCount(countText)}
                  onInput={event => handleCountInput(event.detail.value)}
                />
                <Text className='order-edit-packaging-stepper__unit'>件</Text>
              </View>
              <AppPressable
                accessibilityLabel='增加打包件数'
                className='order-edit-packaging-stepper__button'
                disabled={packaging.count >= ORDER_EDIT_PACKAGING_MAX_COUNT}
                onPress={() => commitCount(packaging.count + 1)}
              >
                <AppIcon
                  color={APP_STYLE_COLORS.text.body}
                  name='plus'
                  size={APP_NATIVE_TOKENS.icon.small}
                />
              </AppPressable>
            </View>
          </View>
          <Text className='order-edit-packaging__notice'>
            参考收费 {ORDER_EDIT_PACKAGING_UNIT_FEE}{' '}
            元/件，实际费用以后端修改结果和揽收确认结果为准。
          </Text>
        </View>
      ) : null}
    </View>
  )
}
