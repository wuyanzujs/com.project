import type { DepponResponse } from '@/request/deppon'
import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'
import { appendRouteQuery } from '@/shared/navigation/routeUrl'
import { APP_WEB_TARGETS } from '@/shared/webview/appWeb'

import { expressApi } from './express.api'
import { buildFilterOrderRequest, buildFreightRequest } from './express.payload'
import { createExpressWarehouseStagingPayload } from './warehouse.payload'
import { createExpressWarehouseScreening, normalizeExpressWarehouseDraft } from './warehouse.rules'
import { getCurrentEcoToken } from '../auth'
import { createServiceFailure as createFailure } from '../serviceResponse'

import type { ExpressDraft, ExpressFilterResponse, ExpressWarehouseScreening, ExpressWarehouseStageResult } from './types'

const WAREHOUSE_WEB_PATH = APP_WEB_TARGETS.EXPRESS_WAREHOUSE.url

/**
 *
 * @param value 筛单结果
 * @description 判断筛单结果 type 是否合法
 */
function hasValidScreeningResult(value: unknown): value is ExpressFilterResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const type = (value as ExpressFilterResponse).type

  return (typeof type === 'number' && Number.isInteger(type) && type >= 0 && type <= 4) || (typeof type === 'string' && /^[0-4]$/.test(type.trim()))
}

/**
 *
 * @param error 捕获的错误
 * @param fallback 兜底文案
 * @description 取错误信息，兜底默认文案
 */
function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

/**
 *
 * @param draft 寄件草稿
 * @description 查询送货进仓筛单结果
 */
export async function queryExpressWarehouseScreening(draft: ExpressDraft): Promise<DepponResponse<ExpressWarehouseScreening>> {
  if (!draft.selectedProduct?.omsProductCode) {
    return createFailure('请先获取并选择产品价格')
  }

  try {
    const response = await expressApi.filterOrder(buildFilterOrderRequest(draft))

    if (!response.status) {
      return createFailure(response.message || '暂未完成送货进仓筛单')
    }

    if (!hasValidScreeningResult(response.result)) {
      return createFailure('送货进仓筛单结果无效，请重试')
    }

    return {
      ...response,
      result: createExpressWarehouseScreening(draft, response.result)
    }
  } catch (error) {
    return createFailure(getErrorMessage(error, '暂未完成送货进仓筛单'))
  }
}

/**
 *
 * @param draft 寄件草稿
 * @description 暂存送货进仓信息并返回跳转 URI
 */
export async function stageExpressWarehouse(draft: ExpressDraft): Promise<DepponResponse<ExpressWarehouseStageResult>> {
  const ecoToken = getCurrentEcoToken().trim()

  if (!ecoToken) {
    return createFailure('请先登录后再设置送货进仓')
  }

  const productCode = draft.selectedProduct?.omsProductCode

  if (!productCode) {
    return createFailure('请先获取并选择产品价格')
  }

  try {
    const warehouse = normalizeExpressWarehouseDraft(draft.warehouse)
    const response = await expressApi.stageWarehouse({
      code: productCode,
      params: buildFreightRequest(draft),
      warehouse: {
        isWarehousingService: warehouse.enabled ? 'Y' : 'N',
        payload: createExpressWarehouseStagingPayload(warehouse)
      }
    })
    const stagingId = response.result?.trim() ?? ''

    if (!response.status || !stagingId) {
      return createFailure(response.message || '送货进仓信息暂存失败')
    }

    return {
      ...response,
      result: {
        stagingId,
        uri: appendRouteQuery(WAREHOUSE_WEB_PATH, {
          warehouseId: stagingId,
          ecoToken,
          source: APP_RUNTIME_CONFIG.systemCode
        })
      }
    }
  } catch (error) {
    return createFailure(getErrorMessage(error, '送货进仓信息暂存失败'))
  }
}
