import { Text, View } from '@tarojs/components'

import type { ExpressProductQuoteView } from '@/services/express'
import { AppIcon } from '@/shared/components/AppIcon'
import { AppNativeSheet, AppNativePressable } from '@/shared/native'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

interface ExpressPriceDetailSheetProps {
  view: ExpressProductQuoteView
  /** 已选优惠券的抵扣文案（如「-¥1」），没有优惠时为空。 */
  couponDiscountText?: string
  visible: boolean
  onClose: () => void
}

/**
 * @description 预估费用明细弹层：与生产端一致，从页面底部上滑、蒙层不参与动画，底栏保持可见。
 */
export function ExpressPriceDetailSheet({ couponDiscountText = '', onClose, view, visible }: ExpressPriceDetailSheetProps) {
  const weightValue = view.billWeightText.replace(/^计费重量\s*/, '')

  return (
    <AppNativeSheet accessibilityLabel='关闭预估费用明细' visible={visible} onRequestClose={onClose}>
      <View className='express-price-sheet'>
        <View className='express-price-sheet__head'>
          <View className='express-price-sheet__heading'>
            <Text className='express-price-sheet__title'>预估费用明细</Text>
            <Text className='express-price-sheet__subtitle'>实际费用以快递员开单为准</Text>
          </View>
          <AppNativePressable accessibilityLabel='关闭预估费用明细' onPress={onClose}>
            <View className='express-price-sheet__close'>
              <AppIcon color={APP_STYLE_COLORS.text.placeholder} name='close' size={32} />
            </View>
          </AppNativePressable>
        </View>

        <View className='express-price-sheet__section'>
          <View className='express-price-sheet__row'>
            <Text className='express-price-sheet__section-title'>基础费用：</Text>
            <Text className='express-price-sheet__amount'>{view.priceText}</Text>
          </View>
          <View className='express-price-sheet__row'>
            <View className='express-price-sheet__label-group'>
              <Text className='express-price-sheet__label'>计费重量</Text>
              <Text className='express-price-sheet__label-accent'>(重量计费)</Text>
            </View>
            <Text className='express-price-sheet__value'>{weightValue}</Text>
          </View>
        </View>

        <View className='express-price-sheet__section'>
          <View className='express-price-sheet__row'>
            <Text className='express-price-sheet__section-title'>增值费用：</Text>
            <Text className='express-price-sheet__amount'>{view.feeRows.length ? '' : '¥--'}</Text>
          </View>
          {view.feeRows.map(row => (
            <View className='express-price-sheet__row' key={row.key}>
              <Text className='express-price-sheet__label'>{row.name}</Text>
              <Text className='express-price-sheet__value'>{`¥${row.amount}`}</Text>
            </View>
          ))}
          <Text className='express-price-sheet__note'>最终的包装和费用将以快递员揽收后实际使用为准</Text>
        </View>

        {couponDiscountText ? (
          <View className='express-price-sheet__section'>
            <View className='express-price-sheet__row'>
              <Text className='express-price-sheet__section-title'>优惠信息</Text>
              <Text className='express-price-sheet__discount'>{couponDiscountText}</Text>
            </View>
            <View className='express-price-sheet__row'>
              <Text className='express-price-sheet__label'>运费优惠券</Text>
              <Text className='express-price-sheet__discount'>{couponDiscountText}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </AppNativeSheet>
  )
}
