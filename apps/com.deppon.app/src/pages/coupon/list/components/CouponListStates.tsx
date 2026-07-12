import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'
import './CouponListStates.scss'

interface CouponListStatesProps {
  emptyTitle: string
  hasCoupons: boolean
  loading: boolean
  openingWelfare: boolean
  onOpenWelfare: () => void
}

export function CouponListStates({
  emptyTitle,
  hasCoupons,
  loading,
  onOpenWelfare,
  openingWelfare
}: CouponListStatesProps) {
  return (
    <>
      {!hasCoupons && !loading && (
        <View className='coupon-empty'>
          <Text className='coupon-empty__title'>{emptyTitle}</Text>
          <Text className='coupon-empty__summary'>
            可通过兑换码领取优惠券，或前往福利中心查看可领取权益。
          </Text>
          <AppPressable
            accessibilityLabel='去福利中心领券'
            className='coupon-empty__button'
            onPress={onOpenWelfare}
          >
            <Text className='coupon-empty__button-text'>
              {openingWelfare ? '打开中' : '去福利中心领券'}
            </Text>
          </AppPressable>
        </View>
      )}

      {loading && (
        <Text className='coupon-loading'>
          {hasCoupons ? '正在刷新优惠券...' : '正在加载优惠券...'}
        </Text>
      )}
    </>
  )
}
