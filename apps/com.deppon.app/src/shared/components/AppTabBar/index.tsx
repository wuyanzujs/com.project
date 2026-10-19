import { Image, Text, View } from '@tarojs/components'

import tabbarMine from '@/assets/tabbar/tabbar_mine.png'
import tabbarMineSelected from '@/assets/tabbar/tabbar_mine_selected.png'
import tabbarQuery from '@/assets/tabbar/tabbar_query.png'
import tabbarQuerySelected from '@/assets/tabbar/tabbar_query_selected.png'
import tabbarSend from '@/assets/tabbar/tabbar_send.png'
import tabbarSendSelected from '@/assets/tabbar/tabbar_send_selected.png'
import tabbarWelfare from '@/assets/tabbar/tabbar_welfare.png'
import tabbarWelfareSelected from '@/assets/tabbar/tabbar_welfare_selected.png'
import { AppSafeAreaView } from '@/shared/native'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { APP_MAIN_NAVIGATION } from '@/shared/navigation/routes'
import type { AppMainRouteName } from '@/shared/navigation/routes'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { AppPressable } from '../AppPressable'

import './index.scss'

interface AppTabBarProps {
  active: AppMainRouteName
}

// PNG 模块由 types/global.d.ts 声明，运行时值为 Metro 资源 id。
const TAB_ICONS = {
  home: { normal: tabbarSend, active: tabbarSendSelected },
  orderList: { normal: tabbarQuery, active: tabbarQuerySelected },
  memberCenter: { normal: tabbarWelfare, active: tabbarWelfareSelected },
  mine: { normal: tabbarMine, active: tabbarMineSelected }
}

// 「福利」入口的常驻「领券」标识，不表示未读数量。
const TAB_BADGES: Partial<Record<AppMainRouteName, string>> = {
  memberCenter: '领券'
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
      <AppSafeAreaView backgroundColor={APP_STYLE_COLORS.surface.card} edges={['bottom']} fill={false}>
        <View className='app-tab-bar__inner'>
          {APP_MAIN_NAVIGATION.map(item => {
            const isActive = item.name === active
            const icon = TAB_ICONS[item.name]

            return (
              <AppPressable
                flex
                accessibilityLabel={item.title}
                className='app-tab-bar__item'
                key={item.name}
                onPress={() => handleNavigate(item.name, item.path)}
              >
                <View className='app-tab-bar__icon'>
                  <Image className='app-tab-bar__glyph' mode='aspectFit' src={isActive ? icon.active : icon.normal} />
                  {TAB_BADGES[item.name] && (
                    <View className='app-tab-bar__badge'>
                      <Text className='app-tab-bar__badge-text'>{TAB_BADGES[item.name]}</Text>
                    </View>
                  )}
                </View>
                <Text className={isActive ? 'app-tab-bar__text app-tab-bar__text--active' : 'app-tab-bar__text'}>{item.title}</Text>
              </AppPressable>
            )
          })}
        </View>
      </AppSafeAreaView>
    </View>
  )
}

export default AppTabBar
