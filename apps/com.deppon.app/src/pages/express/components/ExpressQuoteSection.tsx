import { Text, View } from '@tarojs/components'

import type { ExpressDraft, ExpressProductQuote } from '../../../services/express'

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

function getProductKey(product: ExpressProductQuote) {
  return `${product.omsProductCode || product.productName}-${product.totalfee ?? ''}`
}

function getProductPriceText(product: ExpressProductQuote | null) {
  if (!product || product.totalfee === null || product.totalfee === undefined) {
    return '--'
  }

  return `¥${product.totalfee}`
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
          {quotes.map(product => (
            <View
              className={
                selectedProduct?.omsProductCode === product.omsProductCode
                  ? 'express-product express-product--active'
                  : 'express-product'
              }
              key={getProductKey(product)}
              onClick={() => onSelectProduct(product)}
            >
              <View>
                <Text className='express-product__name'>
                  {product.productName || product.omsProductCode || '德邦快递'}
                </Text>
                <Text className='express-product__desc'>
                  {product.daysFormat ||
                    product.days ||
                    product.arriveDate ||
                    '时效待确认'}
                </Text>
              </View>
              <Text className='express-product__price'>
                {getProductPriceText(product)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
