import { Text, View } from '@tarojs/components'

import { ExpressSection } from './ExpressSection'
import { createExpressProductQuoteView } from '../../../services/express'
import { AppPressable } from '../../../shared/components'

import type {
  ExpressDraft,
  ExpressProductQuote
} from '../../../services/express'

import './ExpressQuoteSection.scss'

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
  quoteStaleReason,
  quoteStatus,
  quotes,
  selectedProduct,
  onQuote,
  onSelectProduct
}: ExpressQuoteSectionProps) {
  return (
    <ExpressSection title='产品价格'>
      <AppPressable
        accessibilityLabel='获取产品价格'
        block
        className='express-quote-action'
        layout='row-start'
        onPress={onQuote}
      >
        <View className='express-quote-action__content'>
          <Text className='express-quote-action__title'>
            {quoteStatus === 'loading'
              ? '正在获取价格'
              : quotes.length
                ? '重新获取价格'
                : '获取产品价格'}
          </Text>
          <Text className='express-quote-action__summary'>
            {quoteStaleReason ||
              (quoteStatus === 'error'
                ? '获取失败，请检查信息后重试'
                : '根据地址、货物和服务信息试算')}
          </Text>
        </View>
        <Text className='express-quote-action__link'>获取价格</Text>
      </AppPressable>

      {quotes.length > 0 && (
        <View className='express-product-list'>
          {quotes.map(product => {
            const view = createExpressProductQuoteView(product)

            return (
              <AppPressable
                accessibilityLabel={`选择产品${view.name}`}
                block
                className={
                  selectedProduct?.omsProductCode === product.omsProductCode
                    ? 'express-product express-product--active'
                    : 'express-product'
                }
                key={view.key}
                selected={
                  selectedProduct?.omsProductCode === product.omsProductCode
                }
                onPress={() => onSelectProduct(product)}
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
                <Text className='express-product__price'>{view.priceText}</Text>
              </AppPressable>
            )
          })}
        </View>
      )}
    </ExpressSection>
  )
}
