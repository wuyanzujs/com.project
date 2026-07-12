import { ScrollView, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useMemo, useRef, useState } from 'react'

import { CouponCard } from './components/CouponCard'
import { CouponExchangeBar } from './components/CouponExchangeBar'
import { CouponListStates } from './components/CouponListStates'
import {
  CouponStatusTabs,
  type CouponTabItem
} from './components/CouponStatusTabs'
import { CouponSummary } from './components/CouponSummary'
import { couponService } from '../../../services/coupon'
import {
  createExpressDraft,
  expressDraftBridge,
  expressDraftStorage,
  markExpressQuoteStale
} from '../../../services/express'
import { memberService } from '../../../services/member'
import { LatestRequestCoordinator } from '../../../shared/async/latestRequest'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'
import { createAppWebUrl } from '../../../shared/webview/appWeb'

import type { CouponCardView, CouponStatus } from '../../../services/coupon'

import './index.scss'

const COUPON_TABS: CouponTabItem[] = [
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
  const [openingWelfare, setOpeningWelfare] = useState(false)
  const requestCoordinator = useRef(new LatestRequestCoordinator()).current

  const activeTabText = useMemo(
    () => COUPON_TABS.find(item => item.value === status)?.label || '未使用',
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
    async (nextStatus = status, force = false) => {
      const requestToken = requestCoordinator.begin(nextStatus, { force })

      if (!requestToken) {
        return
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const response = await couponService.queryUserCoupons(nextStatus)

        if (!requestCoordinator.isLatest(requestToken)) {
          return
        }

        if (!response.status || !response.result) {
          setCoupons([])
          setErrorMessage(response.message || '暂未获取到优惠券')
          return
        }

        setCoupons(
          response.result.list.map(item =>
            couponService.toCouponCard(
              item,
              response.result?.status ?? nextStatus
            )
          )
        )
      } finally {
        if (requestCoordinator.finish(requestToken)) {
          setLoading(false)
        }
      }
    },
    [requestCoordinator, status]
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
      loadCoupons('USABLE', true)
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

  const handleOpenWelfare = async () => {
    if (!ensureCouponAccess() || openingWelfare) {
      return
    }

    setOpeningWelfare(true)

    try {
      const uri = await memberService.createWelfareCenterUrl('COUPON_LIST')

      navigateToAppRoute(
        createAppWebUrl({
          source: 'MEMBER_WELFARE_CENTER',
          uri,
          title: '福利中心'
        }),
        {
          login: true
        }
      )
    } finally {
      setOpeningWelfare(false)
    }
  }

  return (
    <ScrollView className='coupon-list-page' scrollY>
      <CouponExchangeBar
        exchanging={exchanging}
        value={exchangeCode}
        onBlur={value => setExchangeCode(value.trim())}
        onChange={setExchangeCode}
        onExchange={handleExchange}
      />

      <CouponStatusTabs
        activeStatus={status}
        tabs={COUPON_TABS}
        onChange={handleChangeStatus}
      />

      <CouponSummary count={coupons.length} title={activeTabText} />

      <View className='coupon-list-content'>
        {coupons.map((coupon, index) => (
          <CouponCard
            coupon={coupon}
            key={getCouponKey(coupon, index)}
            onOpenDetail={handleOpenDetail}
            onUse={handleUseCoupon}
          />
        ))}

        <CouponListStates
          emptyTitle={errorMessage || `暂无${activeTabText}优惠券`}
          hasCoupons={coupons.length > 0}
          loading={loading}
          openingWelfare={openingWelfare}
          onOpenWelfare={handleOpenWelfare}
        />
      </View>
    </ScrollView>
  )
}

export default CouponListPage
