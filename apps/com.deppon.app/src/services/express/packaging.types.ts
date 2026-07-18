export type ExpressCartonCode =
  | ''
  | 'ZX_DP'
  | 'ZX_DP_01'
  | 'ZX_DP_2S'
  | 'ZX_DP_02'
  | 'ZX_DP_03'
  | 'ZX_DP_04'
  | 'ZX_DP_05'
  | 'ZX_DP_06'
  | 'ZX_DP_07'

export type ExpressWoodenPackagingCode =
  | 'WOOD_03'
  | 'WOOD_04'
  | 'WOOD_01'
  | 'WOOD_02'

export type ExpressUnpackingCode = 'UNPACKING_01' | 'UNPACKING_02'
export type ExpressPackageLtlType =
  | ''
  | 'WOOD_PACKAGE'
  | 'UN_PACKAGE'
  | 'WOOD_PACKAGE,UN_PACKAGE'
export type ExpressOrderPackageCode =
  | Exclude<ExpressCartonCode, ''>
  | 'SJ'
  | 'BG'
  | 'SP'
  | 'NSP'

export interface ExpressPackagingDraft {
  cartonCode: ExpressCartonCode
  woodenCodes: ExpressWoodenPackagingCode[]
  unpackingCodes: ExpressUnpackingCode[]
}

export interface ExpressPackageInfo {
  type: 'COUNT' | 'VOLUME'
  data: '1'
  packageCode: ExpressOrderPackageCode
}

export interface ExpressUnpackageLtlInfo {
  unpackingNonWoodPackagingNumber: number
  unpackingWoodPackagingNumber: number
}
