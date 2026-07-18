import {
  EXPRESS_UNPACKING_OPTIONS,
  EXPRESS_WOODEN_PACKAGING_OPTIONS
} from './packaging.catalog'
import { normalizeExpressPackagingDraft } from './packaging.rules'

import type {
  ExpressPackageInfo,
  ExpressPackageLtlType,
  ExpressPackagingDraft,
  ExpressUnpackageLtlInfo
} from './types'

export function createExpressQuotePackageInfoList(
  value: ExpressPackagingDraft
): ExpressPackageInfo[] | undefined {
  const packaging = normalizeExpressPackagingDraft(value)

  if (!packaging.cartonCode) {
    return undefined
  }

  return [
    {
      type: 'COUNT',
      data: '1',
      packageCode: packaging.cartonCode
    }
  ]
}

export function createExpressOrderPackageInfoList(
  value: ExpressPackagingDraft
): ExpressPackageInfo[] | undefined {
  const packaging = normalizeExpressPackagingDraft(value)
  const packageInfoList: ExpressPackageInfo[] = []

  if (packaging.cartonCode) {
    packageInfoList.push({
      type: 'COUNT',
      data: '1',
      packageCode: packaging.cartonCode
    })
  }

  const woodenCodes = new Set(packaging.woodenCodes)

  for (const option of EXPRESS_WOODEN_PACKAGING_OPTIONS) {
    if (!woodenCodes.has(option.code)) {
      continue
    }

    packageInfoList.push({
      type: option.orderType,
      data: '1',
      packageCode: option.orderPackageCode
    })
  }

  return packageInfoList.length > 0 ? packageInfoList : undefined
}

export function getExpressPackageLtlType(
  value: ExpressPackagingDraft
): ExpressPackageLtlType {
  const packaging = normalizeExpressPackagingDraft(value)
  const hasWoodenPackaging = packaging.woodenCodes.length > 0
  const hasUnpacking = packaging.unpackingCodes.length > 0

  if (hasWoodenPackaging && hasUnpacking) {
    return 'WOOD_PACKAGE,UN_PACKAGE'
  }

  if (hasUnpacking) {
    return 'UN_PACKAGE'
  }

  return hasWoodenPackaging ? 'WOOD_PACKAGE' : ''
}

export function createExpressUnpackingNumbers(
  value: ExpressPackagingDraft
): ExpressUnpackageLtlInfo {
  const packaging = normalizeExpressPackagingDraft(value)
  const selectedCodes = new Set(packaging.unpackingCodes)
  const result: ExpressUnpackageLtlInfo = {
    unpackingNonWoodPackagingNumber: 0,
    unpackingWoodPackagingNumber: 0
  }

  for (const option of EXPRESS_UNPACKING_OPTIONS) {
    if (selectedCodes.has(option.code)) {
      result[option.numberField] = 1
    }
  }

  return result
}

export function createExpressOrderUnpackageLtlInfo(
  value: ExpressPackagingDraft
) {
  return createExpressUnpackingNumbers(value)
}

export function createExpressOrderPackingText(value: ExpressPackagingDraft) {
  const packaging = normalizeExpressPackagingDraft(value)
  const woodenCodes = new Set(packaging.woodenCodes)
  const packingNames = new Set<string>()

  for (const option of EXPRESS_WOODEN_PACKAGING_OPTIONS) {
    if (woodenCodes.has(option.code)) {
      packingNames.add(option.packingName)
    }
  }

  return [...packingNames].join(',')
}
