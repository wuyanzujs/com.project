import { Input, Text, View } from '@tarojs/components'

import type { OrderEditContact } from '../../../../services/order'

import './OrderEditContactSection.scss'
import './OrderEditSection.scss'

export function OrderEditContactSection(props: {
  title: string
  contact: OrderEditContact
  onChange: (patch: Partial<OrderEditContact>) => void
}) {
  return (
    <View className='order-edit-section'>
      <Text className='order-edit-section__title'>{props.title}</Text>

      <View className='order-edit-row'>
        <Text className='order-edit-row__label'>姓名</Text>
        <Input
          className='order-edit-input'
          maxlength={20}
          placeholder='请输入姓名'
          value={props.contact.name}
          onInput={event => props.onChange({ name: event.detail.value })}
        />
      </View>

      <View className='order-edit-row'>
        <Text className='order-edit-row__label'>手机号</Text>
        <Input
          className='order-edit-input'
          maxlength={11}
          placeholder='请输入手机号'
          type='number'
          value={props.contact.mobile}
          onInput={event => props.onChange({ mobile: event.detail.value })}
        />
      </View>

      <View className='order-edit-region'>
        <View className='order-edit-region__item'>
          <Text className='order-edit-region__label'>省份</Text>
          <Input
            className='order-edit-region__input'
            placeholder='省份'
            value={props.contact.province}
            onInput={event => props.onChange({ province: event.detail.value })}
          />
        </View>
        <View className='order-edit-region__item order-edit-region__item--middle'>
          <Text className='order-edit-region__label'>城市</Text>
          <Input
            className='order-edit-region__input'
            placeholder='城市'
            value={props.contact.city}
            onInput={event => props.onChange({ city: event.detail.value })}
          />
        </View>
        <View className='order-edit-region__item'>
          <Text className='order-edit-region__label'>区县</Text>
          <Input
            className='order-edit-region__input'
            placeholder='区县'
            value={props.contact.county}
            onInput={event => props.onChange({ county: event.detail.value })}
          />
        </View>
      </View>

      <View className='order-edit-row order-edit-row--last'>
        <Text className='order-edit-row__label'>详细地址</Text>
        <Input
          className='order-edit-input'
          maxlength={100}
          placeholder='街道、门牌号等'
          value={props.contact.address}
          onInput={event => props.onChange({ address: event.detail.value })}
        />
      </View>
    </View>
  )
}
