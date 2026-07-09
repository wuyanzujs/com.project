import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useMemo, useState } from 'react'

import { couponService } from '../../../services/coupon'
import {
  createExpressDraft,
  expressDraftBridge,
  expressDraftStorage,
  markExpressQuoteStale
} from '../../../services/express'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'

import type { CouponCardView, CouponStatus } from '../../../services/coupon'

import './index.scss'

const COUPON_TABS: Array<{ label: string; value: CouponStatus }> = [
  {
    label: '未使用',
    value: 'USABLE'
  },
  {
    label: '已使用',
    value: 'USED'
  },
  {
    label: '已过期',
    value: 'EXPIRED'
  }
]

function getCouponKey(item: CouponCardView, index: number) {
  return item.code || `${item.typeName}-${index}`
}

function createCouponDetailUrl(coupon: CouponCardView, status: CouponStatus) {
  return createAppRouteUrl(APP_ROUTES.couponDetail, {
    code: coupon.code,
    status
  })
}

const CouponListPage = () => {
  const [status, setStatus] = useState<CouponStatus>('USABLE')
  const [coupons, setCoupons] = useState<CouponCardView[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [exchangeCode, setExchangeCode] = useState('')
  const [exchanging, setExchanging] = useState(false)

  const activeTabText = useMemo(
    () => COUPON_TABS.find((item) => item.value === status)?.label || '未使用',
    [status]
  )

  const ensureCouponAccess = useCallback(
    () =>
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.couponList,
        replace: true
      }),
    []
  )

  const loadCoupons = useCallback(
    async (nextStatus = status) => {
      if (loading) {
        return
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const response = await couponService.queryUserCoupons(nextStatus)

        if (!response.status || !response.result) {
          setCoupons([])
          setErrorMessage(response.message || '暂未获取到优惠券')
          return
        }

        setCoupons(
          response.result.list.map((item) =>
            couponService.toCouponCard(
              item,
              response.result?.status ?? nextStatus
            )
          )
        )
      } finally {
        setLoading(false)
      }
    },
    [loading, status]
  )

  useDidShow(() => {
    if (ensureCouponAccess()) {
      loadCoupons(status)
    }
  })

  const handleChangeStatus = (nextStatus: CouponStatus) => {
    if (!ensureCouponAccess() || nextStatus === status) {
      return
    }

    setStatus(nextStatus)
    setCoupons([])
    loadCoupons(nextStatus)
  }

  const handleExchange = async () => {
    if (!ensureCouponAccess() || exchanging) {
      return
    }

    const code = exchangeCode.trim()

    if (!code) {
      Taro.showToast({
        title: '请输入兑换码',
        icon: 'none'
      })
      return
    }

    setExchanging(true)

    try {
      const response = await couponService.exchangeCoupon(code)

      if (!response.status) {
        Taro.showToast({
          title: response.message || '兑换失败',
          icon: 'none'
        })
        return
      }

      setExchangeCode('')
      setStatus('USABLE')
      Taro.showToast({
        title: '兑换成功',
        icon: 'none'
      })
      loadCoupons('USABLE')
    } finally {
      setExchanging(false)
    }
  }

  const handleUseCoupon = (coupon: CouponCardView) => {
    if (!coupon.canUse) {
      Taro.showToast({
        title: coupon.statusText,
        icon: 'none'
      })
      return
    }

    const currentDraft = expressDraftStorage.restore() ?? createExpressDraft()
    const nextDraft = markExpressQuoteStale(
      {
        ...currentDraft,
        couponNumber: coupon.code
      },
      '优惠券变化，请重新获取价格'
    )

    expressDraftBridge.carryFromCoupon(nextDraft)
    navigateToAppRoute(APP_ROUTES.express, {
      login: true
    })
  }

  const handleOpenDetail = (coupon: CouponCardView) => {
    if (!coupon.code) {
      Taro.showToast({
        title: '缺少优惠券券码',
        icon: 'none'
      })
      return
    }

    navigateToAppRoute(createCouponDetailUrl(coupon, status), {
      login: true
    })
  }

  return (
    <ScrollView className='coupon-list-page' scrollY>
      <View className='coupon-list-header'>
        <Text className='coupon-list-header__label'>Coupon</Text>
        <Text className='coupon-list-header__title'>我的优惠券</Text>
        <Text className='coupon-list-header__summary'>
          首期承接个人优惠券查询和兑换，营销发券、转赠分享和详情规则后续接入。
        </Text>
      </View>

      <View className='coupon-exchange'>
        <Input
          className='coupon-exchange__input'
          placeholder='输入兑换码'
          value={exchangeCode}
          onInput={(event) => setExchangeCode(event.detail.value)}
        />
        <View className='coupon-exchange__button' onClick={handleExchange}>
          <Text className='coupon-exchange__button-text'>
            {exchanging ? '兑换中' : '兑换'}
          </Text>
        </View>
      </View>

      <View className='coupon-tabs'>
        {COUPON_TABS.map((tab) => (
          <View
            className={
              tab.value === status ? 'coupon-tab coupon-tab--active' : 'coupon-tab'
            }
            key={tab.value}
            onClick={() => handleChangeStatus(tab.value)}
          >
            <Text
              className={
                tab.value === status
                  ? 'coupon-tab__text coupon-tab__text--active'
                  : 'coupon-tab__text'
              }
            >
              {tab.label}
            </Text>
          </View>
        ))}
      </View>

      <View className='coupon-summary'>
        <View>
          <Text className='coupon-summary__title'>{activeTabText}</Text>
          <Text className='coupon-summary__count'>共 {coupons.length} 张券</Text>
        </View>
        <Text className='coupon-summary__hint'>
          可用券会带入寄件页重新报价
        </Text>
      </View>

      <View className='coupon-list-content'>
        {coupons.map((coupon, index) => (
          <View className='coupon-card' key={getCouponKey(coupon, index)}>
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
                    {coupon.tags.map((tag) => (
                      <Text className='coupon-card__tag' key={tag}>
                        {tag}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View className='coupon-card__footer'>
              <Text className='coupon-card__code'>券码 {coupon.code || '--'}</Text>
              <View
                className='coupon-card__button coupon-card__button--ghost'
                onClick={() => handleOpenDetail(coupon)}
              >
                <Text className='coupon-card__button-text coupon-card__button-text--ghost'>
                  详情
                </Text>
              </View>
              <View
                className={
                  coupon.canUse
                    ? 'coupon-card__button'
                    : 'coupon-card__button coupon-card__button--disabled'
                }
                onClick={() => handleUseCoupon(coupon)}
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
              </View>
            </View>
          </View>
        ))}

        {!coupons.length && !loading && (
          <View className='coupon-empty'>
            <Text className='coupon-empty__title'>
              {errorMessage || `暂无${activeTabText}优惠券`}
            </Text>
            <Text className='coupon-empty__summary'>
              可通过兑换码领取优惠券，更多会员权益后续由 App WebView 或原生页承接。
            </Text>
          </View>
        )}

        {loading && (
          <Text className='coupon-loading'>
            {coupons.length ? '正在刷新优惠券...' : '正在加载优惠券...'}
          </Text>
        )}
      </View>
    </ScrollView>
  )
}

export default CouponListPage
