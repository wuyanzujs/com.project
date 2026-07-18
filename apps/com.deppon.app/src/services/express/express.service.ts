import {
  buildExpressDeliveryAppointmentRequest,
  isExpressScheduledDeliveryProductSupported
} from './deliveryPreference.rules'
import { expressApi } from './express.api'
import {
  createExpressDraft,
  trimText,
  validateExpressDraft,
  validateExpressPriceTimeDraft,
  toFiniteNumber
} from './express.draft'
import {
  buildCreateOrderRequest,
  buildFreightRequest,
  buildInsurancePriceRequest
} from './express.payload'
import {
  getBlockingExpressGoodsLabel,
  normalizeExpressGoodsCheckResult
} from './goodsCheck.rules'
import {
  applyExpressInsuranceCapability,
  createExpressInsuranceCapability,
  isExpressInsuranceCapabilityCurrent,
  validateExpressInsurance
} from './insurance.rules'
import { queryExpressPickupTime } from './pickupTime.service'
import { createExpressGoodsLabelRequest } from './productAvailability.rules'
import {
  queryExpressProductAvailability
} from './productAvailability.service'
import { validateExpressWarehouseScreeningForSubmit } from './warehouse.rules'
import {
  queryExpressWarehouseScreening,
  stageExpressWarehouse
} from './warehouse.service'
import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'
import { createServiceFailure as createFailure } from '../serviceResponse'

import type {
  CreateExpressOrderResponse,
  ExpressDeliveryAppointmentResponse,
  ExpressDraft,
  ExpressGoodsCheckResult,
  ExpressGoodsLabelRequest,
  ExpressInsuranceCapability,
  ExpressInsurancePriceResponse,
  ExpressInsuranceQuote,
  ExpressOrderCancelRequest,
  ExpressOrderDetailRequest,
  ExpressProductQuote,
  ExpressQuoteResult
} from './types'
import type { DepponResponse } from '../../request/deppon'

function getResponseFailureMessage(response: DepponResponse<unknown>) {
  return response.message || '校验失败，请稍后再试'
}

function normalizeInsuranceQuote(
  response: ExpressInsurancePriceResponse | null,
  amount: number
): ExpressInsuranceQuote {
  const dataPrice = response?.data?.[String(amount)] ?? response?.data?.[amount]
  const price = dataPrice ?? response?.price ?? 0

  return {
    amount,
    price: toFiniteNumber(price),
    name: response?.fixedProtectionName
  }
}

async function checkGoodsBeforeSubmit(
  draft: ExpressDraft
): Promise<DepponResponse<ExpressInsuranceCapability>> {
  const response = await expressApi.queryGoodsLabels(
    createExpressGoodsLabelRequest(draft),
    false
  )

  if (!response.status) {
    return createFailure(response.message || '暂未完成货物校验，请稍后再试')
  }

  const labels = response.result ?? []
  const blockingLabel = getBlockingExpressGoodsLabel(labels)

  if (blockingLabel) {
    return createFailure(blockingLabel.tip || '该货物暂不支持寄递')
  }

  const capability = createExpressInsuranceCapability(draft, labels)

  if (!isExpressInsuranceCapabilityCurrent(draft, capability)) {
    return createFailure('货物保价规则已更新，请重新获取价格')
  }

  const insuranceMessages = validateExpressInsurance(draft, capability)

  if (insuranceMessages.length) {
    return createFailure(insuranceMessages[0])
  }

  return { ...response, result: capability }
}

async function checkGoodsByName(
  data: ExpressGoodsLabelRequest
): Promise<DepponResponse<ExpressGoodsCheckResult>> {
  const goodsName = trimText(data.goodsName)

  if (!goodsName) {
    return createFailure('请输入货物名称')
  }

  const response = await expressApi.queryGoodsLabels(
    {
      ...data,
      goodsName
    },
    false
  )

  if (!response.status) {
    return createFailure(response.message || '暂未完成货物校验，请稍后再试')
  }

  return {
    ...response,
    result: normalizeExpressGoodsCheckResult(goodsName, response.result ?? [])
  }
}

async function checkOrderFilterBeforeSubmit(
  draft: ExpressDraft
): Promise<DepponResponse<boolean>> {
  const response = await queryExpressWarehouseScreening(draft)

  if (!response.status || !response.result) {
    return createFailure(getResponseFailureMessage(response))
  }

  const messages = validateExpressWarehouseScreeningForSubmit(
    draft,
    response.result
  )

  if (messages.length) {
    return createFailure(messages[0])
  }

  return {
    ...response,
    result: true
  }
}

async function checkBeforeSubmit(
  draft: ExpressDraft
): Promise<DepponResponse<ExpressInsuranceCapability>> {
  const goodsCheck = await checkGoodsBeforeSubmit(draft)

  if (!goodsCheck.status) {
    return goodsCheck
  }

  const filterCheck = await checkOrderFilterBeforeSubmit(draft)

  if (!filterCheck.status) {
    return createFailure(filterCheck.message || '暂时无法提交订单')
  }

  return { ...goodsCheck, result: goodsCheck.result }
}

export const expressService = {
  createDraft: createExpressDraft,

  queryGoodsNames(keyword: string, pageIndex = 1, pageSize = 20) {
    return expressApi.queryGoodsName({
      keyWord: keyword,
      pageIndex,
      pageSize
    })
  },

  queryGoodsLabels(draft: ExpressDraft) {
    return expressApi.queryGoodsLabels(createExpressGoodsLabelRequest(draft))
  },

  checkGoodsByName,

  async quote(
    draft: ExpressDraft
  ): Promise<DepponResponse<ExpressQuoteResult>> {
    const validation = validateExpressDraft(draft)

    if (!validation.valid) {
      return createFailure<ExpressQuoteResult>(validation.messages[0])
    }

    const availability = await queryExpressProductAvailability(draft)
    const availableDraft = applyExpressInsuranceCapability(
      draft,
      availability.insuranceCapability,
      availability.customer.insuranceLimit
    )
    const insuranceMessages = validateExpressInsurance(
      availableDraft,
      availability.insuranceCapability
    )

    if (insuranceMessages.length) {
      return {
        status: false,
        message: insuranceMessages[0],
        result: { availability, products: [] }
      }
    }

    const response = await expressApi.queryFreight(
      buildFreightRequest(availableDraft, availability),
      false
    )

    if (!response.status) {
      return {
        ...response,
        result: { availability, products: [] }
      }
    }

    return {
      ...response,
      result: {
        availability,
        products: response.result ?? []
      }
    }
  },

  quotePriceTime(draft: ExpressDraft) {
    const validation = validateExpressPriceTimeDraft(draft)

    if (!validation.valid) {
      return Promise.resolve(
        createFailure<ExpressProductQuote[]>(validation.messages[0])
      )
    }

    return expressApi.queryFreight(buildFreightRequest(draft), false)
  },

  async queryInsurancePrice(
    draft: ExpressDraft
  ): Promise<DepponResponse<ExpressInsuranceQuote>> {
    try {
      const request = buildInsurancePriceRequest(draft)
      const response = await expressApi.queryInsurancePrice(request)

      if (!response.status) {
        return createFailure(response.message || '暂未获取到保价费用')
      }

      return {
        ...response,
        result: normalizeInsuranceQuote(
          response.result ?? null,
          toFiniteNumber(Number(request.statements[0] ?? 0))
        )
      }
    } catch (error) {
      return createFailure(
        error instanceof Error ? error.message : '暂未获取到保价费用'
      )
    }
  },

  queryPickupTime: queryExpressPickupTime,

  queryWarehouseScreening: queryExpressWarehouseScreening,

  stageWarehouse: stageExpressWarehouse,

  queryDeliveryAppointment(draft: ExpressDraft) {
    if (
      !draft.consignee?.province ||
      !draft.consignee.city ||
      !draft.consignee.county ||
      !trimText(draft.consignee.address)
    ) {
      return Promise.resolve(
        createFailure<ExpressDeliveryAppointmentResponse>('请先填写完整收件地址')
      )
    }

    if (!draft.selectedProduct?.arriveDate) {
      return Promise.resolve(
        createFailure<ExpressDeliveryAppointmentResponse>(
          '请先获取并选择包含预计到达时间的产品'
        )
      )
    }

    if (
      !isExpressScheduledDeliveryProductSupported(
        draft.selectedProduct.omsProductCode
      )
    ) {
      return Promise.resolve(
        createFailure<ExpressDeliveryAppointmentResponse>(
          '当前产品暂不支持定时派送'
        )
      )
    }

    return expressApi.queryDeliveryAppointment(
      buildExpressDeliveryAppointmentRequest(draft)
    )
  },

  async submitDraft(
    draft: ExpressDraft
  ): Promise<DepponResponse<CreateExpressOrderResponse>> {
    const validation = validateExpressDraft(draft, {
      requireAgreement: true,
      requireProduct: true
    })

    if (!validation.valid) {
      return createFailure(validation.messages[0])
    }

    const submitCheck = await checkBeforeSubmit(draft)

    if (!submitCheck.status) {
      return createFailure(submitCheck.message || '暂时无法提交订单')
    }

    const intercept = await expressApi.checkCanCreateOrder()

    if (!intercept.status) {
      return createFailure(intercept.message || '暂时无法提交订单')
    }

    if (intercept.result?.orderFlag === 'N') {
      return createFailure('当前账号存在未完成拦截，请稍后再试')
    }

    return expressApi.createOrder(
      buildCreateOrderRequest(draft, submitCheck.result)
    )
  },

  queryOrderDetail(data: ExpressOrderDetailRequest) {
    return expressApi.queryOrderDetail({
      ...data,
      sysCode: data.sysCode ?? APP_RUNTIME_CONFIG.systemCode
    })
  },

  cancelOrder(data: ExpressOrderCancelRequest) {
    return expressApi.cancelOrder({
      ...data,
      sysCode: data.sysCode ?? APP_RUNTIME_CONFIG.systemCode
    })
  }
}
