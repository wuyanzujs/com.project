import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'

import type { CouponCardView } from '../../../../services/coupon'

import './CouponCardActions.scss'

interface CouponCardActionsProps {
  coupon: CouponCardView
  onOpenDetail: (coupon: CouponCardView) => void
  onUse: (coupon: CouponCardView) => void
}

export function CouponCardActions({
  coupon,
  onOpenDetail,
  onUse
}: CouponCardActionsProps) {
  return (
    <View className='coupon-card__footer'>
      <Text className='coupon-card__code'>券码 {coupon.code || '--'}</Text>
      <AppPressable
        accessibilityLabel='查看优惠券详情'
        className='coupon-card__button coupon-card__button--ghost'
        onPress={() => onOpenDetail(coupon)}
      >
        <Text className='coupon-card__button-text coupon-card__button-text--ghost'>
          详情
        </Text>
      </AppPressable>
      <AppPressable
        accessibilityLabel={coupon.canUse ? '使用优惠券' : coupon.statusText}
        allowDisabledPress={!coupon.canUse}
        disabled={!coupon.canUse}
        className={
          coupon.canUse
            ? 'coupon-card__button'
            : 'coupon-card__button coupon-card__button--disabled'
        }
        onPress={() => onUse(coupon)}
      >
        <Text
          className={
            coupon.canUse
              ? 'coupon-card__button-text'
              : 'coupon-card__button-text coupon-card__button-text--disabled'
          }
        >
          {coupon.canUse ? '去使用' : coupon.statusText}
        </Text>
      </AppPressable>
    </View>
  )
}
