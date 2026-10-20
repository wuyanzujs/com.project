import { CACHE_MAINTENANCE_CLEARABLE_KEYS, createCacheStorageKey } from './keys'
import { getStorageValue, removeStorageValue } from './storage'

/**
 *
 * @description 清除缓存覆盖的存储键：业务缓存既可能写在裸键上，也可能写在 DP_CACHE_ 前缀键上，两者都要统计和清理
 */
function getMaintenanceStorageKeys() {
  return CACHE_MAINTENANCE_CLEARABLE_KEYS.flatMap(key => [key, createCacheStorageKey(key)])
}

/**
 *
 * @description 统计可清理缓存占用的字节数（按 UTF-16 每字符 2 字节估算）
 */
export function getAppCacheSizeBytes(): number {
  return getMaintenanceStorageKeys().reduce((total, key) => {
    const value = getStorageValue(key)

    return value ? total + value.length * 2 : total
  }, 0)
}

/**
 *
 * @description 清除业务缓存，保留登录态、cookie 与个性化推荐偏好
 */
export async function clearAppCache(): Promise<boolean> {
  const results = await Promise.all(getMaintenanceStorageKeys().map(key => removeStorageValue(key)))

  return results.every(Boolean)
}
