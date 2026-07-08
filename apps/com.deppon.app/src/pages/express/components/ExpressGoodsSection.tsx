import { Input, Text, View } from '@tarojs/components'

import type {
  ExpressDraft,
  ExpressGoodsItem,
  ExpressInsuranceQuote
} from '../../../services/express'

interface ExpressGoodsSectionProps {
  goods: ExpressDraft['goods']
  goodsLoading: boolean
  goodsMessage: string
  goodsSuggestions: ExpressGoodsItem[]
  insuranceLoading: boolean
  insuranceMessage: string
  insuranceQuote: ExpressInsuranceQuote | null
  onGoodsChange: (patch: Partial<ExpressDraft['goods']>) => void
  onGoodsNameInput: (value: string) => void
  onInsuranceGoodsChange: (patch: Partial<ExpressDraft['goods']>) => void
  onOpenInsuranceRules: () => void
  onQueryGoodsNames: () => void
  onQueryInsurancePrice: () => void
  onSelectGoodsName: (item: ExpressGoodsItem) => void
}

function parseNumber(value: string, fallback = 0) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

function getMoneyText(value: number) {
  if (!Number.isFinite(value)) {
    return '¥0'
  }

  return Number.isInteger(value) ? `¥${value}` : `¥${value.toFixed(2)}`
}

function getGoodsCategoryText(item: ExpressGoodsItem) {
  return [item.firstCategory, item.secondCategory].filter(Boolean).join(' / ')
}

export function ExpressGoodsSection({
  goods,
  goodsLoading,
  goodsMessage,
  goodsSuggestions,
  insuranceLoading,
  insuranceMessage,
  insuranceQuote,
  onGoodsChange,
  onGoodsNameInput,
  onInsuranceGoodsChange,
  onOpenInsuranceRules,
  onQueryGoodsNames,
  onQueryInsurancePrice,
  onSelectGoodsName
}: ExpressGoodsSectionProps) {
  return (
    <View className='express-section'>
      <View className='express-section__head'>
        <Text className='express-section__title'>物品信息</Text>
        <Text className='express-section__hint'>必填</Text>
      </View>

      <View className='express-field'>
        <View className='express-field__row'>
          <Text className='express-field__label'>货物名称</Text>
          <View className='express-field__button' onClick={onQueryGoodsNames}>
            <Text className='express-field__button-text'>
              {goodsLoading ? '查询中' : '推荐'}
            </Text>
          </View>
        </View>
        <Input
          className='express-input'
          placeholder='如文件、服饰、配件'
          value={goods.name}
          onInput={event => onGoodsNameInput(event.detail.value)}
        />
        {goodsSuggestions.length > 0 && (
          <View className='express-goods-suggestions'>
            {goodsSuggestions.map((item, index) => (
              <View
                className='express-goods-suggestion'
                key={`${item.productKeyWord}-${item.secondCategory}-${index}`}
                onClick={() => onSelectGoodsName(item)}
              >
                <Text className='express-goods-suggestion__name'>
                  {item.productKeyWord}
                </Text>
                <Text className='express-goods-suggestion__desc'>
                  {getGoodsCategoryText(item) || '常用品名'}
                </Text>
              </View>
            ))}
          </View>
        )}
        {goodsMessage && (
          <Text className='express-goods-message'>{goodsMessage}</Text>
        )}
      </View>

      <View className='express-field-grid'>
        <View className='express-field express-field--grid'>
          <Text className='express-field__label'>重量 kg</Text>
          <Input
            className='express-input'
            placeholder='1'
            type='digit'
            value={String(goods.weight)}
            onInput={event =>
              onInsuranceGoodsChange({
                weight: parseNumber(event.detail.value, 0)
              })
            }
          />
        </View>
        <View className='express-field express-field--grid express-field--grid-right'>
          <Text className='express-field__label'>件数</Text>
          <Input
            className='express-input'
            placeholder='1'
            type='number'
            value={String(goods.count)}
            onInput={event =>
              onGoodsChange({ count: parseNumber(event.detail.value, 1) })
            }
          />
        </View>
      </View>

      <View className='express-field-grid'>
        <View className='express-field express-field--grid express-field--grid-right'>
          <Text className='express-field__label'>体积 m³</Text>
          <Input
            className='express-input'
            placeholder='选填'
            type='digit'
            value={String(goods.volume || '')}
            onInput={event =>
              onInsuranceGoodsChange({
                volume: parseNumber(event.detail.value, 0)
              })
            }
          />
        </View>
        <View className='express-field express-field--grid'>
          <View className='express-field__row'>
            <Text className='express-field__label'>保价金额</Text>
            <View className='express-field__actions'>
              <View
                className='express-field__button express-field__button--compact'
                onClick={onOpenInsuranceRules}
              >
                <Text className='express-field__button-text'>规则</Text>
              </View>
              <View
                className='express-field__button express-field__button--compact'
                onClick={onQueryInsurancePrice}
              >
                <Text className='express-field__button-text'>
                  {insuranceLoading ? '试算中' : '试算'}
                </Text>
              </View>
            </View>
          </View>
          <Input
            className='express-input'
            placeholder='0'
            type='digit'
            value={String(goods.insuredAmount || '')}
            onInput={event =>
              onInsuranceGoodsChange({
                insuredAmount: parseNumber(event.detail.value, 0)
              })
            }
          />
          {insuranceQuote && (
            <Text className='express-insurance-message'>
              {insuranceQuote.name || '保价费'}约
              {getMoneyText(insuranceQuote.price)}
            </Text>
          )}
          {insuranceMessage && (
            <Text className='express-insurance-message express-insurance-message--error'>
              {insuranceMessage}
            </Text>
          )}
        </View>
      </View>
    </View>
  )
}
