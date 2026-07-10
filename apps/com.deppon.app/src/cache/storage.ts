import Taro from '@tarojs/taro'

import { APP_STORAGE_KEYS } from './keys'

const storageValues = new Map<string, string>()
let hydrationPromise: Promise<void> | null = null

function normalizeStorageValue(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  return typeof value === 'string' ? value : String(value)
}

async function hydrateStorageKey(key: string) {
  try {
    const result = await Taro.getStorage({ key })
    const value = normalizeStorageValue(result.data)

    if (value) {
      storageValues.set(key, value)
    }
  } catch {
    storageValues.delete(key)
  }
}

export function hydrateStorage() {
  if (!hydrationPromise) {
    hydrationPromise = Promise.all(
      APP_STORAGE_KEYS.map(hydrateStorageKey)
    ).then(() => undefined)
  }

  return hydrationPromise
}

export function getStorageValue(key: string): string {
  return storageValues.get(key) ?? ''
}

export async function setStorageValue(key: string, value: string) {
  storageValues.set(key, value)

  try {
    await Taro.setStorage({ key, data: value })
    return true
  } catch {
    return false
  }
}

export async function removeStorageValue(key: string) {
  storageValues.delete(key)

  try {
    await Taro.removeStorage({ key })
    return true
  } catch {
    return false
  }
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
