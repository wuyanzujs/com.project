import { Text } from '@tarojs/components'

import './OrderEditIdentity.scss'

export function OrderEditIdentity(props: { orderNumber: string }) {
  return (
    <Text className='order-edit-identity'>订单 {props.orderNumber}</Text>
  )
}
