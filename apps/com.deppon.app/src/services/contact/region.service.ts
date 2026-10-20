import { fetchRegionTree } from './region.api'

import type { RegionProvince } from './region.types'

export const regionService = {
  /**
   *
   * @description 省/市/区数据（页面只能经 service facade 取，不能直连 region.api）
   */
  loadProvinces(): Promise<RegionProvince[]> {
    return fetchRegionTree()
  }
}
