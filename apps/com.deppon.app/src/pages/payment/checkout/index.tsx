import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useCallback, useMemo, useState } from 'react'

import {
  APP_PAYMENT_UNAVAILABLE_MESSAGE,
  createPaymentCheckoutUrl,
  createPaymentCheckoutView,
  getPaymentItemAmount,
  getPaymentOrderTypeLabel,
  paymentCheckoutService,
  paymentService,
  selectPaymentCheckoutItems,
  validatePaymentCheckout
} from '../../../services/payment'
import {
  AppButton,
  AppEmptyState,
  AppLoadingState,
  AppPage,
  AppStatusTag
} from '../../../shared/components'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'

import type {
  PaymentCheckoutSource,
  PaymentItem,
  PaymentRole
} from '../../../services/payment'

import './index.scss'
import './content.scss'

interface PaymentCheckoutRouteParams {
  detailNo: string
  role: PaymentRole
  source: PaymentCheckoutSource
  waybillNumber: string
}

function parseRouteParams(
  params: Record<string, string | undefined>
): PaymentCheckoutRouteParams {
  return {
    detailNo: params.detailNo?.trim() || '',
    role: params.role === 'receive' ? 'receive' : 'sender',
    source: params.source === 'ORDER_DETAIL' ? 'ORDER_DETAIL' : 'PAYMENT_LIST',
    waybillNumber: (params.waybillNumber || params.waybillNo || '').trim()
  }
}

const PaymentCheckoutPage = () => {
  const router = useRouter()
  const routeParams = useMemo(
    () =>
      parseRouteParams(
        router.params as Record<string, string | undefined>
      ),
    [router.params]
  )
  const [items, setItems] = useState<PaymentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const checkout = useMemo(() => createPaymentCheckoutView(items), [items])
  const validation = useMemo(
    () => validatePaymentCheckout(checkout.items),
    [checkout.items]
  )
  const paymentAvailable = paymentCheckoutService.isPaymentAvailable()

  const loadCheckout = useCallback(async () => {
    if (!routeParams.waybillNumber) {
      setItems([])
      setErrorMessage('缺少运单号，暂无法加载支付费用')
      setLoading(false)
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const response = await paymentService.queryUnpaidByWaybill({
        role: routeParams.role,
        waybillNumber: routeParams.waybillNumber,
        pageSize: 50
      })

      if (!response.status || !response.result) {
        setItems([])
        setErrorMessage(response.message || '暂未获取到待支付费用')
        return
      }

      const selectedItems = selectPaymentCheckoutItems(
        response.result.items,
        routeParams.detailNo
      )

      setItems(selectedItems)
      setErrorMessage(
        selectedItems.length
          ? ''
          : response.result.disabledReason || '该笔费用已支付或暂不可付'
      )
    } finally {
      setLoading(false)
    }
  }, [routeParams])

  useDidShow(() => {
    const redirectUrl = createPaymentCheckoutUrl(routeParams)

    if (
      ensureAuthenticated({
        redirectUrl,
        replace: true
      })
    ) {
      void loadCheckout()
    }
  })

  const handleSubmit = async () => {
    if (submitting || !validation.valid || !paymentAvailable) {
      return
    }

    setSubmitting(true)

    try {
      const response = await paymentCheckoutService.submit({
        source: routeParams.source,
        items: checkout.items
      })

      if (!response.status || !response.result) {
        Taro.showToast({
          title: response.message || '支付失败，请稍后重试',
          icon: 'none'
        })
        return
      }

      navigateToAppRoute(
        createAppRouteUrl(APP_ROUTES.paymentResult, {
          status: 'paid',
          amount: response.result.amount.toFixed(2),
          payNo: response.result.payNo,
          subject: response.result.subject,
          transactionId: response.result.transactionId,
          waybillNumber: response.result.waybillNumber,
          role: routeParams.role,
          source: routeParams.source
        }),
        {
          login: true,
          replace: true
        }
      )
    } finally {
      setSubmitting(false)
    }
  }

  const footer = (
    <View className='payment-checkout-footer'>
      <View className='payment-checkout-footer__amount'>
        <Text className='payment-checkout-footer__label'>合计</Text>
        <Text className='payment-checkout-footer__value'>
          ¥{checkout.amount.toFixed(2)}
        </Text>
      </View>
      <AppButton
        block={false}
        className='payment-checkout-footer__button'
        disabled={!validation.valid || !paymentAvailable}
        label={paymentAvailable ? '确认支付' : '暂不可支付'}
        loading={submitting}
        loadingLabel='处理中'
        onPress={handleSubmit}
      />
    </View>
  )

  return (
    <AppPage footer={footer} safeArea='bottom' surface='page'>
      <ScrollView
        className='payment-checkout-page'
        scrollY
        style={{ flex: 1 }}
      >
        <View className='payment-checkout-header'>
          <Text className='payment-checkout-header__title'>确认支付信息</Text>
          <Text className='payment-checkout-header__summary'>
            请核对运单与费用后提交
          </Text>
        </View>

        {loading ? (
          <AppLoadingState label='正在加载待支付费用' />
        ) : errorMessage ? (
          <AppEmptyState
            action={
              <AppButton
                density='compact'
                label='重新加载'
                onPress={loadCheckout}
              />
            }
            description={errorMessage}
            title='暂无法支付'
            tone='error'
          />
        ) : (
          <>
            <View className='payment-checkout-section'>
              <View className='payment-checkout-section__head'>
                <Text className='payment-checkout-section__title'>支付明细</Text>
                <Text className='payment-checkout-section__hint'>
                  共 {checkout.count} 笔
                </Text>
              </View>

              {checkout.items.map(item => (
                <View
                  className='payment-checkout-item'
                  key={`${item.accountStatementDetailNo}-${item.waybillNum}`}
                >
                  <View className='payment-checkout-item__main'>
                    <Text className='payment-checkout-item__number'>
                      {item.waybillNum}
                    </Text>
                    <Text className='payment-checkout-item__description'>
                      {getPaymentOrderTypeLabel(item.orderSubType)} ·{' '}
                      {item.senderCityName || '--'} 至 {item.arriveCity || '--'}
                    </Text>
                  </View>
                  <Text className='payment-checkout-item__amount'>
                    ¥{getPaymentItemAmount(item, 'UNPAID').toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            <View className='payment-checkout-section'>
              <View className='payment-checkout-channel'>
                <View className='payment-checkout-channel__main'>
                  <Text className='payment-checkout-channel__title'>
                    App 在线支付
                  </Text>
                  <Text className='payment-checkout-channel__summary'>
                    支付渠道将在提交后由收银台确认
                  </Text>
                </View>
                <AppStatusTag
                  label={paymentAvailable ? '可用' : '暂不可用'}
                  tone={paymentAvailable ? 'success' : 'neutral'}
                />
              </View>
              {!paymentAvailable && (
                <Text className='payment-checkout-channel__notice'>
                  {APP_PAYMENT_UNAVAILABLE_MESSAGE}
                </Text>
              )}
            </View>

            {!validation.valid && (
              <View className='payment-checkout-message'>
                <Text className='payment-checkout-message__text'>
                  {validation.message}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </AppPage>
  )
}

export default PaymentCheckoutPage
