import { Text, View } from '@tarojs/components'

import { createExpressProductQuoteView } from '../../../services/express'

import type { ExpressDraft, ExpressProductQuote } from '../../../services/express'

import '../index.scss'

interface ExpressQuoteSectionProps {
  pickup: ExpressDraft['pickup']
  quoteStaleReason: string
  quoteStatus: 'idle' | 'loading' | 'done' | 'error'
  quotes: ExpressProductQuote[]
  selectedProduct: ExpressProductQuote | null
  onQueryPickupTime: () => void
  onQuote: () => void
  onSelectProduct: (product: ExpressProductQuote) => void
}

export function ExpressQuoteSection({
  pickup,
  quoteStaleReason,
  quoteStatus,
  quotes,
  selectedProduct,
  onQueryPickupTime,
  onQuote,
  onSelectProduct
}: ExpressQuoteSectionProps) {
  return (
    <View className='express-section'>
      <View className='express-section__head'>
        <Text className='express-section__title'>产品价格</Text>
        {quoteStaleReason && (
          <Text className='express-section__hint'>{quoteStaleReason}</Text>
        )}
      </View>

      <View className='express-actions'>
        <View className='express-secondary-button' onClick={onQueryPickupTime}>
          <Text className='express-secondary-button__text'>
            {pickup.time ? '更新取件时间' : '获取取件时间'}
          </Text>
        </View>
        <View className='express-primary-button' onClick={onQuote}>
          <Text className='express-primary-button__text'>
            {quoteStatus === 'loading' ? '获取中' : '获取价格'}
          </Text>
        </View>
      </View>

      {pickup.time && (
        <View className='express-pickup'>
          <Text className='express-pickup__label'>预计取件</Text>
          <Text className='express-pickup__value'>
            {pickup.timeSlot || pickup.time}
          </Text>
        </View>
      )}

      {quotes.length > 0 && (
        <View className='express-product-list'>
          {quotes.map(product => {
            const view = createExpressProductQuoteView(product)

            return (
              <View
                className={
                  selectedProduct?.omsProductCode === product.omsProductCode
                    ? 'express-product express-product--active'
                    : 'express-product'
                }
                key={view.key}
                onClick={() => onSelectProduct(product)}
              >
                <View className='express-product__main'>
                  <Text className='express-product__name'>{view.name}</Text>
                  <Text className='express-product__desc'>{view.timeText}</Text>
                  {view.billWeightText && (
                    <Text className='express-product__meta'>
                      {view.billWeightText}
                    </Text>
                  )}
                  {view.feeRows.length > 0 && (
                    <Text className='express-product__meta'>
                      {view.feeRows
                        .slice(0, 3)
                        .map(row => `${row.name} ¥${row.amount}`)
                        .join(' · ')}
                    </Text>
                  )}
                </View>
                <Text className='express-product__price'>
                  {view.priceText}
                </Text>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}
