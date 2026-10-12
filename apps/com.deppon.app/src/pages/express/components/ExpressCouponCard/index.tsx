import { Image, Text, View } from '@tarojs/components'

import { useState } from 'react'

import { AppPressable } from '@/shared/components'
import { APP_IMAGE_ICONS } from '@/shared/components/AppIcon'

import { ExpressCouponSheet } from '../ExpressCouponSheet'

import type { ExpressCouponController } from '../../hooks/useExpressCoupons'

import './index.scss'

interface ExpressCouponCardProps {
  controller: ExpressCouponController
  couponNumber: string
}

function getCouponSummary(
  controller: ExpressCouponController,
  couponNumber: string
) {
  if (couponNumber) {
    const displayCode =
      couponNumber.length > 18
        ? `${couponNumber.slice(0, 10)}...${couponNumber.slice(-4)}`
        : couponNumber

    return `已选 ${displayCode}`
  }

  if (controller.status === 'loading') {
    return '正在匹配'
  }

  if (controller.available.length) {
    return `${controller.available.length}张待使用`
  }

  return controller.loginRequired ? '登录后可选' : '暂无可用'
}

// 生产端选中券后展示红色优惠金额「-¥3」（prod_scroll_coupon.png 量测），非胶囊徽标。
function isCouponHighlighted(
  controller: ExpressCouponController,
  couponNumber: string
) {
  return Boolean(couponNumber) || controller.available.length > 0
}

// 已选券面额展示：现金券为「-¥{面额}」，非现金单位（如折）保持「{面额}{单位}」。
function getSelectedCouponText(
  controller: ExpressCouponController,
  couponNumber: string
) {
  const selectedCoupon = couponNumber
    ? controller.available.find(coupon => coupon.code === couponNumber)
    : undefined

  if (!selectedCoupon) {
    return null
  }

  return selectedCoupon.amountUnit === '¥'
    ? `-¥${selectedCoupon.amountValue}`
    : `${selectedCoupon.amountValue}${selectedCoupon.amountUnit}`
}

export function ExpressCouponCard({
  controller,
  couponNumber
}: ExpressCouponCardProps) {
  const [visible, setVisible] = useState(false)

  const summary = getCouponSummary(controller, couponNumber)
  const highlighted = isCouponHighlighted(controller, couponNumber)
  // 已选券时优先展示生产端同款优惠金额，匹配不到券时回退券摘要。
  const selectedCouponText = getSelectedCouponText(controller, couponNumber)
  // 生产 App 只在有券可用时提示补全信息，出错提示错误；暂无可用不留提示行。
  const hintText = couponNumber
    ? ''
    : controller.status === 'error' && controller.message
      ? controller.message
      : controller.available.length > 0
        ? '填写收寄信息和物品名称后点击使用'
        : ''

  return (
    <View className='express-coupon-row'>
      <AppPressable
        accessibilityLabel='选择优惠券'
        block
        className='express-coupon-row__entry'
        layout='row-start'
        onPress={() => setVisible(true)}
      >
        <Text className='express-coupon-row__label'>优惠券</Text>
        <View className='express-coupon-row__spacer' />
        <Text
          className={
            highlighted
              ? 'express-coupon-row__badge express-coupon-row__badge--active'
              : 'express-coupon-row__badge'
          }
          numberOfLines={1}
        >
          {selectedCouponText ?? summary}
        </Text>
        <Image
          className='express-coupon-row__arrow'
          mode='aspectFit'
          src={APP_IMAGE_ICONS.arrowRightGrey}
        />
      </AppPressable>

      {hintText ? (
        <Text className='express-coupon-row__hint'>{hintText}</Text>
      ) : null}

      <ExpressCouponSheet
        controller={controller}
        couponNumber={couponNumber}
        visible={visible}
        onClose={() => setVisible(false)}
      />
    </View>
  )
}
