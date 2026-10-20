import { request } from '@/request'

import { normalizeRegionTree, REGION_DATA_URL } from './region.rules'

import type { RegionProvince } from './region.types'

// 省市数据是自有 CDN 上的静态 JSON，不走 gwapi，因此单独指定 baseURL 并跳过鉴权/loading。
let regionTreeCache: RegionProvince[] | null = null
let regionTreePending: Promise<RegionProvince[]> | null = null

async function requestRegionTree(): Promise<RegionProvince[]> {
  const raw = await request<unknown>({
    credentials: 'omit',
    skipAuth: true,
    url: REGION_DATA_URL
  })

  return normalizeRegionTree(raw)
}

/**
 *
 * @description 拉取省/市/区三级数据（进程内缓存，失败不缓存）
 */
export function fetchRegionTree(): Promise<RegionProvince[]> {
  if (regionTreeCache) {
    return Promise.resolve(regionTreeCache)
  }

  if (regionTreePending) {
    return regionTreePending
  }

  regionTreePending = requestRegionTree()
    .then(provinces => {
      if (provinces.length > 0) {
        regionTreeCache = provinces
      }

      return provinces
    })
    .catch(error => {
      regionTreePending = null
      throw error
    })
    .then(provinces => {
      regionTreePending = null

      return provinces
    })

  return regionTreePending
}

/**
 *
 * @description 清空省市数据缓存（账号切换或调试用）
 */
export function clearRegionTreeCache() {
  regionTreeCache = null
  regionTreePending = null
}
