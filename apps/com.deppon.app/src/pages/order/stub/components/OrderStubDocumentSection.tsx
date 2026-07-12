import { Text, View } from '@tarojs/components'

import { OrderStubSection } from './OrderStubSection'
import { AppPressable } from '../../../../shared/components'

import type { OrderStubDocumentView } from '../../../../services/order'

import './OrderStubDocumentSection.scss'

export function OrderStubDocumentSection(props: {
  document: OrderStubDocumentView | null
  onOpen: () => void
}) {
  if (!props.document) {
    return null
  }

  const { document } = props

  return (
    <OrderStubSection hint={document.statusText} title='单据票证'>
      <View className='order-stub-document'>
        <View
          className={
            document.canPreview
              ? 'order-stub-document__mark order-stub-document__mark--ready'
              : 'order-stub-document__mark'
          }
        >
          <Text className='order-stub-document__mark-text'>PDF</Text>
        </View>
        <View className='order-stub-document__content'>
          <Text className='order-stub-document__title'>{document.title}</Text>
          <Text className='order-stub-document__summary'>
            {document.summary}
          </Text>
        </View>
        <AppPressable
          accessibilityLabel={document.actionText}
          className={
            document.canPreview
              ? 'order-stub-document__button'
              : 'order-stub-document__button order-stub-document__button--disabled'
          }
          onPress={props.onOpen}
        >
          <Text className='order-stub-document__button-text'>
            {document.actionText}
          </Text>
        </AppPressable>
      </View>
    </OrderStubSection>
  )
}
