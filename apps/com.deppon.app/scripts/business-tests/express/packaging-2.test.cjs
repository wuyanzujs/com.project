require('../support/register.cjs')
const { test } = require('node:test')
const { updateExpressPackaging } = require('@/services/express/packaging.rules')
const assert = require('node:assert/strict')
const { CACHE_KEYS, createCacheStorageKey } = require('@/cache/keys')
const {
  getStorageValue,
  removeStorageValue,
  setStorageValue
} = require('@/cache/storage')
const { expressDraftStorage } = require('@/services/express/draftStorage')
const { expressDraftBridge } = require('@/services/express/draftBridge')
const { templateDraftBridge } = require('@/services/template/template.bridge')
const { createExpressDraft } = require('@/services/express/express.draft')
const {
  createValidExpressDraft,
  expressProduct
} = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'express packaging changes invalidate the selected quote',
    run() {
      const source = createValidExpressDraft()
      const updated = updateExpressPackaging(source, {
        cartonCode: 'ZX_DP_03',
        woodenCodes: ['WOOD_04', 'WOOD_01'],
        unpackingCodes: ['UNPACKING_02']
      })

      assert.deepEqual(updated.packaging, {
        cartonCode: 'ZX_DP_03',
        woodenCodes: ['WOOD_04', 'WOOD_01'],
        unpackingCodes: ['UNPACKING_02']
      })
      assert.equal(updated.selectedProduct, null)
      assert.equal(updated.quoteStaleReason, '包装服务变化，请重新获取价格')
      assert.equal(source.packaging.cartonCode, '')
      assert.deepEqual(source.packaging.woodenCodes, [])
      assert.deepEqual(source.packaging.unpackingCodes, [])
      assert.deepEqual(source.selectedProduct, expressProduct)
      assert.equal(
        updateExpressPackaging(updated, {
          woodenCodes: ['WOOD_01', 'WOOD_04', 'WOOD_01'],
          unpackingCodes: ['UNPACKING_02', 'UNPACKING_02']
        }),
        updated
      )
    }
  },
  {
    name: 'express packaging is isolated across storage and draft bridges',
    async run() {
      const storageKey = createCacheStorageKey(CACHE_KEYS.expressDraft)
      const originalStorageValue = getStorageValue(storageKey)
      const source = {
        ...createValidExpressDraft(),
        packaging: {
          cartonCode: 'ZX_DP_05',
          woodenCodes: ['WOOD_03', 'WOOD_01'],
          unpackingCodes: ['UNPACKING_01']
        }
      }

      try {
        await expressDraftStorage.save(source)
        source.packaging.cartonCode = 'ZX_DP_06'
        source.packaging.woodenCodes.push('WOOD_02')
        source.packaging.unpackingCodes.push('UNPACKING_02')

        const restored = expressDraftStorage.restore()

        assert.ok(restored)
        assert.deepEqual(restored.packaging, {
          cartonCode: 'ZX_DP_05',
          woodenCodes: ['WOOD_03', 'WOOD_01'],
          unpackingCodes: ['UNPACKING_01']
        })
        assert.notEqual(restored.packaging, source.packaging)
        assert.notEqual(
          restored.packaging.woodenCodes,
          source.packaging.woodenCodes
        )
        assert.notEqual(
          restored.packaging.unpackingCodes,
          source.packaging.unpackingCodes
        )

        expressDraftBridge.carryFromCoupon(restored)
        restored.packaging.cartonCode = 'ZX_DP_07'
        restored.packaging.woodenCodes.push('WOOD_04')
        restored.packaging.unpackingCodes.push('UNPACKING_02')

        const carried = expressDraftBridge.consume().draft

        assert.deepEqual(carried.packaging, {
          cartonCode: 'ZX_DP_05',
          woodenCodes: ['WOOD_03', 'WOOD_01'],
          unpackingCodes: ['UNPACKING_01']
        })
        assert.notEqual(carried.packaging, restored.packaging)
        assert.notEqual(
          carried.packaging.woodenCodes,
          restored.packaging.woodenCodes
        )
        assert.notEqual(
          carried.packaging.unpackingCodes,
          restored.packaging.unpackingCodes
        )

        templateDraftBridge.stage(carried)
        carried.packaging.cartonCode = 'ZX_DP'
        carried.packaging.woodenCodes.push('WOOD_02')
        carried.packaging.unpackingCodes.push('UNPACKING_02')

        const staged = templateDraftBridge.consume()

        assert.deepEqual(staged.packaging, {
          cartonCode: 'ZX_DP_05',
          woodenCodes: ['WOOD_03', 'WOOD_01'],
          unpackingCodes: ['UNPACKING_01']
        })
        assert.notEqual(staged.packaging, carried.packaging)
        assert.notEqual(
          staged.packaging.woodenCodes,
          carried.packaging.woodenCodes
        )
        assert.notEqual(
          staged.packaging.unpackingCodes,
          carried.packaging.unpackingCodes
        )

        const woodOnlyDraft = createExpressDraft()

        woodOnlyDraft.packaging.woodenCodes = ['WOOD_04']
        await expressDraftStorage.save(woodOnlyDraft)

        assert.deepEqual(expressDraftStorage.restore()?.packaging, {
          cartonCode: '',
          woodenCodes: ['WOOD_04'],
          unpackingCodes: []
        })

        const unpackingOnlyDraft = createExpressDraft()

        unpackingOnlyDraft.packaging.unpackingCodes = ['UNPACKING_02']
        await expressDraftStorage.save(unpackingOnlyDraft)

        assert.deepEqual(expressDraftStorage.restore()?.packaging, {
          cartonCode: '',
          woodenCodes: [],
          unpackingCodes: ['UNPACKING_02']
        })
      } finally {
        if (originalStorageValue) {
          await setStorageValue(storageKey, originalStorageValue)
        } else {
          await removeStorageValue(storageKey)
        }
      }
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
