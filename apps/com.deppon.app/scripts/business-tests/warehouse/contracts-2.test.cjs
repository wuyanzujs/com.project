require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { CACHE_KEYS } = require('@/cache/keys')
const { getStorageValue, setStorageValue } = require('@/cache/storage')
const { expressApi } = require('@/services/express/core/express.api')
const { expressDraftBridge } = require('@/services/express/draft/draftBridge')
const { createExpressWarehouseScreening } = require('@/services/express/warehouse/warehouse.rules')
const { queryExpressWarehouseScreening, stageExpressWarehouse } = require('@/services/express/warehouse/warehouse.service')
const { templateDraftBridge } = require('@/services/template/template.bridge')
const { getAppWebWarehouseStagingId } = require('@/shared/webview/appWeb')
const { appWebMessageBridge } = require('@/shared/webview/appWebMessage')

const { createValidExpressDraft } = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'warehouse draft and template bridges deep clone files and screening proof',
    run() {
      const base = createValidExpressDraft()
      const screening = createExpressWarehouseScreening(base, {
        type: 1,
        reason: '可能产生进仓费用',
        depotType: '2'
      })
      const source = {
        ...base,
        warehouse: {
          ...base.warehouse,
          enabled: true,
          warehouseNo: 'ENTRY-001',
          fileList: [
            {
              previewPath: 'https://owstest.deppon.com/files/warehouse-original.jpg'
            }
          ],
          screening
        }
      }

      expressDraftBridge.carryFromCoupon(source)
      source.warehouse.fileList[0].previewPath = 'https://owstest.deppon.com/files/warehouse-mutated.jpg'
      source.warehouse.screening.reason = '已修改'

      const carried = expressDraftBridge.consume().draft

      assert.equal(carried.warehouse.fileList[0].previewPath, 'https://owstest.deppon.com/files/warehouse-original.jpg')
      assert.equal(carried.warehouse.screening.reason, '可能产生进仓费用')
      assert.notEqual(carried.warehouse.fileList, source.warehouse.fileList)
      assert.notEqual(carried.warehouse.fileList[0], source.warehouse.fileList[0])
      assert.notEqual(carried.warehouse.screening, source.warehouse.screening)

      templateDraftBridge.stage(carried)
      carried.warehouse.fileList[0].previewPath = 'https://owstest.deppon.com/files/template-mutated.jpg'
      carried.warehouse.screening.reason = '模板已修改'

      const staged = templateDraftBridge.consume()

      assert.equal(staged.warehouse.fileList[0].previewPath, 'https://owstest.deppon.com/files/warehouse-original.jpg')
      assert.equal(staged.warehouse.screening.reason, '可能产生进仓费用')
      assert.notEqual(staged.warehouse.fileList, carried.warehouse.fileList)
      assert.notEqual(staged.warehouse.screening, carried.warehouse.screening)
      assert.equal(templateDraftBridge.consume(), null)
    }
  },
  {
    name: 'warehouse web messages enforce source event flags fields and one time consumption',
    run() {
      const payload = {
        fileList: [{ previewPath: 'https://owstest.deppon.com/files/warehouse.jpg' }],
        warehouseNo: ' ENTRY-001 ',
        warehouseTime: ' 2026-07-20 10:00:00 ',
        warehouseType: '3',
        deliverWarehouseWay: 'AGXSF',
        warehouseProcess: ' 排队,卸货 ',
        warehouseCode: ' WH-CODE-001 ',
        warehouseRemark: ' 工作日进仓 '
      }
      const createMessage = (event, args) => JSON.stringify({ event, args })
      const enabledMessage = createMessage('SEND_WAREHOUSE', {
        isWarehousingService: 'Y',
        payload: JSON.stringify(payload)
      })
      const enabledContext = {
        inputKey: 'warehouse-input-enabled',
        stagingId: 'WAREHOUSE-STAGE-ENABLED'
      }

      assert.equal(
        getAppWebWarehouseStagingId('https://owstest.deppon.com/depponmobile/mow/send/warehouse/index?warehouseId=WAREHOUSE-STAGE-ENABLED'),
        enabledContext.stagingId
      )

      appWebMessageBridge.clear()

      assert.equal(
        appWebMessageBridge.stage(
          'CUSTOMER_CENTER',
          createMessage('SEND_WAREHOUSE', {
            isWarehousingService: 'Y',
            payload: JSON.stringify(payload)
          })
        ).handled,
        false
      )
      assert.deepEqual(appWebMessageBridge.stage('EXPRESS_WAREHOUSE', enabledMessage), { handled: false, closeAfterReceive: false })
      assert.equal(appWebMessageBridge.consumeWarehouse(), null)
      assert.equal(appWebMessageBridge.expectWarehouse(enabledContext), true)
      assert.equal(
        appWebMessageBridge.stage('EXPRESS_WAREHOUSE', enabledMessage, {
          stagingId: 'WAREHOUSE-STAGE-OTHER'
        }).handled,
        false
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage('WAREHOUSE_CHANGE', {
            isWarehousingService: 'Y',
            payload: JSON.stringify(payload)
          }),
          enabledContext
        ).handled,
        false
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage('SEND_WAREHOUSE', {
            isWarehousingService: 'Y',
            payload: JSON.stringify(payload),
            unknown: true
          }),
          enabledContext
        ).handled,
        false
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage('SEND_WAREHOUSE', {
            isWarehousingService: 'Y',
            payload: JSON.stringify({ ...payload, unknown: true })
          }),
          enabledContext
        ).handled,
        false
      )
      assert.deepEqual(appWebMessageBridge.stage('EXPRESS_WAREHOUSE', enabledMessage, enabledContext), { handled: true, closeAfterReceive: true })
      assert.deepEqual(appWebMessageBridge.consumeWarehouse(), {
        context: enabledContext,
        warehouse: {
          enabled: true,
          fileList: [{ previewPath: 'https://owstest.deppon.com/files/warehouse.jpg' }],
          warehouseNo: 'ENTRY-001',
          warehouseTime: '2026-07-20 10:00:00',
          warehouseType: '3',
          deliverWarehouseWay: 'AGXSF',
          warehouseProcess: '排队,卸货',
          warehouseCode: 'WH-CODE-001',
          warehouseRemark: '工作日进仓'
        }
      })
      assert.equal(appWebMessageBridge.consumeWarehouse(), null)

      const disabledContext = {
        inputKey: 'warehouse-input-disabled',
        stagingId: 'WAREHOUSE-STAGE-DISABLED'
      }

      assert.equal(appWebMessageBridge.expectWarehouse(disabledContext), true)
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage('SEND_WAREHOUSE', {
            isWarehousingService: 'MAYBE',
            payload: JSON.stringify(payload)
          }),
          disabledContext
        ).handled,
        false
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage('SEND_WAREHOUSE', {
            isWarehousingService: 'N'
          }),
          disabledContext
        ).handled,
        true
      )
      assert.deepEqual(appWebMessageBridge.consumeWarehouse(), {
        context: disabledContext,
        warehouse: {
          enabled: false,
          fileList: [],
          warehouseNo: '',
          warehouseTime: '',
          warehouseType: '',
          deliverWarehouseWay: '',
          warehouseProcess: '',
          warehouseCode: '',
          warehouseRemark: ''
        }
      })
      assert.equal(appWebMessageBridge.consumeWarehouse(), null)
    }
  },
  {
    name: 'warehouse web messages accept nine safe files and reject unsafe or excessive urls',
    run() {
      const createMessage = fileList =>
        JSON.stringify({
          event: 'SEND_WAREHOUSE',
          args: {
            isWarehousingService: 'Y',
            payload: JSON.stringify({
              fileList,
              warehouseNo: '',
              warehouseTime: '',
              warehouseType: '',
              deliverWarehouseWay: '',
              warehouseProcess: '',
              warehouseCode: '',
              warehouseRemark: ''
            })
          }
        })
      const safeFiles = Array.from({ length: 9 }, (_, index) => ({
        previewPath: `https://owstest.deppon.com/files/${index + 1}.jpg`
      }))
      let expectationIndex = 0
      const expectWarehouse = () => {
        expectationIndex += 1
        const context = {
          inputKey: `warehouse-files-input-${expectationIndex}`,
          stagingId: `WAREHOUSE-FILES-STAGE-${expectationIndex}`
        }

        assert.equal(appWebMessageBridge.expectWarehouse(context), true)
        return context
      }

      appWebMessageBridge.clear()
      const safeContext = expectWarehouse()
      assert.equal(appWebMessageBridge.stage('EXPRESS_WAREHOUSE', createMessage(safeFiles), safeContext).handled, true)
      const safeResult = appWebMessageBridge.consumeWarehouse()

      assert.deepEqual(safeResult.context, safeContext)
      assert.equal(safeResult.warehouse.fileList.length, 9)
      const excessiveContext = expectWarehouse()
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage([...safeFiles, { previewPath: 'https://owstest.deppon.com/files/10.jpg' }]),
          excessiveContext
        ).handled,
        false
      )
      const unsafeProtocolContext = expectWarehouse()
      assert.equal(
        appWebMessageBridge.stage('EXPRESS_WAREHOUSE', createMessage([{ previewPath: 'http://example.com/unsafe.jpg' }]), unsafeProtocolContext).handled,
        false
      )
      const credentialContext = expectWarehouse()
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage([
            {
              previewPath: 'https://user:password@example.com/private.jpg'
            }
          ]),
          credentialContext
        ).handled,
        false
      )
      const unknownFieldContext = expectWarehouse()
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage([
            {
              previewPath: 'https://owstest.deppon.com/files/extra.jpg',
              unknown: true
            }
          ]),
          unknownFieldContext
        ).handled,
        false
      )
      assert.equal(appWebMessageBridge.consumeWarehouse(), null)
      appWebMessageBridge.cancelWarehouse()
    }
  },
  {
    name: 'warehouse screening fails closed for missing or invalid result types',
    async run() {
      const originalFilterOrder = expressApi.filterOrder
      const draft = createValidExpressDraft()

      try {
        for (const result of [null, {}, { type: null }, { type: 5 }, { type: '03' }]) {
          expressApi.filterOrder = async () => ({ status: true, result })

          const response = await queryExpressWarehouseScreening(draft)

          assert.equal(response.status, false)
          assert.equal(response.message, '送货进仓筛单结果无效，请重试')
        }

        expressApi.filterOrder = async () => ({
          status: true,
          result: { type: '0', reason: '未命中进仓规则' }
        })

        const valid = await queryExpressWarehouseScreening(draft)

        assert.equal(valid.status, true)
        assert.equal(valid.result.type, 0)
      } finally {
        expressApi.filterOrder = originalFilterOrder
      }
    }
  },
  {
    name: 'warehouse query and staging reject stale transport mode without selected product',
    async run() {
      const originalCookie = getStorageValue(CACHE_KEYS.cookie)
      const base = createValidExpressDraft()
      const draft = {
        ...base,
        service: { ...base.service, transportMode: 'PACKAGE' },
        selectedProduct: null
      }

      await setStorageValue(CACHE_KEYS.cookie, 'ECO_TOKEN=warehouse-stale-product-token;')

      try {
        const queryResponse = await queryExpressWarehouseScreening(draft)
        const stageResponse = await stageExpressWarehouse(draft)

        assert.equal(queryResponse.status, false)
        assert.equal(queryResponse.message, '产品价格尚未就绪，请稍候')
        assert.equal(stageResponse.status, false)
        assert.equal(stageResponse.message, '产品价格尚未就绪，请稍候')
      } finally {
        await setStorageValue(CACHE_KEYS.cookie, originalCookie)
      }
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
