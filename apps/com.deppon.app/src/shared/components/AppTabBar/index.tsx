import { Text, View } from '@tarojs/components'

import { navigateToAppRoute } from '../../navigation/appNavigation'
import { APP_MAIN_NAVIGATION } from '../../navigation/routes'
import { AppSafeAreaView } from '../../native'
import { AppIcon } from '../AppIcon'

import type { AppMainRouteName } from '../../navigation/routes'

import './index.scss'

interface AppTabBarProps {
  active: AppMainRouteName
}

const TAB_ICONS = {
  home: 'home',
  orderList: 'search',
  memberCenter: 'ticket',
  mine: 'user'
} as const

const AppTabBar = ({ active }: AppTabBarProps) => {
  const handleNavigate = (name: AppMainRouteName, path: string) => {
    if (name === active) {
      return
    }

    navigateToAppRoute(path)
  }

  return (
    <View className='app-tab-bar'>
      <AppSafeAreaView
        backgroundColor='#ffffff'
        edges={['bottom']}
        fill={false}
      >
        <View className='app-tab-bar__inner'>
          {APP_MAIN_NAVIGATION.map(item => {
            const isActive = item.name === active

            return (
              <View
                className='app-tab-bar__item'
                key={item.name}
                onClick={() => handleNavigate(item.name, item.path)}
              >
                <View className='app-tab-bar__icon'>
                  <AppIcon
                    color={isActive ? '#1a5eff' : '#2f3135'}
                    name={TAB_ICONS[item.name]}
                    size={30}
                    strokeWidth={isActive ? 2.6 : 2.2}
                  />
                </View>
                <Text
                  className={
                    isActive
                      ? 'app-tab-bar__text app-tab-bar__text--active'
                      : 'app-tab-bar__text'
                  }
                >
                  {item.title}
                </Text>
              </View>
            )
          })}
        </View>
      </AppSafeAreaView>
    </View>
  )
}

export default AppTabBar
