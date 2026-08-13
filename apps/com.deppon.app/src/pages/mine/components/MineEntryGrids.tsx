import { Image, Text, View } from '@tarojs/components'

import { AppPressable } from '@/shared/components'

import { SERVICE_ENTRIES } from '../mine.model'

import type { MineEntry } from '../mine.model'

import './MineEntryGrids.scss'

interface MineEntryGridsProps {
  quickEntries?: MineEntry[]
  onSelect: (entry: MineEntry) => void
}

export function MineEntryGrids({
  quickEntries,
  onSelect
}: MineEntryGridsProps) {
  return (
    <>
      <View className='mine-quick-grid'>
        {quickEntries?.map(entry => (
          <AppPressable
            flex
            accessibilityLabel={entry.title}
            block
            className='mine-quick-grid__item'
            key={entry.title}
            onPress={() => onSelect(entry)}
          >
            <Image
              className='mine-quick-grid__image'
              mode='aspectFit'
              src={entry.image}
            />
            <Text className='mine-quick-grid__title'>{entry.title}</Text>
            {entry.badge && (
              <View className='mine-service-grid__badge'>
                <Text className='mine-service-grid__badge-text'>
                  {entry.badge}
                </Text>
              </View>
            )}
          </AppPressable>
        ))}
      </View>

      <View className='mine-service-grid'>
        {SERVICE_ENTRIES.map(entry => (
          <AppPressable
            accessibilityLabel={entry.title}
            block
            className='mine-service-grid__item'
            key={entry.title}
            onPress={() => onSelect(entry)}
          >
            <Image
              className='mine-service-grid__image'
              mode='aspectFit'
              src={entry.image}
            />
            <Text className='mine-service-grid__title'>{entry.title}</Text>
            {entry.badge && (
              <View className='mine-service-grid__badge'>
                <Text className='mine-service-grid__badge-text'>
                  {entry.badge}
                </Text>
              </View>
            )}
          </AppPressable>
        ))}
      </View>
    </>
  )
}
