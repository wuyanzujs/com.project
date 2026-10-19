require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { mapMessageGroups, mapMessageItem } = require('@/services/message/message.mapper')

test('unknown messages have a reachable group and contribute to its unread count', () => {
  const items = [
    mapMessageItem({ messageId: 'known', groupName: '系统消息', isRead: false }),
    mapMessageItem({ messageId: 'unknown', messageType: 123, title: '未识别的消息', isRead: false }),
    mapMessageItem({ messageId: 'read', groupName: '其他类型', isRead: true })
  ]
  const groups = mapMessageGroups(items)
  const other = groups.find(group => group.key === 'OTHER')

  assert.equal(other.name, '其他消息')
  assert.equal(other.summary, '未识别的消息')
  assert.equal(other.totalCount, 2)
  assert.equal(other.unreadCount, 1)
  assert.equal(
    groups.reduce((sum, group) => sum + group.unreadCount, 0),
    items.filter(item => !item.isRead).length
  )
  assert.equal(
    items.every(item => groups.some(group => group.key === item.groupKey)),
    true
  )
})

test('the empty center retains the three standard groups without an empty fallback entry', () => {
  assert.deepEqual(
    mapMessageGroups([]).map(group => group.key),
    ['EXPRESS', 'SYSTEM', 'BROADCAST']
  )
})
