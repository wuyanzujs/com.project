import { Text, View } from '@tarojs/components'

import { OrderStubSection } from './OrderStubSection'
import { AppPressable } from '../../../../shared/components'

import type {
  OrderStubFieldView,
  OrderStubView
} from '../../../../services/order'

import './OrderStubDetailSections.scss'

function OrderStubField(props: {
  field: OrderStubFieldView
  first: boolean
  onCopy: (value: string) => void
}) {
  const { field } = props
  const className = `order-stub-field${
    props.first ? ' order-stub-field--first' : ''
  }${field.important ? ' order-stub-field--important' : ''}`

  return (
    <View className={className}>
      <Text className='order-stub-field__label'>{field.label}</Text>
      <View className='order-stub-field__content'>
        <Text className='order-stub-field__value'>{field.value}</Text>
        {!!field.copyValue && (
          <AppPressable
            accessibilityLabel={`复制${field.label}`}
            className='order-stub-field__copy'
            onPress={() => props.onCopy(field.copyValue || '')}
          >
            <Text className='order-stub-field__copy-text'>复制</Text>
          </AppPressable>
        )}
      </View>
    </View>
  )
}

export function OrderStubDetailSections(props: {
  sections: OrderStubView['sections']
  onCopy: (value: string) => void
}) {
  return (
    <>
      {props.sections.map(section => (
        <OrderStubSection key={section.title} title={section.title}>
          {section.fields.map((field, index) => (
            <OrderStubField
              field={field}
              first={index === 0}
              key={`${field.label}-${field.value}`}
              onCopy={props.onCopy}
            />
          ))}
        </OrderStubSection>
      ))}
    </>
  )
}
