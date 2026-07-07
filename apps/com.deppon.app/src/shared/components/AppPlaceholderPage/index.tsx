import { ScrollView, Text, View } from '@tarojs/components'

import './index.scss'

export interface PlaceholderItem {
  title: string
  summary: string
}

interface AppPlaceholderPageProps {
  title: string
  description: string
  label: string
  items: PlaceholderItem[]
}

const AppPlaceholderPage = ({
  title,
  description,
  label,
  items
}: AppPlaceholderPageProps) => {
  return (
    <ScrollView className='placeholder-page' scrollY>
      <View className='placeholder-hero'>
        <Text className='placeholder-hero__label'>{label}</Text>
        <Text className='placeholder-hero__title'>{title}</Text>
        <Text className='placeholder-hero__description'>{description}</Text>
      </View>

      <View className='placeholder-list'>
        {items.map((item) => (
          <View className='placeholder-item' key={item.title}>
            <Text className='placeholder-item__title'>{item.title}</Text>
            <Text className='placeholder-item__summary'>{item.summary}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

export default AppPlaceholderPage
