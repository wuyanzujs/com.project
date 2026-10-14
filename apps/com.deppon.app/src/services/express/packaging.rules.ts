import { EXPRESS_CARTON_OPTIONS, EXPRESS_UNPACKING_OPTIONS, EXPRESS_WOODEN_PACKAGING_OPTIONS, getExpressCartonOption } from './packaging.catalog'

import type { ExpressCartonCode, ExpressDraft, ExpressPackagingDraft, ExpressUnpackingCode, ExpressWoodenPackagingCode } from './types'

const EXPRESS_CARTON_CODES = new Set(EXPRESS_CARTON_OPTIONS.map(option => option.code))
const EXPRESS_WOODEN_PACKAGING_CODES = new Set(EXPRESS_WOODEN_PACKAGING_OPTIONS.map(option => option.code))
const EXPRESS_UNPACKING_CODES = new Set(EXPRESS_UNPACKING_OPTIONS.map(option => option.code))

/**
 *
 * @param value 纸箱 code
 * @description 校验纸箱 code，非法值返回空字符串
 */
export function normalizeExpressCartonCode(value: unknown): ExpressCartonCode {
  const code = typeof value === 'string' ? value.trim() : ''

  return EXPRESS_CARTON_CODES.has(code as Exclude<ExpressCartonCode, ''>) ? (code as Exclude<ExpressCartonCode, ''>) : ''
}

/**
 *
 * @param value 木包装 code 的数组
 * @description 过滤非法项、去重，木包装
 */
export function normalizeExpressWoodenPackagingCodes(value: unknown): ExpressWoodenPackagingCode[] {
  if (!Array.isArray(value)) {
    return []
  }

  const selectedCodes = new Set(
    value.map(code => (typeof code === 'string' ? code.trim() : '')).filter(code => EXPRESS_WOODEN_PACKAGING_CODES.has(code as ExpressWoodenPackagingCode))
  )

  return EXPRESS_WOODEN_PACKAGING_OPTIONS.map(option => option.code).filter(code => selectedCodes.has(code))
}

/**
 *
 * @param value 拆包装 code 的数组
 * @description 过滤非法项、去重，按目录顺序返回
 */
export function normalizeExpressUnpackingCodes(value: unknown): ExpressUnpackingCode[] {
  if (!Array.isArray(value)) {
    return []
  }

  const selectedCodes = new Set(
    value.map(code => (typeof code === 'string' ? code.trim() : '')).filter(code => EXPRESS_UNPACKING_CODES.has(code as ExpressUnpackingCode))
  )

  return EXPRESS_UNPACKING_OPTIONS.map(option => option.code).filter(code => selectedCodes.has(code))
}

/**
 *
 * @description 创建空的包装草稿
 */
export function createExpressPackagingDraft(): ExpressPackagingDraft {
  return { cartonCode: '', woodenCodes: [], unpackingCodes: [] }
}

/**
 *
 * @param value 包装草稿，可为空
 * @description 归一草稿中的纸箱、木包装、拆包装 code
 */
export function normalizeExpressPackagingDraft(value?: Partial<ExpressPackagingDraft> | null): ExpressPackagingDraft {
  return {
    cartonCode: normalizeExpressCartonCode(value?.cartonCode),
    woodenCodes: normalizeExpressWoodenPackagingCodes(value?.woodenCodes),
    unpackingCodes: normalizeExpressUnpackingCodes(value?.unpackingCodes)
  }
}

/**
 *
 * @param left 左侧 code 列表
 * @param right 右侧 code 列表
 * @description 判断两个 code 列表是否完全一致
 */
function areCodeListsEqual(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((code, index) => code === right[index])
}

/**
 *
 * @param draft 寄件草稿
 * @description 取货物体积与纸箱体积中较大者，作为报价体积
 */
export function getExpressPackagingQuoteVolume(draft: ExpressDraft) {
  const goodsVolume = Number.isFinite(draft.goods.volume) ? Math.max(draft.goods.volume, 0) : 0
  const cartonVolume = getExpressCartonOption(draft.packaging.cartonCode)?.volume ?? 0

  return Math.max(goodsVolume, cartonVolume)
}

/**
 *
 * @param draft 寄件草稿
 * @param patch 待更新的包装字段
 * @description 合并并归一包装信息，有变化时清空选品并标记报价过期
 */
export function updateExpressPackaging(draft: ExpressDraft, patch: Partial<ExpressPackagingDraft>): ExpressDraft {
  const currentPackaging = normalizeExpressPackagingDraft(draft.packaging)
  const packaging = normalizeExpressPackagingDraft({
    ...currentPackaging,
    ...patch
  })

  if (
    packaging.cartonCode === currentPackaging.cartonCode &&
    areCodeListsEqual(packaging.woodenCodes, currentPackaging.woodenCodes) &&
    areCodeListsEqual(packaging.unpackingCodes, currentPackaging.unpackingCodes)
  ) {
    return draft
  }

  return {
    ...draft,
    packaging,
    selectedProduct: null,
    quoteStaleReason: '包装服务变化，请重新获取价格'
  }
}
