import type {
  ExpressCartonCode,
  ExpressPackageInfo,
  ExpressUnpackageLtlInfo,
  ExpressUnpackingCode,
  ExpressWoodenPackagingCode
} from './types'

export interface ExpressCartonOption {
  code: Exclude<ExpressCartonCode, ''>
  name: string
  dimensions: string
  suitableFor: string
  priceLabel: string
  volume: number
  imageUrl: string
  tag?: string
}

export interface ExpressWoodenPackagingOption {
  code: ExpressWoodenPackagingCode
  name: string
  suitableFor: string
  priceLabel: string
  minimumPriceLabel: string
  imageUrl: string
  orderType: ExpressPackageInfo['type']
  orderPackageCode: ExpressPackageInfo['packageCode']
  packingName: string
}

export interface ExpressUnpackingOption {
  code: ExpressUnpackingCode
  name: string
  description: string
  priceLabel: string
  numberField: keyof ExpressUnpackageLtlInfo
}

export const EXPRESS_CARTON_OPTIONS: ExpressCartonOption[] = [
  {
    code: 'ZX_DP',
    name: '小盒纸箱',
    dimensions: '20 x 10 x 15cm',
    suitableFor: '手机、首饰等',
    priceLabel: '¥1/个',
    volume: 0.003,
    imageUrl: 'https://ca.deppon.com.cn/ows/assets/package/box.png'
  },
  {
    code: 'ZX_DP_01',
    name: '1号纸箱',
    dimensions: '25 x 18 x 20cm',
    suitableFor: '化妆品、日用品等',
    priceLabel: '¥2/个',
    volume: 0.009,
    imageUrl: 'https://ca.deppon.com.cn/ows/assets/package/carton1.png'
  },
  {
    code: 'ZX_DP_2S',
    name: '2S号纸箱',
    dimensions: '30 x 20 x 25cm',
    suitableFor: '酒水、图书等',
    priceLabel: '¥2/个',
    volume: 0.015,
    imageUrl: 'https://ca.deppon.com.cn/ows/assets/package/carton2s.png'
  },
  {
    code: 'ZX_DP_02',
    name: '2号纸箱',
    dimensions: '30 x 20 x 25cm',
    suitableFor: '玩具、小型工艺品等',
    priceLabel: '¥4/个',
    volume: 0.015,
    imageUrl: 'https://ca.deppon.com.cn/ows/assets/package/carton2.png',
    tag: '抗压'
  },
  {
    code: 'ZX_DP_03',
    name: '3号纸箱',
    dimensions: '35 x 25 x 30cm',
    suitableFor: '鞋帽、洗护用品等',
    priceLabel: '¥5/个',
    volume: 0.026,
    imageUrl: 'https://ca.deppon.com.cn/ows/assets/package/carton3.png',
    tag: '抗压'
  },
  {
    code: 'ZX_DP_04',
    name: '4号纸箱',
    dimensions: '40 x 30 x 30cm',
    suitableFor: '小家电、空气炸锅',
    priceLabel: '¥6/个',
    volume: 0.036,
    imageUrl: 'https://ca.deppon.com.cn/ows/assets/package/carton4.png',
    tag: '抗压'
  },
  {
    code: 'ZX_DP_05',
    name: '5号纸箱',
    dimensions: '50 x 30 x 25cm',
    suitableFor: '微波炉、电饭锅等',
    priceLabel: '¥7/个',
    volume: 0.038,
    imageUrl: 'https://ca.deppon.com.cn/ows/assets/package/carton5.png',
    tag: '抗压'
  },
  {
    code: 'ZX_DP_06',
    name: '6号纸箱',
    dimensions: '50 x 30 x 55cm',
    suitableFor: '礼品、特产等',
    priceLabel: '¥10/个',
    volume: 0.083,
    imageUrl: 'https://ca.deppon.com.cn/ows/assets/package/carton6.png',
    tag: '抗压'
  },
  {
    code: 'ZX_DP_07',
    name: '7号纸箱',
    dimensions: '60 x 40 x 50cm',
    suitableFor: '行李、搬家等',
    priceLabel: '¥15/个',
    volume: 0.12,
    imageUrl: 'https://ca.deppon.com.cn/ows/assets/package/carton7.png',
    tag: '抗压'
  }
]

export const EXPRESS_WOODEN_PACKAGING_OPTIONS:
  ExpressWoodenPackagingOption[] = [
    {
      code: 'WOOD_03',
      name: '木架',
      suitableFor: '汽车配件等',
      priceLabel: '¥200/方',
      minimumPriceLabel: '最低40元/票',
      imageUrl: 'https://ca.deppon.com.cn/ows/assets/goods/27.png',
      orderType: 'VOLUME',
      orderPackageCode: 'SJ',
      packingName: '木架'
    },
    {
      code: 'WOOD_04',
      name: '木箱',
      suitableFor: '显示器等',
      priceLabel: '¥300/方',
      minimumPriceLabel: '最低60元/票',
      imageUrl: 'https://ca.deppon.com.cn/ows/assets/goods/28.png',
      orderType: 'VOLUME',
      orderPackageCode: 'BG',
      packingName: '木箱'
    },
    {
      code: 'WOOD_01',
      name: '木托1号',
      suitableFor: '不超过120cm x 100cm',
      priceLabel: '¥60/个',
      minimumPriceLabel: '',
      imageUrl: 'https://ca.deppon.com.cn/ows/assets/package/pallet1.png',
      orderType: 'COUNT',
      orderPackageCode: 'SP',
      packingName: '木托'
    },
    {
      code: 'WOOD_02',
      name: '木托2号',
      suitableFor: '超过120cm x 100cm',
      priceLabel: '¥120/个',
      minimumPriceLabel: '',
      imageUrl: 'https://ca.deppon.com.cn/ows/assets/package/pallet2.png',
      orderType: 'COUNT',
      orderPackageCode: 'NSP',
      packingName: '木托'
    }
  ]

export const EXPRESS_UNPACKING_OPTIONS: ExpressUnpackingOption[] = [
  {
    code: 'UNPACKING_01',
    name: '拆木包装',
    description: '拆除货物木包装、协助摆位、处理包装垃圾',
    priceLabel: '¥20',
    numberField: 'unpackingWoodPackagingNumber'
  },
  {
    code: 'UNPACKING_02',
    name: '拆非木包装',
    description: '拆除货物非木包装、协助摆位、处理包装垃圾',
    priceLabel: '¥10',
    numberField: 'unpackingNonWoodPackagingNumber'
  }
]

export function getExpressCartonOption(value: ExpressCartonCode) {
  return EXPRESS_CARTON_OPTIONS.find(option => option.code === value) ?? null
}

export function getExpressWoodenPackagingOption(
  value: ExpressWoodenPackagingCode
) {
  return (
    EXPRESS_WOODEN_PACKAGING_OPTIONS.find(option => option.code === value) ??
    null
  )
}

export function getExpressUnpackingOption(value: ExpressUnpackingCode) {
  return EXPRESS_UNPACKING_OPTIONS.find(option => option.code === value) ?? null
}
