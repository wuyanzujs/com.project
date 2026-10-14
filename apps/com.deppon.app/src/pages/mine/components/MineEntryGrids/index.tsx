import { Image, Text, View } from '@tarojs/components'

import { AppPressable } from '@/shared/components'

import { SERVICE_ENTRIES } from '../../mine.model'

import type { MineEntry } from '../../mine.model'

import './index.scss'

interface MineEntryGridsProps {
  quickEntries?: MineEntry[]
  onSelect: (entry: MineEntry) => void
}

export function MineEntryGrids({ quickEntries, onSelect }: MineEntryGridsProps) {
  return (
    <>
      <View className='mine-quick-grid'>
        {quickEntries?.map(entry => (
          <AppPressable flex accessibilityLabel={entry.title} block className='mine-quick-grid__item' key={entry.title} onPress={() => onSelect(entry)}>
            <Image className='mine-quick-grid__image' mode='aspectFit' src={entry.image} />
            <Text className='mine-quick-grid__title'>{entry.title}</Text>
            {entry.badge && <Text className='mine-service-grid__badge'>{entry.badge}</Text>}
          </AppPressable>
        ))}
      </View>

      <View className='mine-service-grid'>
        {SERVICE_ENTRIES.map(entry => (
          <View className='mine-service-grid__cell' key={entry.title}>
            <AppPressable block accessibilityLabel={entry.title} className='mine-service-grid__item' onPress={() => onSelect(entry)}>
              <Image className='mine-service-grid__image' mode='aspectFit' src={entry.image} />
              <Text className='mine-service-grid__title'>{entry.title}</Text>
              {entry.badge && <Text className='mine-service-grid__badge'>{entry.badge}</Text>}
            </AppPressable>
          </View>
        ))}
      </View>
    </>
  )
}
