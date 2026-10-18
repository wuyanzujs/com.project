import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useCallback, useMemo, useState } from 'react'

import {
  APP_PAYMENT_UNAVAILABLE_MESSAGE,
  createPaymentCheckoutUrl,
  createPaymentCheckoutView,
  createECardCheckoutResult,
  confirmECardPayment,
  createECardOrder,
  discardECardOrder,
  getPaymentItemAmount,
  getPaymentOrderTypeLabel,
  isECardBalanceSufficient,
  loadECardChannel,
  paymentCheckoutService,
  paymentService,
  selectPaymentCheckoutItems,
  validatePaymentCheckout
} from '@/services/payment'
import type { ECardChannelView, PaymentCheckoutSource, PaymentItem, PaymentOrder, PaymentRole } from '@/services/payment'
import { AppButton, AppEmptyState, AppLoadingState, AppPage, AppPressable, AppStatusTag } from '@/shared/components'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { ensureAuthenticated } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'

import { ECardPasswordDialog } from './components/ECardPasswordDialog'

import './index.scss'
import './content.scss'

type CheckoutChannel = 'APP' | 'ECARD'

interface PaymentCheckoutRouteParams {
  detailNo: string
  role: PaymentRole
  source: PaymentCheckoutSource
  waybillNumber: string
}

function parseRouteParams(params: Record<string, string | undefined>): PaymentCheckoutRouteParams {
  return {
    detailNo: params.detailNo?.trim() || '',
    role: params.role === 'receive' ? 'receive' : 'sender',
    source: params.source === 'ORDER_DETAIL' ? 'ORDER_DETAIL' : 'PAYMENT_LIST',
    waybillNumber: (params.waybillNumber || params.waybillNo || '').trim()
  }
}

const PaymentCheckoutPage = () => {
  const router = useRouter()
  const routeParams = useMemo(() => parseRouteParams(router.params as Record<string, string | undefined>), [router.params])
  const [items, setItems] = useState<PaymentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [ecardChannel, setEcardChannel] = useState<ECardChannelView | null>(null)
  const [channel, setChannel] = useState<CheckoutChannel>('APP')
  const [ecardOrder, setEcardOrder] = useState<PaymentOrder | null>(null)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const checkout = useMemo(() => createPaymentCheckoutView(items), [items])
  const validation = useMemo(() => validatePaymentCheckout(checkout.items), [checkout.items])
  const paymentAvailable = paymentCheckoutService.isPaymentAvailable()
  const ecardSufficient = Boolean(ecardChannel && isECardBalanceSufficient(ecardChannel.balance, checkout.amount))
  const ecardSelectable = Boolean(ecardChannel?.enabled && ecardChannel.registered && ecardSufficient)

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

      const selectedItems = selectPaymentCheckoutItems(response.result.items, routeParams.detailNo)

      setItems(selectedItems)
      setErrorMessage(selectedItems.length ? '' : response.result.disabledReason || '该笔费用已支付或暂不可付')

      // E 卡通道探测:纯 HTTP 闭环,与原生支付能力无关(参照小程序收银台)。
      const channelView = await loadECardChannel(selectedItems[0] ?? null)
      setEcardChannel(channelView)
      setChannel(channelView.enabled && channelView.registered && isECardBalanceSufficient(channelView.balance, checkout.amount) ? 'ECARD' : 'APP')
    } finally {
      setLoading(false)
    }
  }, [routeParams, checkout.amount])

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

  const handleAppPaySubmit = async () => {
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
  }

  const handleECardPaySubmit = async () => {
    const result = await createECardOrder(checkout.items)

    if (!result.status || !result.order) {
      Taro.showToast({
        title: result.message || '创建支付单失败，请稍后重试',
        icon: 'none'
      })
      return
    }

    setEcardOrder(result.order)
    setPasswordError('')
    setPasswordVisible(true)
  }

  const handleSubmit = async () => {
    if (submitting || !validation.valid || (channel === 'APP' && !paymentAvailable) || (channel === 'ECARD' && !ecardSelectable)) {
      return
    }

    setSubmitting(true)

    try {
      if (channel === 'ECARD') {
        await handleECardPaySubmit()
      } else {
        await handleAppPaySubmit()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasswordClose = async () => {
    setPasswordVisible(false)
    setPasswordError('')
    await discardECardOrder(ecardOrder)
    setEcardOrder(null)
  }

  const handlePasswordConfirm = async (password: string) => {
    if (!ecardOrder || passwordSubmitting) {
      return
    }

    setPasswordSubmitting(true)
    setPasswordError('')

    try {
      const result = await confirmECardPayment(ecardOrder.payNo, password)

      if (!result.status) {
        setPasswordError(result.message || '付款失败，请稍后再试')
        return
      }

      const paidResult = createECardCheckoutResult(ecardOrder.payNo, checkout.amount, routeParams.waybillNumber)
      setPasswordVisible(false)

      navigateToAppRoute(
        createAppRouteUrl(APP_ROUTES.paymentResult, {
          status: 'paid',
          amount: paidResult.amount.toFixed(2),
          payNo: paidResult.payNo,
          subject: paidResult.subject,
          waybillNumber: paidResult.waybillNumber,
          role: routeParams.role,
          source: routeParams.source
        }),
        {
          login: true,
          replace: true
        }
      )
    } finally {
      setPasswordSubmitting(false)
    }
  }

  const footer = (
    <View className='payment-checkout-footer'>
      <View className='payment-checkout-footer__amount'>
        <Text className='payment-checkout-footer__label'>合计</Text>
        <Text className='payment-checkout-footer__value'>¥{checkout.amount.toFixed(2)}</Text>
      </View>
      <AppButton
        block={false}
        className='payment-checkout-footer__button'
        disabled={!validation.valid || (channel === 'APP' && !paymentAvailable) || (channel === 'ECARD' && !ecardSelectable)}
        label={channel === 'ECARD' ? 'E卡支付' : paymentAvailable ? '确认支付' : '暂不可支付'}
        loading={submitting}
        loadingLabel='处理中'
        onPress={handleSubmit}
      />
    </View>
  )

  return (
    <AppPage footer={footer} safeArea='bottom' statusBar='dark' surface='page'>
      <ScrollView className='payment-checkout-page' scrollY style={{ flex: 1 }}>
        <View className='payment-checkout-header'>
          <Text className='payment-checkout-header__title'>确认支付信息</Text>
          <Text className='payment-checkout-header__summary'>请核对运单与费用后提交</Text>
        </View>

        {loading ? (
          <AppLoadingState label='正在加载待支付费用' />
        ) : errorMessage ? (
          <AppEmptyState
            action={<AppButton density='compact' label='重新加载' onPress={loadCheckout} />}
            description={errorMessage}
            title='暂无法支付'
            tone='error'
          />
        ) : (
          <>
            <View className='payment-checkout-section'>
              <View className='payment-checkout-section__head'>
                <Text className='payment-checkout-section__title'>支付明细</Text>
                <Text className='payment-checkout-section__hint'>共 {checkout.count} 笔</Text>
              </View>

              {checkout.items.map(item => (
                <View className='payment-checkout-item' key={`${item.accountStatementDetailNo}-${item.waybillNum}`}>
                  <View className='payment-checkout-item__main'>
                    <Text className='payment-checkout-item__number'>{item.waybillNum}</Text>
                    <Text className='payment-checkout-item__description'>
                      {getPaymentOrderTypeLabel(item.orderSubType)} · {item.senderCityName || '--'} 至 {item.arriveCity || '--'}
                    </Text>
                  </View>
                  <Text className='payment-checkout-item__amount'>¥{getPaymentItemAmount(item, 'UNPAID').toFixed(2)}</Text>
                </View>
              ))}
            </View>

            <View className='payment-checkout-section'>
              <View className='payment-checkout-section__head'>
                <Text className='payment-checkout-section__title'>支付方式</Text>
              </View>

              <AppPressable
                accessibilityLabel='App 在线支付'
                block
                className={channel === 'APP' ? 'payment-checkout-channel payment-checkout-channel--active' : 'payment-checkout-channel'}
                onPress={() => setChannel('APP')}
              >
                <View className='payment-checkout-channel__main'>
                  <Text className='payment-checkout-channel__title'>App 在线支付</Text>
                  <Text className='payment-checkout-channel__summary'>支付渠道将在提交后由收银台确认</Text>
                </View>
                <AppStatusTag label={paymentAvailable ? '可用' : '暂不可用'} tone={paymentAvailable ? 'success' : 'neutral'} />
              </AppPressable>

              {ecardChannel?.enabled ? (
                <AppPressable
                  accessibilityLabel='E卡支付'
                  block
                  className={channel === 'ECARD' ? 'payment-checkout-channel payment-checkout-channel--active' : 'payment-checkout-channel'}
                  onPress={() => setChannel('ECARD')}
                >
                  <View className='payment-checkout-channel__main'>
                    <Text className='payment-checkout-channel__title'>E卡支付</Text>
                    <Text className='payment-checkout-channel__summary'>
                      余额 ¥{ecardChannel.balance.toFixed(2)}
                      {ecardChannel.tips ? ` · ${ecardChannel.tips}` : ''}
                    </Text>
                  </View>
                  <AppStatusTag
                    label={ecardChannel.registered ? (ecardSufficient ? '可用' : '余额不足') : '未开通'}
                    tone={ecardSelectable ? 'success' : 'neutral'}
                  />
                </AppPressable>
              ) : null}

              {channel === 'APP' && !paymentAvailable && <Text className='payment-checkout-channel__notice'>{APP_PAYMENT_UNAVAILABLE_MESSAGE}</Text>}
            </View>

            {!validation.valid && (
              <View className='payment-checkout-message'>
                <Text className='payment-checkout-message__text'>{validation.message}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
      <ECardPasswordDialog
        error={passwordError}
        submitting={passwordSubmitting}
        visible={passwordVisible}
        onClose={() => void handlePasswordClose()}
        onConfirm={password => void handlePasswordConfirm(password)}
      />
    </AppPage>
  )
}

export default PaymentCheckoutPage
