import type { BatchContact, BatchRecognizedConsignee, BatchConsigneeDraft, BatchDraft, BatchGoodsDraft, BatchServiceDraft } from './types'
import type { Contact } from '../contact/types'
import type { ExpressContact, ExpressDraft } from '../express/types'

/**
 *
 * @param name 货物名称
 * @description 创建批量的货物草稿
 */
export function createBatchGoodsDraft(name = ''): BatchGoodsDraft {
  return {
    name,
    count: 1,
    weight: 1,
    volume: 0
  }
}

/**
 *
 * @description 创建批量的增值服务草稿
 */
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

/**
 *
 * @param contact 收货人联系人
 * @param goodsName 货物名称
 * @description 创建单个收货人的批量草稿
 */
export function createBatchConsigneeDraft(contact: BatchContact | null = null, goodsName = ''): BatchConsigneeDraft {
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

/**
 *
 * @param consignee 收货人草稿
 * @description 生成联系人去重 key
 */
export function getBatchContactKey(consignee: BatchConsigneeDraft) {
  const contact = consignee.contact

  return [contact?.id, contact?.mobile, contact?.province, contact?.address].filter(Boolean).join('|')
}

/**
 *
 * @param contact 寄件联系人
 * @description 寄件联系人转为批量联系人
 */
export function mapExpressContactToBatchContact(contact: ExpressContact | null): BatchContact | null {
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

/**
 *
 * @param contact 地址簿联系人
 * @description 地址簿联系人转为批量联系人
 */
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

/**
 *
 * @param contact 批量联系人
 * @description 批量联系人转为寄件联系人
 */
export function mapBatchContactToExpressContact(contact: BatchContact | null): ExpressContact | null {
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

/**
 *
 * @param draft 批量草稿
 * @param index 收货人下标
 * @param patch 待更新的货物字段
 * @description 更新收货人货物并清空已获取的价格
 */
export function updateBatchConsigneeGoods(draft: BatchDraft, index: number, patch: Partial<BatchGoodsDraft>): BatchDraft {
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

/**
 *
 * @param draft 批量草稿
 * @description 清空所有收货人的报价结果
 */
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

/**
 *
 * @param draft 批量草稿
 * @param results 收货人报价结果列表
 * @description 按收货人下标写回报价结果
 */
export function applyBatchQuoteResults(
  draft: BatchDraft,
  results: Array<{
    consigneeIndex: number
    productCode: BatchConsigneeDraft['productCode']
    productName: string
    estimatedFee: number | null
  }>
): BatchDraft {
  const resultMap = new Map(results.map(result => [result.consigneeIndex, result]))

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

/**
 *
 * @param item 识别出的收货人
 * @description 由识别结果创建收货人草稿
 */
export function createBatchConsigneeFromRecognition(item: BatchRecognizedConsignee): BatchConsigneeDraft | null {
  if (item.status !== 'ready' || !item.contact) {
    return null
  }

  return createBatchConsigneeDraft(item.contact, item.goodsName)
}

/**
 *
 * @description 创建空的批量寄件草稿
 */
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

/**
 *
 * @param expressDraft 寄件草稿
 * @description 由寄件草稿创建批量草稿，继承发货人与取件信息
 */
export function createBatchDraftFromExpressDraft(expressDraft: ExpressDraft | null): BatchDraft {
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
