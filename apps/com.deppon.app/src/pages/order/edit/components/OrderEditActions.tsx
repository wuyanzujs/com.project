import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'


import './OrderEditActions.scss'

interface OrderEditActionsProps {
  disabled: boolean
  submitting: boolean
  onCancel: () => void
  onSubmit: () => void
}

export function OrderEditActions(props: OrderEditActionsProps) {
  return (
    <View className='order-edit-actions'>
      <AppPressable className='order-edit-actions__secondary' onPress={props.onCancel}>
        <Text className='order-edit-actions__secondary-text'>取消</Text>
      </AppPressable>
      <AppPressable flex
        className={
          props.disabled
            ? 'order-edit-actions__primary order-edit-actions__primary--disabled'
            : 'order-edit-actions__primary'
        }
        onPress={props.onSubmit}
      >
        <Text className='order-edit-actions__primary-text'>
          {props.submitting ? '提交中' : '保存修改'}
        </Text>
      </AppPressable>
    </View>
  )
}
