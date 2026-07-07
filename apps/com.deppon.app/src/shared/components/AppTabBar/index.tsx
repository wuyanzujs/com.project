import { Text, View } from '@tarojs/components'

import { navigateToAppRoute } from '../../navigation/appNavigation'
import { APP_MAIN_NAVIGATION } from '../../navigation/routes'

import type { AppMainRouteName } from '../../navigation/routes'

import './index.scss'

interface AppTabBarProps {
  active: AppMainRouteName
}

const AppTabBar = ({ active }: AppTabBarProps) => {
  const handleNavigate = (name: AppMainRouteName, path: string) => {
    if (name === active) {
      return
    }

    navigateToAppRoute(path)
  }

  return (
    <View className='app-tab-bar'>
      <View className='app-tab-bar__inner'>
        {APP_MAIN_NAVIGATION.map((item) => {
          const isActive = item.name === active

          return (
            <View
              className={
                isActive
                  ? 'app-tab-bar__item app-tab-bar__item--active'
                  : 'app-tab-bar__item'
              }
              key={item.name}
              onClick={() => handleNavigate(item.name, item.path)}
            >
              <View
                className={
                  isActive
                    ? `app-tab-bar__icon app-tab-bar__icon--${item.name} app-tab-bar__icon--active`
                    : `app-tab-bar__icon app-tab-bar__icon--${item.name}`
                }
              />
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
    </View>
  )
}

export default AppTabBar
