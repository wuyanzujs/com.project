import { Text, View } from '@tarojs/components'

import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

function OrderDetailPrimaryAction(props: { label: string; onPress: () => void }) {
  return (
    <View className='order-detail-primary-slot'>
      <AppPressable accessibilityLabel={props.label} block className='order-detail-primary' onPress={props.onPress}>
        <Text className='order-detail-primary__text'>{props.label}</Text>
      </AppPressable>
    </View>
  )
}

function OrderDetailSecondaryAction(props: { label: string; onPress: () => void }) {
  return (
    <AppPressable accessibilityLabel={props.label} className='order-detail-secondary' onPress={props.onPress}>
      <Text className='order-detail-secondary__text'>{props.label}</Text>
    </AppPressable>
  )
}

function OrderDetailDangerAction(props: { label: string; onPress: () => void }) {
  return (
    <AppPressable accessibilityLabel={props.label} className='order-detail-danger' onPress={props.onPress}>
      <Text className='order-detail-danger__text'>{props.label}</Text>
    </AppPressable>
  )
}

export function OrderPublicTrackActions(props: { onOpenSecureDetail: () => void; onRefresh: () => void }) {
  return (
    <View className='order-detail-actions'>
      <OrderDetailSecondaryAction label='刷新' onPress={props.onRefresh} />
      <OrderDetailPrimaryAction label='查看完整详情' onPress={props.onOpenSecureDetail} />
    </View>
  )
}

function OrderDetailSupportAction(props: { onPress: () => void }) {
  return (
    <AppPressable accessibilityLabel='客服' className='order-detail-support' onPress={props.onPress}>
      <AppIcon color={APP_STYLE_COLORS.text.heading} name='headphones' size={34} strokeWidth={2.1} />
      <Text className='order-detail-support__text'>客服</Text>
    </AppPressable>
  )
}

export function OrderDetailFooterActions(props: {
  cancelable: boolean
  deletable: boolean
  cancelled: boolean
  deleting: boolean
  resendActionText: string
  onBackToList: () => void
  onCancel: () => void
  onDelete: () => void
  onRefresh: () => void
  onResend: () => void
  onResendFresh: () => void
  onSupport: () => void
}) {
  return (
    <View className='order-detail-actions'>
      <OrderDetailSupportAction onPress={props.onSupport} />
      {props.cancelled ? null : <OrderDetailSecondaryAction label='刷新' onPress={props.onRefresh} />}
      <OrderDetailSecondaryAction label={props.resendActionText} onPress={props.onResend} />
      {props.cancelable ? <OrderDetailDangerAction label='取消订单' onPress={props.onCancel} /> : null}
      {props.cancelled || !props.deletable ? null : <OrderDetailDangerAction label={props.deleting ? '删除中' : '删除'} onPress={props.onDelete} />}
      {props.cancelled ? (
        <OrderDetailPrimaryAction label='重新寄件' onPress={props.onResendFresh} />
      ) : (
        <OrderDetailPrimaryAction label='查看订单列表' onPress={props.onBackToList} />
      )}
    </View>
  )
}
