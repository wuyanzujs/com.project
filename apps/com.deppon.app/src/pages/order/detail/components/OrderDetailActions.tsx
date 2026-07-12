import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'

import './OrderDetailActions.scss'

function OrderDetailPrimaryAction(props: {
  label: string
  onPress: () => void
}) {
  return (
    <View className='order-detail-primary-slot'>
      <AppPressable
        accessibilityLabel={props.label}
        block
        className='order-detail-primary'
        onPress={props.onPress}
      >
        <Text className='order-detail-primary__text'>{props.label}</Text>
      </AppPressable>
    </View>
  )
}

function OrderDetailSecondaryAction(props: {
  label: string
  onPress: () => void
}) {
  return (
    <AppPressable
      accessibilityLabel={props.label}
      className='order-detail-secondary'
      onPress={props.onPress}
    >
      <Text className='order-detail-secondary__text'>{props.label}</Text>
    </AppPressable>
  )
}

function OrderDetailDangerAction(props: {
  label: string
  onPress: () => void
}) {
  return (
    <AppPressable
      accessibilityLabel={props.label}
      className='order-detail-danger'
      onPress={props.onPress}
    >
      <Text className='order-detail-danger__text'>{props.label}</Text>
    </AppPressable>
  )
}

export function OrderPublicTrackActions(props: {
  onOpenSecureDetail: () => void
  onRefresh: () => void
}) {
  return (
    <View className='order-detail-actions'>
      <OrderDetailSecondaryAction label='刷新' onPress={props.onRefresh} />
      <OrderDetailPrimaryAction
        label='查看完整详情'
        onPress={props.onOpenSecureDetail}
      />
    </View>
  )
}

export function OrderDetailFooterActions(props: {
  cancelable: boolean
  deletable: boolean
  deleting: boolean
  resendActionText: string
  onBackToList: () => void
  onCancel: () => void
  onDelete: () => void
  onRefresh: () => void
  onResend: () => void
}) {
  return (
    <View className='order-detail-actions'>
      <OrderDetailSecondaryAction label='刷新' onPress={props.onRefresh} />
      <OrderDetailSecondaryAction
        label={props.resendActionText}
        onPress={props.onResend}
      />
      {props.cancelable ? (
        <OrderDetailDangerAction label='取消订单' onPress={props.onCancel} />
      ) : null}
      {props.deletable ? (
        <OrderDetailDangerAction
          label={props.deleting ? '删除中' : '删除'}
          onPress={props.onDelete}
        />
      ) : null}
      <OrderDetailPrimaryAction
        label='查看订单列表'
        onPress={props.onBackToList}
      />
    </View>
  )
}
