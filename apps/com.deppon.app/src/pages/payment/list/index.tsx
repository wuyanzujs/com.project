import { ScrollView, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useRef, useState } from 'react'

import { PaymentCard } from './components/PaymentCard'
import { PaymentListControls } from './components/PaymentListControls'
import { PaymentListStates } from './components/PaymentListStates'
import {
  createPaymentEvaluateWebUri,
  getPaymentItemAmount,
  paymentService
} from '../../../services/payment'
import { LatestRequestCoordinator } from '../../../shared/async/latestRequest'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'
import { getNativeCapabilityErrorMessage } from '../../../shared/platform/capabilities'
import { payWithApp } from '../../../shared/platform/payment'
import { createAppWebUrl } from '../../../shared/webview/appWeb'

import type {
  PaymentItem,
  PaymentListStatus,
  PaymentRole
} from '../../../services/payment'

import './index.scss'

const PAGE_SIZE = 10

function getPaymentItemKey(item: PaymentItem) {
  return item.accountStatementDetailNo || item.waybillNum
}

const PaymentListPage = () => {
  const [status, setStatus] = useState<PaymentListStatus>('UNPAID')
  const [role, setRole] = useState<PaymentRole>('sender')
  const [keyword, setKeyword] = useState('')
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [pageIndex, setPageIndex] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const [loadedAmount, setLoadedAmount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [payingKey, setPayingKey] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const requestCoordinator = useRef(new LatestRequestCoordinator()).current

  const ensurePaymentListAccess = useCallback(
    () =>
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.paymentList,
        replace: true
      }),
    []
  )

  const loadPayments = useCallback(
    async (
      nextPage = 1,
      nextRole = role,
      nextKeyword = keyword,
      nextStatus = status,
      force = false
    ) => {
      const requestToken = requestCoordinator.begin(
        JSON.stringify([nextPage, nextRole, nextKeyword, nextStatus]),
        { force }
      )

      if (!requestToken) {
        return
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const response = await paymentService.queryPaymentList({
          status: nextStatus,
          role: nextRole,
          pageIndex: nextPage,
          pageSize: PAGE_SIZE,
          waybillNumber: nextKeyword
        })

        if (!requestCoordinator.isLatest(requestToken)) {
          return
        }

        if (!response.status || !response.result) {
          setErrorMessage(
            response.message ||
              (nextStatus === 'PAID'
                ? '暂未获取到支付记录'
                : '暂未获取到待支付运单')
          )
          if (nextPage === 1) {
            setPayments([])
            setTotalRows(0)
            setLoadedAmount(0)
          }
          return
        }

        setPayments(current =>
          nextPage === 1
            ? (response.result?.list ?? [])
            : [...current, ...(response.result?.list ?? [])]
        )
        setPageIndex(response.result.pageIndex)
        setTotalPage(response.result.totalPage)
        setTotalRows(response.result.totalRows)
        setLoadedAmount(current =>
          nextPage === 1
            ? (response.result?.pageAmount ?? 0)
            : current + (response.result?.pageAmount ?? 0)
        )
      } finally {
        if (requestCoordinator.finish(requestToken)) {
          setLoading(false)
        }
      }
    },
    [keyword, requestCoordinator, role, status]
  )

  useDidShow(() => {
    if (ensurePaymentListAccess()) {
      loadPayments(1)
    }
  })

  const handleChangeRole = (nextRole: PaymentRole) => {
    if (!ensurePaymentListAccess()) {
      return
    }

    setRole(nextRole)
    setPayments([])
    setPageIndex(1)
    loadPayments(1, nextRole, keyword, status)
  }

  const handleChangeStatus = (nextStatus: PaymentListStatus) => {
    if (!ensurePaymentListAccess()) {
      return
    }

    if (nextStatus === status) {
      return
    }

    setStatus(nextStatus)
    setPayments([])
    setPageIndex(1)
    setTotalRows(0)
    setLoadedAmount(0)
    setErrorMessage('')
    loadPayments(1, role, keyword, nextStatus)
  }

  const handleSearch = () => {
    if (!ensurePaymentListAccess()) {
      return
    }

    setPayments([])
    setPageIndex(1)
    loadPayments(1, role, keyword, status)
  }

  const handleLoadMore = () => {
    if (!ensurePaymentListAccess()) {
      return
    }

    if (loading || pageIndex >= totalPage) {
      return
    }

    loadPayments(pageIndex + 1)
  }

  const handleOpenOrder = (item: PaymentItem) => {
    const url = createAppRouteUrl(APP_ROUTES.orderDetail, {
      waybillNumber: item.waybillNum,
      role,
      view: 'secure'
    })

    navigateToAppRoute(url, {
      login: true
    })
  }

  const handlePay = async (item: PaymentItem) => {
    const itemKey = getPaymentItemKey(item)

    if (payingKey) {
      return
    }

    setPayingKey(itemKey)

    try {
      await payWithApp({
        source: 'PAYMENT_LIST',
        channel: 'h5Cashier',
        orderNumber: item.waybillNum,
        payload: {
          role,
          amount: getPaymentItemAmount(item, 'UNPAID'),
          item
        }
      })

      Taro.showToast({
        title: '支付完成',
        icon: 'none'
      })
      loadPayments(1, role, keyword, status, true)
    } catch (error) {
      Taro.showToast({
        title: getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    } finally {
      setPayingKey('')
    }
  }

  const handleEvaluate = (item: PaymentItem) => {
    if (!ensurePaymentListAccess()) {
      return
    }

    navigateToAppRoute(
      createAppWebUrl({
        source: 'PAYMENT_EVALUATE',
        uri: createPaymentEvaluateWebUri(item),
        title: '服务评价'
      }),
      {
        login: true
      }
    )
  }

  return (
    <ScrollView
      className='payment-list-page'
      onScrollToLower={handleLoadMore}
      scrollY
    >
      <PaymentListControls
        keyword={keyword}
        loadedAmount={loadedAmount}
        role={role}
        status={status}
        totalRows={totalRows}
        onKeywordChange={setKeyword}
        onRoleChange={handleChangeRole}
        onSearch={handleSearch}
        onStatusChange={handleChangeStatus}
      />

      <View className='payment-list-content'>
        {payments.map(item => {
          const itemKey = getPaymentItemKey(item)

          return (
            <PaymentCard
              item={item}
              key={itemKey}
              paying={payingKey === itemKey}
              status={status}
              onEvaluate={handleEvaluate}
              onOpenOrder={handleOpenOrder}
              onPay={handlePay}
            />
          )
        })}

        <PaymentListStates
          errorMessage={errorMessage}
          hasPayments={!!payments.length}
          loading={loading}
          status={status}
        />
      </View>
    </ScrollView>
  )
}

export default PaymentListPage
