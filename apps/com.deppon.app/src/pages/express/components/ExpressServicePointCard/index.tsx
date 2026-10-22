import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import type { ExpressPickup } from '@/services/express'
import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { isValidCoordinate } from '@/shared/geo/coordinates'
import { getNativeCapabilityErrorMessage } from '@/shared/platform/capabilities'
import { openMapLocation } from '@/shared/platform/map'
import { dialPhone, PhoneNumberError } from '@/shared/platform/phone'
import { APP_NATIVE_TOKENS, APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

const STATION_NAME_PLACEHOLDER = '查看附近服务点'

export interface ExpressServicePointCardProps {
  pickup: ExpressPickup
  onOpenStations: () => void
}

/** 自送服务点信息卡：网点名、地址、营业时间与导航/拨号入口。 */
export function ExpressServicePointCard({ pickup, onOpenStations }: ExpressServicePointCardProps) {
  const detail = pickup.stationDetail
  const stationName = pickup.stationName || STATION_NAME_PLACEHOLDER
  const latitude = Number(detail?.latitude)
  const longitude = Number(detail?.longitude)
  const canNavigate = isValidCoordinate(latitude, longitude)
  const phone = detail?.phone ?? ''

  const handleDial = async () => {
    if (!phone) {
      Taro.showToast({ title: '该服务点暂无联系电话', icon: 'none' })
      return
    }

    try {
      await dialPhone(phone)
    } catch (error) {
      Taro.showToast({
        title: error instanceof PhoneNumberError ? error.message : getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    }
  }

  const handleNavigate = async () => {
    if (!canNavigate) {
      Taro.showToast({ title: '暂无法获取服务点坐标', icon: 'none' })
      return
    }

    try {
      await openMapLocation({
        source: 'EXPRESS_SERVICE_POINT',
        location: {
          latitude,
          longitude,
          name: stationName,
          address: detail?.address ?? '',
          coordinateSystem: 'bd09'
        }
      })
    } catch (error) {
      Taro.showToast({ title: getNativeCapabilityErrorMessage(error), icon: 'none' })
    }
  }

  return (
    <View className='express-service-point-card'>
      <View className='express-service-point-card__main'>
        <View className='express-service-point-card__copy'>
          <Text className='express-service-point-card__name' numberOfLines={1}>
            {stationName}
          </Text>
          {detail?.address ? (
            <Text className='express-service-point-card__address' numberOfLines={1}>
              {detail.address}
            </Text>
          ) : null}
        </View>

        <View className='express-service-point-card__actions'>
          <AppPressable accessibilityLabel='导航到自送服务点' className='express-service-point-card__action' onPress={handleNavigate}>
            <AppIcon color={APP_STYLE_COLORS.text.ink} name='send' size={APP_NATIVE_TOKENS.icon.default} />
            <Text className='express-service-point-card__action-text'>导航</Text>
          </AppPressable>
          <AppPressable
            accessibilityLabel='拨打自送服务点电话'
            className='express-service-point-card__action express-service-point-card__action--spaced'
            onPress={handleDial}
          >
            <AppIcon color={APP_STYLE_COLORS.text.ink} name='phone' size={APP_NATIVE_TOKENS.icon.default} />
            <Text className='express-service-point-card__action-text'>手机</Text>
          </AppPressable>
        </View>
      </View>

      <View className='express-service-point-card__foot'>
        {detail?.hours ? (
          <View className='express-service-point-card__hours'>
            <AppIcon color={APP_STYLE_COLORS.text.secondary} name='clock' size={APP_NATIVE_TOKENS.icon.small} />
            <Text className='express-service-point-card__hours-text'>{detail.hours}</Text>
          </View>
        ) : (
          <View className='express-service-point-card__hours' />
        )}

        <AppPressable accessibilityLabel='查看更多自送服务点' className='express-service-point-card__more' layout='row-center' onPress={onOpenStations}>
          <Text className='express-service-point-card__more-text'>更多网点</Text>
          <AppIcon color={APP_STYLE_COLORS.text.placeholder} name='chevronRight' size={APP_NATIVE_TOKENS.icon.small} />
        </AppPressable>
      </View>
    </View>
  )
}
