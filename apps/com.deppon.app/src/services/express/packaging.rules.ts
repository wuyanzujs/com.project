import {
  EXPRESS_CARTON_OPTIONS,
  EXPRESS_UNPACKING_OPTIONS,
  EXPRESS_WOODEN_PACKAGING_OPTIONS,
  getExpressCartonOption
} from './packaging.catalog'

import type {
  ExpressCartonCode,
  ExpressDraft,
  ExpressPackagingDraft,
  ExpressUnpackingCode,
  ExpressWoodenPackagingCode
} from './types'

const EXPRESS_CARTON_CODES = new Set(
  EXPRESS_CARTON_OPTIONS.map(option => option.code)
)
const EXPRESS_WOODEN_PACKAGING_CODES = new Set(
  EXPRESS_WOODEN_PACKAGING_OPTIONS.map(option => option.code)
)
const EXPRESS_UNPACKING_CODES = new Set(
  EXPRESS_UNPACKING_OPTIONS.map(option => option.code)
)

export function normalizeExpressCartonCode(value: unknown): ExpressCartonCode {
  const code = typeof value === 'string' ? value.trim() : ''

  return EXPRESS_CARTON_CODES.has(code as Exclude<ExpressCartonCode, ''>)
    ? (code as Exclude<ExpressCartonCode, ''>)
    : ''
}

export function normalizeExpressWoodenPackagingCodes(
  value: unknown
): ExpressWoodenPackagingCode[] {
  if (!Array.isArray(value)) {
    return []
  }

  const selectedCodes = new Set(
    value
      .map(code => (typeof code === 'string' ? code.trim() : ''))
      .filter(code =>
        EXPRESS_WOODEN_PACKAGING_CODES.has(
          code as ExpressWoodenPackagingCode
        )
      )
  )

  return EXPRESS_WOODEN_PACKAGING_OPTIONS.map(option => option.code).filter(
    code => selectedCodes.has(code)
  )
}

export function normalizeExpressUnpackingCodes(
  value: unknown
): ExpressUnpackingCode[] {
  if (!Array.isArray(value)) {
    return []
  }

  const selectedCodes = new Set(
    value
      .map(code => (typeof code === 'string' ? code.trim() : ''))
      .filter(code =>
        EXPRESS_UNPACKING_CODES.has(code as ExpressUnpackingCode)
      )
  )

  return EXPRESS_UNPACKING_OPTIONS.map(option => option.code).filter(code =>
    selectedCodes.has(code)
  )
}

export function createExpressPackagingDraft(): ExpressPackagingDraft {
  return { cartonCode: '', woodenCodes: [], unpackingCodes: [] }
}

export function normalizeExpressPackagingDraft(
  value?: Partial<ExpressPackagingDraft> | null
): ExpressPackagingDraft {
  return {
    cartonCode: normalizeExpressCartonCode(value?.cartonCode),
    woodenCodes: normalizeExpressWoodenPackagingCodes(value?.woodenCodes),
    unpackingCodes: normalizeExpressUnpackingCodes(value?.unpackingCodes)
  }
}

function areCodeListsEqual(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((code, index) => code === right[index])
  )
}

export function getExpressPackagingQuoteVolume(draft: ExpressDraft) {
  const goodsVolume = Number.isFinite(draft.goods.volume)
    ? Math.max(draft.goods.volume, 0)
    : 0
  const cartonVolume =
    getExpressCartonOption(draft.packaging.cartonCode)?.volume ?? 0

  return Math.max(goodsVolume, cartonVolume)
}

export function updateExpressPackaging(
  draft: ExpressDraft,
  patch: Partial<ExpressPackagingDraft>
): ExpressDraft {
  const currentPackaging = normalizeExpressPackagingDraft(draft.packaging)
  const packaging = normalizeExpressPackagingDraft({
    ...currentPackaging,
    ...patch
  })

  if (
    packaging.cartonCode === currentPackaging.cartonCode &&
    areCodeListsEqual(packaging.woodenCodes, currentPackaging.woodenCodes) &&
    areCodeListsEqual(
      packaging.unpackingCodes,
      currentPackaging.unpackingCodes
    )
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
