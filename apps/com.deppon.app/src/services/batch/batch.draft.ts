import type {
  BatchContact,
  BatchRecognizedConsignee,
  BatchConsigneeDraft,
  BatchDraft,
  BatchGoodsDraft,
  BatchServiceDraft
} from './types'
import type { Contact } from '../contact/types'
import type { ExpressContact, ExpressDraft } from '../express/types'

export function createBatchGoodsDraft(name = ''): BatchGoodsDraft {
  return {
    name,
    count: 1,
    weight: 1,
    volume: 0
  }
}

export function createBatchServiceDraft(): BatchServiceDraft {
  return {
    insuredAmount: 0,
    reciveLoanType: '',
    reciveLoanAccount: '',
    reviceMoneyAmount: 0,
    returnBillType: 'NO_RETURN_SIGNED',
    returnRequirement: '',
    accountName: '',
    privacyProtection: 'N'
  }
}

export function createBatchConsigneeDraft(
  contact: BatchContact | null = null,
  goodsName = ''
): BatchConsigneeDraft {
  return {
    contact,
    goods: createBatchGoodsDraft(goodsName),
    service: createBatchServiceDraft(),
    productCode: '',
    productName: '',
    estimatedFee: null,
    deliveryMode: '',
    couponNumber: '',
    remark: '',
    waybillNumber: '',
    receiveGoods: true
  }
}

export function getBatchContactKey(consignee: BatchConsigneeDraft) {
  const contact = consignee.contact

  return [contact?.id, contact?.mobile, contact?.province, contact?.address]
    .filter(Boolean)
    .join('|')
}

export function mapExpressContactToBatchContact(
  contact: ExpressContact | null
): BatchContact | null {
  if (!contact) {
    return null
  }

  return {
    id: contact.id,
    name: contact.name,
    mobile: contact.mobile,
    province: contact.province,
    city: contact.city,
    county: contact.county,
    address: contact.address
  }
}

export function mapContactToBatchContact(contact: Contact): BatchContact {
  return {
    id: contact.id,
    name: contact.name,
    mobile: contact.telephone,
    province: contact.province,
    city: contact.city,
    county: contact.county,
    address: contact.address
  }
}

export function mapBatchContactToExpressContact(
  contact: BatchContact | null
): ExpressContact | null {
  if (!contact) {
    return null
  }

  return {
    id: contact.id,
    name: contact.name,
    mobile: contact.mobile,
    province: contact.province,
    city: contact.city,
    county: contact.county,
    address: contact.address
  }
}

export function updateBatchConsigneeGoods(
  draft: BatchDraft,
  index: number,
  patch: Partial<BatchGoodsDraft>
): BatchDraft {
  return {
    ...draft,
    consignees: draft.consignees.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            goods: {
              ...item.goods,
              ...patch
            },
            productCode: '',
            productName: '',
            estimatedFee: null
          }
        : item
    )
  }
}

export function resetBatchQuotes(draft: BatchDraft): BatchDraft {
  return {
    ...draft,
    consignees: draft.consignees.map(item => ({
      ...item,
      productCode: '',
      productName: '',
      estimatedFee: null
    }))
  }
}

export function applyBatchQuoteResults(
  draft: BatchDraft,
  results: Array<{
    consigneeIndex: number
    productCode: BatchConsigneeDraft['productCode']
    productName: string
    estimatedFee: number | null
  }>
): BatchDraft {
  const resultMap = new Map(
    results.map(result => [result.consigneeIndex, result])
  )

  return {
    ...draft,
    consignees: draft.consignees.map((item, index) => {
      const result = resultMap.get(index)

      return result
        ? {
            ...item,
            productCode: result.productCode,
            productName: result.productName,
            estimatedFee: result.estimatedFee
          }
        : item
    })
  }
}

export function createBatchConsigneeFromRecognition(
  item: BatchRecognizedConsignee
): BatchConsigneeDraft | null {
  if (item.status !== 'ready' || !item.contact) {
    return null
  }

  return createBatchConsigneeDraft(item.contact, item.goodsName)
}

export function createBatchDraft(): BatchDraft {
  return {
    sender: null,
    consignees: [],
    paymentType: 'MP',
    needContact: 'Y',
    pickup: {
      dispatch: 'Y',
      time: '',
      stationCode: '',
      stationName: ''
    },
    requireWaybillNumber: false
  }
}

export function createBatchDraftFromExpressDraft(
  expressDraft: ExpressDraft | null
): BatchDraft {
  const draft = createBatchDraft()

  if (!expressDraft) {
    return draft
  }

  return {
    ...draft,
    sender: mapExpressContactToBatchContact(expressDraft.sender),
    paymentType: expressDraft.service.paymentType,
    needContact: expressDraft.service.needContact,
    pickup: {
      dispatch: expressDraft.pickup.dispatch,
      time: expressDraft.pickup.time,
      endTime: expressDraft.pickup.endTime,
      stationCode: expressDraft.pickup.stationCode,
      stationName: expressDraft.pickup.stationName,
      pickPeriodTime: expressDraft.pickup.pickPeriodTime
    }
  }
}
