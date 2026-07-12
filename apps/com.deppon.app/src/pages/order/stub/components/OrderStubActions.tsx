import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'

import './OrderStubActions.scss'

export function OrderStubActions(props: {
  onBack: () => void
  onRefresh: () => void
}) {
  return (
    <View className='order-stub-actions'>
      <View className='order-stub-secondary-slot'>
        <AppPressable
          accessibilityLabel='刷新电子存根'
          block
          className='order-stub-secondary'
          onPress={props.onRefresh}
        >
          <Text className='order-stub-secondary__text'>刷新</Text>
        </AppPressable>
      </View>
      <View className='order-stub-primary-slot'>
        <AppPressable
          accessibilityLabel='返回订单详情'
          block
          className='order-stub-primary'
          onPress={props.onBack}
        >
          <Text className='order-stub-primary__text'>返回订单详情</Text>
        </AppPressable>
      </View>
    </View>
  )
}
