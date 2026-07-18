import { Text, View } from '@tarojs/components'

import PaymentFeeRows from './PaymentFeeRows'
import {
  getPaymentItemAmount,
  getPaymentOrderTypeLabel
} from '../../../../services/payment'
import { AppPressable, AppStatusTag } from '../../../../shared/components'

import type {
  PaymentItem,
  PaymentListStatus
} from '../../../../services/payment'

import './PaymentCard.scss'

interface PaymentCardProps {
  item: PaymentItem
  status: PaymentListStatus
  onOpenOrder: (item: PaymentItem) => void
  onEvaluate: (item: PaymentItem) => void
  onPay: (item: PaymentItem) => void
}

export function PaymentCard(props: PaymentCardProps) {
  const { item } = props

  return (
    <View className='payment-card'>
      <View className='payment-card__top'>
        <Text className='payment-card__number'>运单 {item.waybillNum}</Text>
        <View className='payment-card__tags'>
          <Text className='payment-card__tag'>
            {getPaymentOrderTypeLabel(item.orderSubType)}
          </Text>
          {props.status === 'PAID' && (
            <AppStatusTag
              className='payment-card__status'
              label='已支付'
              tone='success'
            />
          )}
        </View>
      </View>

      <View className='payment-card__route'>
        <View className='payment-card__city-block'>
          <Text className='payment-card__city'>
            {item.senderCityName || '--'}
          </Text>
          <Text className='payment-card__name'>{item.sender || '--'}</Text>
        </View>
        <Text className='payment-card__arrow'>→</Text>
        <View className='payment-card__city-block payment-card__city-block--right'>
          <Text className='payment-card__city'>{item.arriveCity || '--'}</Text>
          <Text className='payment-card__name'>{item.consignee || '--'}</Text>
        </View>
      </View>

      <View className='payment-card__meta'>
        <Text className='payment-card__time'>
          开单时间 {item.businessDate || '--'}
        </Text>
        <Text className='payment-card__amount'>
          ¥{getPaymentItemAmount(item, props.status).toFixed(2)}
        </Text>
      </View>

      <PaymentFeeRows item={item} />

      <View className='payment-card__actions'>
        <AppPressable
          accessibilityLabel='查看订单'
          className='payment-card__outline-button'
          onPress={() => props.onOpenOrder(item)}
        >
          <Text className='payment-card__outline-button-text'>查看订单</Text>
        </AppPressable>
        {props.status === 'PAID' && (
          <AppPressable
            accessibilityLabel='服务评价'
            className='payment-card__primary-button'
            onPress={() => props.onEvaluate(item)}
          >
            <Text className='payment-card__primary-button-text'>服务评价</Text>
          </AppPressable>
        )}
        {props.status === 'UNPAID' && (
          <AppPressable
            accessibilityLabel='去支付'
            className='payment-card__primary-button'
            onPress={() => props.onPay(item)}
          >
            <Text className='payment-card__primary-button-text'>去支付</Text>
          </AppPressable>
        )}
      </View>
    </View>
  )
}
