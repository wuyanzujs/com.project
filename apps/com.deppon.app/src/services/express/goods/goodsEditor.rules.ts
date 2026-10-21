import type { ExpressGoods } from '../core/types'

export const EXPRESS_GOODS_LIMITS = {
  minWeight: 1,
  maxWeight: 10000,
  minCount: 1,
  maxCount: 999
} as const

interface ExpressGoodsEditorInput {
  name: string
  weight: string
  count: string
  volume: string
  volumeEnabled: boolean
}

/** 编辑页校验成功后才回传，避免把非法体积、件数静默转换为零或整数。 */
export function resolveExpressGoodsInput(initial: ExpressGoods, input: ExpressGoodsEditorInput): { goods: ExpressGoods | null; message: string } {
  const name = input.name.trim()
  const weight = Number(input.weight)
  const count = Number(input.count)
  const volume = input.volumeEnabled ? Number(input.volume) : 0

  if (!name) {
    return { goods: null, message: '请填写物品名称' }
  }

  if (!Number.isFinite(weight) || weight < EXPRESS_GOODS_LIMITS.minWeight || weight > EXPRESS_GOODS_LIMITS.maxWeight) {
    return { goods: null, message: `重量需为${EXPRESS_GOODS_LIMITS.minWeight}至${EXPRESS_GOODS_LIMITS.maxWeight}kg` }
  }

  if (!Number.isInteger(count) || count < EXPRESS_GOODS_LIMITS.minCount || count > EXPRESS_GOODS_LIMITS.maxCount) {
    return { goods: null, message: `货物件数需为${EXPRESS_GOODS_LIMITS.minCount}至${EXPRESS_GOODS_LIMITS.maxCount}的整数` }
  }

  if (!Number.isFinite(volume) || volume < 0) {
    return { goods: null, message: '请填写正确的货物体积' }
  }

  return { goods: { ...initial, name, weight, count, volume }, message: '' }
}
