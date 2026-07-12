import { Text } from '@tarojs/components'

import './OrderEditMessage.scss'

export function OrderEditMessage(props: { message: string }) {
  return <Text className='order-edit-message'>{props.message}</Text>
}
