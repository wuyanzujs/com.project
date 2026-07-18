import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'

import type {
  StationQueryType,
  StationSubType
} from '../../../../services/query'

import './StationQueryFilters.scss'

const STATION_TYPE_OPTIONS: Array<{
  label: string
  value: StationQueryType
}> = [
  { label: '全部', value: 'ALL' },
  { label: '发货', value: 'LEAVE' },
  { label: '提货', value: 'PICKUP' },
  { label: '送货', value: 'DELIVERY' }
]

const STATION_SUB_TYPE_OPTIONS: Array<{
  label: string
  value: StationSubType
}> = [
  { label: '快递网点', value: 'EXPRESS' },
  { label: '零担网点', value: 'LOGISTICS' }
]

interface StationQueryFiltersProps {
  stationType: StationQueryType
  subType: StationSubType
  onStationTypeChange: (value: StationQueryType) => void
  onSubTypeChange: (value: StationSubType) => void
}

export function StationQueryFilters({
  stationType,
  subType,
  onStationTypeChange,
  onSubTypeChange
}: StationQueryFiltersProps) {
  return (
    <View className='query-stations-filter'>
      <Text className='query-stations-filter__label'>网点类型</Text>
      <View className='query-stations-chip-group'>
        {STATION_TYPE_OPTIONS.map(option => (
          <AppPressable
            className={
              option.value === stationType
                ? 'query-stations-chip query-stations-chip--active'
                : 'query-stations-chip'
            }
            key={option.value}
            onPress={() => onStationTypeChange(option.value)}
          >
            <Text
              className={
                option.value === stationType
                  ? 'query-stations-chip__text query-stations-chip__text--active'
                  : 'query-stations-chip__text'
              }
            >
              {option.label}
            </Text>
          </AppPressable>
        ))}
      </View>

      <Text className='query-stations-filter__label'>业务类型</Text>
      <View className='query-stations-chip-group'>
        {STATION_SUB_TYPE_OPTIONS.map(option => (
          <AppPressable
            className={
              option.value === subType
                ? 'query-stations-chip query-stations-chip--active'
                : 'query-stations-chip'
            }
            key={option.value}
            onPress={() => onSubTypeChange(option.value)}
          >
            <Text
              className={
                option.value === subType
                  ? 'query-stations-chip__text query-stations-chip__text--active'
                  : 'query-stations-chip__text'
              }
            >
              {option.label}
            </Text>
          </AppPressable>
        ))}
      </View>
    </View>
  )
}
