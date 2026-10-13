require('../support/register.cjs')
const { test } = require('node:test')
const {
  createExpressPickupNightCapability
} = require('@/services/express/pickupTime.rules')
const { expressDraftBridge } = require('@/services/express/draftBridge')
const assert = require('node:assert/strict')
const {
  applyExpressScanContext,
  clearExpressScanContext,
  createAddressOnlyExpressContact,
  createExpressDraft,
  markExpressQuoteStale
} = require('@/services/express/express.draft')
const {
  buildCreateOrderRequest,
  buildFilterOrderRequest,
  buildFreightRequest
} = require('@/services/express/express.payload')
const {
  createExpressScanContextView
} = require('@/services/express/scanContext')
const {
  createValidExpressDraft,
  expressProduct
} = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'express draft bridge isolates nested night pickup capability',
    run() {
      const draft = createValidExpressDraft()
      const capability = createExpressPickupNightCapability(draft, {
        nightPickUpEnable: true,
        startTime: '18:00:00',
        endTime: '23:00:00'
      })
      const source = {
        ...draft,
        pickup: {
          ...draft.pickup,
          nightCapability: capability
        }
      }

      expressDraftBridge.carryFromQueryPrice(source, expressProduct)
      capability.startTime = '00:00:00'

      const carried = expressDraftBridge.consume()

      assert.equal(carried.draft.pickup.nightCapability.startTime, '18:00:00')
      assert.notEqual(
        carried.draft.pickup.nightCapability,
        source.pickup.nightCapability
      )
    }
  },
  {
    name: 'express scan context clears stale quote and maps courier payload fields',
    run() {
      const draft = applyExpressScanContext(createValidExpressDraft(), {
        role: 'driverId',
        value: ' DRIVER_001 ',
        sceneId: ' SCENE_001 ',
        expressRole: 'PARTNER'
      })
      const request = buildCreateOrderRequest(draft)

      assert.equal(draft.scanContext.role, 'driverId')
      assert.equal(draft.scanContext.value, 'DRIVER_001')
      assert.equal(draft.scanContext.sceneId, 'SCENE_001')
      assert.equal(draft.scanContext.expressRole, 'PARTNER')
      assert.equal(draft.selectedProduct, null)
      assert.equal(draft.agreementAccepted, false)
      assert.equal(draft.quoteStaleReason, '扫码寄件信息变化，请重新获取价格')
      assert.equal(request.pickupManId, 'DRIVER_001')
      assert.equal(request.shipperNumber, '')
      assert.equal(request.acceptDept, '')
    }
  },
  {
    name: 'express scan context maps customer and department payload fields',
    run() {
      const customerRequest = buildCreateOrderRequest(
        applyExpressScanContext(createValidExpressDraft(), {
          role: 'shipperNumber',
          value: 'CUS_001'
        })
      )
      const businessRequest = buildCreateOrderRequest(
        applyExpressScanContext(createValidExpressDraft(), {
          role: 'businessCode',
          value: 'DEPT_001'
        })
      )
      const departmentRequest = buildCreateOrderRequest(
        applyExpressScanContext(createValidExpressDraft(), {
          role: 'acceptDept',
          value: 'DEPT_002'
        })
      )

      assert.equal(customerRequest.shipperNumber, 'CUS_001')
      assert.equal(customerRequest.acceptDept, '')
      assert.equal(customerRequest.pickupManId, '')
      assert.equal(businessRequest.acceptDept, 'DEPT_001')
      assert.equal(departmentRequest.acceptDept, 'DEPT_002')
    }
  },
  {
    name: 'non-customer scan context does not affect freight customer fields',
    run() {
      const draft = applyExpressScanContext(createValidExpressDraft(), {
        role: 'pickupManId',
        value: 'PM_001'
      })
      const freightRequest = buildFreightRequest(draft)
      const filterRequest = buildFilterOrderRequest(draft)

      assert.equal(freightRequest.customerCode, undefined)
      assert.equal(freightRequest.customerMonthly, undefined)
      assert.equal(freightRequest.customerContract, undefined)
      assert.equal(filterRequest.customerCode, undefined)
      assert.equal(filterRequest.limitCust, 0)
    }
  },
  {
    name: 'express scan context view explains customer code and backend guard',
    run() {
      const view = createExpressScanContextView({
        role: 'shipperNumber',
        value: 'CUS_001',
        sceneId: 'SCENE_001',
        expressRole: 'PARTNER'
      })
      const emptyView = createExpressScanContextView()

      assert.equal(view.title, '扫码寄件信息')
      assert.equal(view.tag, '客户编码二维码')
      assert.equal(view.actionText, '移除')
      assert.equal(view.tone, 'success')
      assert.ok(view.summary.includes('客户编码 CUS_001'))
      assert.ok(view.summary.includes('场景 SCENE_001'))
      assert.ok(view.summary.includes('合作伙伴'))
      assert.ok(view.summary.includes('以后端校验为准'))
      assert.equal(emptyView, null)
    }
  },
  {
    name: 'express scan context view labels courier and department roles',
    run() {
      const courierView = createExpressScanContextView({
        role: 'pickupManId',
        value: 'PM_001'
      })
      const departmentView = createExpressScanContextView({
        role: 'businessCode',
        value: 'DEPT_001'
      })

      assert.equal(courierView.tag, '快递员二维码')
      assert.ok(courierView.summary.includes('pickupManId'))
      assert.equal(departmentView.tag, '服务点二维码')
      assert.ok(departmentView.summary.includes('acceptDept'))
    }
  },
  {
    name: 'clearing express scan context removes payload fields and stale quote',
    run() {
      const scannedDraft = applyExpressScanContext(createValidExpressDraft(), {
        role: 'pickupManId',
        value: 'PM_001'
      })
      const quotedDraft = {
        ...scannedDraft,
        selectedProduct: expressProduct,
        agreementAccepted: true,
        quoteStaleReason: ''
      }
      const clearedDraft = clearExpressScanContext(quotedDraft)
      const request = buildCreateOrderRequest(clearedDraft)

      assert.equal(clearedDraft.scanContext, undefined)
      assert.equal(clearedDraft.selectedProduct, null)
      assert.equal(clearedDraft.agreementAccepted, false)
      assert.equal(
        clearedDraft.quoteStaleReason,
        '扫码寄件信息已移除，请重新获取价格'
      )
      assert.equal(request.pickupManId, '')
      assert.equal(request.shipperNumber, '')
      assert.equal(request.acceptDept, '')
      assert.equal(
        clearExpressScanContext(createValidExpressDraft()).scanContext,
        undefined
      )
    }
  },
  {
    name: 'batch recognition draft bridge carries consignee and clears quotes',
    run() {
      const draft = {
        ...createExpressDraft(),
        consignee: {
          name: '李四',
          mobile: '13900139000',
          province: '广东省',
          city: '深圳市',
          county: '南山区',
          address: '科技园科苑路200号'
        },
        goods: {
          ...createExpressDraft().goods,
          name: '文件'
        },
        selectedProduct: expressProduct,
        agreementAccepted: true,
        quoteStaleReason: ''
      }

      expressDraftBridge.carryFromBatchRecognition(draft)
      const carried = expressDraftBridge.consume()

      assert.equal(carried.source, 'BATCH_RECOGNITION')
      assert.equal(carried.draft.consignee.name, '李四')
      assert.equal(carried.draft.goods.name, '文件')
      assert.equal(carried.draft.selectedProduct, null)
      assert.equal(carried.draft.agreementAccepted, false)
      assert.equal(
        carried.draft.quoteStaleReason,
        '批量识别带入，请重新获取价格'
      )
      assert.deepEqual(carried.quotes, [])
    }
  },
  {
    name: 'goods query draft bridge carries goods name and marks quote stale',
    run() {
      const draft = markExpressQuoteStale(
        {
          ...createValidExpressDraft(),
          goods: {
            ...createValidExpressDraft().goods,
            name: '电子配件'
          },
          selectedProduct: expressProduct,
          agreementAccepted: true,
          quoteStaleReason: ''
        },
        '货物名称来自违禁品查询，请重新获取价格'
      )

      expressDraftBridge.carryFromGoodsQuery(draft)
      const carried = expressDraftBridge.consume()

      assert.equal(carried.source, 'GOODS_QUERY')
      assert.equal(carried.draft.goods.name, '电子配件')
      assert.equal(carried.draft.selectedProduct, null)
      assert.equal(carried.draft.agreementAccepted, false)
      assert.equal(
        carried.draft.quoteStaleReason,
        '货物名称来自违禁品查询，请重新获取价格'
      )
      assert.deepEqual(carried.quotes, [])
    }
  },
  {
    name: 'scan qr draft bridge carries scan context without quotes',
    run() {
      const draft = applyExpressScanContext(createValidExpressDraft(), {
        role: 'shipperNumber',
        value: 'CUS_002'
      })

      expressDraftBridge.carryFromScanQrCode(draft)
      const carried = expressDraftBridge.consume()

      assert.equal(carried.source, 'SCAN_QR_CODE')
      assert.equal(carried.draft.scanContext.role, 'shipperNumber')
      assert.equal(carried.draft.scanContext.value, 'CUS_002')
      assert.equal(carried.draft.selectedProduct, null)
      assert.equal(carried.draft.agreementAccepted, false)
      assert.equal(
        carried.draft.quoteStaleReason,
        '扫码寄件信息变化，请重新获取价格'
      )
      assert.deepEqual(carried.quotes, [])
    }
  },
  {
    name: 'dispatch query draft bridge carries address-only consignee',
    run() {
      const draft = {
        ...createExpressDraft(),
        consignee: createAddressOnlyExpressContact({
          province: '上海市',
          city: '上海市',
          county: '青浦区',
          town: '徐泾镇',
          address: '明珠路100号'
        }),
        selectedProduct: expressProduct,
        agreementAccepted: true,
        quoteStaleReason: ''
      }

      expressDraftBridge.carryFromDispatchQuery(draft)
      const carried = expressDraftBridge.consume()

      assert.equal(carried.source, 'DISPATCH_QUERY')
      assert.equal(carried.draft.consignee.name, '')
      assert.equal(carried.draft.consignee.mobile, '')
      assert.equal(carried.draft.consignee.province, '上海市')
      assert.equal(carried.draft.consignee.town, '徐泾镇')
      assert.equal(carried.draft.consignee.address, '明珠路100号')
      assert.equal(carried.draft.selectedProduct, null)
      assert.equal(carried.draft.agreementAccepted, false)
      assert.equal(
        carried.draft.quoteStaleReason,
        '收派范围查询带入，请重新获取价格'
      )
      assert.deepEqual(carried.quotes, [])
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
