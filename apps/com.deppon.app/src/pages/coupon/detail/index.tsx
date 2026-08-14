import { ScrollView, Text, View } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'

import { useMemo } from 'react'

import type { CouponStatus } from '@/services/coupon'
import { AppPressable } from '@/shared/components'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'

import { useCouponDetail } from './hooks/useCouponDetail'

import './index.scss'
import './content.scss'

const ROUTE_STATUSES: CouponStatus[] = [
  'AVAILABLE',
  'UN_AVAILABLE',
  'USABLE',
  'USED',
  'EXPIRED'
]

const STATUS_TEXT: Record<CouponStatus, string> = {
  AVAILABLE: '可使用',
  UN_AVAILABLE: '不可用',
  USABLE: '可使用',
  USED: '已使用',
  EXPIRED: '已过期'
}

interface DetailFieldProps {
  title: string
  value: string
  emptyText: string
}

interface DetailSectionProps {
  title: string
  items: string[]
  emptyText: string
}

function getRouteParam(value: unknown) {
  if (Array.isArray(value)) {
    return getRouteParam(value[0])
  }

  if (value === null || value === undefined) {
    return ''
  }

  const text = String(value)

  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

function normalizeStatus(value: string): CouponStatus {
  return ROUTE_STATUSES.includes(value as CouponStatus)
    ? (value as CouponStatus)
    : 'UN_AVAILABLE'
}

function createCouponDetailRoute(code: string, status: CouponStatus) {
  return createAppRouteUrl(APP_ROUTES.couponDetail, {
    code,
    status
  })
}

function getStatusClassName(status: CouponStatus) {
  return `coupon-detail-status coupon-detail-status--${status
    .toLowerCase()
    .replace('_', '-')}`
}

function DetailField({ title, value, emptyText }: DetailFieldProps) {
  return (
    <View className='coupon-detail-section'>
      <Text className='coupon-detail-section__title'>{title}</Text>
      <Text
        className={
          value
            ? 'coupon-detail-section__value'
            : 'coupon-detail-section__value coupon-detail-section__value--empty'
        }
      >
        {value || emptyText}
      </Text>
    </View>
  )
}

function DetailSection({ title, items, emptyText }: DetailSectionProps) {
  return (
    <View className='coupon-detail-section'>
      <Text className='coupon-detail-section__title'>{title}</Text>
      {items.length ? (
        items.map((item, index) => (
          <View
            className='coupon-detail-rule'
            key={`${title}-${item}-${index}`}
          >
            <Text className='coupon-detail-rule__index'>{index + 1}</Text>
            <Text className='coupon-detail-rule__text'>{item}</Text>
          </View>
        ))
      ) : (
        <Text className='coupon-detail-section__empty'>{emptyText}</Text>
      )}
    </View>
  )
}

const CouponDetailPage = () => {
  const router = useRouter()
  const rawCouponCode = router.params.code || router.params.id
  const couponCode = getRouteParam(rawCouponCode).trim()
  const routeStatus = normalizeStatus(getRouteParam(router.params.status))
  const canUse = routeStatus === 'USABLE' || routeStatus === 'AVAILABLE'
  const routeUrl = useMemo(
    () => createCouponDetailRoute(couponCode, routeStatus),
    [couponCode, routeStatus]
  )

  const coupon = useCouponDetail({
    couponCode,
    routeStatus,
    canUse,
    routeUrl
  })

  const displayCode = coupon.detail?.code || couponCode

  const handleBackToList = () => {
    navigateToAppRoute(APP_ROUTES.couponList, {
      login: true,
      replace: true
    })
  }

  if (!couponCode) {
    return (
      <View className='coupon-detail-page coupon-detail-page--empty'>
        <View className='coupon-detail-empty'>
          <Text className='coupon-detail-empty__title'>缺少优惠券券码</Text>
          <Text className='coupon-detail-empty__summary'>
            请从我的优惠券列表进入详情。
          </Text>
          <AppPressable
            accessibilityLabel='返回优惠券'
            className='coupon-detail-empty__button'
            onPress={handleBackToList}
          >
            <Text className='coupon-detail-empty__button-text'>返回优惠券</Text>
          </AppPressable>
        </View>
      </View>
    )
  }

  return (
    <ScrollView className='coupon-detail-page' scrollY>
      <View className='coupon-detail-card'>
        <View className='coupon-detail-card__top'>
          <View>
            <Text className='coupon-detail-card__label'>券码</Text>
            <Text className='coupon-detail-card__code' selectable>
              {displayCode}
            </Text>
          </View>
          <Text className={getStatusClassName(routeStatus)}>
            {STATUS_TEXT[routeStatus]}
          </Text>
        </View>
        <Text className='coupon-detail-card__summary'>
          详情规则用于下单前参考，最终可用性以价格时效和下单校验结果为准。
        </Text>
        <View className='coupon-detail-actions'>
          <AppPressable
            accessibilityLabel='返回优惠券列表'
            className='coupon-detail-action coupon-detail-action--ghost'
            onPress={handleBackToList}
          >
            <Text className='coupon-detail-action__text coupon-detail-action__text--ghost'>
              返回列表
            </Text>
          </AppPressable>
          <AppPressable
            accessibilityLabel={
              canUse ? '去使用优惠券' : STATUS_TEXT[routeStatus]
            }
            allowDisabledPress={!canUse}
            disabled={!canUse}
            className={
              canUse
                ? 'coupon-detail-action'
                : 'coupon-detail-action coupon-detail-action--disabled'
            }
            onPress={coupon.handleUseCoupon}
          >
            <Text
              className={
                canUse
                  ? 'coupon-detail-action__text'
                  : 'coupon-detail-action__text coupon-detail-action__text--disabled'
              }
            >
              {canUse ? '去使用' : STATUS_TEXT[routeStatus]}
            </Text>
          </AppPressable>
        </View>
      </View>

      {coupon.detail && !coupon.detail.hasDetail && (
        <View className='coupon-detail-notice'>
          <Text className='coupon-detail-notice__title'>暂无更多规则</Text>
          <Text className='coupon-detail-notice__summary'>
            当前券未返回详细限制，使用时以寄件页结算校验为准。
          </Text>
        </View>
      )}

      {coupon.detail && (
        <>
          <DetailField
            title='适用产品'
            value={coupon.detail.fitProduct}
            emptyText='不限产品或以结算页为准'
          />
          <DetailSection
            title='发货地'
            items={coupon.detail.senderAddresses}
            emptyText='不限发货地或以结算页为准'
          />
          <DetailSection
            title='收货地'
            items={coupon.detail.consigneeAddresses}
            emptyText='不限收货地或以结算页为准'
          />
          <DetailSection
            title='使用限制'
            items={coupon.detail.limits}
            emptyText='暂无额外限制'
          />
          <DetailSection
            title='使用说明'
            items={coupon.detail.descriptions}
            emptyText='暂无使用说明'
          />
        </>
      )}

      {!coupon.detail && !coupon.loading && (
        <View className='coupon-detail-empty-block'>
          <Text className='coupon-detail-empty-block__title'>
            {coupon.message || '暂未获取到优惠券详情'}
          </Text>
          <Text className='coupon-detail-empty-block__summary'>
            可返回列表刷新后再次进入。
          </Text>
        </View>
      )}

      {coupon.loading && (
        <Text className='coupon-detail-loading'>正在加载优惠券详情...</Text>
      )}
    </ScrollView>
  )
}

export default CouponDetailPage
