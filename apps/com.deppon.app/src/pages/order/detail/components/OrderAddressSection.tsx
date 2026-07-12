import { Text, View } from '@tarojs/components'

import { OrderDetailSection } from './OrderDetailSection'
import {
  getOrderReceiverAddress,
  getOrderSenderAddress
} from '../../../../services/order'
import { AppPressable } from '../../../../shared/components'

import type { OrderDetail } from '../../../../services/order'

import './OrderAddressSection.scss'

interface OrderAddressSectionProps {
  detail: OrderDetail
  onDial: (phoneNumber?: string | null) => void
}

export function OrderAddressSection({
  detail,
  onDial
}: OrderAddressSectionProps) {
  return (
    <OrderDetailSection title='寄收信息'>
      <View className='order-address-card'>
        <Text className='order-address-card__tag'>寄</Text>
        <View className='order-address-card__content'>
          <View className='order-address-card__head'>
            <Text className='order-address-card__name'>
              {detail.contactName || '--'} {detail.contactMobile || ''}
            </Text>
            {detail.contactMobile ? (
              <AppPressable
                accessibilityLabel={`拨打寄件人电话${detail.contactMobile}`}
                className='order-address-card__call-target'
                onPress={() => onDial(detail.contactMobile)}
              >
                <Text className='order-address-card__call'>拨打</Text>
              </AppPressable>
            ) : null}
          </View>
          <Text className='order-address-card__address'>
            {getOrderSenderAddress(detail) || '--'}
          </Text>
        </View>
      </View>
      <View className='order-address-card'>
        <Text className='order-address-card__tag order-address-card__tag--receive'>
          收
        </Text>
        <View className='order-address-card__content'>
          <View className='order-address-card__head'>
            <Text className='order-address-card__name'>
              {detail.receiverName || '--'} {detail.receiverMobile || ''}
            </Text>
            {detail.receiverMobile ? (
              <AppPressable
                accessibilityLabel={`拨打收件人电话${detail.receiverMobile}`}
                className='order-address-card__call-target'
                onPress={() => onDial(detail.receiverMobile)}
              >
                <Text className='order-address-card__call'>拨打</Text>
              </AppPressable>
            ) : null}
          </View>
          <Text className='order-address-card__address'>
            {getOrderReceiverAddress(detail) || '--'}
          </Text>
        </View>
      </View>
    </OrderDetailSection>
  )
}
