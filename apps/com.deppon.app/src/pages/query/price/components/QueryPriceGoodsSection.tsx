import { Input, Text, View } from '@tarojs/components'

import { QueryPriceSection } from './QueryPriceSection'
import { AppPressable } from '../../../../shared/components'

import type {
  ExpressDeliveryMode,
  ExpressDraft
} from '../../../../services/express'


import './QueryPriceFormFields.scss'
import './QueryPriceGoodsSection.scss'

const DELIVERY_OPTIONS: Array<{ label: string; value: ExpressDeliveryMode }> = [
  {
    label: '送货上门',
    value: 'PICKNOTUPSTAIRS'
  },
  {
    label: '自提',
    value: 'PICKSELF'
  },
  {
    label: '送货上楼',
    value: 'PICKUPSTAIRS'
  }
]

function parseNumber(value: string, fallback = 0) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

interface QueryPriceGoodsSectionProps {
  draft: ExpressDraft
  onGoodsChange: (patch: Partial<ExpressDraft['goods']>) => void
  onDeliveryChange: (deliveryMode: ExpressDeliveryMode) => void
}

export function QueryPriceGoodsSection(props: QueryPriceGoodsSectionProps) {
  return (
    <QueryPriceSection>
      <View className='query-price-section__head'>
        <Text className='query-price-section__title'>货物与服务</Text>
        {props.draft.quoteStaleReason && (
          <Text className='query-price-section__hint'>
            {props.draft.quoteStaleReason}
          </Text>
        )}
      </View>

      <View className='query-price-field'>
        <Text className='query-price-field__label'>货物名称</Text>
        <Input
          className='query-price-input'
          placeholder='如文件、服饰、配件'
          value={props.draft.goods.name}
          onInput={event =>
            props.onGoodsChange({ name: event.detail.value })
          }
        />
      </View>

      <View className='query-price-grid'>
        <View className='query-price-field query-price-field--grid'>
          <Text className='query-price-field__label'>重量 kg</Text>
          <Input
            className='query-price-input'
            placeholder='1'
            type='digit'
            value={String(props.draft.goods.weight)}
            onInput={event =>
              props.onGoodsChange({
                weight: parseNumber(event.detail.value, 0)
              })
            }
          />
        </View>
        <View className='query-price-field query-price-field--grid query-price-field--right'>
          <Text className='query-price-field__label'>件数</Text>
          <Input
            className='query-price-input'
            placeholder='1'
            type='number'
            value={String(props.draft.goods.count)}
            onInput={event =>
              props.onGoodsChange({
                count: parseNumber(event.detail.value, 1)
              })
            }
          />
        </View>
      </View>

      <Text className='query-price-option-title'>送货方式</Text>
      <View className='query-price-chip-group'>
        {DELIVERY_OPTIONS.map(option => (
          <AppPressable
            className={
              option.value === props.draft.service.deliveryMode
                ? 'query-price-chip query-price-chip--active'
                : 'query-price-chip'
            }
            key={option.value}
            onPress={() => props.onDeliveryChange(option.value)}
          >
            <Text
              className={
                option.value === props.draft.service.deliveryMode
                  ? 'query-price-chip__text query-price-chip__text--active'
                  : 'query-price-chip__text'
              }
            >
              {option.label}
            </Text>
          </AppPressable>
        ))}
      </View>
    </QueryPriceSection>
  )
}
