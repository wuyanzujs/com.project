import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'


import './OrderEditLoadState.scss'

interface OrderEditLoadStateProps {
  loading: boolean
  hasDraft: boolean
  errorMessage: string
  onReload: () => void
}

export function OrderEditLoadState(props: OrderEditLoadStateProps) {
  return (
    <>
      {props.loading && !props.hasDraft && (
        <Text className='order-edit-loading'>正在加载订单...</Text>
      )}

      {!props.loading && !props.hasDraft && (
        <View className='order-edit-empty'>
          <Text className='order-edit-empty__title'>
            {props.errorMessage || '暂无法修改订单'}
          </Text>
          <AppPressable className='order-edit-empty__button' onPress={props.onReload}>
            <Text className='order-edit-empty__button-text'>重新加载</Text>
          </AppPressable>
        </View>
      )}
    </>
  )
}
