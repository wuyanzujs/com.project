import {
  ACCOUNT_SCOPED_CACHE_KEYS,
  ACCOUNT_SCOPED_STORAGE_KEYS,
  createCacheStorageKey
} from './keys'
import { removeStorageValue } from './storage'

type AccountScopedCacheKey = (typeof ACCOUNT_SCOPED_CACHE_KEYS)[number]

const LOGIN_RETURN_DRAFT_MAX_AGE_MS = 10 * 60 * 1000
const pendingLoginReturnDrafts = new Map<AccountScopedCacheKey, number>()

export function preserveAccountScopedCacheForLogin(key: AccountScopedCacheKey) {
  pendingLoginReturnDrafts.set(key, Date.now())
}

function consumePendingLoginReturnStorageKeys() {
  const now = Date.now()
  const preserved = new Set<string>()

  for (const [key, stagedAt] of pendingLoginReturnDrafts) {
    if (now - stagedAt <= LOGIN_RETURN_DRAFT_MAX_AGE_MS) {
      preserved.add(key)
      preserved.add(createCacheStorageKey(key))
    }
  }

  pendingLoginReturnDrafts.clear()
  return preserved
}

export async function clearAccountScopedCache(
  options: { preserveLoginReturnDrafts?: boolean } = {}
) {
  const preservedKeys = options.preserveLoginReturnDrafts
    ? consumePendingLoginReturnStorageKeys()
    : new Set<string>()

  if (!options.preserveLoginReturnDrafts) {
    pendingLoginReturnDrafts.clear()
  }

  const results = await Promise.all(
    ACCOUNT_SCOPED_STORAGE_KEYS
      .filter(key => !preservedKeys.has(key))
      .map(key => removeStorageValue(key))
  )

  return results.every(Boolean)
}
