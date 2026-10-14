import Taro from '@tarojs/taro'

import { APP_STORAGE_KEYS } from './keys'

const storageValues = new Map<string, string>()
const storageOperationQueues = new Map<string, Promise<void>>()
let hydrationPromise: Promise<void> | null = null

function normalizeStorageValue(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  return typeof value === 'string' ? value : String(value)
}

function hydrateStorageKey(key: string) {
  return enqueueStorageOperation(key, async () => {
    try {
      const result = await Taro.getStorage({ key })
      const value = normalizeStorageValue(result.data)

      if (value) {
        storageValues.set(key, value)
      } else {
        storageValues.delete(key)
      }
    } catch {
      storageValues.delete(key)
    }
  })
}

export function hydrateStorage() {
  if (!hydrationPromise) {
    hydrationPromise = Promise.all(APP_STORAGE_KEYS.map(hydrateStorageKey)).then(() => undefined)
  }

  return hydrationPromise
}

export function getStorageValue(key: string): string {
  return storageValues.get(key) ?? ''
}

function enqueueStorageOperation<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = storageOperationQueues.get(key) ?? Promise.resolve()
  const current = previous.then(operation, operation)
  const settled = current.then(
    () => undefined,
    () => undefined
  )

  storageOperationQueues.set(key, settled)

  return current.finally(() => {
    if (storageOperationQueues.get(key) === settled) {
      storageOperationQueues.delete(key)
    }
  })
}

export function setStorageValue(key: string, value: string) {
  return enqueueStorageOperation(key, async () => {
    try {
      await Taro.setStorage({ key, data: value })
      storageValues.set(key, value)
      return true
    } catch {
      return false
    }
  })
}

export function removeStorageValue(key: string) {
  return enqueueStorageOperation(key, async () => {
    try {
      await Taro.removeStorage({ key })
      storageValues.delete(key)
      return true
    } catch {
      return false
    }
  })
}

export function getJsonStorageValue<T>(key: string): T | null {
  const value = getStorageValue(key)

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function setJsonStorageValue<T>(key: string, value: T) {
  try {
    return setStorageValue(key, JSON.stringify(value))
  } catch {
    return Promise.resolve(false)
  }
}
