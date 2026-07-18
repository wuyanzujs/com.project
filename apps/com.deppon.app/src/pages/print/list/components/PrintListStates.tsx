import { Text, View } from '@tarojs/components'

import {
  AppButton,
  AppEmptyState,
  AppLoadingState
} from '../../../../shared/components'

import type { PrintSearchType } from '../../../../services/print'

import './PrintListStates.scss'

interface PrintListStatesProps {
  errorMessage: string
  hasItems: boolean
  hasMore: boolean
  loading: boolean
  rangeLabel: string
  status: PrintSearchType
  onRetry: () => void
}

export function PrintListStates(props: PrintListStatesProps) {
  if (!props.hasItems && props.loading) {
    return <AppLoadingState label='正在加载打印订单' />
  }

  if (!props.hasItems) {
    const emptyTitle =
      props.status === '1' ? '暂无待打印订单' : '暂无已打印订单'

    return (
      <AppEmptyState
        action={
          props.errorMessage ? (
            <AppButton
              block={false}
              density='compact'
              label='重新加载'
              onPress={props.onRetry}
            />
          ) : undefined
        }
        description={
          props.errorMessage || `${props.rangeLabel}内没有相关打印订单`
        }
        title={props.errorMessage ? '打印订单加载失败' : emptyTitle}
        tone={props.errorMessage ? 'error' : 'neutral'}
      />
    )
  }

  return (
    <View className='print-list-state'>
      {!!props.errorMessage && (
        <View className='print-list-inline-error'>
          <Text className='print-list-inline-error__message'>
            {props.errorMessage}
          </Text>
          <AppButton
            block={false}
            density='compact'
            label='重试'
            variant='secondary'
            onPress={props.onRetry}
          />
        </View>
      )}

      {props.loading && (
        <AppLoadingState label='正在加载更多订单' layout='inline' />
      )}

      {!props.loading && !props.errorMessage && !props.hasMore && (
        <Text className='print-list-state__end'>已加载全部订单</Text>
      )}
    </View>
  )
}
