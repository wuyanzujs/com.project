import { Text, View } from '@tarojs/components'

import { OrderDetailSection } from './OrderDetailSection'
import { AppPressable } from '../../../../shared/components'

import type { OrderDetail } from '../../../../services/order'

import './OrderTransportSection.scss'

interface OrderTransportSectionProps {
  detail: OrderDetail
  onDial: (phoneNumber?: string | null) => void
}

export function OrderTransportSection({
  detail,
  onDial
}: OrderTransportSectionProps) {
  return (
    <OrderDetailSection hint={detail.orderTime || ''} title='运输信息'>
      <View className='order-detail-route'>
        <View className='order-detail-route__block'>
          <Text className='order-detail-route__city'>
            {detail.contactCity || '--'}
          </Text>
          <Text className='order-detail-route__name'>
            {detail.contactName || '--'}
          </Text>
        </View>
        <Text className='order-detail-route__arrow'>→</Text>
        <View className='order-detail-route__block order-detail-route__block--right'>
          <Text className='order-detail-route__city'>
            {detail.receiverCity || '--'}
          </Text>
          <Text className='order-detail-route__name'>
            {detail.receiverName || '--'}
          </Text>
        </View>
      </View>

      <View className='order-detail-meta-row'>
        <Text className='order-detail-meta-row__label'>货物</Text>
        <Text className='order-detail-meta-row__value'>
          {detail.goodsName || '--'}
        </Text>
      </View>
      <View className='order-detail-meta-row'>
        <Text className='order-detail-meta-row__label'>产品</Text>
        <Text className='order-detail-meta-row__value'>
          {detail.transportMode || '--'}
        </Text>
      </View>
      <View className='order-detail-meta-row'>
        <Text className='order-detail-meta-row__label'>付款方式</Text>
        <Text className='order-detail-meta-row__value'>
          {detail.paymentType || '--'}
        </Text>
      </View>
      {detail.courierName || detail.courierMobile ? (
        <View className='order-detail-meta-row'>
          <Text className='order-detail-meta-row__label'>快递员</Text>
          <View className='order-detail-meta-row__content'>
            <Text className='order-detail-meta-row__value'>
              {detail.courierName || '--'} {detail.courierMobile || ''}
            </Text>
            {detail.courierMobile ? (
              <AppPressable
                accessibilityLabel={`拨打快递员电话${detail.courierMobile}`}
                className='order-detail-call'
                onPress={() => onDial(detail.courierMobile)}
              >
                <Text className='order-detail-call__text'>拨打</Text>
              </AppPressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </OrderDetailSection>
  )
}
