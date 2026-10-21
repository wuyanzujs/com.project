require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { buildCreateOrderRequest, buildFreightRequest } = require('@/services/express/core/express.payload')
const { createExpressProductQuoteView } = require('@/services/express/core/express.quoteView')
const { EXPRESS_CARTON_OPTIONS, EXPRESS_UNPACKING_OPTIONS, EXPRESS_WOODEN_PACKAGING_OPTIONS } = require('@/services/express/packaging/packaging.catalog')
const {
  createExpressOrderPackageInfoList,
  createExpressOrderPackingText,
  createExpressOrderUnpackageLtlInfo,
  createExpressQuotePackageInfoList,
  createExpressUnpackingNumbers,
  getExpressPackageLtlType
} = require('@/services/express/packaging/packaging.payload')
const {
  getExpressPackagingQuoteVolume,
  normalizeExpressCartonCode,
  normalizeExpressPackagingDraft,
  normalizeExpressUnpackingCodes,
  normalizeExpressWoodenPackagingCodes
} = require('@/services/express/packaging/packaging.rules')

const { createValidExpressDraft, expressProduct } = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'express carton catalog keeps exact backend codes and quote volumes',
    run() {
      assert.deepEqual(
        EXPRESS_CARTON_OPTIONS.map(({ code, volume }) => ({ code, volume })),
        [
          { code: 'ZX_DP', volume: 0.003 },
          { code: 'ZX_DP_01', volume: 0.009 },
          { code: 'ZX_DP_2S', volume: 0.015 },
          { code: 'ZX_DP_02', volume: 0.015 },
          { code: 'ZX_DP_03', volume: 0.026 },
          { code: 'ZX_DP_04', volume: 0.036 },
          { code: 'ZX_DP_05', volume: 0.038 },
          { code: 'ZX_DP_06', volume: 0.083 },
          { code: 'ZX_DP_07', volume: 0.12 }
        ]
      )
      assert.equal(new Set(EXPRESS_CARTON_OPTIONS.map(option => option.code)).size, 9)
      assert.equal(normalizeExpressCartonCode(' ZX_DP_2S '), 'ZX_DP_2S')

      for (const value of ['ZX_DP_08', 'ZX_DP_2', 'zx_dp', 1, null, undefined, {}]) {
        assert.equal(normalizeExpressCartonCode(value), '')
      }
    }
  },
  {
    name: 'express wooden packaging catalog keeps exact order mappings',
    run() {
      assert.deepEqual(
        EXPRESS_WOODEN_PACKAGING_OPTIONS.map(({ code, orderType, orderPackageCode, packingName }) => ({
          code,
          orderType,
          orderPackageCode,
          packingName
        })),
        [
          {
            code: 'WOOD_03',
            orderType: 'VOLUME',
            orderPackageCode: 'SJ',
            packingName: '木架'
          },
          {
            code: 'WOOD_04',
            orderType: 'VOLUME',
            orderPackageCode: 'BG',
            packingName: '木箱'
          },
          {
            code: 'WOOD_01',
            orderType: 'COUNT',
            orderPackageCode: 'SP',
            packingName: '木托'
          },
          {
            code: 'WOOD_02',
            orderType: 'COUNT',
            orderPackageCode: 'NSP',
            packingName: '木托'
          }
        ]
      )
      assert.deepEqual(normalizeExpressWoodenPackagingCodes([' WOOD_02 ', 'WOOD_03', 'WOOD_02', 'WOOD_UNKNOWN', null]), ['WOOD_03', 'WOOD_02'])
      assert.deepEqual(
        normalizeExpressPackagingDraft({
          cartonCode: 'ZX_UNKNOWN',
          woodenCodes: ['WOOD_04', 'WOOD_04', 'WOOD_UNKNOWN']
        }),
        {
          cartonCode: '',
          woodenCodes: ['WOOD_04'],
          unpackingCodes: []
        }
      )
    }
  },
  {
    name: 'express unpacking catalog keeps exact quantity mappings',
    run() {
      assert.deepEqual(
        EXPRESS_UNPACKING_OPTIONS.map(({ code, name, priceLabel, numberField }) => ({
          code,
          name,
          priceLabel,
          numberField
        })),
        [
          {
            code: 'UNPACKING_01',
            name: '拆木包装',
            priceLabel: '¥20',
            numberField: 'unpackingWoodPackagingNumber'
          },
          {
            code: 'UNPACKING_02',
            name: '拆非木包装',
            priceLabel: '¥10',
            numberField: 'unpackingNonWoodPackagingNumber'
          }
        ]
      )
      assert.deepEqual(normalizeExpressUnpackingCodes([' UNPACKING_02 ', 'UNPACKING_01', 'UNPACKING_02', 'UNPACKING_UNKNOWN', null]), [
        'UNPACKING_01',
        'UNPACKING_02'
      ])
    }
  },
  {
    name: 'express carton packaging floors quote volume without changing goods volume',
    run() {
      const source = {
        ...createValidExpressDraft(),
        goods: {
          ...createValidExpressDraft().goods,
          volume: 0.01
        },
        packaging: {
          cartonCode: 'ZX_DP_04',
          woodenCodes: [],
          unpackingCodes: []
        }
      }
      const goodsBeforeQuote = { ...source.goods }

      assert.equal(getExpressPackagingQuoteVolume(source), 0.036)
      assert.deepEqual(source.goods, goodsBeforeQuote)
      assert.equal(source.packaging.cartonCode, 'ZX_DP_04')
      assert.equal(
        getExpressPackagingQuoteVolume({
          ...source,
          goods: { ...source.goods, volume: 0.08 }
        }),
        0.08
      )
    }
  },
  {
    name: 'express carton packaging maps exact quote and order payloads',
    run() {
      const draft = {
        ...createValidExpressDraft(),
        goods: {
          ...createValidExpressDraft().goods,
          volume: 0.01
        },
        packaging: {
          cartonCode: 'ZX_DP_04',
          woodenCodes: [],
          unpackingCodes: []
        }
      }
      const expectedPackageInfoList = [
        {
          type: 'COUNT',
          data: '1',
          packageCode: 'ZX_DP_04'
        }
      ]
      const freightRequest = buildFreightRequest(draft)
      const orderRequest = buildCreateOrderRequest(draft)

      assert.deepEqual(createExpressQuotePackageInfoList(draft.packaging), expectedPackageInfoList)
      assert.deepEqual(createExpressOrderPackageInfoList(draft.packaging), expectedPackageInfoList)
      assert.equal(getExpressPackageLtlType(draft.packaging), '')
      assert.equal(createExpressOrderPackingText(draft.packaging), '')
      assert.equal(freightRequest.totalVolume, 0.036)
      assert.equal(freightRequest.packageLtlType, '')
      assert.equal(freightRequest.unpackingWoodPackagingNumber, 0)
      assert.equal(freightRequest.unpackingNonWoodPackagingNumber, 0)
      assert.deepEqual(freightRequest.packageInfoList, expectedPackageInfoList)
      assert.deepEqual(orderRequest.packageInfoList, expectedPackageInfoList)
      assert.deepEqual(orderRequest.unpackageLtlInfo, {
        unpackingNonWoodPackagingNumber: 0,
        unpackingWoodPackagingNumber: 0
      })
      assert.equal(orderRequest.receive[0].totalVolume, 0.01)
      assert.equal(orderRequest.receive[0].packing, '')
      assert.equal(draft.goods.volume, 0.01)

      const unpackagedDraft = {
        ...draft,
        packaging: {
          cartonCode: '',
          woodenCodes: [],
          unpackingCodes: []
        }
      }
      const unpackagedFreightRequest = buildFreightRequest(unpackagedDraft)
      const unpackagedOrderRequest = buildCreateOrderRequest(unpackagedDraft)

      assert.equal(Object.prototype.hasOwnProperty.call(unpackagedFreightRequest, 'packageInfoList'), false)
      assert.equal(Object.prototype.hasOwnProperty.call(unpackagedOrderRequest, 'packageInfoList'), false)
      assert.equal(createExpressQuotePackageInfoList(unpackagedDraft.packaging), undefined)
      assert.equal(createExpressOrderPackageInfoList(unpackagedDraft.packaging), undefined)
      assert.equal(unpackagedFreightRequest.packageLtlType, '')
      assert.deepEqual(createExpressUnpackingNumbers(draft.packaging), {
        unpackingNonWoodPackagingNumber: 0,
        unpackingWoodPackagingNumber: 0
      })
      assert.equal(unpackagedOrderRequest.receive[0].packing, '')
    }
  },
  {
    name: 'express wooden packaging separates quote and order contracts',
    run() {
      const draft = {
        ...createValidExpressDraft(),
        goods: {
          ...createValidExpressDraft().goods,
          volume: 0.01
        },
        packaging: {
          cartonCode: 'ZX_DP_04',
          woodenCodes: ['WOOD_02', 'WOOD_03', 'WOOD_04', 'WOOD_01', 'WOOD_02'],
          unpackingCodes: []
        }
      }
      const quotePackageInfoList = [{ type: 'COUNT', data: '1', packageCode: 'ZX_DP_04' }]
      const orderPackageInfoList = [
        ...quotePackageInfoList,
        { type: 'VOLUME', data: '1', packageCode: 'SJ' },
        { type: 'VOLUME', data: '1', packageCode: 'BG' },
        { type: 'COUNT', data: '1', packageCode: 'SP' },
        { type: 'COUNT', data: '1', packageCode: 'NSP' }
      ]
      const freightRequest = buildFreightRequest(draft)
      const orderRequest = buildCreateOrderRequest(draft)

      assert.deepEqual(createExpressQuotePackageInfoList(draft.packaging), quotePackageInfoList)
      assert.deepEqual(createExpressOrderPackageInfoList(draft.packaging), orderPackageInfoList)
      assert.equal(getExpressPackageLtlType(draft.packaging), 'WOOD_PACKAGE')
      assert.equal(createExpressOrderPackingText(draft.packaging), '木架,木箱,木托')
      assert.equal(freightRequest.packageLtlType, 'WOOD_PACKAGE')
      assert.deepEqual(freightRequest.packageInfoList, quotePackageInfoList)
      assert.deepEqual(orderRequest.packageInfoList, orderPackageInfoList)
      assert.equal(orderRequest.receive[0].packing, '木架,木箱,木托')
      assert.equal(orderRequest.receive[0].totalVolume, 0.01)

      const woodOnlyDraft = {
        ...draft,
        packaging: {
          cartonCode: '',
          woodenCodes: ['WOOD_04'],
          unpackingCodes: []
        }
      }
      const woodOnlyFreightRequest = buildFreightRequest(woodOnlyDraft)
      const woodOnlyOrderRequest = buildCreateOrderRequest(woodOnlyDraft)

      assert.equal(Object.prototype.hasOwnProperty.call(woodOnlyFreightRequest, 'packageInfoList'), false)
      assert.equal(woodOnlyFreightRequest.packageLtlType, 'WOOD_PACKAGE')
      assert.deepEqual(woodOnlyOrderRequest.packageInfoList, [{ type: 'VOLUME', data: '1', packageCode: 'BG' }])
      assert.equal(woodOnlyOrderRequest.receive[0].packing, '木箱')
    }
  },
  {
    name: 'express unpacking separates quote and order quantity contracts',
    run() {
      const draft = {
        ...createValidExpressDraft(),
        packaging: {
          cartonCode: 'ZX_DP_03',
          woodenCodes: ['WOOD_04'],
          unpackingCodes: ['UNPACKING_02', 'UNPACKING_01']
        }
      }
      const freightRequest = buildFreightRequest(draft)
      const orderRequest = buildCreateOrderRequest(draft)
      const expectedNumbers = {
        unpackingNonWoodPackagingNumber: 1,
        unpackingWoodPackagingNumber: 1
      }
      const quoteView = createExpressProductQuoteView({
        ...expressProduct,
        detail: [
          {
            priceEntryCode: 'BZ',
            priceEntryName: '包装费',
            caculateFee: 3
          },
          {
            priceEntryCode: 'CBF',
            priceEntryName: '拆包服务费',
            caculateFee: 20
          }
        ]
      })

      assert.equal(getExpressPackageLtlType(draft.packaging), 'WOOD_PACKAGE,UN_PACKAGE')
      assert.deepEqual(createExpressUnpackingNumbers(draft.packaging), {
        ...expectedNumbers
      })
      assert.deepEqual(createExpressOrderUnpackageLtlInfo(draft.packaging), expectedNumbers)
      assert.equal(freightRequest.packageLtlType, 'WOOD_PACKAGE,UN_PACKAGE')
      assert.equal(freightRequest.unpackingWoodPackagingNumber, 1)
      assert.equal(freightRequest.unpackingNonWoodPackagingNumber, 1)
      assert.deepEqual(freightRequest.packageInfoList, [{ type: 'COUNT', data: '1', packageCode: 'ZX_DP_03' }])
      assert.deepEqual(orderRequest.unpackageLtlInfo, expectedNumbers)
      assert.deepEqual(orderRequest.packageInfoList, [
        { type: 'COUNT', data: '1', packageCode: 'ZX_DP_03' },
        { type: 'VOLUME', data: '1', packageCode: 'BG' }
      ])
      assert.equal(orderRequest.receive[0].packing, '木箱')
      assert.deepEqual(quoteView.feeRows, [
        { key: 'BZ', name: '包装服务-纸箱', amount: 3 },
        { key: 'CBF', name: '包装服务-拆包装', amount: 20 }
      ])

      const unpackOnly = {
        cartonCode: '',
        woodenCodes: [],
        unpackingCodes: ['UNPACKING_02']
      }

      assert.equal(getExpressPackageLtlType(unpackOnly), 'UN_PACKAGE')
      assert.deepEqual(createExpressUnpackingNumbers(unpackOnly), {
        unpackingNonWoodPackagingNumber: 1,
        unpackingWoodPackagingNumber: 0
      })
      assert.equal(createExpressQuotePackageInfoList(unpackOnly), undefined)
      assert.equal(createExpressOrderPackageInfoList(unpackOnly), undefined)
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
