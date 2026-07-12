import { AppPageHeader } from '../../../../shared/components'
import './OrderStubHeader.scss'

export function OrderStubHeader(props: {
  title?: string
  subtitle?: string
}) {
  return (
    <AppPageHeader
      className='order-stub-header'
      subtitle={props.subtitle || '订单结构化凭证'}
      subtitleClassName='order-stub-header__summary'
      title={props.title || '电子存根'}
      titleClassName='order-stub-header__title'
    />
  )
}
