import { expressApi } from './express.api'
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
import { getCurrentEcoToken } from '../auth/session'
import { customerService } from '../customer/customer.service'

import type {
  ExpressDraft,
  ExpressGoodsLabel,
  ExpressProductCustomerCapability,
  ExpressProductUpgradeResult
} from './types'
import type { DepponResponse } from '../../request/deppon'

function getSuccessfulResponse<TResult>(
  result: PromiseSettledResult<DepponResponse<TResult> | null>
) {
  if (result.status !== 'fulfilled' || !result.value?.status) {
    return null
  }

  return result.value
}

async function resolveQuoteCustomerCapability(draft: ExpressDraft) {
  if (!getCurrentEcoToken()) {
    return resolveExpressProductCustomerCapability(draft)
  }

  try {
    const response = await customerService.queryCustomerCapability()

    return resolveExpressProductCustomerCapability(
      draft,
      response.status ? response.result : null
    )
  } catch {
    return resolveExpressProductCustomerCapability(draft)
  }
}

function createDefaultAvailability(
  draft: ExpressDraft,
  customer: ExpressProductCustomerCapability
) {
  return createExpressProductAvailability(draft, customer)
}

export async function queryExpressProductAvailability(draft: ExpressDraft) {
  const customer = await resolveQuoteCustomerCapability(draft)
  const productSwitchEnabled = supportsExpressProductSwitch(draft)
  const dczpEnabled = supportsExpressDczpRecommendation(draft)
  const goodsLabelEnabled = Boolean(draft.goods.name.trim())

  try {
    const [pointResult, switchResult, upgradeResult, goodsLabelResult] =
      await Promise.allSettled([
        dczpEnabled
          ? expressApi.queryProductPointCity(
              createExpressProductPointRequest(draft)
            )
          : Promise.resolve(null),
        productSwitchEnabled
          ? expressApi.queryProductSwitch(
              createExpressProductSwitchRequest(draft, customer)
            )
          : Promise.resolve(null),
        productSwitchEnabled
          ? expressApi.queryProductUpgrade(
              createExpressProductUpgradeRequest(draft, customer)
            )
          : Promise.resolve(null),
        goodsLabelEnabled
          ? expressApi.queryGoodsLabels(
              createExpressGoodsLabelRequest(draft),
              false
            )
          : Promise.resolve(null)
      ])
    const pointResponse = getSuccessfulResponse<boolean>(pointResult)
    const switchResponse = getSuccessfulResponse<boolean>(switchResult)
    const upgradeResponse =
      getSuccessfulResponse<ExpressProductUpgradeResult>(upgradeResult)
    const goodsLabelResponse =
      getSuccessfulResponse<ExpressGoodsLabel[]>(goodsLabelResult)

    return createExpressProductAvailability(draft, customer, {
      dczpAvailable: pointResponse?.result === true,
      fusionEnabled:
        switchResponse?.result === true
          ? true
          : switchResponse?.result === false
            ? false
            : undefined,
      goodsLabels: goodsLabelResponse
        ? goodsLabelResponse.result ?? []
        : undefined,
      upgradeResult: upgradeResponse?.result ?? undefined
    })
  } catch {
    return createDefaultAvailability(draft, customer)
  }
}
