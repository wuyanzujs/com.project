import type {
  ExpressGoodsCheckStatus,
  ExpressGoodsItem,
  ExpressGoodsLabel,
  ExpressGoodsLabelRequest
} from '../express'

export type GoodsQuerySource = 'search' | 'hot'
export type GoodsCheckStatus = ExpressGoodsCheckStatus

export interface GoodsSuggestionView {
  name: string
  category: string
  firstCategory: string
  secondCategory: string
  labels: ExpressGoodsLabel[]
  source: GoodsQuerySource
}

export interface GoodsCheckInput extends ExpressGoodsLabelRequest {}

export interface GoodsCheckResult {
  goodsName: string
  status: GoodsCheckStatus
  canExpress: boolean
  title: string
  message: string
  labels: ExpressGoodsLabel[]
  checkedAt: number
}

export interface GoodsHistoryItem {
  goodsName: string
  status: GoodsCheckStatus
  title: string
  message: string
  checkedAt: number
}

export type GoodsSearchRawItem = ExpressGoodsItem
