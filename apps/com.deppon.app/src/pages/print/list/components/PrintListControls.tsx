import { ScrollView, Text, View } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'

import type {
  PrintDateRangeKey,
  PrintDateRangeOption,
  PrintListCounts,
  PrintSearchType
} from '../../../../services/print'

import './PrintListControls.scss'

const PRINT_STATUS_TABS: Array<{
  label: string
  value: PrintSearchType
}> = [
  { label: '待打印', value: '1' },
  { label: '已打印', value: '2' }
]

interface PrintListControlsProps {
  counts: PrintListCounts
  countMessage: string
  dateOptions: PrintDateRangeOption[]
  rangeKey: PrintDateRangeKey
  status: PrintSearchType
  totalRows: number
  onRangeChange: (rangeKey: PrintDateRangeKey) => void
  onStatusChange: (status: PrintSearchType) => void
}

function getCount(counts: PrintListCounts, status: PrintSearchType) {
  const count = status === '1' ? counts.waiting : counts.printed

  return count === null ? '--' : String(count)
}

export function PrintListControls(props: PrintListControlsProps) {
  const selectedRange =
    props.dateOptions.find(option => option.key === props.rangeKey) ??
    props.dateOptions[0]

  return (
    <View className='print-list-controls'>
      <View className='print-list-status-tabs'>
        {PRINT_STATUS_TABS.map(tab => {
          const active = tab.value === props.status

          return (
            <AppPressable flex
              accessibilityLabel={`${tab.label} ${getCount(
                props.counts,
                tab.value
              )}`}
              className={
                active
                  ? 'print-list-status-tab print-list-status-tab--active'
                  : 'print-list-status-tab'
              }
              key={tab.value}
              onPress={() => props.onStatusChange(tab.value)}
            >
              <Text
                className={
                  active
                    ? 'print-list-status-tab__label print-list-status-tab__label--active'
                    : 'print-list-status-tab__label'
                }
              >
                {tab.label}
              </Text>
              <Text
                className={
                  active
                    ? 'print-list-status-tab__count print-list-status-tab__count--active'
                    : 'print-list-status-tab__count'
                }
              >
                {getCount(props.counts, tab.value)}
              </Text>
            </AppPressable>
          )
        })}
      </View>

      <View className='print-list-range-head'>
        <Text className='print-list-range-title'>查询范围</Text>
        <Text className='print-list-range-summary'>
          {selectedRange?.summary || '--'}
        </Text>
      </View>

      <ScrollView className='print-list-range-scroll' scrollX>
        <View className='print-list-range-options'>
          {props.dateOptions.map(option => {
            const active = option.key === props.rangeKey

            return (
              <AppPressable
                accessibilityLabel={option.label}
                className={
                  active
                    ? 'print-list-range-option print-list-range-option--active'
                    : 'print-list-range-option'
                }
                key={option.key}
                onPress={() => props.onRangeChange(option.key)}
              >
                <Text
                  className={
                    active
                      ? 'print-list-range-option__label print-list-range-option__label--active'
                      : 'print-list-range-option__label'
                  }
                >
                  {option.label}
                </Text>
              </AppPressable>
            )
          })}
        </View>
      </ScrollView>

      <View className='print-list-summary'>
        <Text className='print-list-summary__label'>
          {props.status === '1' ? '待打印订单' : '已打印订单'}
        </Text>
        <Text className='print-list-summary__count'>共 {props.totalRows} 单</Text>
      </View>

      {!!props.countMessage && (
        <Text className='print-list-count-warning'>{props.countMessage}</Text>
      )}
    </View>
  )
}
