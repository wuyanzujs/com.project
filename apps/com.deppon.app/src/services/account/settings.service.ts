import { clearAppCache, getAppCacheSizeBytes, getPersonalizedRecommendEnabled, setPersonalizedRecommendEnabled as persistPersonalizedRecommend } from '@/cache'
import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'

import { formatAppVersionText, formatCacheSize } from './settings.rules'

export const accountSettingsService = {
  /**
   *
   * @description 「设置」页缓存体积文案
   */
  getCacheSizeText(): string {
    return formatCacheSize(getAppCacheSizeBytes())
  },

  /**
   *
   * @description 清除业务缓存并返回清除后的体积文案
   */
  async clearCache(): Promise<string> {
    await clearAppCache()

    return accountSettingsService.getCacheSizeText()
  },

  /**
   *
   * @description 个性化推荐开关当前值（本地偏好，默认开启）
   */
  isPersonalizedRecommendEnabled(): boolean {
    return getPersonalizedRecommendEnabled()
  },

  /**
   *
   * @param enabled 目标开关状态
   * @description 持久化个性化推荐开关
   */
  setPersonalizedRecommendEnabled(enabled: boolean): Promise<boolean> {
    return persistPersonalizedRecommend(enabled)
  },

  /**
   *
   * @description 版本信息行文案
   */
  getVersionText(): string {
    return formatAppVersionText(APP_RUNTIME_CONFIG.appVersion)
  }
}
