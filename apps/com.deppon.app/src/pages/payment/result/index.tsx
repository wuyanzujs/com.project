import { Text, View } from '@tarojs/components'
import { useRouter } from '@tarojs/taro'

import { useMemo } from 'react'

import { AppButton, AppPage } from '../../../shared/components'
import { AppIcon } from '../../../shared/components/AppIcon'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'
import { APP_STYLE_COLORS } from '../../../styles/nativeTokens'

import './index.scss'
import './content.scss'

function parseResultParams(params: Record<string, string | undefined>) {
  return {
    amount: params.amount || '',
    paid: params.status === 'paid',
    payNo: params.payNo || '',
    role: params.role === 'receive' ? 'receive' : 'sender',
    subject: params.subject || '',
    transactionId: params.transactionId || '',
    waybillNumber: params.waybillNumber || ''
  }
}

const PaymentResultPage = () => {
  const router = useRouter()
  const result = useMemo(
    () =>
      parseResultParams(
        router.params as Record<string, string | undefined>
      ),
    [router.params]
  )

  const handleOpenOrder = () => {
    if (!result.waybillNumber) {
      return
    }

    navigateToAppRoute(
      createAppRouteUrl(APP_ROUTES.orderDetail, {
        waybillNumber: result.waybillNumber,
        role: result.role,
        view: 'secure'
      }),
      { login: true, replace: true }
    )
  }

  const handleBackToPaymentList = () => {
    navigateToAppRoute(APP_ROUTES.paymentList, {
      login: true,
      replace: true
    })
  }

  return (
    <AppPage safeArea='bottom' surface='page'>
      <View className='payment-result-page'>
        <View className='payment-result-status'>
          <View className='payment-result-status__icon'>
            <AppIcon
              color={
                result.paid
                  ? APP_STYLE_COLORS.status.successEmphasis
                  : APP_STYLE_COLORS.status.dangerEmphasis
              }
              name={result.paid ? 'badgeCheck' : 'shieldAlert'}
            />
          </View>
          <Text className='payment-result-status__title'>
            {result.paid ? '支付完成' : '支付未完成'}
          </Text>
          {result.amount && (
            <Text className='payment-result-status__amount'>
              ¥{result.amount}
            </Text>
          )}
        </View>

        <View className='payment-result-detail'>
          <View className='payment-result-row'>
            <Text className='payment-result-row__label'>运单号</Text>
            <Text className='payment-result-row__value'>
              {result.waybillNumber || '--'}
            </Text>
          </View>
          <View className='payment-result-row'>
            <Text className='payment-result-row__label'>支付单号</Text>
            <Text className='payment-result-row__value'>
              {result.payNo || '--'}
            </Text>
          </View>
          {result.subject && (
            <View className='payment-result-row'>
              <Text className='payment-result-row__label'>支付内容</Text>
              <Text className='payment-result-row__value'>
                {result.subject}
              </Text>
            </View>
          )}
          {result.transactionId && (
            <View className='payment-result-row'>
              <Text className='payment-result-row__label'>渠道流水</Text>
              <Text className='payment-result-row__value'>
                {result.transactionId}
              </Text>
            </View>
          )}
        </View>

        <View className='payment-result-actions'>
          <AppButton
            label='查看订单'
            disabled={!result.waybillNumber}
            onPress={handleOpenOrder}
          />
          <AppButton
            className='payment-result-actions__secondary'
            label='返回支付列表'
            variant='secondary'
            onPress={handleBackToPaymentList}
          />
        </View>
      </View>
    </AppPage>
  )
}

export default PaymentResultPage
