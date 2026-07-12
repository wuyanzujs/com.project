import { Input, Text, View } from '@tarojs/components'

import { getExpressContactFullAddress } from '../../../../services/express'
import { AppPressable } from '../../../../shared/components'

import type {
  ExpressContact,
  ExpressContactTarget
} from '../../../../services/express'


import './QueryPriceContactForm.scss'
import './QueryPriceFormFields.scss'

interface QueryPriceContactFormProps {
  target: ExpressContactTarget
  title: string
  mark: string
  contact: ExpressContact
  onSelect: () => void
  onChange: (patch: Partial<ExpressContact>) => void
}

export function QueryPriceContactForm(props: QueryPriceContactFormProps) {
  return (
    <View className='query-price-contact'>
      <View className='query-price-contact__head'>
        <View className='query-price-contact__title-row'>
          <View
            className={
              props.target === 'sender'
                ? 'query-price-contact__mark query-price-contact__mark--sender'
                : 'query-price-contact__mark query-price-contact__mark--consignee'
            }
          >
            <Text className='query-price-contact__mark-text'>{props.mark}</Text>
          </View>
          <Text className='query-price-contact__title'>{props.title}</Text>
        </View>
        <AppPressable contentElement='text' className='query-price-link' onPress={props.onSelect}>
          地址簿
        </AppPressable>
      </View>

      {props.contact.province &&
        props.contact.city &&
        props.contact.county && (
          <Text className='query-price-contact__summary'>
            {getExpressContactFullAddress(props.contact)}
          </Text>
        )}

      <View className='query-price-grid'>
        <Input
          className='query-price-input query-price-input--grid'
          placeholder='省份'
          value={props.contact.province}
          onInput={event => props.onChange({ province: event.detail.value })}
        />
        <Input
          className='query-price-input query-price-input--grid query-price-input--right'
          placeholder='城市'
          value={props.contact.city}
          onInput={event => props.onChange({ city: event.detail.value })}
        />
      </View>
      <View className='query-price-grid'>
        <Input
          className='query-price-input query-price-input--grid'
          placeholder='区县'
          value={props.contact.county}
          onInput={event => props.onChange({ county: event.detail.value })}
        />
        <Input
          className='query-price-input query-price-input--grid query-price-input--right'
          placeholder='乡镇，选填'
          value={props.contact.town || ''}
          onInput={event => props.onChange({ town: event.detail.value })}
        />
      </View>
      <Input
        className='query-price-input'
        placeholder='街道、门牌号等'
        value={props.contact.address}
        onInput={event => props.onChange({ address: event.detail.value })}
      />
    </View>
  )
}
