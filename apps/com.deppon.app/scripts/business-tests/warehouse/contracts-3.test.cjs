require('../support/register.cjs')
const { test } = require('node:test')
const { expressApi } = require('@/services/express/express.api')
const { getStorageValue, setStorageValue } = require('@/cache/storage')
const { CACHE_KEYS } = require('@/cache/keys')
const {
  stageExpressWarehouse
} = require('@/services/express/warehouse.service')
const assert = require('node:assert/strict')
const { createValidExpressDraft } = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'warehouse staging posts context and builds controlled app uri',
    async run() {
      const originalStageWarehouse = expressApi.stageWarehouse
      const originalCookie = getStorageValue(CACHE_KEYS.cookie)
      let capturedRequest = null
      const base = createValidExpressDraft()
      const draft = {
        ...base,
        service: { ...base.service, transportMode: 'PACKAGE' },
        warehouse: {
          ...base.warehouse,
          enabled: true,
          warehouseNo: 'ENTRY-001',
          warehouseTime: '2026-07-20 10:00:00',
          fileList: [
            {
              previewPath: 'https://owstest.deppon.com/files/warehouse.jpg'
            }
          ],
          warehouseType: '3',
          deliverWarehouseWay: 'APSF',
          warehouseCode: 'WH-CODE-001',
          warehouseRemark: '工作日进仓'
        }
      }

      await setStorageValue(
        CACHE_KEYS.cookie,
        'ECO_TOKEN=warehouse-token+/=; Path=/'
      )
      expressApi.stageWarehouse = async request => {
        capturedRequest = request
        return {
          status: true,
          message: '',
          result: ' STAGE 001 '
        }
      }

      try {
        const response = await stageExpressWarehouse(draft)

        assert.equal(response.status, true)
        assert.equal(response.result.stagingId, 'STAGE 001')
        assert.equal(capturedRequest.code, 'PACKAGE')
        assert.equal(capturedRequest.warehouse.isWarehousingService, 'Y')
        assert.equal(capturedRequest.warehouse.payload.warehouseNo, 'ENTRY-001')
        assert.deepEqual(capturedRequest.warehouse.payload.fileList, [
          { previewPath: 'https://owstest.deppon.com/files/warehouse.jpg' }
        ])
        assert.equal(capturedRequest.params.isWarehousingService, 'Y')
        assert.equal(capturedRequest.params.deliverWarehouseWay, 'APSF')
        assert.equal(capturedRequest.params.warehouseCode, 'WH-CODE-001')
        assert.equal(capturedRequest.params.jcType, '3')

        const uri = new URL(response.result.uri, 'https://owstest.deppon.com')

        assert.equal(uri.pathname, '/depponmobile/mow/send/warehouse/index')
        assert.equal(uri.searchParams.get('warehouseId'), 'STAGE 001')
        assert.equal(uri.searchParams.get('ecoToken'), 'warehouse-token+/=')
        assert.equal(uri.searchParams.get('source'), 'APP')
      } finally {
        expressApi.stageWarehouse = originalStageWarehouse
        await setStorageValue(CACHE_KEYS.cookie, originalCookie)
      }
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
