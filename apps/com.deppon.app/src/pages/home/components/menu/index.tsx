import { Text, View } from '@tarojs/components'

import type { AppRoutePath } from '../../../../shared/navigation/routes'
import type { HomeQuickAction } from '../../home.data'

import './index.scss'

interface MenuProps {
  actions: HomeQuickAction[]
  onSelect: (url: AppRoutePath) => void
}

const Menu = ({ actions, onSelect }: MenuProps) => {
  return (
    <View className='home-menu'>
      {actions.map((action) => (
        <View
          className={`home-menu__item home-menu__item--${action.tone}`}
          key={action.key}
          onClick={() => onSelect(action.route)}
        >
          <Text className={`home-menu__mark home-menu__mark--${action.tone}`}>
            {action.label.slice(0, 1)}
          </Text>
          <Text className='home-menu__label'>{action.label}</Text>
          <Text className='home-menu__desc'>{action.description}</Text>
        </View>
      ))}
    </View>
  )
}

export default Menu
