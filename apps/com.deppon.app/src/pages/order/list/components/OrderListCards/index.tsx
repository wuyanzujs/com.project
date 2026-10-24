import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { canCancelOrder, canDeleteOrder, canEvaluateOrder, canModifyOrder, canNotifyRecipient, getOrderListTimeText } from '@/services/order'
import type { OrderListItem } from '@/services/order'
import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { AppElevatedView, AppLinearGradient, designPxToDp } from '@/shared/native'
import { copyTextToClipboard } from '@/shared/platform/clipboard'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'
import './OrderCardActions.scss'

type OrderCardTone = 'brand' | 'success' | 'danger' | 'muted'

const ORDER_CARD_STYLE = {
  marginBottom: designPxToDp(20),
  marginHorizontal: designPxToDp(24)
}

function getOrderCardTone(orderClass: number): OrderCardTone {
  if (orderClass === 2) {
    return 'success'
  }

  if (orderClass === 5) {
    return 'danger'
  }

  if (orderClass === 3 || orderClass === 4 || orderClass === 99) {
    return 'muted'
  }

  return 'brand'
}

export function OrderListEmpty(props: { title: string }) {
  return (
    <View className='order-empty'>
      <Image className='order-empty__image' mode='aspectFit' src='https://ca.deppon.com.cn/ows/assets/status/order_404.png' />
      <Text className='order-empty__title'>{props.title}</Text>
    </View>
  )
}

export function OrderListLoading(props: { hasOrders: boolean }) {
  return <Text className='order-loading'>{props.hasOrders ? '加载更多订单...' : '正在加载订单...'}</Text>
}

export function OrderCard(props: {
  order: OrderListItem
  deletingOrderKey: string
  resendingOrderKey: string
  getOrderActionKey: (order: OrderListItem) => string
  getResendActionText: (role: OrderListItem['role']) => string
  onOpenDetail: (order: OrderListItem) => void
  onCancelOrder: (order: OrderListItem) => void
  onDeleteOrder: (order: OrderListItem) => void
  onModifyOrder: (order: OrderListItem) => void
  onResendOrder: (order: OrderListItem) => void
  onEvaluateOrder: (order: OrderListItem) => void
  onNotifyOrder: (order: OrderListItem) => void
}) {
  const orderKey = props.getOrderActionKey(props.order)
  const tone = getOrderCardTone(props.order.orderClass)
  const numberText = props.order.waybillNumber ? `运单号：${props.order.waybillNumber}` : props.order.orderNumber ? `订单号：${props.order.orderNumber}` : '--'
  const copyValue = props.order.waybillNumber || props.order.orderNumber
  const actions = [
    canEvaluateOrder(props.order) && {
      key: 'evaluate',
      label: '去评价',
      onPress: () => props.onEvaluateOrder(props.order)
    },
    canNotifyRecipient(props.order) && {
      key: 'notify',
      label: '通知收件人',
      onPress: () => props.onNotifyOrder(props.order)
    },
    canCancelOrder(props.order) && {
      key: 'cancel',
      label: '取消订单',
      onPress: () => props.onCancelOrder(props.order)
    },
    canModifyOrder(props.order) && {
      key: 'modify',
      label: '修改订单',
      onPress: () => props.onModifyOrder(props.order)
    },
    canDeleteOrder(props.order) && {
      key: 'resend',
      label: props.resendingOrderKey === orderKey ? '带入中' : props.getResendActionText(props.order.role),
      onPress: () => props.onResendOrder(props.order)
    },
    canDeleteOrder(props.order) && {
      key: 'delete',
      label: props.deletingOrderKey === orderKey ? '删除中' : '删除',
      onPress: () => props.onDeleteOrder(props.order)
    }
  ].filter((action): action is { key: string; label: string; onPress: () => void } => Boolean(action))

  const handleCopy = () => {
    if (!copyValue) {
      return
    }

    copyTextToClipboard(copyValue)
      .then(() => {
        Taro.showToast({ title: '复制成功', icon: 'none' })
      })
      .catch(() => {
        Taro.showToast({ title: '复制失败，请稍后再试', icon: 'none' })
      })
  }

  return (
    <AppElevatedView borderRadius={32} shadow style={ORDER_CARD_STYLE}>
      <View className={`order-card order-card--${tone}`}>
        <View className='order-card__top'>
          <View className='order-card__number-row'>
            <AppPressable compact accessibilityLabel='查看订单详情' hitSlop={10} onPress={() => props.onOpenDetail(props.order)}>
              <Text className='order-card__number'>{numberText}</Text>
            </AppPressable>
            {copyValue && (
              <AppPressable compact accessibilityLabel='复制单号' className='order-card__copy' hitSlop={10} onPress={handleCopy}>
                <Text className='order-card__copy-text'>复制</Text>
              </AppPressable>
            )}
          </View>
          <View className='order-card__tag'>
            <Text className='order-card__tag-text'>{props.order.isExpress ? '快递' : '零担'}</Text>
          </View>
        </View>

        <AppPressable accessibilityLabel='查看订单详情' className='order-card__main' onPress={() => props.onOpenDetail(props.order)}>
          <View className='order-card__route'>
            <View className='order-card__party'>
              <Text className='order-card__city'>{props.order.senderCity || '--'}</Text>
              <Text className='order-card__name'>{props.order.senderName || '--'}</Text>
            </View>

            <View className='order-card__status'>
              <View className='order-card__status-line'>
                <View className='order-card__status-dot' />
                <View className='order-card__status-dot' />
                <View className='order-card__status-dot' />
                <AppIcon color={APP_STYLE_COLORS.brand.default} name='chevronRight' size={34} strokeWidth={2.4} />
                <View className='order-card__status-dot' />
                <View className='order-card__status-dot' />
                <View className='order-card__status-dot' />
              </View>
              <Text className={`order-card__status-text order-card__status-text--${tone}`}>{props.order.orderClassName}</Text>
            </View>

            <View className='order-card__party order-card__party--right'>
              <Text className='order-card__city'>{props.order.consigneeCity || '--'}</Text>
              <Text className='order-card__name'>{props.order.consigneeName || '--'}</Text>
            </View>
          </View>
        </AppPressable>

        {actions.length > 0 && (
          <View className='order-card__actions'>
            {actions.map(action => (
              <AppPressable compact key={action.key} accessibilityLabel={action.label} className='order-card__action' hitSlop={8} onPress={action.onPress}>
                <Text className='order-card__action-text'>{action.label}</Text>
              </AppPressable>
            ))}
          </View>
        )}

        <View className={`order-card__bottom order-card__bottom--${tone}`}>
          {tone === 'brand' && (
            <AppLinearGradient
              className='order-card__bottom-gradient'
              colors={[APP_STYLE_COLORS.order.waitGradientStart, APP_STYLE_COLORS.order.waitBackground]}
              end={{ x: 0, y: 1 }}
              start={{ x: 0, y: 0 }}
            />
          )}
          <Text className={`order-card__time order-card__time--${tone}`}>{getOrderListTimeText(props.order)}</Text>
          {props.order.orderPrice > 0 && <Text className='order-card__price'>¥{props.order.orderPrice}</Text>}
        </View>
      </View>
    </AppElevatedView>
  )
}

export function OrderListFooter(props: { emptyTitle: string; errorMessage: string; loading: boolean; orders: OrderListItem[] }) {
  if (props.loading) {
    return <OrderListLoading hasOrders={!!props.orders.length} />
  }

  if (!props.orders.length) {
    return <OrderListEmpty title={props.errorMessage || props.emptyTitle} />
  }

  return null
}
