import Taro from '@tarojs/taro'

export function getStorageValue(key: string): string {
  try {
    return Taro.getStorageSync(key) || ''
  } catch {
    return ''
  }
}

export function setStorageValue(key: string, value: string): boolean {
  try {
    Taro.setStorageSync(key, value)
    return true
  } catch {
    return false
  }
}

export function removeStorageValue(key: string): boolean {
  try {
    Taro.removeStorageSync(key)
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

export function setJsonStorageValue<T>(key: string, value: T): boolean {
  try {
    return setStorageValue(key, JSON.stringify(value))
  } catch {
    return false
  }
}
