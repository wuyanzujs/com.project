import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useCallback, useRef, useState } from 'react'

import { messageService } from '@/services/message'
import type { MessageGroupKey, MessageItemView } from '@/services/message'
import { AppEmptyState, AppPressable } from '@/shared/components'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { ensureAuthenticated } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'

import './index.scss'
import './content.scss'

const VALID_GROUP_KEYS: MessageGroupKey[] = ['EXPRESS', 'SYSTEM', 'BROADCAST', 'OTHER']

const MessageListPage = () => {
  const router = useRouter()
  const groupKey = VALID_GROUP_KEYS.includes(router.params.groupKey as MessageGroupKey) ? (router.params.groupKey as MessageGroupKey) : 'OTHER'
  const groupName = router.params.groupName ? decodeURIComponent(router.params.groupName) : '消息列表'
  const [items, setItems] = useState<MessageItemView[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [emptyText, setEmptyText] = useState('暂时没有最新消息哦')
  const [processingId, setProcessingId] = useState('')
  const loadingRef = useRef(false)

  const loadMessages = useCallback(async () => {
    if (loadingRef.current) {
      return
    }

    loadingRef.current = true
    setLoading(true)
    setErrorMessage('')

    try {
      const response = await messageService.queryMessages(groupKey)

      if (!response.status || !response.result) {
        setItems([])
        setErrorMessage(response.message || '暂未获取到消息')
        return
      }

      setEmptyText(response.result.emptyText)
      setItems(response.result.items)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [groupKey])

  useDidShow(() => {
    if (ensureAuthenticated({ redirectUrl: APP_ROUTES.messageList, replace: true })) {
      void loadMessages()
    }
  })

  const handleOpenMessage = async (item: MessageItemView) => {
    if (!item.isRead) {
      void messageService.markMessageRead(item.id)
      setItems(current => current.map(currentItem => (currentItem.id === item.id ? { ...currentItem, isRead: true } : currentItem)))
    }

    if (item.waybillNumber) {
      navigateToAppRoute(
        createAppRouteUrl(APP_ROUTES.orderDetail, {
          waybillNumber: item.waybillNumber,
          role: 'sender',
          source: 'MESSAGE',
          view: 'secure'
        }),
        { login: true }
      )
    }
  }

  const handleRemoveMessage = async (item: MessageItemView) => {
    if (processingId) {
      return
    }

    const confirm = await Taro.showModal({
      title: '删除消息',
      content: '确定要删除这条记录吗？',
      cancelText: '暂不删除',
      confirmText: '确认删除'
    })

    if (!confirm.confirm) {
      return
    }

    setProcessingId(item.id)

    try {
      const response = await messageService.removeMessageItem(item.id)

      Taro.showToast({
        title: response.status ? '删除成功' : response.message || '删除失败，请稍后再试！',
        icon: 'none'
      })

      if (response.status) {
        setItems(current => current.filter(currentItem => currentItem.id !== item.id))
      }
    } finally {
      setProcessingId('')
    }
  }

  return (
    <ScrollView className='message-list-page' scrollY>
      <View className='message-list-nav'>
        <Text className='message-list-nav__title'>{groupName}</Text>
        <Text className='message-list-nav__summary'>共 {items.length} 条</Text>
      </View>

      <View className='message-list-content'>
        {items.map(item => (
          <View className='message-item-card' key={item.id}>
            <AppPressable className='message-item-card__body' onPress={() => void handleOpenMessage(item)}>
              <View className='message-item-card__top'>
                {!item.isRead && <View className='message-item-card__dot' />}
                <Text className='message-item-card__title'>{item.title}</Text>
                {item.time ? <Text className='message-item-card__time'>{item.time}</Text> : null}
              </View>
              {item.content ? <Text className='message-item-card__content'>{item.content}</Text> : null}
            </AppPressable>
            <AppPressable accessibilityLabel='删除消息' className='message-item-card__delete' onPress={() => void handleRemoveMessage(item)}>
              <Text className='message-item-card__delete-text'>{processingId === item.id ? '删除中' : '删除'}</Text>
            </AppPressable>
          </View>
        ))}

        {!items.length && !loading && (
          <AppEmptyState
            title={errorMessage || emptyText}
            action={
              <AppPressable className='message-list-reload' onPress={loadMessages}>
                <Text className='message-list-reload__text'>重新加载</Text>
              </AppPressable>
            }
          />
        )}
      </View>
    </ScrollView>
  )
}

export default MessageListPage
