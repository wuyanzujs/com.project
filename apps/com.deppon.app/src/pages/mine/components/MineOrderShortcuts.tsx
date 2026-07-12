import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../shared/components'
import { ORDER_SHORTCUTS } from '../mine.model'

import type {
  MineOrderCounts,
  MineOrderShortcut
} from '../mine.model'

import './MineOrderShortcuts.scss'

interface MineOrderShortcutsProps {
  authenticated: boolean
  orderCounts: MineOrderCounts
  onSelect: (entry: MineOrderShortcut) => void
}

export function MineOrderShortcuts({
  authenticated,
  onSelect,
  orderCounts
}: MineOrderShortcutsProps) {
  return (
    <View className='mine-shortcuts'>
      {ORDER_SHORTCUTS.map(entry => (
        <AppPressable flex
          accessibilityLabel={entry.title}
          block
          className='mine-shortcut'
          key={entry.title}
          onPress={() => onSelect(entry)}
        >
          <Text className='mine-shortcut__count'>
            {authenticated ? (orderCounts[entry.countKey] ?? '--') : '--'}
          </Text>
          <Text className='mine-shortcut__title'>{entry.title}</Text>
        </AppPressable>
      ))}
    </View>
  )
}
