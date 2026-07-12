import { Text } from '@tarojs/components'

import { QueryPriceContactForm } from './QueryPriceContactForm'
import { QueryPriceSection } from './QueryPriceSection'
import { AppPressable } from '../../../../shared/components'

import type {
  ExpressContact,
  ExpressContactTarget
} from '../../../../services/express'

import './QueryPriceContactsSection.scss'

interface QueryPriceContactsSectionProps {
  sender: ExpressContact
  consignee: ExpressContact
  onContactChange: (
    target: ExpressContactTarget,
    patch: Partial<ExpressContact>
  ) => void
  onContactSelect: (target: ExpressContactTarget) => void
  onSwap: () => void
}

export function QueryPriceContactsSection(
  props: QueryPriceContactsSectionProps
) {
  return (
    <QueryPriceSection>
      <QueryPriceContactForm
        contact={props.sender}
        mark='寄'
        target='sender'
        title='寄件地址'
        onChange={patch => props.onContactChange('sender', patch)}
        onSelect={() => props.onContactSelect('sender')}
      />
      <AppPressable className='query-price-swap' onPress={props.onSwap}>
        <Text className='query-price-swap__text'>互换地址</Text>
      </AppPressable>
      <QueryPriceContactForm
        contact={props.consignee}
        mark='收'
        target='consignee'
        title='收件地址'
        onChange={patch => props.onContactChange('consignee', patch)}
        onSelect={() => props.onContactSelect('consignee')}
      />
    </QueryPriceSection>
  )
}
