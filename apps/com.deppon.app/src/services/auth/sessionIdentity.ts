import type { AppUser } from './types'

const ACCOUNT_IDENTITY_FIELDS = ['id', 'mobile', 'mobileEncrypt', 'unionId', 'originalOpenId', 'openId', 'userName', 'thirdBindUserName'] as const

/**
 *
 * @param value 身份字段值
 * @description 归一身份字段为去空格文本
 */
function normalizeIdentity(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 *
 * @param user 用户信息
 * @description 提取用户身份字段，作为账号标识
 */
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

/**
 *
 * @param current 当前用户
 * @param next 新用户
 * @description 判断两个用户是否同一账号
 */
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

/**
 *
 * @param current 当前用户，可为空
 * @param next 新用户
 * @param owner 已缓存账号标识，可为空
 * @description 判断是否需要清理账号维度缓存
 */
export function shouldClearAccountScopedCache(current: AppUser | null, next: AppUser, owner: AppUser | null = null) {
  if (current && !isSameAppUser(current, next)) {
    return true
  }

  return !owner || !isSameAppUser(owner, next)
}
