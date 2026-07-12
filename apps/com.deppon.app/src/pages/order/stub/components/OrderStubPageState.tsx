import {
  AppButton,
  AppEmptyState,
  AppLoadingState
} from '../../../../shared/components'

import './OrderStubPageState.scss'

export function OrderStubLoadingState() {
  return (
    <AppLoadingState
      className='order-stub-loading'
      label='正在加载电子存根...'
      layout='inline'
      showIndicator={false}
    />
  )
}

export function OrderStubEmptyState(props: {
  message: string
  onBack: () => void
}) {
  return (
    <AppEmptyState
      action={
        <AppButton
          className='order-stub-empty__button'
          density='compact'
          label='返回订单详情'
          labelClassName='order-stub-empty__button-text'
          onPress={props.onBack}
        />
      }
      actionClassName='order-stub-empty__action'
      className='order-stub-empty'
      title={props.message || '暂未获取到电子存根'}
      titleClassName='order-stub-empty__title'
    />
  )
}
