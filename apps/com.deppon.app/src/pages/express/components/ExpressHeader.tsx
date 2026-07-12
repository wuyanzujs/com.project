import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../shared/components'
import { AppIcon } from '../../../shared/components/AppIcon'
import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../styles/nativeTokens'

import './ExpressHeader.scss'

interface ExpressHeaderProps {
  priceText: string
  onOpenRealName: () => void
  onOpenBatch: () => void
  onOpenHelp: () => void
  onOpenTemplates: () => void
  onSaveTemplate: () => void
}

export function ExpressHeader({
  priceText,
  onOpenRealName,
  onOpenBatch,
  onOpenHelp,
  onOpenTemplates,
  onSaveTemplate
}: ExpressHeaderProps) {
  return (
    <View className='express-header'>
      <View className='express-header__notice'>
        <View className='express-header__notice-copy'>
          <AppIcon
            color={APP_STYLE_COLORS.status.warningText}
            name='badgeCheck'
            size={APP_NATIVE_TOKENS.icon.small}
          />
          <Text className='express-header__notice-text'>
            根据相关法律法规要求，寄件须实名认证。推荐您提前线上实名，一次实名长期有效，寄件更便捷。
          </Text>
        </View>
        <AppPressable
          accessibilityLabel='立即进行实名认证'
          className='express-header__real-name'
          onPress={onOpenRealName}
        >
          <Text className='express-header__real-name-text'>立即实名</Text>
        </AppPressable>
      </View>

      <View className='express-header__quick-row'>
        <AppPressable
          accessibilityLabel='常规下单'
          className='express-header__quick express-header__quick--active'
          layout='row-center'
          selected
        >
          <Text className='express-header__quick-text express-header__quick-text--active'>
            常规下单
          </Text>
        </AppPressable>
        <AppPressable
          accessibilityLabel='批量寄件'
          className='express-header__quick'
          layout='row-center'
          onPress={onOpenBatch}
        >
          <AppIcon
            color={APP_STYLE_COLORS.text.secondary}
            name='packagePlus'
            size={APP_NATIVE_TOKENS.icon.small}
          />
          <Text className='express-header__quick-text'>批量寄</Text>
        </AppPressable>
        <AppPressable
          accessibilityLabel='查看寄件操作说明'
          className='express-header__quick express-header__quick--help'
          layout='row-center'
          onPress={onOpenHelp}
        >
          <Text className='express-header__quick-text'>如何操作?</Text>
        </AppPressable>
        <AppPressable
          accessibilityLabel='打开寄件模板库，长按保存当前模板'
          className='express-header__quick'
          layout='row-center'
          onLongPress={onSaveTemplate}
          onPress={onOpenTemplates}
        >
          <Text className='express-header__quick-text'>模板库</Text>
          <AppIcon
            color={APP_STYLE_COLORS.text.secondary}
            name='fileCheck'
            size={APP_NATIVE_TOKENS.icon.small}
          />
        </AppPressable>
        <AppPressable
          accessibilityLabel='保存当前寄件模板'
          className='express-header__quick express-header__quick--save'
          layout='row-center'
          onPress={onSaveTemplate}
        >
          <AppIcon
            color={APP_STYLE_COLORS.text.secondary}
            name='save'
            size={APP_NATIVE_TOKENS.icon.small}
          />
          <Text className='express-header__quick-text'>保存</Text>
        </AppPressable>
        {priceText ? (
          <Text className='express-header__price'>{priceText}</Text>
        ) : null}
      </View>
    </View>
  )
}
