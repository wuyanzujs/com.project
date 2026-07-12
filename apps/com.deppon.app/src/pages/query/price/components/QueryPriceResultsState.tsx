import { Text } from '@tarojs/components'

import { QueryPriceProductCard } from './QueryPriceProductCard'
import { QueryPriceSection } from './QueryPriceSection'
import { getExpressQuoteKey } from '../../../../services/express'

import type { ExpressProductQuote } from '../../../../services/express'

import './QueryPriceResultsState.scss'

interface QueryPriceResultsStateProps {
  quotes: ExpressProductQuote[]
  status: 'idle' | 'loading' | 'done' | 'error'
  onExpress: (product: ExpressProductQuote) => void
}

export function QueryPriceResultsState(props: QueryPriceResultsStateProps) {
  return (
    <>
      {props.quotes.length > 0 && (
        <QueryPriceSection className='query-price-results'>
          <Text className='query-price-results__title'>可选产品</Text>
          {props.quotes.map(product => (
            <QueryPriceProductCard
              key={getExpressQuoteKey(product)}
              product={product}
              onExpress={props.onExpress}
            />
          ))}
        </QueryPriceSection>
      )}

      {props.status === 'error' && (
        <QueryPriceSection className='query-price-empty'>
          <Text className='query-price-empty__title'>暂无报价结果</Text>
          <Text className='query-price-empty__summary'>
            可调整地址、重量或送货方式后重新查询。
          </Text>
        </QueryPriceSection>
      )}
    </>
  )
}
