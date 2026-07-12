import {
  AppButton,
  AppEmptyState,
  AppLoadingState
} from '../../../../shared/components'

import './OrderDetailStates.scss'

interface OrderDetailEmptyProps {
  buttonText: string
  title: string
  onPress: () => void
}

export function OrderDetailEmpty({
  buttonText,
  title,
  onPress
}: OrderDetailEmptyProps) {
  return (
    <AppEmptyState
      action={
        <AppButton
          className='order-detail-empty__button'
          density='compact'
          label={buttonText}
          labelClassName='order-detail-empty__button-text'
          onPress={onPress}
        />
      }
      actionClassName='order-detail-empty__action'
      className='order-detail-empty'
      title={title}
      titleClassName='order-detail-empty__title'
    />
  )
}

export function OrderDetailLoading(props: { publicTrackMode: boolean }) {
  return (
    <AppLoadingState
      className='order-detail-loading'
      label={
        props.publicTrackMode ? '正在加载物流轨迹...' : '正在加载订单详情...'
      }
      layout='inline'
      showIndicator={false}
    />
  )
}
