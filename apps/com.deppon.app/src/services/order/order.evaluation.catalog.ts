import type {
  OrderEvaluationLevel,
  OrderEvaluationRecordType
} from './order.evaluation.types'

export const ORDER_EVALUATION_LEVELS: readonly OrderEvaluationLevel[] = [
  1, 2, 3, 4, 5
]

export const ORDER_EVALUATION_TITLES: Record<OrderEvaluationLevel, string> = {
  1: '非常不满意，我要吐槽',
  2: '不满意，我要吐槽',
  3: '一般般，还需改善',
  4: '比较满意，仍待提升',
  5: '服务太棒了，我想夸一夸'
}

const COLLECTION_NEGATIVE_LABELS = [
  '服务态度差',
  '不按时取件',
  '不在现场开单',
  '不提供包装',
  '乱收费',
  '付款方式开错',
  '联系不及时',
  '形象/工具不专业',
  '小哥让线下转账',
  '未告知运单信息',
  '私自保价',
  '不上门取件'
] as const

const COLLECTION_POSITIVE_LABELS = [
  '服务态度好',
  '取件准时',
  '现场开单',
  '提供包装',
  '费用明细清晰',
  '开单准确无误',
  '联系及时',
  '形象/工具专业',
  '支付正规透明',
  '清楚告知运单信息',
  '主动上门取件'
] as const

const DELIVERY_NEGATIVE_LABELS = [
  '服务态度差',
  '异常未及时告知',
  '小哥送货慢',
  '乱收费',
  '私自签收/放代收点',
  '未及时告知取件信息',
  '未按要求送货',
  '派送前未联系',
  '不送货上门',
  '私自不送货'
] as const

const DELIVERY_POSITIVE_LABELS = [
  '服务态度好',
  '异常及时沟通',
  '送货神速',
  '收费透明清晰',
  '经同意签收',
  '及时告知取件信息',
  '按要求送货',
  '派送前主动联系',
  '主动送上门'
] as const

export function getOrderEvaluationLabels(
  recordType: OrderEvaluationRecordType,
  level: OrderEvaluationLevel
): readonly string[] {
  if (recordType === 'COLLECTION') {
    return level === 5
      ? COLLECTION_POSITIVE_LABELS
      : COLLECTION_NEGATIVE_LABELS
  }

  return level === 5 ? DELIVERY_POSITIVE_LABELS : DELIVERY_NEGATIVE_LABELS
}
