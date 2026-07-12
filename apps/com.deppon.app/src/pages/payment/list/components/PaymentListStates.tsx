import { Text, View } from '@tarojs/components'

import type { PaymentListStatus } from '../../../../services/payment'

import './PaymentListStates.scss'

interface PaymentListStatesProps {
  status: PaymentListStatus
  errorMessage: string
  loading: boolean
  hasPayments: boolean
}

export function PaymentListStates(props: PaymentListStatesProps) {
  return (
    <>
      {!props.hasPayments && !props.loading && (
        <View className='payment-empty'>
          <Text className='payment-empty__title'>
            {props.errorMessage ||
              (props.status === 'PAID'
                ? '暂无支付记录'
                : '暂无待支付运单')}
          </Text>
          <Text className='payment-empty__summary'>
            {props.status === 'PAID'
              ? '可切换寄件/收件，或按运单号搜索最近180天支付记录。'
              : '可切换寄件/收件，或按运单号搜索最近一个月费用。'}
          </Text>
        </View>
      )}

      {props.loading && (
        <Text className='payment-loading'>
          {props.hasPayments
            ? '加载更多费用...'
            : props.status === 'PAID'
              ? '正在加载支付记录...'
              : '正在加载待支付运单...'}
        </Text>
      )}
    </>
  )
}
