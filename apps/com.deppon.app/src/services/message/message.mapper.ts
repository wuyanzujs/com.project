import type { IntMessageRaw, MessageGroupDefinition, MessageGroupKey, MessageGroupView, MessageItemView } from './types'

/** 消息分组名称与空态文案，按消息中心展示顺序排列。 */
export const MESSAGE_GROUP_DEFINITIONS: MessageGroupDefinition[] = [
  { key: 'EXPRESS', name: '快递消息', icon: 'package', emptyText: '暂无最新快递消息' },
  { key: 'SYSTEM', name: '系统消息', icon: 'info', emptyText: '暂无最新系统消息' },
  { key: 'BROADCAST', name: '广播消息', icon: 'mailbox', emptyText: '暂时没有最新消息哦' },
  { key: 'OTHER', name: '其他消息', icon: 'info', emptyText: '暂时没有最新消息哦' }
]

export const MESSAGE_GROUP_EMPTY_FALLBACK = '暂时没有最新消息哦'

/**
 *
 * @param raw 原始消息
 * @description 按分组名归组,未知归入其他
 */
export function resolveMessageGroupKey(raw: IntMessageRaw): MessageGroupKey {
  const groupName = String(raw.groupName ?? raw.messageType ?? '')

  if (groupName.includes('快递')) {
    return 'EXPRESS'
  }

  if (groupName.includes('系统')) {
    return 'SYSTEM'
  }

  if (groupName.includes('广播')) {
    return 'BROADCAST'
  }

  return 'OTHER'
}

/**
 *
 * @param value 已读标记
 * @description 归一多形态已读字段(布尔/Y/1)
 */
function normalizeReadFlag(raw: IntMessageRaw) {
  const flag = raw.isRead ?? raw.readFlag

  return flag === true || flag === 'Y' || flag === 'y' || flag === 1 || flag === '1'
}

/**
 *
 * @param value 时间值
 * @description 归一时间为 yyyy-MM-dd HH:mm
 */
function formatMessageTime(value: string | number | null | undefined) {
  if (!value) {
    return ''
  }

  if (typeof value === 'string') {
    return value.replace('T', ' ').slice(0, 16)
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  const pad = (item: number) => String(item).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 *
 * @param raw 原始消息
 * @description 原始消息转列表项视图
 */
export function mapMessageItem(raw: IntMessageRaw): MessageItemView {
  const content = String(raw.content ?? raw.summary ?? '')
  const title = String(raw.title ?? '').trim()

  return {
    id: String(raw.messageId ?? `${raw.groupId ?? ''}-${raw.sendTime ?? raw.createTime ?? ''}`),
    groupKey: resolveMessageGroupKey(raw),
    groupName: String(raw.groupName ?? ''),
    title: title || (content.length > 24 ? content.slice(0, 24) : content) || '消息通知',
    content,
    time: formatMessageTime(raw.sendTime ?? raw.createTime),
    isRead: normalizeReadFlag(raw),
    waybillNumber: String(raw.waybillNumber ?? ''),
    orderNumber: String(raw.orderNumber ?? '')
  }
}

/**
 *
 * @param items 列表项视图
 * @description 按配置顺序聚合消息中心分组视图
 */
export function mapMessageGroups(items: MessageItemView[]): MessageGroupView[] {
  return MESSAGE_GROUP_DEFINITIONS.filter(definition => definition.key !== 'OTHER' || items.some(item => item.groupKey === 'OTHER')).map(definition => {
    const groupItems = items.filter(item => item.groupKey === definition.key)
    const latest = groupItems[0]

    return {
      key: definition.key,
      name: definition.name,
      icon: definition.icon,
      summary: latest ? latest.title : definition.emptyText,
      summaryTime: latest ? latest.time : '',
      totalCount: groupItems.length,
      unreadCount: groupItems.filter(item => !item.isRead).length
    }
  })
}
