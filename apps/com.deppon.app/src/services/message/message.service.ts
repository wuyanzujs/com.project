import type { DepponResponse } from '@/request/deppon'

import { createServiceFailure } from '../serviceResponse'
import { messageApi } from './message.api'
import { MESSAGE_GROUP_DEFINITIONS, MESSAGE_GROUP_EMPTY_FALLBACK, mapMessageGroups, mapMessageItem } from './message.mapper'

import type { MessageGroupKey, MessageGroupView, MessageItemView } from './types'

/** 消息列表缓存:我的页角标与消息页共用一次拉取,动作后失效 */
const CACHE_TTL = 60_000

let messageCache: { items: MessageItemView[]; fetchedAt: number } | null = null

function invalidateCache() {
  messageCache = null
}

function toSuccess<TResult>(result: TResult): DepponResponse<TResult> {
  return {
    status: true,
    message: '',
    result
  }
}

async function loadMessageItems(): Promise<DepponResponse<MessageItemView[]>> {
  if (messageCache && Date.now() - messageCache.fetchedAt < CACHE_TTL) {
    return toSuccess(messageCache.items)
  }

  const response = await messageApi.fetchMessages()

  if (!response.status) {
    return createServiceFailure<MessageItemView[]>(response.message || '暂未获取到消息')
  }

  // 时间已归一为补零字符串,字典序即时间序
  const items = (response.result ?? []).map(mapMessageItem).sort((left, right) => (left.time < right.time ? 1 : -1))

  messageCache = { items, fetchedAt: Date.now() }

  return toSuccess(items)
}

export const messageService = {
  /**
   * @description 查询快递、系统和广播消息分组
   */
  async queryGroups(): Promise<DepponResponse<MessageGroupView[]>> {
    const response = await loadMessageItems()

    if (!response.status || !response.result) {
      return createServiceFailure<MessageGroupView[]>(response.message || '暂未获取到消息')
    }

    return toSuccess(mapMessageGroups(response.result))
  },

  /**
   * @param groupKey 分组 key
   * @description 查询分组消息列表与分组空态文案
   */
  async queryMessages(groupKey: MessageGroupKey): Promise<DepponResponse<{ emptyText: string; items: MessageItemView[] }>> {
    const response = await loadMessageItems()

    if (!response.status || !response.result) {
      return createServiceFailure(response.message || '暂未获取到消息')
    }

    const definition = MESSAGE_GROUP_DEFINITIONS.find(item => item.key === groupKey)

    return toSuccess({
      emptyText: definition?.emptyText ?? MESSAGE_GROUP_EMPTY_FALLBACK,
      items: response.result.filter(item => item.groupKey === groupKey)
    })
  },

  /**
   * @description 查询未读总数,供我的页消息角标使用
   */
  async queryUnreadCount(): Promise<DepponResponse<number>> {
    const response = await loadMessageItems()

    if (!response.status || !response.result) {
      return createServiceFailure<number>(response.message || '暂未获取到消息')
    }

    return toSuccess(response.result.filter(item => !item.isRead).length)
  },

  /**
   * @param messageId 消息 id
   * @description 单条标记已读
   */
  async markMessageRead(messageId: string): Promise<DepponResponse<null>> {
    const response = await messageApi.markAsRead(messageId)

    invalidateCache()

    if (!response.status) {
      return createServiceFailure<null>(response.message || '标记已读失败，请稍后再试')
    }

    return { ...response, result: null }
  },

  /**
   * @description 全部标记为已读(消息中心「清除未读」)
   */
  async markAllMessagesRead(): Promise<DepponResponse<null>> {
    const response = await messageApi.markAllAsRead()

    invalidateCache()

    if (!response.status) {
      return createServiceFailure<null>(response.message || '清除未读失败，请稍后再试')
    }

    return { ...response, result: null }
  },

  /**
   * @param messageId 消息 id
   * @description 删除单条消息
   */
  async removeMessageItem(messageId: string): Promise<DepponResponse<null>> {
    const response = await messageApi.removeMessage(messageId)

    invalidateCache()

    if (!response.status) {
      return createServiceFailure<null>(response.message || '删除失败，请稍后再试！')
    }

    return { ...response, result: null }
  }
}
