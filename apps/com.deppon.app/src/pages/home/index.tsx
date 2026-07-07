import { ScrollView, Text, View } from '@tarojs/components'

import Banner from './components/banner'
import Menu from './components/menu'
import Navibar from './components/navibar'
import Search from './components/search'
import { HOME_QUICK_ACTIONS, HOME_SERVICE_CARDS } from './home.data'
import AppTabBar from '../../shared/components/AppTabBar'
import { navigateToAppRoute } from '../../shared/navigation/appNavigation'
import './index.scss'

const HomePage = () => {
  const handleNavigate = (url: string) => {
    navigateToAppRoute(url)
  }

  return (
    <>
      <ScrollView className='home-page' scrollY>
        <Navibar />
        <Banner />
        <Search />
        <Menu actions={HOME_QUICK_ACTIONS} onSelect={handleNavigate} />
        <View className='home-section'>
          <View className='home-section__header'>
            <Text className='home-section__title'>常用服务</Text>
            <Text className='home-section__hint'>App 首期</Text>
          </View>
          {HOME_SERVICE_CARDS.map((item) => (
            <View
              className='home-service'
              key={item.key}
              onClick={() => item.route && handleNavigate(item.route)}
            >
              <Text className='home-service__title'>{item.title}</Text>
              <Text className='home-service__summary'>{item.summary}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <AppTabBar active='home' />
    </>
  )
}

export default HomePage
