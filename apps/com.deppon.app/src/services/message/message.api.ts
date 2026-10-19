import { depponHttp } from '@/request/deppon'

import type { IntMessageRaw } from './types'

/**
 * 站内信网关接口；请求体字段需联调确认，单条消息操作暂以 messageId 作为标识。
 */
export const messageApi = {
  /**
   * @description 拉取站内消息列表
   */
  fetchMessages(loading = false) {
    return depponHttp.post<IntMessageRaw[] | null, Record<string, never>>(
      '/gwapi/messageService/eco/message/intMsg/secure/fetchMessage',
      {},
      {
        loading
      }
    )
  },

  /**
   * @param messageId 消息 id
   * @description 单条标记已读
   */
  markAsRead(messageId: string, loading = false) {
    return depponHttp.post<null, { messageId: string }>(
      '/gwapi/messageService/eco/message/intMsg/secure/markAsRead',
      { messageId },
      {
        loading
      }
    )
  },

  /**
   * @description 全部标记为已读
   */
  markAllAsRead(loading = true) {
    return depponHttp.post<null, Record<string, never>>(
      '/gwapi/messageService/eco/message/intMsg/secure/markAllAsRead',
      {},
      {
        loading
      }
    )
  },

  /**
   * @param messageId 消息 id
   * @description 删除单条消息
   */
  removeMessage(messageId: string, loading = true) {
    return depponHttp.post<null, { messageId: string }>(
      '/gwapi/messageService/eco/message/intMsg/secure/remove/msg',
      { messageId },
      {
        loading
      }
    )
  }
}
