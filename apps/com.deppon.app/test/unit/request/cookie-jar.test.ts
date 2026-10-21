import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CACHE_KEYS } from '@/cache/keys'
import * as jar from '@/request/cookieJar'

const storage = vi.hoisted(() => {
  const values = new Map<string, string>()
  const failingSets = new Set<string>()
  const failingRemoves = new Set<string>()
  const state = { throwOnSet: false }

  return {
    failingRemoves,
    failingSets,
    getStorageValue: vi.fn((key: string) => values.get(key) ?? ''),
    removeGates: new Map<string, Promise<void>>(),
    removeStorageValue: vi.fn(async (key: string) => {
      const gate = storage.removeGates.get(key)

      if (gate) {
        await gate
      }

      if (failingRemoves.has(key)) {
        return false
      }

      values.delete(key)
      return true
    }),
    setStorageValue: vi.fn(async (key: string, value: string) => {
      if (state.throwOnSet) {
        throw new Error('storage offline')
      }

      if (failingSets.has(key)) {
        return false
      }

      values.set(key, value)
      return true
    }),
    state,
    values
  }
})

vi.mock('@/cache/storage', () => ({
  getStorageValue: storage.getStorageValue,
  removeStorageValue: storage.removeStorageValue,
  setStorageValue: storage.setStorageValue
}))

beforeEach(async () => {
  storage.values.clear()
  storage.failingSets.clear()
  storage.failingRemoves.clear()
  storage.removeGates.clear()
  storage.state.throwOnSet = false
  jar.configureSessionCookieRuntime(null)
  await jar.clearSessionCookie()
  storage.getStorageValue.mockClear()
  storage.setStorageValue.mockClear()
  storage.removeStorageValue.mockClear()
})

function createRuntime(
  overrides: {
    clear?: () => Promise<boolean>
    read?: (url: string) => Promise<string>
    write?: (cookie: string) => Promise<boolean>
  } = {}
) {
  const runtime = {
    clear: vi.fn(overrides.clear ?? (async () => true)),
    read: vi.fn(overrides.read ?? (async () => '')),
    write: vi.fn(overrides.write ?? (async () => true))
  }

  jar.configureSessionCookieRuntime(runtime)
  return runtime
}

describe('recoverSessionCookie', () => {
  it('is exported and bounded to five native reads', async () => {
    const runtime = createRuntime()

    await expect(jar.recoverSessionCookie('https://owstest.deppon.com/gwapi')).resolves.toBe('')

    expect(typeof jar.recoverSessionCookie).toBe('function')
    expect(runtime.read).toHaveBeenCalledTimes(5)
    expect(storage.values.has(CACHE_KEYS.sessionInvalidated)).toBe(false)
    expect(storage.values.has(CACHE_KEYS.cookie)).toBe(false)
  })

  it('persists the cookie once the native store catches up', async () => {
    const runtime = createRuntime()
    runtime.read.mockResolvedValueOnce('').mockResolvedValueOnce('ECO_TOKEN=recovered;')

    await expect(jar.recoverSessionCookie('https://owstest.deppon.com/gwapi')).resolves.toBe('ECO_TOKEN=recovered;')

    expect(runtime.read).toHaveBeenCalledTimes(2)
    expect(storage.values.get(CACHE_KEYS.cookie)).toBe('ECO_TOKEN=recovered;')
    expect(runtime.write).toHaveBeenCalledWith('ECO_TOKEN=recovered;')
  })

  it('keeps the login state when recovery fails and can recover later', async () => {
    const runtime = createRuntime()
    runtime.read.mockRejectedValue(new Error('cookie store unavailable'))

    await expect(jar.recoverSessionCookie('https://owstest.deppon.com/gwapi')).resolves.toBe('')

    expect(runtime.read).toHaveBeenCalledTimes(5)
    expect(storage.values.has(CACHE_KEYS.sessionInvalidated)).toBe(false)

    runtime.read.mockResolvedValue('ECO_TOKEN=later;')

    await expect(jar.recoverSessionCookie('https://owstest.deppon.com/gwapi')).resolves.toBe('ECO_TOKEN=later;')
  })

  it('does not touch the native store when the session was invalidated', async () => {
    const runtime = createRuntime()
    storage.values.set(CACHE_KEYS.sessionInvalidated, '1')

    await expect(jar.recoverSessionCookie('https://owstest.deppon.com/gwapi')).resolves.toBe('')

    expect(runtime.read).not.toHaveBeenCalled()
    expect(storage.values.get(CACHE_KEYS.sessionInvalidated)).toBe('1')
  })

  it('restores a cached cookie without polling the native store', async () => {
    const runtime = createRuntime()
    storage.values.set(CACHE_KEYS.cookie, 'ECO_TOKEN=cached;')

    await expect(jar.recoverSessionCookie('https://owstest.deppon.com/gwapi')).resolves.toBe('ECO_TOKEN=cached;')

    expect(runtime.read).not.toHaveBeenCalled()
    expect(runtime.write).toHaveBeenCalledWith('ECO_TOKEN=cached;')
  })

  it('hydrates once without polling', async () => {
    const runtime = createRuntime()
    runtime.read.mockResolvedValue('ECO_TOKEN=hydrated;')

    await expect(jar.hydrateSessionCookie('https://owstest.deppon.com/gwapi')).resolves.toBe('ECO_TOKEN=hydrated;')

    expect(runtime.read).toHaveBeenCalledTimes(1)
  })

  it('returns an empty cookie when the runtime write fails', async () => {
    const runtime = createRuntime()
    storage.values.set(CACHE_KEYS.cookie, 'ECO_TOKEN=cached;')
    runtime.write.mockRejectedValue(new Error('write failed'))

    await expect(jar.hydrateSessionCookie('https://owstest.deppon.com/gwapi')).resolves.toBe('ECO_TOKEN=cached;')
  })
})

describe('setSessionCookie', () => {
  it('ignores cookies without an ECO_TOKEN', async () => {
    const runtime = createRuntime()

    await expect(jar.setSessionCookie('foo=1')).resolves.toBe(false)

    expect(runtime.write).not.toHaveBeenCalled()
    expect(storage.values.has(CACHE_KEYS.cookie)).toBe(false)
  })

  it('stores a valid cookie and clears the invalidation marker', async () => {
    const runtime = createRuntime()
    storage.values.set(CACHE_KEYS.sessionInvalidated, '1')

    await expect(jar.setSessionCookie('ECO_TOKEN=next;')).resolves.toBe(true)

    expect(storage.values.get(CACHE_KEYS.cookie)).toBe('ECO_TOKEN=next;')
    expect(storage.values.has(CACHE_KEYS.sessionInvalidated)).toBe(false)
    expect(runtime.write).toHaveBeenCalledWith('ECO_TOKEN=next;')
    expect(jar.getEcoToken()).toBe('next')
  })

  it('reports a failed cookie save', async () => {
    createRuntime()
    storage.failingSets.add(CACHE_KEYS.cookie)

    await expect(jar.setSessionCookie('ECO_TOKEN=next;')).resolves.toBe(false)
  })

  it('keeps the session invalidated when the marker cannot be cleared', async () => {
    createRuntime()
    storage.failingRemoves.add(CACHE_KEYS.sessionInvalidated)

    await expect(jar.setSessionCookie('ECO_TOKEN=next;')).resolves.toBe(false)

    expect(jar.getSessionCookie()).toBe('')
  })

  it('drops the native write failure after the cookie was persisted', async () => {
    const runtime = createRuntime()
    runtime.write.mockRejectedValue(new Error('native write failed'))

    await expect(jar.setSessionCookie('ECO_TOKEN=next;')).resolves.toBe(true)
    expect(jar.getSessionCookie()).toBe('ECO_TOKEN=next;')
  })

  it('drops an older write when a newer cookie supersedes it', async () => {
    createRuntime()

    const first = jar.setSessionCookie('ECO_TOKEN=first;')
    const second = jar.setSessionCookie('ECO_TOKEN=second;')

    await expect(first).resolves.toBe(false)
    await expect(second).resolves.toBe(true)
    expect(jar.getSessionCookie()).toBe('ECO_TOKEN=second;')
  })

  it('recovers the mutation queue after a storage rejection', async () => {
    createRuntime()
    storage.state.throwOnSet = true

    await expect(jar.setSessionCookie('ECO_TOKEN=broken;')).rejects.toThrow('storage offline')

    storage.state.throwOnSet = false

    await expect(jar.setSessionCookie('ECO_TOKEN=fixed;')).resolves.toBe(true)
    expect(jar.getSessionCookie()).toBe('ECO_TOKEN=fixed;')
  })
})

describe('clearSessionCookie', () => {
  it('clears storage, native cookies and the invalidation marker', async () => {
    const runtime = createRuntime()
    storage.values.set(CACHE_KEYS.cookie, 'ECO_TOKEN=old;')

    await expect(jar.clearSessionCookie()).resolves.toBe(true)

    expect(runtime.clear).toHaveBeenCalledTimes(1)
    expect(storage.values.has(CACHE_KEYS.cookie)).toBe(false)
    expect(storage.values.has(CACHE_KEYS.sessionInvalidated)).toBe(false)
  })

  it('keeps the invalidation marker when the native clear fails', async () => {
    const runtime = createRuntime()
    runtime.clear.mockResolvedValue(false)
    storage.values.set(CACHE_KEYS.cookie, 'ECO_TOKEN=old;')

    await expect(jar.clearSessionCookie()).resolves.toBe(false)

    expect(jar.getSessionCookie()).toBe('')
    expect(storage.values.get(CACHE_KEYS.sessionInvalidated)).toBe('1')

    await expect(jar.recoverSessionCookie('https://owstest.deppon.com/gwapi')).resolves.toBe('')
  })

  it('drops a write superseded while the invalidation marker is being cleared', async () => {
    createRuntime()
    let releaseGate: () => void = () => undefined
    const gate = new Promise<void>(resolve => {
      releaseGate = resolve
    })
    storage.removeGates.set(CACHE_KEYS.sessionInvalidated, gate)

    const first = jar.setSessionCookie('ECO_TOKEN=first;')

    await vi.waitFor(() => expect(storage.removeStorageValue).toHaveBeenCalledWith(CACHE_KEYS.sessionInvalidated))

    const clear = jar.clearSessionCookie()
    releaseGate()

    await expect(first).resolves.toBe(false)
    await expect(clear).resolves.toBe(true)
  })

  it('keeps the invalidation marker when the native clear rejects', async () => {
    const runtime = createRuntime()
    runtime.clear.mockRejectedValue(new Error('native clear failed'))

    await expect(jar.clearSessionCookie()).resolves.toBe(false)
    expect(jar.getSessionCookie()).toBe('')
  })

  it('keeps the invalidation marker when storage removal fails', async () => {
    createRuntime()
    storage.failingRemoves.add(CACHE_KEYS.sessionInvalidated)

    await expect(jar.clearSessionCookie()).resolves.toBe(false)
    expect(jar.getSessionCookie()).toBe('')
  })
})

describe('session cookie responses', () => {
  it('reads set-cookie from every supported header shape', () => {
    expect(jar.getResponseSetCookie({ headers: { 'set-cookie': 'a=1' }, fallbackHeaders: undefined, cookies: undefined })).toBe('a=1')
    expect(jar.getResponseSetCookie({ headers: {}, fallbackHeaders: { 'set-cookie': 'b=2' }, cookies: undefined })).toBe('b=2')
    expect(jar.getResponseSetCookie({ headers: {}, fallbackHeaders: {}, cookies: [{ name: 'c', value: '3' }] })).toBe('c=3')
    expect(jar.getResponseSetCookie({ headers: {}, fallbackHeaders: {}, cookies: undefined })).toBe('')
  })

  it('saves the session cookie from a response', async () => {
    const runtime = createRuntime()

    await expect(
      jar.saveSessionCookieFromResponse({
        cookies: undefined,
        fallbackHeaders: undefined,
        headers: { 'set-cookie': 'ECO_TOKEN=from-header;' },
        data: null,
        method: 'POST',
        statusCode: 200,
        url: 'https://owstest.deppon.com/gwapi'
      })
    ).resolves.toBe('ECO_TOKEN=from-header;')

    expect(runtime.write).toHaveBeenCalledWith('ECO_TOKEN=from-header;')
  })

  it('falls back to the native cookie store when the response has no cookie', async () => {
    const runtime = createRuntime()
    runtime.read.mockResolvedValue('ECO_TOKEN=from-native;')

    await expect(
      jar.saveSessionCookieFromResponse({
        cookies: undefined,
        fallbackHeaders: undefined,
        headers: {},
        data: null,
        method: 'POST',
        statusCode: 200,
        url: 'https://owstest.deppon.com/gwapi'
      })
    ).resolves.toBe('ECO_TOKEN=from-native;')
  })

  it('returns an empty cookie when the native store read rejects', async () => {
    createRuntime({
      read: async () => {
        throw new Error('cookie store unavailable')
      }
    })

    await expect(
      jar.saveSessionCookieFromResponse({
        cookies: undefined,
        fallbackHeaders: undefined,
        headers: {},
        data: null,
        method: 'POST',
        statusCode: 200,
        url: 'https://owstest.deppon.com/gwapi'
      })
    ).resolves.toBe('')
  })

  it('refuses to save into an invalidated session', async () => {
    const runtime = createRuntime()
    storage.failingRemoves.add(CACHE_KEYS.sessionInvalidated)
    await jar.clearSessionCookie()
    storage.failingRemoves.clear()

    await expect(
      jar.saveSessionCookieFromResponse(
        {
          cookies: undefined,
          fallbackHeaders: undefined,
          headers: { 'set-cookie': 'ECO_TOKEN=blocked;' },
          data: null,
        method: 'POST',
          statusCode: 200,
          url: 'https://owstest.deppon.com/gwapi'
        },
        { allowInvalidatedSession: false }
      )
    ).resolves.toBe('')

    expect(runtime.write).not.toHaveBeenCalled()
  })

  it('returns an empty cookie when the response cannot produce one', async () => {
    createRuntime()

    await expect(
      jar.saveSessionCookieFromResponse(
        {
          cookies: undefined,
          fallbackHeaders: undefined,
          headers: {},
          data: null,
        method: 'POST',
          statusCode: 200,
          url: 'https://owstest.deppon.com/gwapi'
        },
        { allowInvalidatedSession: true }
      )
    ).resolves.toBe('')
  })

  it('does not save when the cookie jar refuses the write', async () => {
    createRuntime()
    storage.failingSets.add(CACHE_KEYS.cookie)

    await expect(
      jar.saveSessionCookieFromResponse({
        cookies: undefined,
        fallbackHeaders: undefined,
        headers: { 'set-cookie': 'ECO_TOKEN=rejected;' },
        data: null,
        method: 'POST',
        statusCode: 200,
        url: 'https://owstest.deppon.com/gwapi'
      })
    ).resolves.toBe('')
  })

  it('allows an explicit invalidated session write', async () => {
    const runtime = createRuntime()
    storage.failingRemoves.add(CACHE_KEYS.sessionInvalidated)
    await jar.clearSessionCookie()
    storage.failingRemoves.clear()

    await expect(
      jar.saveSessionCookieFromResponse(
        {
          cookies: undefined,
          fallbackHeaders: undefined,
          headers: { 'set-cookie': 'ECO_TOKEN=allowed;' },
          data: null,
        method: 'POST',
          statusCode: 200,
          url: 'https://owstest.deppon.com/gwapi'
        },
        { allowInvalidatedSession: true }
      )
    ).resolves.toBe('ECO_TOKEN=allowed;')

    expect(runtime.write).toHaveBeenCalledWith('ECO_TOKEN=allowed;')
  })
})

describe('getSessionCookie', () => {
  it('returns the stored cookie and token', () => {
    storage.values.set(CACHE_KEYS.cookie, 'ECO_TOKEN=stored;')
    expect(jar.getSessionCookie()).toBe('ECO_TOKEN=stored;')
    expect(jar.getEcoToken()).toBe('stored')

    storage.values.set(CACHE_KEYS.sessionInvalidated, '1')
    expect(jar.getSessionCookie()).toBe('')
  })

  it('accepts a null runtime', async () => {
    jar.configureSessionCookieRuntime(null)

    await expect(jar.recoverSessionCookie('https://owstest.deppon.com/gwapi')).resolves.toBe('')
    await expect(jar.hydrateSessionCookie('https://owstest.deppon.com/gwapi')).resolves.toBe('')
    await expect(jar.setSessionCookie('ECO_TOKEN=next;')).resolves.toBe(true)
    await expect(jar.clearSessionCookie()).resolves.toBe(true)
  })
})
