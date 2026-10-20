const CACHE_SIZE_KILO = 1024
const CACHE_SIZE_MEGA = CACHE_SIZE_KILO * 1024

/**
 *
 * @description 缓存体积文案：0B / 128.39K / 1.20M
 */
export function formatCacheSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0B'
  }

  if (bytes < CACHE_SIZE_KILO) {
    return `${Math.round(bytes)}B`
  }

  if (bytes < CACHE_SIZE_MEGA) {
    return `${(bytes / CACHE_SIZE_KILO).toFixed(2)}K`
  }

  return `${(bytes / CACHE_SIZE_MEGA).toFixed(2)}M`
}

/**
 *
 * @description 版本信息行文案：`当前版本v` 加版本号
 */
export function formatAppVersionText(version: string): string {
  const normalized = version.trim().replace(/^v/i, '')

  return `当前版本v${normalized || '--'}`
}
