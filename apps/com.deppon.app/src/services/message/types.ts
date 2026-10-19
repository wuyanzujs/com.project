/**
 * 站内信原始结构。请求响应字段仍需联调确认，调整集中在类型定义与 message.mapper.ts。
 */
export interface IntMessageRaw {
  messageId?: string | number
  messageType?: string | number
  groupId?: string | number
  groupName?: string
  title?: string
  content?: string
  summary?: string
  sendTime?: string | number
  createTime?: string | number
  isRead?: boolean | string | number
  readFlag?: boolean | string | number
  businessType?: string | number
  orderNumber?: string
  waybillNumber?: string
  [key: string]: unknown
}

/** 消息分组标识。 */
export type MessageGroupKey = 'EXPRESS' | 'SYSTEM' | 'BROADCAST' | 'OTHER'

export interface MessageGroupDefinition {
  key: MessageGroupKey
  /** 消息分组名称。 */
  name: string
  /** AppIcon 名称 */
  icon: 'package' | 'info' | 'mailbox'
  /** 分组空态文案。 */
  emptyText: string
}

export interface MessageGroupView {
  key: MessageGroupKey
  name: string
  icon: MessageGroupDefinition['icon']
  /** 最新一条消息摘要 */
  summary: string
  summaryTime: string
  totalCount: number
  unreadCount: number
}

export interface MessageItemView {
  id: string
  groupKey: MessageGroupKey
  groupName: string
  title: string
  content: string
  time: string
  isRead: boolean
  waybillNumber: string
  orderNumber: string
}
