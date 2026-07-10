import { Text, View } from '@tarojs/components'

import {
  getOrderReceiverAddress,
  getOrderSenderAddress
} from '../../../../services/order'

import type {
  OrderDetail,
  OrderStubEntryView,
  WaybillTrackItem
} from '../../../../services/order'
import type { PaymentSummary } from '../../../../services/payment'

import '../index.scss'

export function OrderDetailHeader(props: {
  title: string
  identityText: string
  onCopy: () => void
}) {
  return (
    <View className='order-detail-header'>
      <Text className='order-detail-header__label'>Order</Text>
      <Text className='order-detail-header__title'>{props.title}</Text>
      <View className='order-detail-header__summary-row'>
        <Text className='order-detail-header__summary'>{props.identityText}</Text>
        <View className='order-detail-header__copy' onClick={props.onCopy}>
          <Text className='order-detail-header__copy-text'>复制</Text>
        </View>
      </View>
    </View>
  )
}

export function OrderDetailEmpty(props: {
  title: string
  buttonText: string
  onClick: () => void
}) {
  return (
    <View className='order-detail-empty'>
      <Text className='order-detail-empty__title'>{props.title}</Text>
      <View className='order-detail-empty__button' onClick={props.onClick}>
        <Text className='order-detail-empty__button-text'>
          {props.buttonText}
        </Text>
      </View>
    </View>
  )
}

export function OrderDetailLoading(props: { publicTrackMode: boolean }) {
  return (
    <Text className='order-detail-loading'>
      {props.publicTrackMode ? '正在加载物流轨迹...' : '正在加载订单详情...'}
    </Text>
  )
}

export function OrderTrackSection(props: {
  tracks: WaybillTrackItem[]
  hintText: string
  emptyText?: string
}) {
  return (
    <View className='order-detail-section'>
      <View className='order-detail-section__head'>
        <Text className='order-detail-section__title'>物流轨迹</Text>
        <Text className='order-detail-section__hint'>{props.hintText}</Text>
      </View>

      {props.tracks.length ? (
        props.tracks.map((track) => (
          <View
            className='order-track'
            key={`${track.operateTime}-${track.trackIndex}`}
          >
            <View
              className={
                track.trackFirst
                  ? 'order-track__dot order-track__dot--active'
                  : 'order-track__dot'
              }
            />
            <View className='order-track__content'>
              <Text className='order-track__text'>
                {track.contentNoLinkLabel || track.contentOrig || track.content}
              </Text>
              <Text className='order-track__time'>
                {track.date} {track.time}
              </Text>
            </View>
          </View>
        ))
      ) : props.emptyText ? (
        <Text className='order-detail-section__empty'>{props.emptyText}</Text>
      ) : null}
    </View>
  )
}

export function OrderPublicTrackActions(props: {
  onRefresh: () => void
  onOpenSecureDetail: () => void
}) {
  return (
    <View className='order-detail-actions'>
      <View className='order-detail-secondary' onClick={props.onRefresh}>
        <Text className='order-detail-secondary__text'>刷新</Text>
      </View>
      <View className='order-detail-primary' onClick={props.onOpenSecureDetail}>
        <Text className='order-detail-primary__text'>查看完整详情</Text>
      </View>
    </View>
  )
}

export function OrderPaymentAlert(props: {
  summary: PaymentSummary | null
  paying: boolean
  onPay: () => void
}) {
  if (!props.summary) {
    return null
  }

  return (
    <View className='order-payment-alert'>
      <View className='order-payment-alert__content'>
        <Text className='order-payment-alert__title'>订单存在待支付费用</Text>
        <Text className='order-payment-alert__summary'>
          共 {props.summary.count} 笔，合计 ¥{props.summary.amount.toFixed(2)}
        </Text>
        {props.summary.disabledReason && (
          <Text className='order-payment-alert__hint'>
            {props.summary.disabledReason}
          </Text>
        )}
      </View>
      <View
        className={
          props.summary.canPay
            ? 'order-payment-alert__button'
            : 'order-payment-alert__button order-payment-alert__button--disabled'
        }
        onClick={props.onPay}
      >
        <Text className='order-payment-alert__button-text'>
          {props.paying ? '处理中' : props.summary.canPay ? '去支付' : '暂不可付'}
        </Text>
      </View>
    </View>
  )
}

export function OrderStubEntryCard(props: {
  entry: OrderStubEntryView | null
  onOpen: () => void
}) {
  if (!props.entry?.available) {
    return null
  }

  return (
    <View className='order-detail-stub-entry' onClick={props.onOpen}>
      <View className='order-detail-stub-entry__mark'>
        <Text className='order-detail-stub-entry__mark-text'>存</Text>
      </View>
      <View className='order-detail-stub-entry__content'>
        <Text className='order-detail-stub-entry__title'>
          {props.entry.title}
        </Text>
        <Text className='order-detail-stub-entry__summary'>
          {props.entry.summary}
        </Text>
      </View>
      <Text className='order-detail-stub-entry__arrow'>›</Text>
    </View>
  )
}

export function OrderTransportSection(props: {
  detail: OrderDetail
  onDial: (phoneNumber?: string | null) => void
}) {
  const detail = props.detail

  return (
    <View className='order-detail-section'>
      <View className='order-detail-section__head'>
        <Text className='order-detail-section__title'>运输信息</Text>
        <Text className='order-detail-section__hint'>{detail.orderTime || ''}</Text>
      </View>

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
      {(detail.courierName || detail.courierMobile) && (
        <View className='order-detail-meta-row'>
          <Text className='order-detail-meta-row__label'>快递员</Text>
          <View className='order-detail-meta-row__content'>
            <Text className='order-detail-meta-row__value'>
              {detail.courierName || '--'} {detail.courierMobile || ''}
            </Text>
            {detail.courierMobile && (
              <View
                className='order-detail-call'
                onClick={() => props.onDial(detail.courierMobile)}
              >
                <Text className='order-detail-call__text'>拨打</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  )
}

export function OrderAddressSection(props: {
  detail: OrderDetail
  onDial: (phoneNumber?: string | null) => void
}) {
  const detail = props.detail

  return (
    <View className='order-detail-section'>
      <Text className='order-detail-section__title'>寄收信息</Text>
      <View className='order-address-card'>
        <Text className='order-address-card__tag'>寄</Text>
        <View className='order-address-card__content'>
          <View className='order-address-card__head'>
            <Text className='order-address-card__name'>
              {detail.contactName || '--'} {detail.contactMobile || ''}
            </Text>
            {detail.contactMobile && (
              <Text
                className='order-address-card__call'
                onClick={() => props.onDial(detail.contactMobile)}
              >
                拨打
              </Text>
            )}
          </View>
          <Text className='order-address-card__address'>
            {getOrderSenderAddress(detail) || '--'}
          </Text>
        </View>
      </View>
      <View className='order-address-card'>
        <Text className='order-address-card__tag order-address-card__tag--receive'>
          收
        </Text>
        <View className='order-address-card__content'>
          <View className='order-address-card__head'>
            <Text className='order-address-card__name'>
              {detail.receiverName || '--'} {detail.receiverMobile || ''}
            </Text>
            {detail.receiverMobile && (
              <Text
                className='order-address-card__call'
                onClick={() => props.onDial(detail.receiverMobile)}
              >
                拨打
              </Text>
            )}
          </View>
          <Text className='order-address-card__address'>
            {getOrderReceiverAddress(detail) || '--'}
          </Text>
        </View>
      </View>
    </View>
  )
}
