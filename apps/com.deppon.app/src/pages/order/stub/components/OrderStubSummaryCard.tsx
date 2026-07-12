import { Text, View } from '@tarojs/components'

import { OrderStubParty } from './OrderStubParty'
import { AppCard, AppPressable } from '../../../../shared/components'

import type { OrderStubView } from '../../../../services/order'

import './OrderStubSummaryCard.scss'

const BARCODE_PATTERN = [
  1, 3, 1, 2, 4, 1, 2, 2, 1, 3, 3, 1, 4, 2, 1, 1, 3, 2, 2, 4, 1, 3, 1, 2
]

function getBarcodeBarClassName(value: number) {
  return `order-stub-barcode__bar order-stub-barcode__bar--${value}`
}

export function OrderStubSummaryCard(props: {
  stub: OrderStubView
  onCopy: (value: string, successText?: string) => void
}) {
  return (
    <AppCard className='order-stub-card' padding='none'>
      <View className='order-stub-card__head'>
        <View>
          <Text className='order-stub-card__status'>
            {props.stub.statusText}
          </Text>
          <Text className='order-stub-card__number'>
            {props.stub.copyNumber || props.stub.barcodeText}
          </Text>
        </View>
        <AppPressable
          accessibilityLabel='复制订单编号'
          className='order-stub-card__copy'
          onPress={() => props.onCopy(props.stub.copyNumber)}
        >
          <Text className='order-stub-card__copy-text'>复制</Text>
        </AppPressable>
      </View>

      <View className='order-stub-barcode'>
        <View className='order-stub-barcode__bars'>
          {BARCODE_PATTERN.map((item, index) => (
            <View
              className={getBarcodeBarClassName(item)}
              key={`${item}-${index}`}
            />
          ))}
        </View>
        <Text className='order-stub-barcode__text'>
          {props.stub.barcodeText}
        </Text>
      </View>

      <View className='order-stub-divider' />
      <OrderStubParty party={props.stub.sender} onCopy={props.onCopy} />
      <OrderStubParty party={props.stub.receiver} onCopy={props.onCopy} />
    </AppCard>
  )
}
