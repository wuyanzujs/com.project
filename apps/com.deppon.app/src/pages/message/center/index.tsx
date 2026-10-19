import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useRef, useState } from 'react'

import { messageService } from '@/services/message'
import type { MessageGroupView } from '@/services/message'
import { AppEmptyState, AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { ensureAuthenticated } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'
import './content.scss'

const MessageCenterPage = () => {
  const [groups, setGroups] = useState<MessageGroupView[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [clearing, setClearing] = useState(false)
  const loadingRef = useRef(false)

  const loadGroups = useCallback(async () => {
    if (loadingRef.current) {
      return
    }

    loadingRef.current = true
    setLoading(true)
    setErrorMessage('')

    try {
      const response = await messageService.queryGroups()

      if (!response.status || !response.result) {
        setGroups([])
        setErrorMessage(response.message || '暂未获取到消息')
        return
      }

      setGroups(response.result)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [])

  useDidShow(() => {
    if (ensureAuthenticated({ redirectUrl: APP_ROUTES.messageCenter, replace: true })) {
      void loadGroups()
    }
  })

  const handleClearUnread = async () => {
    if (clearing) {
      return
    }

    setClearing(true)

    try {
      const response = await messageService.markAllMessagesRead()

      Taro.showToast({
        title: response.status ? '已清除未读' : response.message || '清除未读失败，请稍后再试',
        icon: 'none'
      })

      if (response.status) {
        void loadGroups()
      }
    } finally {
      setClearing(false)
    }
  }

  const handleOpenGroup = (group: MessageGroupView) => {
    navigateToAppRoute(
      createAppRouteUrl(APP_ROUTES.messageList, {
        groupKey: group.key,
        groupName: group.name
      }),
      { login: true }
    )
  }

  const hasUnread = groups.some(group => group.unreadCount > 0)

  return (
    <ScrollView className='message-center-page' scrollY>
      <View className='message-center-nav'>
        <Text className='message-center-nav__title'>消息中心</Text>
        {hasUnread ? (
          <AppPressable accessibilityLabel='清除未读' className='message-center-nav__action' onPress={handleClearUnread}>
            <Text className='message-center-nav__action-text'>{clearing ? '清除中' : '清除未读'}</Text>
          </AppPressable>
        ) : null}
      </View>

      <View className='message-center-content'>
        {groups.map(group => (
          <AppPressable accessibilityLabel={group.name} className='message-group-card' key={group.key} onPress={() => handleOpenGroup(group)}>
            <View className='message-group-card__icon-wrap'>
              <AppIcon color={APP_STYLE_COLORS.brand.default} name={group.icon} size={40} strokeWidth={2} />
              {group.unreadCount > 0 && <Text className='message-group-card__badge'>{group.unreadCount > 99 ? '99+' : group.unreadCount}</Text>}
            </View>
            <View className='message-group-card__body'>
              <View className='message-group-card__top'>
                <Text className='message-group-card__name'>{group.name}</Text>
                {group.summaryTime ? <Text className='message-group-card__time'>{group.summaryTime}</Text> : null}
              </View>
              <Text className='message-group-card__summary'>{group.summary}</Text>
            </View>
            <AppIcon color={APP_STYLE_COLORS.text.supporting} name='chevronRight' size={32} />
          </AppPressable>
        ))}

        {!groups.length && !loading && (
          <AppEmptyState
            title={errorMessage || '暂时没有最新消息哦'}
            action={
              <AppPressable className='message-center-reload' onPress={loadGroups}>
                <Text className='message-center-reload__text'>重新加载</Text>
              </AppPressable>
            }
          />
        )}
      </View>
    </ScrollView>
  )
}

export default MessageCenterPage
