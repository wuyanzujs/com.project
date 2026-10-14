import { Text, View } from '@tarojs/components'

import type { ExpressFlag } from '@/services/express'
import { AppPressable, AppSwitch } from '@/shared/components'

import './index.scss'

interface ExpressPrivacyCardProps {
  value: ExpressFlag
  onChange: (value: ExpressFlag) => void
  onOpenTerms: () => void
}

export function ExpressPrivacyCard({ value, onChange, onOpenTerms }: ExpressPrivacyCardProps) {
  return (
    <View className='express-privacy-card'>
      <View className='express-privacy-card__head'>
        <Text className='express-privacy-card__title'>收寄件信息加密</Text>
        <AppSwitch accessibilityLabel='收寄件信息加密' checked={value === 'Y'} onChange={checked => onChange(checked ? 'Y' : 'N')} />
      </View>
      {/* 生产端这段是行内文本流：链接跟着文字排版，不能用 flex 子元素（会整块换行）。 */}
      {/* 生产端这段是行内文本流：链接跟着文字排版，不能拆成 flex 子元素（会整块换行）。
          项目禁止 Taro 原生点击控件，所以整段用 AppPressable 承载点击。 */}
      <AppPressable accessibilityLabel='查看信息加密说明' className='express-privacy-card__desc' layout='column-start' onPress={onOpenTerms}>
        <Text className='express-privacy-card__desc-text'>
          纸质单和德邦自助查单渠道(APP/小程序等)均会对收寄双方姓名/电话/地址进行隐藏处理，开启即同意
          <Text className='express-privacy-card__link'>《信息加密说明》</Text>。
        </Text>
      </AppPressable>
    </View>
  )
}
