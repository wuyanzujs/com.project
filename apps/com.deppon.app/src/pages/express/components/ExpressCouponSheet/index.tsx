import { Image, Text, View } from '@tarojs/components'

import { useState } from 'react'

import type { CouponCardView, CouponStatus } from '@/services/coupon'
import { AppPressable } from '@/shared/components'
import { APP_IMAGE_ICONS } from '@/shared/components/AppIcon'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'

import { ExpressSheet } from '../ExpressSheet'

import type { ExpressCouponController } from '../../hooks/useExpressCoupons'

import './index.scss'

interface ExpressCouponSheetProps {
  visible: boolean
  controller: ExpressCouponController
  couponNumber: string
  onClose: () => void
}

interface CouponOptionProps {
  coupon: CouponCardView
  selected: boolean
  status: CouponStatus
  onDetail: (coupon: CouponCardView, status: CouponStatus) => void
  onSelect?: (coupon: CouponCardView) => void
}

function CouponOption({ coupon, onDetail, onSelect, selected, status }: CouponOptionProps) {
  const available = status === 'AVAILABLE' && Boolean(onSelect)
  const ribbon = coupon.raw.label === 'recommended' ? '最优惠' : coupon.raw.label === 'will_expire' ? '即将到期' : ''
  const discountText = available && coupon.raw.optimalFee ? `本单可减${coupon.raw.optimalFee / 100}元` : ''
  // 描述行由使用门槛和券副标题组成。
  const description = [coupon.thresholdText, coupon.title && coupon.title !== coupon.typeName ? coupon.title : ''].filter(Boolean).join('，')
  const unavailableNote = !available && coupon.raw.useLimit?.length ? `禁用说明：${coupon.raw.useLimit.join('，')}。` : ''

  const body = (
    <>
      <View className='express-coupon-sheet__left'>
        <View className='express-coupon-sheet__fee'>
          <Text className={available ? 'express-coupon-sheet__fee-value' : 'express-coupon-sheet__fee-value express-coupon-sheet__fee-value--disabled'}>
            {coupon.amountValue}
          </Text>
          <Text className={available ? 'express-coupon-sheet__fee-unit' : 'express-coupon-sheet__fee-unit express-coupon-sheet__fee-unit--disabled'}>
            {coupon.amountUnit}
          </Text>
        </View>
        {discountText ? <Text className='express-coupon-sheet__discount'>{discountText}</Text> : null}
      </View>

      <View className='express-coupon-sheet__divider' />

      <View className={available ? 'express-coupon-sheet__right' : 'express-coupon-sheet__right express-coupon-sheet__right--disabled'}>
        <Text className='express-coupon-sheet__name'>{coupon.typeName}</Text>
        {description ? <Text className='express-coupon-sheet__description'>{description}</Text> : null}
        <View className='express-coupon-sheet__meta'>
          <Text className='express-coupon-sheet__validity'>{coupon.validityText}</Text>
          <AppPressable accessibilityLabel={`查看${coupon.typeName}使用说明`} className='express-coupon-sheet__detail' onPress={() => onDetail(coupon, status)}>
            <Text className='express-coupon-sheet__detail-text'>使用说明</Text>
            <Image className='express-coupon-sheet__detail-arrow' mode='aspectFit' src={APP_IMAGE_ICONS.arrowRightGrey} />
          </AppPressable>
        </View>
      </View>
    </>
  )

  return (
    <View className='express-coupon-sheet__item'>
      <View className={selected && available ? 'express-coupon-sheet__card express-coupon-sheet__card--selected' : 'express-coupon-sheet__card'}>
        {ribbon && available ? (
          <View
            className={
              ribbon === '最优惠'
                ? 'express-coupon-sheet__ribbon express-coupon-sheet__ribbon--red'
                : 'express-coupon-sheet__ribbon express-coupon-sheet__ribbon--orange'
            }
          >
            <Text className='express-coupon-sheet__ribbon-text'>{ribbon}</Text>
          </View>
        ) : null}

        {available ? (
          <AppPressable
            accessibilityLabel={`选择${coupon.typeName}`}
            block
            className='express-coupon-sheet__card-body'
            layout='row-start'
            onPress={() => onSelect?.(coupon)}
          >
            {body}
          </AppPressable>
        ) : (
          <View className='express-coupon-sheet__card-body'>{body}</View>
        )}

        {unavailableNote ? <Text className='express-coupon-sheet__note'>{unavailableNote}</Text> : null}
      </View>
    </View>
  )
}

export function ExpressCouponSheet({ controller, couponNumber, onClose, visible }: ExpressCouponSheetProps) {
  const [draftCode, setDraftCode] = useState('')
  const [prevVisible, setPrevVisible] = useState(false)

  // 打开瞬间以当前生效券码作为弹窗内暂存选中，确定时才提交。
  if (visible !== prevVisible) {
    setPrevVisible(visible)

    if (visible) {
      setDraftCode(couponNumber)
    }
  }

  const handleOpenDetail = (coupon: CouponCardView, status: CouponStatus) => {
    onClose()
    navigateToAppRoute(
      createAppRouteUrl(APP_ROUTES.couponDetail, {
        code: coupon.code,
        status
      }),
      { login: true }
    )
  }

  const handleClear = () => {
    controller.onClear()
    onClose()
  }

  const handleConfirm = () => {
    if (draftCode && draftCode !== couponNumber) {
      const coupon = controller.available.find(item => item.code === draftCode)

      if (coupon) {
        controller.onSelect(coupon)
      }
    }

    onClose()
  }

  // 已选优惠券置顶展示。
  const orderedAvailable = [...controller.available.filter(item => item.code === draftCode), ...controller.available.filter(item => item.code !== draftCode)]

  return (
    <ExpressSheet
      bodyClassName='express-coupon-sheet__list'
      title='选择优惠券'
      titleSize={42}
      visible={visible}
      footer={
        <View className='express-coupon-sheet__actions'>
          <AppPressable accessibilityLabel='不使用优惠券' className='express-coupon-sheet__cancel' onPress={handleClear}>
            <Text className='express-coupon-sheet__cancel-text'>不使用</Text>
          </AppPressable>
          <AppPressable accessibilityLabel='确定所选优惠券' className='express-coupon-sheet__confirm' onPress={handleConfirm}>
            <Text className='express-coupon-sheet__confirm-text'>确定</Text>
          </AppPressable>
        </View>
      }
      onClose={onClose}
    >
      {controller.loginRequired ? (
        <AppPressable accessibilityLabel='登录后查询优惠券' block className='express-coupon-sheet__login' onPress={controller.onLogin}>
          <Text className='express-coupon-sheet__login-text'>登录后查询我的优惠券</Text>
        </AppPressable>
      ) : null}

      {orderedAvailable.map(coupon => (
        <CouponOption
          coupon={coupon}
          key={coupon.code}
          selected={coupon.code === draftCode}
          status='AVAILABLE'
          onDetail={handleOpenDetail}
          onSelect={controller.onSelect}
        />
      ))}

      {controller.unavailable.map(coupon => (
        <CouponOption coupon={coupon} key={coupon.code} selected={false} status='UN_AVAILABLE' onDetail={handleOpenDetail} />
      ))}

      {!controller.available.length && !controller.unavailable.length ? (
        <Text className='express-coupon-sheet__empty'>{controller.message || '获取产品价格后可查询适用优惠券'}</Text>
      ) : (
        <View className='express-coupon-sheet__end'>
          <Text className='express-coupon-sheet__end-text'>已经到底了</Text>
        </View>
      )}
    </ExpressSheet>
  )
}
