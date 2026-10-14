import { Image, Text, View } from '@tarojs/components'

import { AppPressable } from '@/shared/components'

import './index.scss'

// 与生产端一致：雨云动图 + 蓝字提示 + 右箭头，点击进入货物信息。
const WEATHER_RAIN_ICON = 'https://ca.deppon.com.cn/ows/assets/express/27.gif'
const WEATHER_ARROW = 'https://ca.deppon.com.cn/ows/assets/express/26.png'

interface ExpressWeatherBannerProps {
  text: string
  onPress: () => void
}

export function ExpressWeatherBanner({ text, onPress }: ExpressWeatherBannerProps) {
  if (!text) {
    return null
  }

  return (
    <View className='express-weather-banner'>
      <AppPressable accessibilityLabel={`天气提示${text}`} block className='express-weather-banner__inner' layout='row-start' onPress={onPress}>
        <Image className='express-weather-banner__icon' mode='aspectFit' src={WEATHER_RAIN_ICON} />
        <Text className='express-weather-banner__text' numberOfLines={1}>
          {text}
        </Text>
        <Image className='express-weather-banner__arrow' mode='aspectFit' src={WEATHER_ARROW} />
      </AppPressable>
    </View>
  )
}
