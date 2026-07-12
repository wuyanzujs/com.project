import { Text } from '@tarojs/components'

import { QueryPriceSection } from './QueryPriceSection'
import { AppPressable } from '../../../../shared/components'

import './QueryPriceActions.scss'

interface QueryPriceActionsProps {
  messages: string[]
  loading: boolean
  onSubmit: () => void
}

export function QueryPriceActions(props: QueryPriceActionsProps) {
  return (
    <>
      {props.messages.length > 0 && (
        <QueryPriceSection className='query-price-validation'>
          {props.messages.map(message => (
            <Text className='query-price-validation__message' key={message}>
              {message}
            </Text>
          ))}
        </QueryPriceSection>
      )}

      <AppPressable className='query-price-submit' onPress={props.onSubmit}>
        <Text className='query-price-submit__text'>
          {props.loading ? '查询中' : '查询价格时效'}
        </Text>
      </AppPressable>
    </>
  )
}
