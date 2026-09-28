import { Image, Swiper, SwiperItem, Text, View } from '@tarojs/components'

import { useMemo, useState } from 'react'

import type { HomeQuickAction } from '@/pages/home/home.data'
import { AppPressable } from '@/shared/components'

import './index.scss'

const PAGE_SIZE = 6

interface MenuProps {
  actions: HomeQuickAction[]
  onSelect: (action: HomeQuickAction) => void
}

const Menu = ({ actions, onSelect }: MenuProps) => {
  const [activePage, setActivePage] = useState(0)
  const pages = useMemo(
    () =>
      Array.from(
        { length: Math.ceil(actions.length / PAGE_SIZE) },
        (_, index) => actions.slice(index * PAGE_SIZE, (index + 1) * PAGE_SIZE)
      ),
    [actions]
  )

  return (
    <View className='home-menu'>
      <Swiper
        className='home-menu__swiper'
        circular={pages.length > 1}
        onChange={event => setActivePage(event.detail.current)}
      >
        {pages.map((page, pageIndex) => (
          <SwiperItem className='home-menu__page' key={`page-${pageIndex}`}>
            <View className='home-menu__grid'>
              {page.map(action => (
                <View className='home-menu__cell' key={action.key}>
                  <AppPressable
                    accessibilityLabel={action.label}
                    block
                    className='home-menu__item'
                    onPress={() => onSelect(action)}
                  >
                    <View
                      className={
                        action.imageSize === 'large'
                          ? 'home-menu__icon home-menu__icon--large'
                          : 'home-menu__icon'
                      }
                    >
                      <Image
                        className={
                          action.imageSize === 'large'
                            ? 'home-menu__image home-menu__image--large'
                            : 'home-menu__image'
                        }
                        mode='aspectFit'
                        src={action.image}
                      />
                    </View>
                    <View className='home-menu__content'>
                      <Text className='home-menu__label'>{action.label}</Text>
                      {action.desc && (
                        <Text className='home-menu__desc'>{action.desc}</Text>
                      )}
                    </View>
                  </AppPressable>
                </View>
              ))}
            </View>
          </SwiperItem>
        ))}
      </Swiper>

      {pages.length > 1 && (
        <View className='home-menu__pagination'>
          {pages.map((_, index) => (
            <View
              className={
                index === activePage
                  ? 'home-menu__dot home-menu__dot--active'
                  : 'home-menu__dot'
              }
              key={`dot-${index}`}
            />
          ))}
        </View>
      )}
    </View>
  )
}

export default Menu
