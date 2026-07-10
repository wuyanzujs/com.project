import { Text, View } from '@tarojs/components'

import { createExpressProductQuoteView } from '../../../../services/express'

import type { ExpressProductQuote } from '../../../../services/express'

import '../index.scss'

interface QueryPriceProductCardProps {
  product: ExpressProductQuote
  onExpress: (product: ExpressProductQuote) => void
}

export function QueryPriceProductCard({
  product,
  onExpress
}: QueryPriceProductCardProps) {
  const view = createExpressProductQuoteView(product)
  const feeText = view.feeRows
    .slice(0, 3)
    .map((row) => `${row.name} ¥${row.amount}`)
    .join(' · ')

  return (
    <View className='query-price-product'>
      <View className='query-price-product__main'>
        <Text className='query-price-product__name'>{view.name}</Text>
        <Text className='query-price-product__time'>{view.timeText}</Text>
        {view.billWeightText && (
          <Text className='query-price-product__weight'>
            {view.billWeightText}
          </Text>
        )}
        {feeText && (
          <Text className='query-price-product__fees'>{feeText}</Text>
        )}
      </View>
      <View className='query-price-product__side'>
        <Text className='query-price-product__price'>
          {view.priceWithSuffixText}
        </Text>
        <View
          className='query-price-product__button'
          onClick={() => onExpress(product)}
        >
          <Text className='query-price-product__button-text'>去寄件</Text>
        </View>
      </View>
    </View>
  )
}
