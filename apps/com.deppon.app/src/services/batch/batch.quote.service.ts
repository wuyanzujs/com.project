import { mapBatchContactToExpressContact } from './batch.draft'
import { expressApi } from '../express/express.api'
import { createExpressDraft } from '../express/express.draft'
import { buildFreightRequest } from '../express/express.payload'
import { normalizeExpressReturnBillDraft } from '../express/valueAdded'
import { createServiceFailure as createFailure } from '../serviceResponse'

import type {
  BatchConsigneeDraft,
  BatchDraft,
  BatchQuoteItem
} from './types'
import type { DepponResponse } from '../../request/deppon'
import type { ExpressDraft, ExpressProductQuote } from '../express/types'

function createQuoteDraft(
  draft: BatchDraft,
  item: BatchConsigneeDraft
): ExpressDraft {
  const baseDraft = createExpressDraft()

  return {
    ...baseDraft,
    sender: mapBatchContactToExpressContact(draft.sender),
    consignee: mapBatchContactToExpressContact(item.contact),
    goods: {
      name: item.goods.name,
      count: item.goods.count,
      weight: item.goods.weight,
      volume: item.goods.volume,
      insuredAmount: item.service.insuredAmount
    },
    service: {
      ...baseDraft.service,
      transportMode: item.productCode,
      deliveryMode: item.deliveryMode,
      paymentType: draft.paymentType,
      returnBill: normalizeExpressReturnBillDraft({
        type: item.service.returnBillType,
        returnRequirement: item.service.returnRequirement
      }),
      needContact: draft.needContact,
      privacyProtection: item.service.privacyProtection
    },
    collection: {
      ...baseDraft.collection,
      type: item.service.reciveLoanType,
      amount: item.service.reviceMoneyAmount,
      account: item.service.reciveLoanAccount,
      accountName: item.service.accountName
    },
    pickup: {
      ...baseDraft.pickup,
      ...draft.pickup
    },
    couponNumber: item.couponNumber,
    remark: item.remark,
    scanContext: draft.scanContext
  }
}

function getDefaultQuoteProduct(products: ExpressProductQuote[]) {
  return products.find(product => !!product.omsProductCode) ?? null
}

export async function quoteBatchDraft(
  draft: BatchDraft
): Promise<DepponResponse<BatchQuoteItem[]>> {
  try {
    const responses = await Promise.all(
      draft.consignees.map(item =>
        expressApi.queryFreight(
          buildFreightRequest(createQuoteDraft(draft, item)),
          false
        )
      )
    )
    const quotes: BatchQuoteItem[] = []

    for (let index = 0; index < responses.length; index += 1) {
      const response = responses[index]
      const product = getDefaultQuoteProduct(response.result ?? [])

      if (!response.status || !product) {
        return createFailure(
          response.message || `第 ${index + 1} 票暂未获取到产品价格`
        )
      }

      quotes.push({
        consigneeIndex: index,
        productCode: product.omsProductCode,
        productName: product.productName || product.label || '推荐产品',
        estimatedFee: product.totalfee
      })
    }

    return {
      status: true,
      message: '',
      result: quotes
    }
  } catch (error) {
    return createFailure(
      error instanceof Error ? error.message : '批量价格获取失败，请稍后重试'
    )
  }
}
