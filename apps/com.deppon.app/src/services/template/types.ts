import type {
  ExpressFlag,
  ExpressPaymentType,
  ExpressProductCode,
  ExpressReturnBillType
} from '../express'

export interface ExpressTemplateContactRaw {
  id?: string
  name?: string
  telephone?: string
  fixedPhone?: string
  province?: string
  city?: string
  county?: string
  town?: string
  address?: string
  company?: string
  regionType?: '' | 'GAT'
}

export interface ExpressTemplateRaw {
  id: string
  defaultFlag: 1 | 2
  templateName: string
  template: {
    sender?: ExpressTemplateContactRaw | null
    receiver?: ExpressTemplateContactRaw | null
    isContact?: ExpressFlag
    goodInfo?: {
      weight?: number
      goodsName?: string
      isExtra?: boolean
    } | null
    pickupTime?: {
      dispatchFlag?: ExpressFlag
      beginAcceptTime?: string
      beginAcceptTimeText?: string
      serviceTime?: string
    } | null
    payment?: {
      paymentType?: ExpressPaymentType
      paymentName?: string
    } | null
    product?: {
      omsProductCode?: ExpressProductCode
      productCode?: string
    } | null
    insurance?: {
      insuranceAmount?: string | number
    } | null
    addedService?: {
      returnBillType?: ExpressReturnBillType
      returnBillName?: string
      returnRequirement?: string
      customReturnRequirement?: string
    } | null
  }
}

export interface ExpressTemplateView {
  id: string
  name: string
  isDefault: boolean
  senderText: string
  receiverText: string
  goodsText: string
  weightText: string
  tags: string[]
  raw: ExpressTemplateRaw
}

export interface ExpressTemplateQueryRequest {
  id: string
}

export interface ExpressTemplateDeleteRequest {
  id: string
}

export interface ExpressTemplateSaveRequest extends ExpressTemplateRaw {
  sysCode: string
}

export interface ExpressTemplateDraftMeta {
  name: string
  defaultFlag: 1 | 2
}
