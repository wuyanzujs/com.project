require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { isAlreadyBoundCourierMessage, normalizeCourier } = require('@/services/courier/courier.mapper')
const { createCourierExpressDraft } = require('@/services/courier/courier.rules')

const cases = [
  {
    name: 'courier rules normalize profile labels and binding responses',
    run() {
      assert.deepEqual(
        normalizeCourier({
          avgStart: 5.8,
          courierMobile: ' 13800138000 ',
          courierName: ' 王师傅 ',
          courierNo: ' DPK001 ',
          deptName: ' 上海青浦营业部 ',
          deptCode: ' 021A001 ',
          signedCount: 120,
          rewardTimes: -1,
          labels: [
            { labelName: '服务热情', labelCount: 8 },
            { labelName: '上门及时', labelCount: 18 }
          ]
        }),
        {
          id: 'DPK001',
          name: '王师傅',
          mobile: '13800138000',
          departmentName: '上海青浦营业部',
          departmentCode: '021A001',
          rating: 5,
          ratingText: '5.0',
          signedCount: 120,
          rewardTimes: 0,
          labels: [
            { name: '上门及时', count: 18 },
            { name: '服务热情', count: 8 }
          ]
        }
      )
      assert.equal(isAlreadyBoundCourierMessage('当前账号已绑定该快递员'), true)
      assert.equal(isAlreadyBoundCourierMessage('绑定失败'), false)
    }
  },
  {
    name: 'courier express entry maps employee code to pickup scan context',
    run() {
      const draft = createCourierExpressDraft('  DPK001  ')

      assert.ok(draft)
      assert.deepEqual(draft.scanContext, {
        role: 'pickupManId',
        value: 'DPK001',
        sceneId: undefined,
        expressRole: undefined
      })
      assert.equal(draft.selectedProduct, null)
      assert.equal(draft.agreementAccepted, false)
      assert.equal(createCourierExpressDraft(''), null)
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
