import { Text, View } from '@tarojs/components'

import { OrderStubSection } from './OrderStubSection'

import type {
  OrderStubPackageFeeGroupView,
  OrderStubPackageFeeView,
  OrderStubView
} from '../../../../services/order'

import './OrderStubGoodsSupplement.scss'

function OrderStubPackageFeeGroup(props: {
  group: OrderStubPackageFeeGroupView
}) {
  const { group } = props

  return (
    <View className='order-stub-package-group'>
      <Text className='order-stub-package-group__title'>{group.title}</Text>
      <View className='order-stub-package-row order-stub-package-row--head'>
        <Text className='order-stub-package-row__name order-stub-package-row__name--head'>
          {group.nameTitle}
        </Text>
        <Text className='order-stub-package-row__count order-stub-package-row__count--head'>
          {group.countTitle}
        </Text>
        <Text className='order-stub-package-row__amount order-stub-package-row__amount--head'>
          {group.amountTitle}
        </Text>
      </View>
      {group.items.map(item => (
        <View
          className='order-stub-package-row'
          key={`${group.title}-${item.name}-${item.amount}`}
        >
          <Text className='order-stub-package-row__name'>{item.name}</Text>
          <Text className='order-stub-package-row__count'>{item.count}</Text>
          <Text className='order-stub-package-row__amount'>{item.amount}</Text>
        </View>
      ))}
    </View>
  )
}

export function OrderStubGoodsSupplement(props: {
  packageFee: OrderStubPackageFeeView | null
  size: OrderStubView['size']
}) {
  if (!props.size.available && !props.packageFee?.available) {
    return null
  }

  return (
    <OrderStubSection hint='只读明细' title='货物补充'>
      {props.size.available && (
        <View className='order-stub-size'>
          <Text className='order-stub-size__title'>尺寸详情</Text>
          {props.size.rows.map(row => (
            <Text className='order-stub-size__row' key={row}>
              {row}
            </Text>
          ))}
          <Text className='order-stub-size__notice'>{props.size.notice}</Text>
        </View>
      )}
      {props.packageFee?.available && (
        <View className='order-stub-package'>
          <View className='order-stub-package__head'>
            <Text className='order-stub-package__title'>包装费用</Text>
            <Text className='order-stub-package__amount'>
              {props.packageFee.totalAmount}
            </Text>
          </View>
          {props.packageFee.groups.map(group => (
            <OrderStubPackageFeeGroup group={group} key={group.title} />
          ))}
        </View>
      )}
    </OrderStubSection>
  )
}
