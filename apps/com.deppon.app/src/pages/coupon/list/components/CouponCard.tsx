import { Text, View } from '@tarojs/components'

import { CouponCardActions } from './CouponCardActions'

import type { CouponCardView } from '../../../../services/coupon'

import './CouponCard.scss'

interface CouponCardProps {
  coupon: CouponCardView
  onOpenDetail: (coupon: CouponCardView) => void
  onUse: (coupon: CouponCardView) => void
}

export function CouponCard({
  coupon,
  onOpenDetail,
  onUse
}: CouponCardProps) {
  return (
    <View className='coupon-card'>
      {coupon.labelText && (
        <View className='coupon-card__ribbon'>
          <Text className='coupon-card__ribbon-text'>{coupon.labelText}</Text>
        </View>
      )}

      <View className='coupon-card__main'>
        <View
          className={
            coupon.canUse
              ? 'coupon-card__amount'
              : 'coupon-card__amount coupon-card__amount--disabled'
          }
        >
          <View className='coupon-card__amount-row'>
            <Text className='coupon-card__amount-value'>
              {coupon.amountValue}
            </Text>
            <Text className='coupon-card__amount-unit'>
              {coupon.amountUnit}
            </Text>
          </View>
          <Text className='coupon-card__amount-desc'>
            {coupon.thresholdText}
          </Text>
        </View>

        <View className='coupon-card__info'>
          <View className='coupon-card__title-row'>
            <Text className='coupon-card__title'>{coupon.typeName}</Text>
            <Text className='coupon-card__status'>{coupon.statusText}</Text>
          </View>
          <Text className='coupon-card__desc'>{coupon.title}</Text>
          <Text className='coupon-card__time'>{coupon.validityText}</Text>

          {coupon.tags.length > 0 && (
            <View className='coupon-card__tags'>
              {coupon.tags.map(tag => (
                <Text className='coupon-card__tag' key={tag}>
                  {tag}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>

      <CouponCardActions
        coupon={coupon}
        onOpenDetail={onOpenDetail}
        onUse={onUse}
      />
    </View>
  )
}
