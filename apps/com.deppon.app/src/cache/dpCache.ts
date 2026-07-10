import { createCacheStorageKey } from './keys'
import {
  getJsonStorageValue,
  removeStorageValue,
  setJsonStorageValue
} from './storage'

export enum DPCacheExpireType {
  TODAY = 'TODAY',
  THE_MONTH = 'THE_MONTH',
  DAYS = 'DAYS',
  HOURS = 'HOURS',
  MINUTES = 'MINUTES',
  INFINITY = 'INFINITY'
}

export interface DPCacheExpireConfig {
  type: DPCacheExpireType
  value?: number
}

interface DPCachePayload<T> {
  time: number
  data?: T
  expire: DPCacheExpireConfig
}

const MINUTE = 60000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function formatDate(time: number, type: 'day' | 'month') {
  const date = new Date(time)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')

  if (type === 'month') {
    return `${year}-${month}`
  }

  return `${year}-${month}-${`${date.getDate()}`.padStart(2, '0')}`
}

function isExpired(payload: DPCachePayload<unknown>) {
  const currentTime = Date.now()
  const cacheTime = payload.time

  switch (payload.expire.type) {
    case DPCacheExpireType.INFINITY:
      return false
    case DPCacheExpireType.TODAY:
      return formatDate(currentTime, 'day') !== formatDate(cacheTime, 'day')
    case DPCacheExpireType.THE_MONTH:
      return formatDate(currentTime, 'month') !== formatDate(cacheTime, 'month')
    case DPCacheExpireType.MINUTES:
      return currentTime - cacheTime > (payload.expire.value ?? 0) * MINUTE
    case DPCacheExpireType.HOURS:
      return currentTime - cacheTime > (payload.expire.value ?? 0) * HOUR
    case DPCacheExpireType.DAYS:
      return currentTime - cacheTime > (payload.expire.value ?? 0) * DAY
    default:
      return true
  }
}

export const dpCache = {
  set<T>(
    key: string,
    value?: { data?: T; expire?: DPCacheExpireConfig }
  ): Promise<boolean> {
    return setJsonStorageValue<DPCachePayload<T>>(createCacheStorageKey(key), {
      time: Date.now(),
      data: value?.data,
      expire: value?.expire ?? { type: DPCacheExpireType.INFINITY }
    })
  },

  get<T>(key: string): T | null {
    const payload = getJsonStorageValue<DPCachePayload<T>>(
      createCacheStorageKey(key)
    )

    if (!payload || isExpired(payload)) {
      return null
    }

    return payload.data ?? null
  },

  has(key: string): boolean {
    const payload = getJsonStorageValue<DPCachePayload<unknown>>(
      createCacheStorageKey(key)
    )

    return !!payload && !isExpired(payload)
  },

  remove(key: string): Promise<boolean> {
    return removeStorageValue(createCacheStorageKey(key))
  }
}
