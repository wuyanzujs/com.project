import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'

import type { PaymentSummary } from '../../../../services/payment'

import './OrderPaymentAlert.scss'

interface OrderPaymentAlertProps {
  paying: boolean
  summary: PaymentSummary | null
  onPay: () => void
}

export function OrderPaymentAlert({
  paying,
  summary,
  onPay
}: OrderPaymentAlertProps) {
  if (!summary) {
    return null
  }

  return (
    <View className='order-payment-alert'>
      <View className='order-payment-alert__content'>
        <Text className='order-payment-alert__title'>订单存在待支付费用</Text>
        <Text className='order-payment-alert__summary'>
          共 {summary.count} 笔，合计 ¥{summary.amount.toFixed(2)}
        </Text>
        {summary.disabledReason ? (
          <Text className='order-payment-alert__hint'>
            {summary.disabledReason}
          </Text>
        ) : null}
      </View>
      <AppPressable
        accessibilityLabel={
          paying ? '支付处理中' : summary.canPay ? '支付订单费用' : '订单费用暂不可付'
        }
        className={
          summary.canPay
            ? 'order-payment-alert__button'
            : 'order-payment-alert__button order-payment-alert__button--disabled'
        }
        onPress={onPay}
      >
        <Text className='order-payment-alert__button-text'>
          {paying ? '处理中' : summary.canPay ? '去支付' : '暂不可付'}
        </Text>
      </AppPressable>
    </View>
  )
}
