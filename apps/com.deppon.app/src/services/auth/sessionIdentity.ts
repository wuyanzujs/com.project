import type { AppUser } from './types'

const ACCOUNT_IDENTITY_FIELDS = [
  'id',
  'mobile',
  'mobileEncrypt',
  'unionId',
  'originalOpenId',
  'openId',
  'userName',
  'thirdBindUserName'
] as const

function normalizeIdentity(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function createAppUserIdentity(user: AppUser) {
  const identity: AppUser = {}

  for (const field of ACCOUNT_IDENTITY_FIELDS) {
    const value = normalizeIdentity(user[field])

    if (value) {
      identity[field] = value
    }
  }

  return identity
}

export function isSameAppUser(current: AppUser, next: AppUser) {
  for (const field of ACCOUNT_IDENTITY_FIELDS) {
    const currentValue = normalizeIdentity(current[field])
    const nextValue = normalizeIdentity(next[field])

    if (currentValue && nextValue) {
      return currentValue === nextValue
    }
  }

  return false
}

export function shouldClearAccountScopedCache(
  current: AppUser | null,
  next: AppUser,
  owner: AppUser | null = null
) {
  if (current && !isSameAppUser(current, next)) {
    return true
  }

  return !owner || !isSameAppUser(owner, next)
}
