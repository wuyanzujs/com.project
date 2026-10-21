require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { selectExpressProduct, setExpressContact, updateExpressGoods, updateExpressService } = require('@/services/express/core/express.draft')
const { buildCreateOrderRequest, buildFreightRequest } = require('@/services/express/core/express.payload')
const { acknowledgeExpressWarehouseScreening, rejectExpressWarehouse } = require('@/services/express/warehouse/warehouse.decisions')
const {
  applyExpressWarehouseScreening,
  clearExpressWarehouse,
  createExpressWarehouseInputKey,
  createExpressWarehouseScreening,
  isExpressWarehouseScreeningCurrent,
  normalizeExpressWarehouseScreeningType,
  updateExpressWarehouse,
  validateExpressWarehouse
} = require('@/services/express/warehouse/warehouse.rules')

const { createValidExpressDraft, expressProduct } = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'warehouse screening normalizes type zero through four and fingerprints every input',
    run() {
      const draft = {
        ...createValidExpressDraft(),
        service: {
          ...createValidExpressDraft().service,
          transportMode: 'PACKAGE'
        }
      }
      const inputKey = createExpressWarehouseInputKey(draft)
      const input = JSON.parse(inputKey)

      assert.deepEqual(
        [0, 1, 2, 3, 4, 5, -1, 1.5, '3', 'invalid'].map(value => normalizeExpressWarehouseScreeningType(value)),
        [0, 1, 2, 3, 4, 0, 0, 0, 3, 0]
      )
      assert.equal(input.goodsName, '文件')
      assert.equal(input.totalWeight, 1)
      assert.equal(input.transportMode, 'PACKAGE')
      assert.equal(input.deliveryMode, 'PICKNOTUPSTAIRS')

      for (let type = 0; type <= 4; type += 1) {
        const screening = createExpressWarehouseScreening(draft, {
          type,
          reason: ` 类型 ${type} `,
          depotType: '2'
        })

        assert.equal(screening.type, type)
        assert.equal(screening.inputKey, inputKey)
        assert.equal(screening.reason, `类型 ${type}`)
        assert.equal(screening.depotType, '2')
      }

      assert.notEqual(
        createExpressWarehouseInputKey({
          ...draft,
          consignee: {
            ...draft.consignee,
            address: '科技园科苑路201号'
          }
        }),
        inputKey
      )
      assert.notEqual(
        createExpressWarehouseInputKey({
          ...draft,
          goods: { ...draft.goods, name: '家具' }
        }),
        inputKey
      )
      assert.notEqual(
        createExpressWarehouseInputKey({
          ...draft,
          selectedProduct: {
            ...expressProduct,
            omsProductCode: 'DEAP'
          }
        }),
        inputKey
      )
    }
  },
  {
    name: 'warehouse precise screening auto selects once at 100kg and keeps explicit rejection',
    run() {
      let draft = {
        ...createValidExpressDraft(),
        goods: {
          ...createValidExpressDraft().goods,
          name: '家具',
          weight: 100
        },
        service: {
          ...createValidExpressDraft().service,
          transportMode: 'PACKAGE'
        }
      }
      const response = {
        type: 3,
        reason: '当前地址为精准进仓地址',
        depotType: '4'
      }
      const firstScreening = createExpressWarehouseScreening(draft, response)

      assert.equal(firstScreening.autoSelected, true)
      assert.equal(firstScreening.acknowledged, true)

      draft = applyExpressWarehouseScreening(draft, firstScreening)
      assert.equal(draft.warehouse.enabled, true)
      assert.equal(draft.warehouse.warehouseType, '4')

      draft = rejectExpressWarehouse(draft)
      assert.equal(draft.warehouse.enabled, false)
      assert.equal(draft.warehouse.screening.autoSelected, true)
      assert.equal(draft.warehouse.screening.acknowledged, true)

      const warningDraft = {
        ...createValidExpressDraft(),
        service: {
          ...createValidExpressDraft().service,
          transportMode: 'PACKAGE'
        }
      }
      const warningScreening = createExpressWarehouseScreening(warningDraft, {
        type: 2,
        reason: '请确认进仓提示',
        depotType: '2'
      })

      assert.equal(warningScreening.acknowledged, false)
      const screenedWarningDraft = applyExpressWarehouseScreening(warningDraft, warningScreening)
      assert.ok(
        validateExpressWarehouse(screenedWarningDraft, {
          requireScreening: true
        }).includes('请确认进仓提示')
      )
      const acknowledgedDraft = acknowledgeExpressWarehouseScreening(screenedWarningDraft)
      assert.deepEqual(validateExpressWarehouse(acknowledgedDraft, { requireScreening: true }), [])
      assert.equal(
        createExpressWarehouseScreening(acknowledgedDraft, {
          type: 2,
          reason: '进仓风险说明已更新',
          depotType: '2'
        }).acknowledged,
        false
      )

      const clearedWarning = clearExpressWarehouse(screenedWarningDraft)
      assert.equal(clearedWarning.warehouse.screening.acknowledged, false)

      const riskScreening = createExpressWarehouseScreening(warningDraft, {
        type: 4,
        reason: '高风险进仓提示'
      })
      const screenedRiskDraft = applyExpressWarehouseScreening(warningDraft, riskScreening)

      assert.equal(riskScreening.acknowledged, false)
      assert.ok(
        validateExpressWarehouse(screenedRiskDraft, {
          requireScreening: true
        }).includes('高风险进仓提示')
      )

      const repeatedScreening = createExpressWarehouseScreening(draft, response)

      assert.equal(repeatedScreening.autoSelected, false)
      assert.equal(repeatedScreening.acknowledged, true)

      draft = applyExpressWarehouseScreening(draft, repeatedScreening)
      assert.equal(draft.warehouse.enabled, false)
      assert.equal(draft.warehouse.screening.autoSelected, true)
      assert.equal(draft.warehouse.screening.acknowledged, true)

      const belowThreshold = {
        ...createValidExpressDraft(),
        goods: {
          ...createValidExpressDraft().goods,
          name: '家具',
          weight: 99
        },
        service: {
          ...createValidExpressDraft().service,
          transportMode: 'PACKAGE'
        }
      }

      assert.equal(createExpressWarehouseScreening(belowThreshold, response).autoSelected, false)
    }
  },
  {
    name: 'warehouse screening proof expires after address goods or product changes',
    run() {
      const base = {
        ...createValidExpressDraft(),
        service: {
          ...createValidExpressDraft().service,
          transportMode: 'PACKAGE'
        }
      }
      const screened = applyExpressWarehouseScreening(
        base,
        createExpressWarehouseScreening(base, {
          type: 1,
          reason: '当前地址可能产生进仓费用',
          depotType: '2'
        })
      )

      assert.equal(isExpressWarehouseScreeningCurrent(screened), true)

      const addressChanged = setExpressContact(screened, 'consignee', {
        ...screened.consignee,
        address: '科技园科苑路201号'
      })
      const goodsChanged = updateExpressGoods(screened, { name: '家具' })
      const productChanged = selectExpressProduct(screened, {
        ...expressProduct,
        productName: '大件快递',
        omsProductCode: 'DEAP'
      })

      for (const changed of [addressChanged, goodsChanged, productChanged]) {
        assert.equal(changed.warehouse.screening.inputKey, '')
        assert.equal(isExpressWarehouseScreeningCurrent(changed), false)
      }
    }
  },
  {
    name: 'warehouse service is mutually exclusive with delivery preference and self pickup',
    run() {
      const base = {
        ...createValidExpressDraft(),
        service: {
          ...createValidExpressDraft().service,
          transportMode: 'PACKAGE'
        }
      }
      const invalid = {
        ...base,
        service: { ...base.service, deliveryMode: 'PICKSELF' },
        deliveryPreference: {
          ...base.deliveryPreference,
          type: 'NOTIFY_SENDER'
        },
        warehouse: { ...base.warehouse, enabled: true }
      }
      const messages = validateExpressWarehouse(invalid)

      assert.ok(messages.includes('自提订单不能选择送货进仓'))
      assert.ok(messages.includes('送货进仓和派送偏好不能同时选择'))

      const withPreference = {
        ...base,
        deliveryPreference: {
          ...base.deliveryPreference,
          type: 'NOTIFY_SENDER'
        }
      }
      const enabled = updateExpressWarehouse(withPreference, {
        enabled: true
      })
      const selfPickup = updateExpressService(enabled, {
        deliveryMode: 'PICKSELF'
      })

      assert.equal(enabled.deliveryPreference.type, '')
      assert.equal(selfPickup.warehouse.enabled, false)
      assert.equal(selfPickup.warehouse.warehouseNo, '')
      assert.deepEqual(selfPickup.warehouse.fileList, [])
    }
  },
  {
    name: 'warehouse quote emits five fields only while service is enabled',
    run() {
      const base = createValidExpressDraft()
      const warehouse = {
        ...base.warehouse,
        enabled: true,
        warehouseType: '3',
        deliverWarehouseWay: 'AGXSF',
        warehouseProcess: '排队,卸货',
        warehouseCode: 'WH-CODE-001'
      }
      const draft = {
        ...base,
        service: { ...base.service, transportMode: 'PACKAGE' },
        warehouse
      }
      const request = buildFreightRequest(draft)

      assert.deepEqual(
        {
          isWarehousingService: request.isWarehousingService,
          deliverWarehouseWay: request.deliverWarehouseWay,
          warehouseCode: request.warehouseCode,
          warehouseProcess: request.warehouseProcess,
          jcType: request.jcType
        },
        {
          isWarehousingService: 'Y',
          deliverWarehouseWay: 'AGXSF',
          warehouseCode: 'WH-CODE-001',
          warehouseProcess: '排队,卸货',
          jcType: '3'
        }
      )

      const disabled = buildFreightRequest({
        ...draft,
        warehouse: { ...warehouse, enabled: false }
      })

      assert.equal(disabled.isWarehousingService, 'N')
      assert.equal(disabled.deliverWarehouseWay, undefined)
      assert.equal(disabled.warehouseCode, undefined)
      assert.equal(disabled.warehouseProcess, undefined)
      assert.equal(disabled.jcType, undefined)
    }
  },
  {
    name: 'warehouse order maps appointment and extend fields without disabled leakage',
    run() {
      const base = createValidExpressDraft()
      const warehouse = {
        ...base.warehouse,
        enabled: true,
        warehouseNo: 'ENTRY-001',
        warehouseTime: '2026-07-20 10:00:00',
        fileList: [{ previewPath: 'https://owstest.deppon.com/files/warehouse-a.jpg' }, { previewPath: 'https://owstest.deppon.com/files/warehouse-b.jpg' }],
        warehouseType: '3',
        deliverWarehouseWay: 'AGXSF',
        warehouseProcess: '排队,卸货',
        warehouseCode: 'WH-CODE-001',
        warehouseRemark: '工作日进仓'
      }
      const draft = {
        ...base,
        service: { ...base.service, transportMode: 'PACKAGE' },
        warehouse
      }
      const request = buildCreateOrderRequest(draft)
      const warehouseExtendFields = request.receive[0].orderExtendFields.filter(
        field => field.key === 'deliverWarehouseWay' || field.key === 'warehouseProcess' || field.key === 'warehouseRemark'
      )

      assert.deepEqual(request.deliveryToWarehouse, {
        isWarehousingService: 'Y',
        appointmentEntryCode: 'ENTRY-001',
        appointmentTime: '2026-07-20 10:00:00',
        appointmentUrl: ['https://owstest.deppon.com/files/warehouse-a.jpg', 'https://owstest.deppon.com/files/warehouse-b.jpg'],
        warehouseType: '3',
        deliverWarehouseWay: 'AGXSF',
        warehouseProcess: '排队,卸货'
      })
      assert.deepEqual(warehouseExtendFields, [
        { key: 'deliverWarehouseWay', value: 'AGXSF' },
        { key: 'warehouseProcess', value: '排队,卸货' },
        { key: 'warehouseRemark', value: '工作日进仓' }
      ])

      const disabledRequest = buildCreateOrderRequest({
        ...draft,
        warehouse: { ...warehouse, enabled: false }
      })
      const disabledExtendFields = disabledRequest.receive[0].orderExtendFields ?? []

      assert.equal(disabledRequest.deliveryToWarehouse, undefined)
      assert.equal(
        disabledExtendFields.some(field => field.key.includes('warehouse')),
        false
      )
      assert.equal(
        disabledExtendFields.some(field => field.key === 'deliverWarehouseWay'),
        false
      )
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
