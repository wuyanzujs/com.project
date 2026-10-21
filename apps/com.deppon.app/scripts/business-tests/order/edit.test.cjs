require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { buildOrderModifyRequest, createOrderEditDraft, getOrderEditUnavailableMessage, validateOrderEditDraft } = require('@/services/order/edit/order.edit')
const { clearOrderEditCollection, updateOrderEditCollection } = require('@/services/order/edit/order.edit.collection')
const { updateOrderEditInsuranceAmount } = require('@/services/order/edit/order.edit.insurance')
const {
  ORDER_EDIT_PACKAGING_MAX_COUNT,
  ORDER_EDIT_PACKAGING_UNIT_FEE,
  getOrderEditPackagingFee,
  normalizeOrderEditPackagingCountInput,
  updateOrderEditPackagingCount,
  validateOrderEditPackaging
} = require('@/services/order/edit/order.edit.packaging')
const { ORDER_EDIT_DELIVERY_OPTIONS, isOrderEditDeliveryModeVisible } = require('@/services/order/edit/order.edit.schedule')

const { createOrderDetail } = require('../fixtures/order.cjs')

const cases = [
  {
    name: 'order edit mapper creates a normalized draft from secure detail',
    run() {
      const draft = createOrderEditDraft(
        createOrderDetail({
          contactName: ' 张三 ',
          contactMobile: '13800138000',
          contactProvince: '上海市',
          contactCity: '上海市',
          contactArea: '青浦区',
          contactTown: '徐泾镇',
          contactAddress: '明珠路100号',
          receiverName: ' 李四 ',
          receiverMobile: '13900139000',
          receiverProvince: '广东省',
          receiverCity: '深圳市',
          receiverArea: '南山区',
          receiverTown: '粤海街道',
          receiverAddress: '科苑路200号',
          goodsName: ' 文件 ',
          goodsNumber: 2,
          totalWeight: 3.5,
          totalVolume: 0.12,
          transportMode: 'PACKAGE',
          deliveryType: 'PICKSELF',
          endAcceptTime: '2026-07-15 12:00:00',
          channelType: 'ServicePoint',
          tableType: 'EXPRESS',
          orderExtendFields: [{ key: 'nightAccept', value: 'Y' }],
          remark: ' 小心轻放 '
        })
      )

      assert.equal(draft.orderNumber, 'ORDER_001')
      assert.equal(draft.sender.name, '张三')
      assert.equal(draft.sender.town, '徐泾镇')
      assert.equal(draft.receiver.name, '李四')
      assert.equal(draft.goodsName, '文件')
      assert.equal(draft.goodsNumber, 2)
      assert.equal(draft.totalWeight, 3.5)
      assert.equal(draft.totalVolume, 0.12)
      assert.equal(draft.collection.enabled, false)
      assert.equal(draft.schedule.deliveryMode, 'PICKSELF')
      assert.equal(draft.schedule.pickup.type, 'NIGHT')
      assert.equal(draft.schedule.pickup.endTime, '2026-07-15 12:00:00')
      assert.equal(draft.schedule.orderChannel, 'ServicePoint')
      assert.equal(draft.schedule.productCode, 'PACKAGE')
      assert.equal(draft.remark, '小心轻放')
    }
  },
  {
    name: 'order edit delivery modes follow logistics thresholds and big package locks',
    run() {
      const lightExpress = createOrderEditDraft(
        createOrderDetail({
          transportMode: 'PACKAGE',
          deliveryType: 'PICKNOTUPSTAIRS',
          totalWeight: 60,
          totalVolume: 0.36
        })
      )
      const heavyExpress = { ...lightExpress, totalWeight: 60.01 }
      const largeExpress = { ...lightExpress, totalVolume: 0.361 }
      const logistics = createOrderEditDraft(
        createOrderDetail({
          waybillNumber: 'DPL123456789',
          transportMode: 'PACKAGE',
          totalWeight: 1,
          totalVolume: 0
        })
      )
      const bigPackage = createOrderEditDraft(
        createOrderDetail({
          waybillNumber: 'DPL123456789',
          transportMode: 'NZBRH',
          totalWeight: 200,
          totalVolume: 2
        })
      )

      assert.deepEqual(
        ORDER_EDIT_DELIVERY_OPTIONS.map(item => item.value),
        ['PICKNOTUPSTAIRS', 'PICKUPSTAIRS', 'PICKSELF']
      )
      assert.equal(isOrderEditDeliveryModeVisible(lightExpress), false)
      assert.equal(isOrderEditDeliveryModeVisible(heavyExpress), true)
      assert.equal(isOrderEditDeliveryModeVisible(largeExpress), true)
      assert.equal(isOrderEditDeliveryModeVisible(logistics), true)
      assert.equal(isOrderEditDeliveryModeVisible(bigPackage), false)
    }
  },
  {
    name: 'order edit request sends only changed fields and grouped regions',
    run() {
      const origin = createOrderEditDraft(
        createOrderDetail({
          contactName: '张三',
          contactMobile: '13800138000',
          contactProvince: '上海市',
          contactCity: '上海市',
          contactArea: '青浦区',
          contactAddress: '明珠路100号',
          receiverName: '李四',
          receiverMobile: '13900139000',
          receiverProvince: '广东省',
          receiverCity: '深圳市',
          receiverArea: '南山区',
          receiverAddress: '科苑路200号',
          goodsName: '文件',
          goodsNumber: 1,
          totalWeight: 1,
          totalVolume: 0,
          remark: ''
        })
      )
      const preview = buildOrderModifyRequest(
        {
          ...origin,
          sender: {
            ...origin.sender,
            province: '江苏省',
            city: '苏州市',
            county: '工业园区'
          },
          goodsName: '电子配件',
          totalWeight: 2.5,
          remark: ' 加急 '
        },
        origin
      )

      assert.equal(preview.changed, true)
      assert.deepEqual(preview.changedFields, ['寄件地区', '货物名称', '货物重量', '备注'])
      assert.deepEqual(preview.request, {
        orderNumber: 'ORDER_001',
        contactProvince: '江苏省',
        contactCity: '苏州市',
        contactArea: '工业园区',
        goodsName: '电子配件',
        totalWeight: 2.5,
        remark: '加急'
      })
      assert.deepEqual(buildOrderModifyRequest(origin, origin), {
        changed: false,
        changedFields: [],
        request: {
          orderNumber: 'ORDER_001'
        }
      })
    }
  },
  {
    name: 'order edit packaging maps count limits and reference fee',
    run() {
      const draft = createOrderEditDraft(
        createOrderDetail({
          orderExtendFields: [
            { key: 'packingService', value: '3' },
            { key: 'packingService', value: '4' }
          ]
        })
      )

      assert.deepEqual(draft.packaging, { count: 4 })
      assert.equal(normalizeOrderEditPackagingCountInput('00a12'), '12')
      assert.deepEqual(updateOrderEditPackagingCount(draft.packaging, 1000), {
        count: ORDER_EDIT_PACKAGING_MAX_COUNT
      })
      assert.equal(getOrderEditPackagingFee(draft.packaging), 4 * ORDER_EDIT_PACKAGING_UNIT_FEE)
      assert.deepEqual(validateOrderEditPackaging({ count: 1.5 }), ['打包服务件数须为 0 到 999 的整数'])
    }
  },
  {
    name: 'order edit packaging emits string diffs for enable and clear',
    run() {
      const origin = createOrderEditDraft(
        createOrderDetail({
          orderExtendFields: [{ key: 'packingService', value: '2' }]
        })
      )
      const changedPreview = buildOrderModifyRequest(
        {
          ...origin,
          packaging: updateOrderEditPackagingCount(origin.packaging, 5)
        },
        origin
      )
      const clearedPreview = buildOrderModifyRequest(
        {
          ...origin,
          packaging: updateOrderEditPackagingCount(origin.packaging, 0)
        },
        origin
      )
      const combinedPreview = buildOrderModifyRequest(
        {
          ...origin,
          packaging: updateOrderEditPackagingCount(origin.packaging, 5),
          insurance: updateOrderEditInsuranceAmount(origin.insurance, 2000)
        },
        origin
      )

      assert.deepEqual(changedPreview.changedFields, ['打包服务'])
      assert.deepEqual(changedPreview.request, {
        orderNumber: 'ORDER_001',
        orderExtendFields: [{ key: 'packingService', value: '5' }]
      })
      assert.deepEqual(clearedPreview.request, {
        orderNumber: 'ORDER_001',
        orderExtendFields: [{ key: 'packingService', value: '0' }]
      })
      assert.deepEqual(combinedPreview.request, {
        orderNumber: 'ORDER_001',
        insuredAmount: 2000,
        orderExtendFields: [
          { key: 'packingService', value: '5' },
          { key: 'insuranceSource', value: '' }
        ]
      })
    }
  },
  {
    name: 'order edit collection maps detail and emits all-or-nothing diffs',
    run() {
      const activeOrigin = createOrderEditDraft(
        createOrderDetail({
          receiverLoanType: '即日退',
          receiverMoneyAmount: '88.5',
          reciveLoanAccount: ' 622200001234 ',
          reciveLoanAccountName: ' 张三 '
        })
      )

      assert.deepEqual(activeOrigin.collection, {
        enabled: true,
        type: 'INTRADAY',
        amount: 88.5,
        account: '622200001234',
        accountName: '张三',
        limit: 1000000,
        agreementAccepted: true
      })

      const clearedPreview = buildOrderModifyRequest(
        {
          ...activeOrigin,
          collection: clearOrderEditCollection(activeOrigin.collection)
        },
        activeOrigin
      )

      assert.deepEqual(clearedPreview.request, {
        orderNumber: 'ORDER_001',
        reciveLoanType: 'NORMAL',
        reviceMoneyAmount: 0,
        accountName: '',
        reciveLoanAccount: ''
      })
      assert.deepEqual(clearedPreview.changedFields, ['代收货款'])

      const disabledOrigin = createOrderEditDraft(createOrderDetail())
      const enabledPreview = buildOrderModifyRequest(
        {
          ...disabledOrigin,
          collection: updateOrderEditCollection(disabledOrigin.collection, {
            enabled: true,
            type: 'NORMAL',
            amount: 120.25,
            account: '622200009999',
            accountName: '李四',
            agreementAccepted: true
          })
        },
        disabledOrigin
      )

      assert.deepEqual(enabledPreview.request, {
        orderNumber: 'ORDER_001',
        reciveLoanType: 'NORMAL',
        reviceMoneyAmount: 120.25,
        accountName: '李四',
        reciveLoanAccount: '622200009999'
      })

      const localOnlyPreview = buildOrderModifyRequest(
        {
          ...activeOrigin,
          collection: {
            ...activeOrigin.collection,
            limit: 500000
          }
        },
        activeOrigin
      )

      assert.equal(localOnlyPreview.changed, false)
    }
  },
  {
    name: 'order edit access requires sender state flag and product permission',
    run() {
      const editable = createOrderDetail({
        orderClassification: '0',
        modifyFlag: true,
        isSender: 'Y',
        productCodeFlag: true
      })

      assert.equal(getOrderEditUnavailableMessage(editable), '')
      assert.equal(getOrderEditUnavailableMessage({ ...editable, modifyFlag: false }), '当前订单不允许修改')
      assert.equal(getOrderEditUnavailableMessage({ ...editable, isSender: 'N' }), '您没有权限修改此订单')
      assert.equal(
        getOrderEditUnavailableMessage({
          ...editable,
          orderClassification: '1'
        }),
        '当前订单状态不支持修改'
      )
      assert.equal(
        getOrderEditUnavailableMessage({
          ...editable,
          productCodeFlag: false
        }),
        '当前产品不允许修改'
      )
    }
  },
  {
    name: 'order edit validation blocks identical addresses and invalid metrics',
    run() {
      const draft = createOrderEditDraft(
        createOrderDetail({
          contactName: '张三',
          contactMobile: '13800138000',
          contactProvince: '上海市',
          contactCity: '上海市',
          contactArea: '青浦区',
          contactAddress: '明珠路100号',
          receiverName: '李四',
          receiverMobile: '13900139000',
          receiverProvince: '上海市',
          receiverCity: '上海市',
          receiverArea: '青浦区',
          receiverAddress: '明珠路100号',
          goodsName: '文件',
          goodsNumber: 0,
          totalWeight: 0,
          totalVolume: -1
        })
      )
      const invalidDraft = {
        ...draft,
        goodsNumber: 0,
        totalWeight: 0,
        totalVolume: -1
      }
      const validation = validateOrderEditDraft(invalidDraft)

      assert.equal(validation.valid, false)
      assert.ok(validation.messages.includes('寄件和收件地址不能相同'))
      assert.ok(validation.messages.includes('货物件数至少为1件'))
      const invalidCollection = validateOrderEditDraft({
        ...draft,
        collection: {
          ...draft.collection,
          enabled: true,
          amount: 1000001,
          agreementAccepted: false
        }
      })

      assert.ok(invalidCollection.messages.includes('代收货款金额不能超过 1000000 元'))
      assert.ok(invalidCollection.messages.includes('请选择代收货款收款账户'))
      assert.ok(invalidCollection.messages.includes('请阅读并同意代收货款服务协议'))
      const invalidPackaging = validateOrderEditDraft({
        ...draft,
        packaging: { count: 1000 }
      })

      assert.ok(invalidPackaging.messages.includes('打包服务件数须为 0 到 999 的整数'))
      assert.ok(validation.messages.includes('请填写正确的货物重量'))
      assert.ok(validation.messages.includes('请填写正确的货物体积'))
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
