import { Text, View } from '@tarojs/components'

import type { InvoiceTab } from '../../../../services/invoice'

import './InvoiceCenterStates.scss'

export function InvoiceEmpty(props: { title: string; summary: string }) {
  return (
    <View className='invoice-empty'>
      <Text className='invoice-empty__title'>{props.title}</Text>
      <Text className='invoice-empty__summary'>{props.summary}</Text>
    </View>
  )
}

export function InvoiceLoading(props: { tab: InvoiceTab }) {
  return (
    <Text className='invoice-loading'>
      {props.tab === 'orders'
        ? '正在加载可开票运单...'
        : props.tab === 'ecards'
          ? '正在加载储值卡开票记录...'
          : props.tab === 'history'
            ? '正在加载开票历史...'
            : '正在加载发票抬头...'}
    </Text>
  )
}
