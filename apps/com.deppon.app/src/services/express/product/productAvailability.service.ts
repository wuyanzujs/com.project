import type { DepponResponse } from '@/request/deppon'

import {
  createExpressGoodsLabelRequest,
  createExpressProductAvailability,
  createExpressProductPointRequest,
  createExpressProductSwitchRequest,
  createExpressProductUpgradeRequest,
  resolveExpressProductCustomerCapability,
  supportsExpressDczpRecommendation,
  supportsExpressProductSwitch
} from './productAvailability.rules'
import { getCurrentEcoToken } from '../../auth/session'
import { customerService } from '../../customer/customer.service'
import { expressApi } from '../core/express.api'

import type { ExpressDraft, ExpressGoodsLabel, ExpressProductCustomerCapability, ExpressProductUpgradeResult } from '../core/types'

/**
 *
 * @param result 接口聚合结果
 * @description 取成功的接口响应，否则返回 null
 */
function getSuccessfulResponse<TResult>(result: PromiseSettledResult<DepponResponse<TResult> | null>) {
  if (result.status !== 'fulfilled' || !result.value?.status) {
    return null
  }

  return result.value
}

/**
 *
 * @param draft 寄件草稿
 * @description 查询并归一客户能力，失败时降级
 */
async function resolveQuoteCustomerCapability(draft: ExpressDraft) {
  if (!getCurrentEcoToken()) {
    return resolveExpressProductCustomerCapability(draft)
  }

  try {
    const response = await customerService.queryCustomerCapability()

    return resolveExpressProductCustomerCapability(draft, response.status ? response.result : null)
  } catch {
    return resolveExpressProductCustomerCapability(draft)
  }
}

/**
 *
 * @param draft 寄件草稿
 * @param customer 客户能力
 * @description 创建默认产品可用性
 */
function createDefaultAvailability(draft: ExpressDraft, customer: ExpressProductCustomerCapability) {
  return createExpressProductAvailability(draft, customer)
}

/**
 *
 * @param draft 寄件草稿
 * @description 并发查询产品网点、切换、升级与货物标签
 */
export async function queryExpressProductAvailability(draft: ExpressDraft) {
  const customer = await resolveQuoteCustomerCapability(draft)
  const productSwitchEnabled = supportsExpressProductSwitch(draft)
  const dczpEnabled = supportsExpressDczpRecommendation(draft)
  const goodsLabelEnabled = Boolean(draft.goods.name.trim())

  try {
    const [pointResult, switchResult, upgradeResult, goodsLabelResult] = await Promise.allSettled([
      dczpEnabled ? expressApi.queryProductPointCity(createExpressProductPointRequest(draft)) : Promise.resolve(null),
      productSwitchEnabled ? expressApi.queryProductSwitch(createExpressProductSwitchRequest(draft, customer)) : Promise.resolve(null),
      productSwitchEnabled ? expressApi.queryProductUpgrade(createExpressProductUpgradeRequest(draft, customer)) : Promise.resolve(null),
      goodsLabelEnabled ? expressApi.queryGoodsLabels(createExpressGoodsLabelRequest(draft), false) : Promise.resolve(null)
    ])
    const pointResponse = getSuccessfulResponse<boolean>(pointResult)
    const switchResponse = getSuccessfulResponse<boolean>(switchResult)
    const upgradeResponse = getSuccessfulResponse<ExpressProductUpgradeResult>(upgradeResult)
    const goodsLabelResponse = getSuccessfulResponse<ExpressGoodsLabel[]>(goodsLabelResult)

    return createExpressProductAvailability(draft, customer, {
      dczpAvailable: pointResponse?.result === true,
      fusionEnabled: switchResponse?.result === true ? true : switchResponse?.result === false ? false : undefined,
      goodsLabels: goodsLabelResponse ? (goodsLabelResponse.result ?? []) : undefined,
      upgradeResult: upgradeResponse?.result ?? undefined
    })
  } catch {
    return createDefaultAvailability(draft, customer)
  }
}
