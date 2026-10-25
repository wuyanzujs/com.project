import type { ExpressDraft, ExpressGoods } from './types'

const EXPRESS_LTL_MAX_WEIGHT = 60
const EXPRESS_LTL_MAX_VOLUME = 0.36

export function isExpressLtlGoods(goods: Pick<ExpressGoods, 'weight' | 'volume'>) {
  const weight = Number(goods.weight)
  const volume = Number(goods.volume)

  return (Number.isFinite(weight) ? weight : 1) > EXPRESS_LTL_MAX_WEIGHT || (Number.isFinite(volume) ? volume : 0) > EXPRESS_LTL_MAX_VOLUME
}

export function isExpressLtlDraft(draft: Pick<ExpressDraft, 'goods' | 'scanContext'>) {
  return draft.scanContext?.role === 'acceptDept' || isExpressLtlGoods(draft.goods)
}
