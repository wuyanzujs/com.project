import { Switch, Text, View } from '@tarojs/components'

import type { ExpressFlag } from '@/services/express'
import { AppPressable } from '@/shared/components'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

interface ExpressPrivacyCardProps {
  value: ExpressFlag
  onChange: (value: ExpressFlag) => void
  onOpenTerms: () => void
}

export function ExpressPrivacyCard({
  value,
  onChange,
  onOpenTerms
}: ExpressPrivacyCardProps) {
  return (
    <View className='express-privacy-card'>
      <View className='express-privacy-card__head'>
        <Text className='express-privacy-card__title'>收寄件信息加密</Text>
        <Switch
          checked={value === 'Y'}
          color={APP_STYLE_COLORS.brand.default}
          onChange={event => onChange(event.detail.value ? 'Y' : 'N')}
        />
      </View>
      <View className='express-privacy-card__desc'>
        <Text className='express-privacy-card__desc-text'>
          纸质单和德邦自助查单渠道(APP/小程序等)均会对收寄双方姓名/电话/地址进行隐藏处理，开启即同意
        </Text>
        <AppPressable
          accessibilityLabel='查看信息加密说明'
          className='express-privacy-card__terms'
          onPress={onOpenTerms}
        >
          <Text className='express-privacy-card__link'>《信息加密说明》</Text>
        </AppPressable>
        <Text className='express-privacy-card__desc-text'>。</Text>
      </View>
    </View>
  )
}
