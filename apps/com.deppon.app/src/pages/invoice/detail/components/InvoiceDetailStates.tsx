import {
  AppButton,
  AppEmptyState,
  AppLoadingState
} from '../../../../shared/components'
import './InvoiceDetailStates.scss'

interface InvoiceDetailMissingStateProps {
  onBack: () => void
}

export function InvoiceDetailMissingState({
  onBack
}: InvoiceDetailMissingStateProps) {
  return (
    <AppEmptyState
      action={
        <AppButton
          className='invoice-detail-empty__button'
          density='compact'
          label='返回发票中心'
          labelClassName='invoice-detail-empty__button-text'
          onPress={onBack}
        />
      }
      actionClassName='invoice-detail-empty__action'
      className='invoice-detail-empty'
      description='请从发票中心的开票历史进入详情。'
      descriptionClassName='invoice-detail-empty__summary'
      title='缺少发票信息'
      titleClassName='invoice-detail-empty__title'
    />
  )
}

export function InvoiceDetailLoadingState() {
  return (
    <AppLoadingState
      className='invoice-detail-loading'
      label='正在加载包含运单...'
      layout='inline'
      showIndicator={false}
    />
  )
}
