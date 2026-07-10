import { Text, View } from '@tarojs/components'

import { createPaymentFeeSummary } from '../../../../services/payment'

import type { PaymentItem } from '../../../../services/payment'

import '../index.scss'

interface PaymentFeeRowsProps {
  item: PaymentItem
}

function formatFeeAmount(amount: number, tone?: 'discount' | 'paid') {
  const prefix = tone === 'discount' ? '-¥' : '¥'

  return `${prefix}${amount.toFixed(2)}`
}

const PaymentFeeRows = (props: PaymentFeeRowsProps) => {
  const summary = createPaymentFeeSummary(props.item)

  if (!summary.rows.length) {
    return null
  }

  return (
    <View className='payment-fees'>
      <Text className='payment-fees__title'>费用明细</Text>
      {summary.rows.map((row) => (
        <View className='payment-fee-row' key={row.key}>
          <Text className='payment-fee-row__label'>{row.label}</Text>
          <Text
            className={
              row.tone === 'discount'
                ? 'payment-fee-row__amount payment-fee-row__amount--discount'
                : 'payment-fee-row__amount'
            }
          >
            {formatFeeAmount(row.amount, row.tone)}
          </Text>
        </View>
      ))}
    </View>
  )
}

export default PaymentFeeRows
