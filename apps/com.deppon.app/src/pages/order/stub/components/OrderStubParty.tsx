import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'

import type { OrderStubPartyView } from '../../../../services/order'

import './OrderStubParty.scss'

export function OrderStubParty(props: {
  party: OrderStubPartyView
  onCopy: (value: string, successText?: string) => void
}) {
  const { party } = props

  return (
    <View className='order-stub-party'>
      <Text
        className={
          party.role === 'sender'
            ? 'order-stub-party__tag'
            : 'order-stub-party__tag order-stub-party__tag--receiver'
        }
      >
        {party.role === 'sender' ? '寄' : '收'}
      </Text>
      <View className='order-stub-party__content'>
        <View className='order-stub-party__head'>
          <Text className='order-stub-party__label'>{party.label}</Text>
          {party.encrypted && (
            <Text className='order-stub-party__badge'>隐私保护</Text>
          )}
        </View>
        <Text className='order-stub-party__name'>
          {party.name} {party.mobile}
        </Text>
        <Text className='order-stub-party__address'>{party.address}</Text>
        <AppPressable
          accessibilityLabel={`复制${party.label}地址`}
          className='order-stub-party__copy'
          onPress={() => props.onCopy(party.copyText, '地址复制成功')}
        >
          <Text className='order-stub-party__copy-text'>复制地址</Text>
        </AppPressable>
      </View>
    </View>
  )
}
