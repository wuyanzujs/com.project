import { Input, Text, Textarea, View } from '@tarojs/components'

import type { OrderEditDraft } from '../../../../services/order'

import '../index.scss'

export function OrderEditGoodsSection(props: {
  draft: OrderEditDraft
  onChange: (patch: Partial<OrderEditDraft>) => void
}) {
  return (
    <View className='order-edit-section'>
      <Text className='order-edit-section__title'>货物信息</Text>

      <View className='order-edit-row'>
        <Text className='order-edit-row__label'>货物名称</Text>
        <Input
          className='order-edit-input'
          maxlength={30}
          placeholder='请输入货物名称'
          value={props.draft.goodsName}
          onInput={event => props.onChange({ goodsName: event.detail.value })}
        />
      </View>

      <View className='order-edit-metrics'>
        <View className='order-edit-metric'>
          <Text className='order-edit-region__label'>件数</Text>
          <Input
            className='order-edit-region__input'
            placeholder='1'
            type='number'
            value={String(props.draft.goodsNumber)}
            onInput={event =>
              props.onChange({ goodsNumber: Number(event.detail.value) })
            }
          />
        </View>
        <View className='order-edit-metric order-edit-metric--middle'>
          <Text className='order-edit-region__label'>重量（kg）</Text>
          <Input
            className='order-edit-region__input'
            placeholder='1'
            type='digit'
            value={String(props.draft.totalWeight)}
            onInput={event =>
              props.onChange({ totalWeight: Number(event.detail.value) })
            }
          />
        </View>
        <View className='order-edit-metric'>
          <Text className='order-edit-region__label'>体积（m³）</Text>
          <Input
            className='order-edit-region__input'
            placeholder='0'
            type='digit'
            value={String(props.draft.totalVolume)}
            onInput={event =>
              props.onChange({ totalVolume: Number(event.detail.value) })
            }
          />
        </View>
      </View>

      <Text className='order-edit-field-label'>备注</Text>
      <Textarea
        className='order-edit-textarea'
        maxlength={100}
        placeholder='选填，最多100个字符'
        value={props.draft.remark}
        onInput={event => props.onChange({ remark: event.detail.value })}
      />
    </View>
  )
}
