require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { clearSessionCookie, setSessionCookie } = require('@/request/cookieJar')
const { messageApi } = require('@/services/message/message.api')
const { messageService } = require('@/services/message/message.service')

const { createDeferred } = require('../support/deferred.cjs')

function messages(id) {
  return { status: true, result: [{ messageId: id, groupName: '系统消息', title: id, isRead: false }] }
}

test('cached messages are reused within a session and isolated after account switching', async t => {
  const fetch = t.mock.method(messageApi, 'fetchMessages', async () => messages('A-private'))
  await setSessionCookie('ECO_TOKEN=message-account-a;')
  t.after(clearSessionCookie)

  assert.equal((await messageService.queryMessages('SYSTEM')).result.items[0].id, 'A-private')
  assert.equal((await messageService.queryUnreadCount()).result, 1)
  assert.equal(fetch.mock.callCount(), 1)

  await clearSessionCookie()
  await setSessionCookie('ECO_TOKEN=message-account-b;')
  fetch.mock.mockImplementation(async () => messages('B-private'))

  assert.equal((await messageService.queryMessages('SYSTEM')).result.items[0].id, 'B-private')
  assert.equal(fetch.mock.callCount(), 2)
})

test('signed-out queries cannot read cached private messages or fetch without credentials', async t => {
  const fetch = t.mock.method(messageApi, 'fetchMessages', async () => messages('signed-in-private'))
  await setSessionCookie('ECO_TOKEN=message-signout;')
  t.after(clearSessionCookie)
  await messageService.queryGroups()
  await clearSessionCookie()

  const response = await messageService.queryMessages('SYSTEM')
  assert.equal(response.status, false)
  assert.equal(response.result, null)
  assert.equal(fetch.mock.callCount(), 1)
})

test('late responses from the previous account cannot return data or overwrite the new cache', async t => {
  const pending = createDeferred()
  const fetch = t.mock.method(messageApi, 'fetchMessages', () => pending.promise)
  await setSessionCookie('ECO_TOKEN=message-race-a;')
  t.after(clearSessionCookie)
  const oldQuery = messageService.queryMessages('SYSTEM')

  await clearSessionCookie()
  await setSessionCookie('ECO_TOKEN=message-race-b;')
  fetch.mock.mockImplementation(async () => messages('B-current'))
  assert.equal((await messageService.queryMessages('SYSTEM')).result.items[0].id, 'B-current')

  pending.resolve(messages('A-late'))
  const oldResponse = await oldQuery
  assert.equal(oldResponse.status, false)
  assert.equal(oldResponse.result, null)
  assert.equal((await messageService.queryMessages('SYSTEM')).result.items[0].id, 'B-current')
  assert.equal(fetch.mock.callCount(), 2)
})

test('a request completing after logout cannot return private messages', async t => {
  const pending = createDeferred()
  t.mock.method(messageApi, 'fetchMessages', () => pending.promise)
  await setSessionCookie('ECO_TOKEN=message-race-logout;')
  t.after(clearSessionCookie)
  const query = messageService.queryGroups()

  await clearSessionCookie()
  pending.resolve(messages('logged-out-private'))
  assert.equal((await query).status, false)
})

test('message cache expires after sixty seconds', async t => {
  let now = 1_000
  t.mock.method(Date, 'now', () => now)
  const fetch = t.mock.method(messageApi, 'fetchMessages', async () => messages('first'))
  await setSessionCookie('ECO_TOKEN=message-cache-expiry;')
  t.after(clearSessionCookie)
  await messageService.queryGroups()

  now += 59_999
  await messageService.queryGroups()
  assert.equal(fetch.mock.callCount(), 1)

  now += 1
  fetch.mock.mockImplementation(async () => messages('refreshed'))
  assert.equal((await messageService.queryMessages('SYSTEM')).result.items[0].id, 'refreshed')
  assert.equal(fetch.mock.callCount(), 2)
})
