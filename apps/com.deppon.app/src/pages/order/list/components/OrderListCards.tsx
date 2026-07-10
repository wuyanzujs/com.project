import { Image, Text, View } from '@tarojs/components'

import type { OrderListItem } from '../../../../services/order'

import '../index.scss'

function getOrderCardKey(order: OrderListItem) {
  return `${order.role}-${order.orderNumber}-${order.waybillNumber}`
}

export function OrderListEmpty(props: { title: string }) {
  return (
    <View className='order-empty'>
      <Image
        className='order-empty__image'
        mode='aspectFit'
        src='https://ca.deppon.com.cn/ows/assets/status/order_404.png'
      />
      <Text className='order-empty__title'>{props.title}</Text>
    </View>
  )
}

export function OrderListLoading(props: { hasOrders: boolean }) {
  return (
    <Text className='order-loading'>
      {props.hasOrders ? '加载更多订单...' : '正在加载订单...'}
    </Text>
  )
}

export function OrderCard(props: {
  order: OrderListItem
  deletingOrderKey: string
  resendingOrderKey: string
  canCancelOrder: (order: OrderListItem) => boolean
  canDeleteOrder: (order: OrderListItem) => boolean
  canModifyOrder: (order: OrderListItem) => boolean
  canResendOrder: (order: OrderListItem) => boolean
  getOrderActionKey: (order: OrderListItem) => string
  getResendActionText: (order: OrderListItem) => string
  onOpenDetail: (order: OrderListItem) => void
  onCancelOrder: (order: OrderListItem) => void
  onDeleteOrder: (order: OrderListItem) => void
  onModifyOrder: (order: OrderListItem) => void
  onResendOrder: (order: OrderListItem) => void
}) {
  const orderKey = props.getOrderActionKey(props.order)
  const cancelable = props.canCancelOrder(props.order)
  const deletable = props.canDeleteOrder(props.order)
  const modifiable = props.canModifyOrder(props.order)
  const resendable = props.canResendOrder(props.order)
  const hasActions = cancelable || deletable || modifiable || resendable

  return (
    <View className='order-card'>
      <View
        className='order-card__body'
        onClick={() => props.onOpenDetail(props.order)}
      >
        <View className='order-card__top'>
          <Text className='order-card__status'>
            {props.order.orderClassName}
          </Text>
          <Text className='order-card__time'>
            {props.order.orderTime || '暂无时间'}
          </Text>
        </View>

        <View className='order-card__route'>
          <View className='order-card__city-block'>
            <Text className='order-card__city'>
              {props.order.senderCity || '--'}
            </Text>
            <Text className='order-card__name'>
              {props.order.senderName || '--'}
            </Text>
          </View>
          <Text className='order-card__arrow'>→</Text>
          <View className='order-card__city-block order-card__city-block--right'>
            <Text className='order-card__city'>
              {props.order.consigneeCity || '--'}
            </Text>
            <Text className='order-card__name'>
              {props.order.consigneeName || '--'}
            </Text>
          </View>
        </View>

        <View className='order-card__meta'>
          <Text className='order-card__number'>
            {props.order.waybillNumber
              ? `运单 ${props.order.waybillNumber}`
              : `订单 ${props.order.orderNumber}`}
          </Text>
          {props.order.orderPrice > 0 && (
            <Text className='order-card__price'>¥{props.order.orderPrice}</Text>
          )}
        </View>
      </View>

      {hasActions && (
        <View className='order-card__actions'>
          <View
            className='order-card__outline-button'
            onClick={() => props.onOpenDetail(props.order)}
          >
            <Text className='order-card__outline-button-text'>查看详情</Text>
          </View>
          {cancelable && (
            <View
              className='order-card__danger-button'
              onClick={() => props.onCancelOrder(props.order)}
            >
              <Text className='order-card__danger-button-text'>取消订单</Text>
            </View>
          )}
          {modifiable && (
            <View
              className='order-card__outline-button'
              onClick={() => props.onModifyOrder(props.order)}
            >
              <Text className='order-card__outline-button-text'>修改订单</Text>
            </View>
          )}
          {resendable && (
            <View
              className='order-card__outline-button'
              onClick={() => props.onResendOrder(props.order)}
            >
              <Text className='order-card__outline-button-text'>
                {props.resendingOrderKey === orderKey
                  ? '带入中'
                  : props.getResendActionText(props.order)}
              </Text>
            </View>
          )}
          {deletable && (
            <View
              className='order-card__danger-button'
              onClick={() => props.onDeleteOrder(props.order)}
            >
              <Text className='order-card__danger-button-text'>
                {props.deletingOrderKey === orderKey ? '删除中' : '删除'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

export function OrderListContent(props: {
  orders: OrderListItem[]
  loading: boolean
  errorMessage: string
  emptyTitle: string
  deletingOrderKey: string
  resendingOrderKey: string
  canCancelOrder: (order: OrderListItem) => boolean
  canDeleteOrder: (order: OrderListItem) => boolean
  canModifyOrder: (order: OrderListItem) => boolean
  canResendOrder: (order: OrderListItem) => boolean
  getOrderActionKey: (order: OrderListItem) => string
  getResendActionText: (order: OrderListItem) => string
  onOpenDetail: (order: OrderListItem) => void
  onCancelOrder: (order: OrderListItem) => void
  onDeleteOrder: (order: OrderListItem) => void
  onModifyOrder: (order: OrderListItem) => void
  onResendOrder: (order: OrderListItem) => void
}) {
  return (
    <View className='order-list-content'>
      {props.orders.map(order => (
        <OrderCard
          canCancelOrder={props.canCancelOrder}
          canDeleteOrder={props.canDeleteOrder}
          canModifyOrder={props.canModifyOrder}
          canResendOrder={props.canResendOrder}
          deletingOrderKey={props.deletingOrderKey}
          getOrderActionKey={props.getOrderActionKey}
          getResendActionText={props.getResendActionText}
          key={getOrderCardKey(order)}
          order={order}
          resendingOrderKey={props.resendingOrderKey}
          onCancelOrder={props.onCancelOrder}
          onDeleteOrder={props.onDeleteOrder}
          onModifyOrder={props.onModifyOrder}
          onOpenDetail={props.onOpenDetail}
          onResendOrder={props.onResendOrder}
        />
      ))}

      {!props.orders.length && !props.loading && (
        <OrderListEmpty title={props.errorMessage || props.emptyTitle} />
      )}

      {props.loading && <OrderListLoading hasOrders={!!props.orders.length} />}
    </View>
  )
}
