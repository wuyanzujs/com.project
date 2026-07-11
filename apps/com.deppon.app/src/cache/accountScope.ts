import { ACCOUNT_SCOPED_STORAGE_KEYS } from './keys'
import { removeStorageValue } from './storage'

export async function clearAccountScopedCache() {
  const results = await Promise.all(
    ACCOUNT_SCOPED_STORAGE_KEYS.map((key) => removeStorageValue(key))
  )

  return results.every(Boolean)
}
