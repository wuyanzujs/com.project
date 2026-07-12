import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../shared/components'
import { AppIcon } from '../../../shared/components/AppIcon'
import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../styles/nativeTokens'

import type { ExpressDraft, ExpressFlag } from '../../../services/express'

import './ExpressPickupSection.scss'

export interface ExpressPickupSectionProps {
  pickup: ExpressDraft['pickup']
  needContact: ExpressFlag
  onModeChange: (dispatch: ExpressFlag) => void
  onQueryPickupTime: () => void
  onNeedContactChange: (needContact: ExpressFlag) => void
  onOpenStations: () => void
}

const CONTACT_OPTIONS: Array<{ label: string; value: ExpressFlag }> = [
  { label: '联系', value: 'Y' },
  { label: '不联系', value: 'N' }
]

export function ExpressPickupSection({
  pickup,
  needContact,
  onModeChange,
  onQueryPickupTime,
  onNeedContactChange,
  onOpenStations
}: ExpressPickupSectionProps) {
  const isDoorPickup = pickup.dispatch === 'Y'
  const pickupTime = pickup.timeSlot || pickup.time || '今天 一小时内'
  const stationName = pickup.stationName || '查看附近服务点'

  return (
    <View className='express-pickup-section'>
      <View className='express-pickup-section__modes'>
        <AppPressable
          accessibilityLabel='选择上门取件'
          className={
            isDoorPickup
              ? 'express-pickup-section__mode express-pickup-section__mode--active'
              : 'express-pickup-section__mode'
          }
          flex
          onPress={() => onModeChange('Y')}
        >
          <Text
            className={
              isDoorPickup
                ? 'express-pickup-section__mode-text express-pickup-section__mode-text--active'
                : 'express-pickup-section__mode-text'
            }
          >
            上门取件
          </Text>
        </AppPressable>
        <AppPressable
          accessibilityLabel='选择自送服务点'
          className={
            isDoorPickup
              ? 'express-pickup-section__mode'
              : 'express-pickup-section__mode express-pickup-section__mode--active'
          }
          flex
          onPress={() => onModeChange('N')}
        >
          <Text
            className={
              isDoorPickup
                ? 'express-pickup-section__mode-text'
                : 'express-pickup-section__mode-text express-pickup-section__mode-text--active'
            }
          >
            自送服务点
          </Text>
        </AppPressable>
      </View>

      {isDoorPickup ? (
        <View className='express-pickup-section__body'>
          <AppPressable
            accessibilityLabel={`期望上门时间${pickupTime}`}
            block
            className='express-pickup-section__row'
            layout='row-start'
            onPress={onQueryPickupTime}
          >
            <AppIcon
              color={APP_STYLE_COLORS.brand.default}
              name='clock'
              size={APP_NATIVE_TOKENS.icon.small}
            />
            <Text className='express-pickup-section__label'>期望上门时间</Text>
            <Text className='express-pickup-section__value' numberOfLines={1}>
              {pickupTime}
            </Text>
            <View className='express-pickup-section__chevron'>
              <AppIcon
                color={APP_STYLE_COLORS.text.supporting}
                name='chevronDown'
                size={APP_NATIVE_TOKENS.icon.small}
              />
            </View>
          </AppPressable>

          <View className='express-pickup-section__contact-row'>
            <View className='express-pickup-section__contact-label'>
              <Text className='express-pickup-section__label express-pickup-section__label--contact'>
                提前电话联系
              </Text>
              <Text className='express-pickup-section__required'>必填</Text>
            </View>
            <View className='express-pickup-section__contact-options'>
              {CONTACT_OPTIONS.map(option => {
                const selected = needContact === option.value

                return (
                  <AppPressable
                    accessibilityLabel={`取件前${option.label}`}
                    className='express-pickup-section__contact-option'
                    key={option.value}
                    layout='row-center'
                    selected={selected}
                    onPress={() => onNeedContactChange(option.value)}
                  >
                    <View
                      className={
                        selected
                          ? 'express-pickup-section__radio express-pickup-section__radio--active'
                          : 'express-pickup-section__radio'
                      }
                    />
                    <Text className='express-pickup-section__contact-text'>
                      {option.label}
                    </Text>
                  </AppPressable>
                )
              })}
            </View>
          </View>
        </View>
      ) : (
        <View className='express-pickup-section__body'>
          <AppPressable
            accessibilityLabel={`选择自送服务点${stationName}`}
            block
            className='express-pickup-section__row express-pickup-section__row--station'
            layout='row-start'
            onPress={onOpenStations}
          >
            <AppIcon
              color={APP_STYLE_COLORS.brand.default}
              name='mapPin'
              size={APP_NATIVE_TOKENS.icon.small}
            />
            <Text className='express-pickup-section__label'>自送服务点</Text>
            <Text className='express-pickup-section__value' numberOfLines={1}>
              {stationName}
            </Text>
            <View className='express-pickup-section__chevron'>
              <AppIcon
                color={APP_STYLE_COLORS.text.supporting}
                name='chevronDown'
                size={APP_NATIVE_TOKENS.icon.small}
              />
            </View>
          </AppPressable>
        </View>
      )}
    </View>
  )
}
