import { Text, View } from '@tarojs/components'

import type { CustomerCapabilitySummaryView } from '../../../services/customer'

import './CustomerCapabilitySection.scss'

interface CustomerCapabilitySectionProps {
  capability: CustomerCapabilitySummaryView | null
  loading: boolean
  message: string
}

const CAPABILITY_ROWS: Array<{
  key: 'collectionLimitText' | 'monthlyPaymentText' | 'contractText'
  label: string
}> = [
  { key: 'collectionLimitText', label: '代收货款额度' },
  { key: 'monthlyPaymentText', label: '月结付款' },
  { key: 'contractText', label: '合同客户' }
]

export function CustomerCapabilitySection({
  capability,
  loading,
  message
}: CustomerCapabilitySectionProps) {
  return (
    <View className='customer-capability'>
      <View className='customer-capability__header'>
        <Text className='customer-capability__title'>服务能力</Text>
        <Text
          className={
            capability?.available
              ? 'customer-capability__status customer-capability__status--active'
              : 'customer-capability__status'
          }
        >
          {loading
            ? '同步中'
            : capability?.available
              ? '已同步'
              : '待确认'}
        </Text>
      </View>

      {capability ? (
        <View className='customer-capability__rows'>
          {CAPABILITY_ROWS.map(row => (
            <View className='customer-capability__row' key={row.key}>
              <Text className='customer-capability__label'>{row.label}</Text>
              <Text className='customer-capability__value'>
                {capability[row.key]}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className='customer-capability__empty'>
          {loading ? '正在同步客户服务能力' : '暂未获取到客户服务能力'}
        </Text>
      )}

      {message ? (
        <Text className='customer-capability__message'>{message}</Text>
      ) : null}
    </View>
  )
}
