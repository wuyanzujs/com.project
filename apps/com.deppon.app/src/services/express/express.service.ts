import { expressApi } from './express.api'
import {
  createExpressDraft,
  trimText,
  validateExpressContact,
  validateExpressDraft,
  validateExpressPriceTimeDraft,
  toFiniteNumber
} from './express.draft'
import {
  buildCreateOrderRequest,
  buildFilterOrderRequest,
  buildFreightRequest,
  buildInsurancePriceRequest,
  buildPickupTimeRequest
} from './express.payload'
import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'
import { createServiceFailure as createFailure } from '../serviceResponse'

import type {
  CreateExpressOrderResponse,
  ExpressDraft,
  ExpressFilterResponse,
  ExpressGoodsCheckResult,
  ExpressGoodsCheckStatus,
  ExpressGoodsLabel,
  ExpressGoodsLabelRequest,
  ExpressInsurancePriceResponse,
  ExpressInsuranceQuote,
  ExpressOrderCancelRequest,
  ExpressOrderDetailRequest,
  ExpressPickupTimeResponse,
  ExpressProductQuote
} from './types'
import type { DepponResponse } from '../../request/deppon'

function getResponseFailureMessage(response: DepponResponse<unknown>) {
  return response.message || '校验失败，请稍后再试'
}

function getBlockingGoodsLabel(labels: ExpressGoodsLabel[]) {
  return labels.find((label) => label.displayType === 'forbid')
}

function getGoodsLabelStatus(
  label: ExpressGoodsLabel
): ExpressGoodsCheckStatus {
  if (label.displayType === 'forbid') {
    return 'forbid'
  }

  if (label.goodsRemarkCode === 'unknow_category') {
    return 'unknown'
  }

  if (
    label.goodsRemarkCode === 'contraband_category' ||
    label.displayType === 'alert' ||
    label.displayType === 'addprice' ||
    label.displayType === 'tips'
  ) {
    return 'risk'
  }

  return 'risk'
}

function compareGoodsStatus(
  current: ExpressGoodsCheckStatus,
  next: ExpressGoodsCheckStatus
) {
  const rank: Record<ExpressGoodsCheckStatus, number> = {
    ok: 0,
    risk: 1,
    unknown: 2,
    forbid: 3
  }

  return rank[next] > rank[current] ? next : current
}

function getGoodsCheckStatus(
  labels: ExpressGoodsLabel[]
): ExpressGoodsCheckStatus {
  return labels.reduce<ExpressGoodsCheckStatus>(
    (status, label) => compareGoodsStatus(status, getGoodsLabelStatus(label)),
    'ok'
  )
}

function getGoodsCheckTitle(status: ExpressGoodsCheckStatus) {
  switch (status) {
    case 'forbid':
      return '暂不支持寄递'
    case 'unknown':
      return '需要人工确认'
    case 'risk':
      return '存在寄递提示'
    default:
      return '可正常寄递'
  }
}

function getGoodsCheckMessage(
  status: ExpressGoodsCheckStatus,
  labels: ExpressGoodsLabel[]
) {
  const message = labels.map((label) => trimText(label.tip)).find(Boolean)

  if (message) {
    return message
  }

  switch (status) {
    case 'forbid':
      return '该货物当前不支持寄递，请更换货物名称或咨询客服。'
    case 'unknown':
      return '暂未识别到明确品类，寄件前建议补充准确名称。'
    case 'risk':
      return '该货物存在包装、保价或收寄限制提示，请按页面提示确认。'
    default:
      return '未命中禁寄或特殊风险规则。'
  }
}

function normalizeGoodsCheckResult(
  goodsName: string,
  labels: ExpressGoodsLabel[]
): ExpressGoodsCheckResult {
  const status = getGoodsCheckStatus(labels)

  return {
    goodsName,
    status,
    canExpress: status !== 'forbid',
    title: getGoodsCheckTitle(status),
    message: getGoodsCheckMessage(status, labels),
    labels
  }
}

function isBlockingFilterResult(result?: ExpressFilterResponse | null) {
  return !!result && result.type !== 0 && result.type !== 1
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
): Promise<DepponResponse<boolean>> {
  const response = await expressApi.queryGoodsLabels(
    {
      goodsName: draft.goods.name,
      senderProvinceName: draft.sender?.province,
      senderCityName: draft.sender?.city,
      senderCountyName: draft.sender?.county,
      arriveProvinceName: draft.consignee?.province,
      arriveCityName: draft.consignee?.city,
      arriveCountyName: draft.consignee?.county
    },
    false
  )

  if (!response.status) {
    return createFailure(response.message || '暂未完成货物校验，请稍后再试')
  }

  const blockingLabel = getBlockingGoodsLabel(response.result ?? [])

  if (blockingLabel) {
    return createFailure(blockingLabel.tip || '该货物暂不支持寄递')
  }

  return {
    ...response,
    result: true
  }
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
    result: normalizeGoodsCheckResult(goodsName, response.result ?? [])
  }
}

async function checkOrderFilterBeforeSubmit(
  draft: ExpressDraft
): Promise<DepponResponse<boolean>> {
  const response = await expressApi.filterOrder(buildFilterOrderRequest(draft))

  if (!response.status) {
    return createFailure(getResponseFailureMessage(response))
  }

  if (isBlockingFilterResult(response.result)) {
    return createFailure(response.result?.reason || '当前订单暂不支持提交')
  }

  return {
    ...response,
    result: true
  }
}

async function checkBeforeSubmit(
  draft: ExpressDraft
): Promise<DepponResponse<boolean>> {
  const goodsCheck = await checkGoodsBeforeSubmit(draft)

  if (!goodsCheck.status) {
    return goodsCheck
  }

  return checkOrderFilterBeforeSubmit(draft)
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
    return expressApi.queryGoodsLabels({
      goodsName: draft.goods.name,
      senderProvinceName: draft.sender?.province,
      senderCityName: draft.sender?.city,
      senderCountyName: draft.sender?.county,
      arriveProvinceName: draft.consignee?.province,
      arriveCityName: draft.consignee?.city,
      arriveCountyName: draft.consignee?.county
    })
  },

  checkGoodsByName,

  quote(draft: ExpressDraft) {
    const validation = validateExpressDraft(draft)

    if (!validation.valid) {
      return Promise.resolve(
        createFailure<ExpressProductQuote[]>(validation.messages[0])
      )
    }

    return expressApi.queryFreight(buildFreightRequest(draft), false)
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
          toFiniteNumber(draft.goods.insuredAmount)
        )
      }
    } catch (error) {
      return createFailure(
        error instanceof Error ? error.message : '暂未获取到保价费用'
      )
    }
  },

  queryPickupTime(draft: ExpressDraft) {
    const senderMessages = validateExpressContact(draft.sender, '寄件人')

    if (senderMessages.length) {
      return Promise.resolve(
        createFailure<ExpressPickupTimeResponse>(senderMessages[0])
      )
    }

    return expressApi.queryPickupTime(buildPickupTimeRequest(draft), false)
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

    return expressApi.createOrder(buildCreateOrderRequest(draft))
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
