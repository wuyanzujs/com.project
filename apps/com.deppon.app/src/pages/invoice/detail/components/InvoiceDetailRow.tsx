import { Text, View } from '@tarojs/components'

import './InvoiceDetailRow.scss'

interface InvoiceDetailRowProps {
  address?: boolean
  amount?: boolean
  label: string
  value: string
}

export function InvoiceDetailRow({
  address = false,
  amount = false,
  label,
  value
}: InvoiceDetailRowProps) {
  return (
    <View
      className={
        address
          ? 'invoice-detail-row invoice-detail-row--address'
          : 'invoice-detail-row'
      }
    >
      <Text className='invoice-detail-row__label'>{label}</Text>
      <Text
        className={
          amount
            ? 'invoice-detail-row__amount'
            : address
              ? 'invoice-detail-row__value invoice-detail-row__value--address'
              : 'invoice-detail-row__value'
        }
      >
        {value}
      </Text>
    </View>
  )
}
