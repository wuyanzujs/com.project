import { Image, Text, View } from '@tarojs/components'

import { useState } from 'react'

import type { ExpressDraft, ExpressFlag } from '@/services/express'
import { AppPressable } from '@/shared/components'
import { AppIcon, APP_IMAGE_ICONS } from '@/shared/components/AppIcon'
import { APP_NATIVE_TOKENS, APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { ExpressPickupTimeSheet } from '../ExpressPickupTimeSheet'

import type { ExpressPickupTimeController } from '../../hooks/useExpressPickupTime'

import './index.scss'

export interface ExpressPickupSectionProps {
  pickup: ExpressDraft['pickup']
  pickupTimeController: ExpressPickupTimeController
  needContact: ExpressFlag
  // 取件时段依赖寄件地址，生产 App 在未选寄件地址前不展示时间入口。
  hasSenderAddress: boolean
  onModeChange: (dispatch: ExpressFlag) => void
  onNeedContactChange: (needContact: ExpressFlag) => void
  onOpenStations: () => void
}

const CONTACT_OPTIONS: Array<{ label: string; value: ExpressFlag }> = [
  { label: '联系', value: 'Y' },
  { label: '不联系', value: 'N' }
]

export function ExpressPickupSection({
  pickup,
  pickupTimeController,
  needContact,
  hasSenderAddress,
  onModeChange,
  onNeedContactChange,
  onOpenStations
}: ExpressPickupSectionProps) {
  const isDoorPickup = pickup.dispatch === 'Y'
  // 生产端「期望上门时间」行点击打开底部弹窗，不在页内展开时段面板。
  const [timeSheetVisible, setTimeSheetVisible] = useState(false)
  const pickupTime = pickup.timeSlot || pickup.time || '今天 一小时内'
  const stationName = pickup.stationName || '查看附近服务点'

  const handleOpenTimeSheet = () => {
    setTimeSheetVisible(true)
    pickupTimeController.onQuery()
  }

  return (
    <View className='express-pickup-section'>
      <View className='express-pickup-section__modes'>
        {/* 生产端分段器三件套：顶部灰垫片衬出白盖片凸角露出的灰、主灰块带 32 底圆角、白盖片 32 凸角压顶。 */}
        <View
          className={
            isDoorPickup
              ? 'express-pickup-section__notch express-pickup-section__notch--top-right'
              : 'express-pickup-section__notch express-pickup-section__notch--top-left'
          }
        />
        <View
          className={
            isDoorPickup
              ? 'express-pickup-section__notch express-pickup-section__notch--main-right'
              : 'express-pickup-section__notch express-pickup-section__notch--main-left'
          }
        />
        <View
          className={
            isDoorPickup ? 'express-pickup-section__cap express-pickup-section__cap--left' : 'express-pickup-section__cap express-pickup-section__cap--right'
          }
        />
        <AppPressable
          accessibilityLabel='选择上门取件'
          className={isDoorPickup ? 'express-pickup-section__mode express-pickup-section__mode--active' : 'express-pickup-section__mode'}
          flex
          onPress={() => onModeChange('Y')}
        >
          <Text className={isDoorPickup ? 'express-pickup-section__mode-text express-pickup-section__mode-text--active' : 'express-pickup-section__mode-text'}>
            上门取件
          </Text>
        </AppPressable>
        <AppPressable
          accessibilityLabel='选择自送服务点'
          className={isDoorPickup ? 'express-pickup-section__mode' : 'express-pickup-section__mode express-pickup-section__mode--active'}
          flex
          onPress={() => onModeChange('N')}
        >
          <Text className={isDoorPickup ? 'express-pickup-section__mode-text' : 'express-pickup-section__mode-text express-pickup-section__mode-text--active'}>
            自送服务点
          </Text>
        </AppPressable>
      </View>

      {isDoorPickup ? (
        <View className='express-pickup-section__body'>
          {hasSenderAddress ? (
            <>
              <AppPressable
                accessibilityLabel={`期望上门时间${pickupTime}`}
                block
                className='express-pickup-section__row'
                layout='row-start'
                onPress={handleOpenTimeSheet}
              >
                <Text className='express-pickup-section__label express-pickup-section__label--flush'>期望上门时间</Text>
                <Text className='express-pickup-section__value' numberOfLines={1}>
                  {pickupTime}
                </Text>
                <Image className='express-pickup-section__chevron' mode='aspectFit' src={APP_IMAGE_ICONS.arrowRightGrey} />
              </AppPressable>

              <ExpressPickupTimeSheet controller={pickupTimeController} visible={timeSheetVisible} onClose={() => setTimeSheetVisible(false)} />
            </>
          ) : null}

          <View className='express-pickup-section__contact-row'>
            <View className='express-pickup-section__contact-label'>
              <Text className='express-pickup-section__label express-pickup-section__label--flush'>提前电话联系</Text>
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
                    <View className={selected ? 'express-pickup-section__radio express-pickup-section__radio--active' : 'express-pickup-section__radio'}>
                      {selected ? <View className='express-pickup-section__radio-dot' /> : null}
                    </View>
                    <Text className='express-pickup-section__contact-text'>{option.label}</Text>
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
            <AppIcon color={APP_STYLE_COLORS.brand.default} name='mapPin' size={APP_NATIVE_TOKENS.icon.small} />
            <Text className='express-pickup-section__label'>自送服务点</Text>
            <Text className='express-pickup-section__value' numberOfLines={1}>
              {stationName}
            </Text>
            <Image className='express-pickup-section__chevron' mode='aspectFit' src={APP_IMAGE_ICONS.arrowRightGrey} />
          </AppPressable>
        </View>
      )}
    </View>
  )
}
