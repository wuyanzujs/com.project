import { CACHE_KEYS } from './keys'
import { getJsonStorageValue, setJsonStorageValue } from './storage'

/**
 *
 * @description 个性化推荐开关：本地偏好，默认开启；服务端契约未确认，暂不落接口
 */
export function getPersonalizedRecommendEnabled(): boolean {
  const stored = getJsonStorageValue<boolean>(CACHE_KEYS.personalizedRecommend)

  return typeof stored === 'boolean' ? stored : true
}

export function setPersonalizedRecommendEnabled(enabled: boolean) {
  return setJsonStorageValue(CACHE_KEYS.personalizedRecommend, enabled)
}
