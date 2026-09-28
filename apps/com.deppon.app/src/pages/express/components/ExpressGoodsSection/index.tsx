import { Input, Text, View } from '@tarojs/components'

import { useState } from 'react'

import type { ExpressDraft, ExpressGoodsItem } from '@/services/express'
import { AppPressable } from '@/shared/components'
import { APP_NATIVE_TOKENS } from '@/styles/nativeTokens'

import { ExpressSection } from '../ExpressSection'

import './index.scss'

interface ExpressGoodsSectionProps {
  goods: ExpressDraft['goods']
  goodsLoading: boolean
  goodsMessage: string
  goodsSuggestions: ExpressGoodsItem[]
  onGoodsChange: (patch: Partial<ExpressDraft['goods']>) => void
  onGoodsNameInput: (value: string) => void
  onQueryGoodsNames: () => void
  onSelectGoodsName: (item: ExpressGoodsItem) => void
  plain?: boolean
}
function parseNumber(value: string, fallback = 0) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

function getGoodsCategoryText(item: ExpressGoodsItem) {
  return [item.firstCategory, item.secondCategory].filter(Boolean).join(' / ')
}

export function ExpressGoodsSection({
  goods,
  goodsLoading,
  goodsMessage,
  goodsSuggestions,
  onGoodsChange,
  onGoodsNameInput,
  onQueryGoodsNames,
  onSelectGoodsName,
  plain = false
}: ExpressGoodsSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const goodsSummary =
    goods.name && goods.weight > 0
      ? [goods.name, `${goods.weight}kg`, `${goods.count || 1}件`].join(' · ')
      : '请完善货物名称、重量'

  return (
    <ExpressSection
      expanded={expanded}
      hint='必填'
      plain={plain}
      summary={goodsSummary}
      title='货物信息'
      onHeaderPress={() => setExpanded(current => !current)}
    >
      {expanded ? (
        <>
          <View className='express-field'>
            <View className='express-field__row'>
              <Text className='express-field__label'>货物名称</Text>
              <AppPressable
                accessibilityLabel='推荐货物名称'
                className='express-field__button'
                onPress={onQueryGoodsNames}
              >
                <Text className='express-field__button-text'>
                  {goodsLoading ? '查询中' : '推荐'}
                </Text>
              </AppPressable>
            </View>
            <Input
              className='express-input'
              placeholder='如文件、服饰、配件'
              style={{ minHeight: APP_NATIVE_TOKENS.touch.minimum }}
              value={goods.name}
              onInput={event => onGoodsNameInput(event.detail.value)}
            />
            {goodsSuggestions.length > 0 && (
              <View className='express-goods-suggestions'>
                {goodsSuggestions.map((item, index) => (
                  <AppPressable
                    accessibilityLabel={`选择货物名称${item.productKeyWord}`}
                    className='express-goods-suggestion'
                    key={`${item.productKeyWord}-${item.secondCategory}-${index}`}
                    onPress={() => onSelectGoodsName(item)}
                  >
                    <Text className='express-goods-suggestion__name'>
                      {item.productKeyWord}
                    </Text>
                    <Text className='express-goods-suggestion__desc'>
                      {getGoodsCategoryText(item) || '常用品名'}
                    </Text>
                  </AppPressable>
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
                style={{ minHeight: APP_NATIVE_TOKENS.touch.minimum }}
                type='digit'
                value={String(goods.weight)}
                onInput={event =>
                  onGoodsChange({
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
                style={{ minHeight: APP_NATIVE_TOKENS.touch.minimum }}
                type='number'
                value={String(goods.count)}
                onInput={event =>
                  onGoodsChange({ count: parseNumber(event.detail.value, 1) })
                }
              />
            </View>
          </View>

          <View className='express-field'>
            <Text className='express-field__label'>体积 m³</Text>
            <Input
              className='express-input'
              placeholder='选填'
              style={{ minHeight: APP_NATIVE_TOKENS.touch.minimum }}
              type='digit'
              value={String(goods.volume || '')}
              onInput={event =>
                onGoodsChange({
                  volume: parseNumber(event.detail.value, 0)
                })
              }
            />
          </View>
        </>
      ) : null}
    </ExpressSection>
  )
}
