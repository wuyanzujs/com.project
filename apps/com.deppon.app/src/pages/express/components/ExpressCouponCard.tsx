import { Input, Text, View } from '@tarojs/components'

import { useEffect, useState } from 'react'

import { AppDialog, AppPressable } from '../../../shared/components'
import { AppIcon } from '../../../shared/components/AppIcon'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'
import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../styles/nativeTokens'

import type { CouponCardView, CouponStatus } from '../../../services/coupon'
import type { ExpressCouponController } from '../hooks/useExpressCoupons'

import './ExpressCouponCard.scss'
import './ExpressCouponDialog.scss'
import './ExpressCouponOptions.scss'

interface ExpressCouponCardProps {
  controller: ExpressCouponController
  couponNumber: string
}

interface CouponOptionProps {
  coupon: CouponCardView
  selected: boolean
  status: CouponStatus
  onDetail: (coupon: CouponCardView, status: CouponStatus) => void
  onSelect?: (coupon: CouponCardView) => void
}

function CouponOption({
  coupon,
  onDetail,
  onSelect,
  selected,
  status
}: CouponOptionProps) {
  return (
    <View
      className={
        selected
          ? 'express-coupon-option express-coupon-option--selected'
          : 'express-coupon-option'
      }
    >
      {onSelect ? (
        <AppPressable
          accessibilityLabel={`选择优惠券${coupon.title}`}
          block
          className='express-coupon-option__select'
          layout='row-start'
          onPress={() => onSelect(coupon)}
        >
          <View className='express-coupon-option__amount'>
            <Text className='express-coupon-option__value'>
              {coupon.amountValue}
            </Text>
            <Text className='express-coupon-option__unit'>
              {coupon.amountUnit}
            </Text>
          </View>
          <View className='express-coupon-option__content'>
            <Text className='express-coupon-option__title'>{coupon.title}</Text>
            <Text className='express-coupon-option__meta'>
              {coupon.thresholdText}
            </Text>
            <Text className='express-coupon-option__meta'>
              {coupon.validityText}
            </Text>
          </View>
          <Text className='express-coupon-option__state'>
            {selected ? '已选' : '选择'}
          </Text>
        </AppPressable>
      ) : (
        <View className='express-coupon-option__disabled'>
          <View className='express-coupon-option__amount'>
            <Text className='express-coupon-option__value'>
              {coupon.amountValue}
            </Text>
            <Text className='express-coupon-option__unit'>
              {coupon.amountUnit}
            </Text>
          </View>
          <View className='express-coupon-option__content'>
            <Text className='express-coupon-option__title'>{coupon.title}</Text>
            <Text className='express-coupon-option__meta'>
              {coupon.raw.useLimit?.[0] || coupon.thresholdText}
            </Text>
          </View>
          <Text className='express-coupon-option__unavailable'>不可用</Text>
        </View>
      )}
      <AppPressable
        accessibilityLabel={`查看优惠券${coupon.title}详情`}
        className='express-coupon-option__detail'
        onPress={() => onDetail(coupon, status)}
      >
        <Text className='express-coupon-option__detail-text'>使用详情</Text>
      </AppPressable>
    </View>
  )
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
    return `${controller.available.length}张可用`
  }

  return controller.loginRequired ? '登录后可选' : '暂无可用'
}

export function ExpressCouponCard({
  controller,
  couponNumber
}: ExpressCouponCardProps) {
  const [visible, setVisible] = useState(false)
  const [manualCode, setManualCode] = useState(couponNumber)

  useEffect(() => {
    setManualCode(couponNumber)
  }, [couponNumber, visible])

  const handleOpenDetail = (
    coupon: CouponCardView,
    status: CouponStatus
  ) => {
    setVisible(false)
    navigateToAppRoute(
      createAppRouteUrl(APP_ROUTES.couponDetail, {
        code: coupon.code,
        status
      }),
      { login: true }
    )
  }

  const handleApplyCode = () => {
    controller.onApplyCode(manualCode)
    setVisible(false)
  }

  return (
    <View className='express-coupon-card'>
      <View className='express-coupon-card__header'>
        <AppPressable
          accessibilityLabel='选择优惠券'
          block
          className='express-coupon-card__open'
          layout='row-start'
          onPress={() => setVisible(true)}
        >
          <View className='express-coupon-card__icon'>
            <AppIcon
              color={APP_STYLE_COLORS.brand.default}
              name='ticket'
              size={APP_NATIVE_TOKENS.icon.default}
            />
          </View>
          <View className='express-coupon-card__heading'>
            <Text className='express-coupon-card__title'>优惠券</Text>
            <Text className='express-coupon-card__summary'>
              {getCouponSummary(controller, couponNumber)}
            </Text>
          </View>
          <AppIcon
            color={APP_STYLE_COLORS.text.supporting}
            name='chevronRight'
            size={APP_NATIVE_TOKENS.icon.small}
          />
        </AppPressable>
        {controller.requestReady && !controller.loginRequired ? (
          <AppPressable
            accessibilityLabel='刷新可用优惠券'
            className='express-coupon-card__refresh'
            onPress={controller.onRefresh}
          >
            <AppIcon
              color={APP_STYLE_COLORS.text.secondary}
              name='refresh'
              size={APP_NATIVE_TOKENS.icon.small}
            />
          </AppPressable>
        ) : null}
      </View>

      {controller.message ? (
        <Text className='express-coupon-card__message'>
          {controller.message}
        </Text>
      ) : null}

      <AppDialog
        closeOnBackdropPress
        contentClassName='express-coupon-dialog__content'
        contentSpacing={false}
        placement='bottom'
        title='选择优惠券'
        visible={visible}
        footer={
          <AppPressable
            accessibilityLabel='关闭优惠券选择'
            block
            className='express-coupon-dialog__close'
            onPress={() => setVisible(false)}
          >
            <Text className='express-coupon-dialog__close-text'>关闭</Text>
          </AppPressable>
        }
        onClose={() => setVisible(false)}
      >
        <View className='express-coupon-dialog__manual'>
          <Input
            className='express-coupon-dialog__input'
            maxlength={40}
            placeholder='输入优惠券编号'
            style={{ minHeight: APP_NATIVE_TOKENS.touch.minimum }}
            value={manualCode}
            onInput={event => setManualCode(event.detail.value)}
          />
          <AppPressable
            accessibilityLabel='使用输入的优惠券编号'
            className='express-coupon-dialog__apply'
            onPress={handleApplyCode}
          >
            <Text className='express-coupon-dialog__apply-text'>使用券码</Text>
          </AppPressable>
        </View>

        {couponNumber ? (
          <AppPressable
            accessibilityLabel='不使用优惠券'
            block
            className='express-coupon-dialog__clear'
            onPress={() => {
              controller.onClear()
              setVisible(false)
            }}
          >
            <Text className='express-coupon-dialog__clear-text'>不使用优惠券</Text>
          </AppPressable>
        ) : null}

        {controller.loginRequired ? (
          <AppPressable
            accessibilityLabel='登录后查询优惠券'
            block
            className='express-coupon-dialog__login'
            onPress={controller.onLogin}
          >
            <Text className='express-coupon-dialog__login-text'>登录后查询我的优惠券</Text>
          </AppPressable>
        ) : null}

        {controller.available.length ? (
          <View className='express-coupon-dialog__section'>
            <Text className='express-coupon-dialog__section-title'>可用优惠券</Text>
            {controller.available.map(coupon => (
              <CouponOption
                coupon={coupon}
                key={coupon.code}
                selected={coupon.code === couponNumber}
                status='AVAILABLE'
                onDetail={handleOpenDetail}
                onSelect={controller.onSelect}
              />
            ))}
          </View>
        ) : null}

        {controller.unavailable.length ? (
          <View className='express-coupon-dialog__section'>
            <Text className='express-coupon-dialog__section-title'>暂不可用</Text>
            {controller.unavailable.map(coupon => (
              <CouponOption
                coupon={coupon}
                key={coupon.code}
                selected={false}
                status='UN_AVAILABLE'
                onDetail={handleOpenDetail}
              />
            ))}
          </View>
        ) : null}

        {!controller.available.length && !controller.unavailable.length ? (
          <Text className='express-coupon-dialog__empty'>
            {controller.message || '获取产品价格后可查询适用优惠券'}
          </Text>
        ) : null}
      </AppDialog>
    </View>
  )
}
