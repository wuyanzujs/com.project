require('../support/register.cjs')
const { test } = require('node:test')
const {
  buildOrderModifyRequest,
  createOrderEditDraft
} = require('@/services/order/order.edit')
const {
  createOrderEditInsuranceDraft,
  isOrderEditInsuranceChanged,
  updateOrderEditInsuranceAmount,
  validateOrderEditInsurance
} = require('@/services/order/order.edit.insurance')
const assert = require('node:assert/strict')
const { createOrderDetail } = require('../fixtures/order.cjs')

const cases = [
  {
    name: 'order edit merges insurance and night pickup extension fields',
    run() {
      const origin = createOrderEditDraft(
        createOrderDetail({
          insuredAmount: 1000,
          transportMode: 'PACKAGE',
          beginAcceptTime: '2026-07-15 10:00'
        })
      )
      const preview = buildOrderModifyRequest(
        {
          ...origin,
          insurance: updateOrderEditInsuranceAmount(origin.insurance, 2000),
          schedule: {
            ...origin.schedule,
            pickup: {
              ...origin.schedule.pickup,
              time: '2026-07-15 20:00',
              type: 'NIGHT',
              pickPeriodTime: 20
            }
          }
        },
        origin
      )

      assert.deepEqual(preview.changedFields, ['保价金额', '期望上门时间'])
      assert.deepEqual(preview.request.orderExtendFields, [
        { key: 'insuranceSource', value: '' },
        { key: 'nightAccept', value: 'Y' },
        { key: 'nightAcceptStatus', value: -1 }
      ])
      assert.equal(preview.request.insuredAmount, 2000)
      assert.equal(preview.request.beginAcceptTime, '2026-07-15 20:00')
      assert.equal(preview.request.pickPeriodTime, 20)
    }
  },
  {
    name: 'order edit insurance maps product policy and special coverage locks',
    run() {
      const basic = createOrderEditDraft(
        createOrderDetail({
          transportMode: 'PACKAGE',
          insuredAmount: '1200',
          orderExtendFields: [{ key: 'insuranceSource', value: 'USER' }]
        })
      )

      assert.deepEqual(basic.insurance, {
        amount: 1200,
        defaultPending: false,
        editable: true,
        freeCoverage: false,
        lockedType: '',
        maxAmount: 1000000,
        productCode: 'PACKAGE',
        required: false,
        source: 'USER'
      })

      const required = createOrderEditDraft(
        createOrderDetail({
          transportMode: 'DJBK',
          insuredAmount: 0
        })
      )
      assert.equal(required.insurance.required, true)
      assert.equal(required.insurance.maxAmount, 9990000)
      assert.ok(
        validateOrderEditInsurance(required.insurance).includes(
          '当前产品必须填写保价金额'
        )
      )

      const free = createOrderEditDraft(
        createOrderDetail({
          transportMode: 'NFLF',
          insuredAmount: 0
        })
      )
      assert.equal(free.insurance.amount, 2000)
      assert.equal(free.insurance.defaultPending, true)
      assert.equal(free.insurance.source, 'DEFAULT')

      const secondFree = createOrderEditDraft(
        createOrderDetail({
          transportMode: 'NLRF',
          insuredAmount: 0
        })
      )
      assert.equal(secondFree.insurance.defaultPending, true)

      const locked = createOrderEditInsuranceDraft(
        createOrderDetail({
          transportMode: 'PACKAGE',
          insuredAmount: 3000,
          orderExtendFields: [{ key: 'bjlx', value: '0' }]
        })
      )
      assert.equal(locked.lockedType, 'QEB')
      assert.equal(locked.editable, false)
      assert.deepEqual(updateOrderEditInsuranceAmount(locked, '5000'), locked)

      const worryFree = createOrderEditInsuranceDraft(
        createOrderDetail({
          orderExtendFields: [{ key: 'bjlx', value: '1' }]
        })
      )
      const unknown = createOrderEditInsuranceDraft(
        createOrderDetail({
          orderExtendFields: [{ key: 'bjlx', value: 'UNKNOWN' }]
        })
      )
      assert.equal(worryFree.lockedType, 'SXB')
      assert.equal(unknown.lockedType, 'SPECIAL')
    }
  },
  {
    name: 'order edit insurance emits grouped amount and source diffs',
    run() {
      const origin = createOrderEditDraft(
        createOrderDetail({
          transportMode: 'PACKAGE',
          insuredAmount: 1000
        })
      )
      const changedInsurance = updateOrderEditInsuranceAmount(
        origin.insurance,
        '2500.129'
      )
      const changedDraft = {
        ...origin,
        insurance: changedInsurance
      }
      const changedPreview = buildOrderModifyRequest(changedDraft, origin)

      assert.equal(changedInsurance.amount, 2500.13)
      assert.equal(
        isOrderEditInsuranceChanged(changedInsurance, origin.insurance),
        true
      )
      assert.deepEqual(changedPreview.changedFields, ['保价金额'])
      assert.deepEqual(changedPreview.request, {
        orderNumber: 'ORDER_001',
        insuredAmount: 2500.13,
        orderExtendFields: [{ key: 'insuranceSource', value: '' }]
      })

      const clearedPreview = buildOrderModifyRequest(
        {
          ...origin,
          insurance: updateOrderEditInsuranceAmount(origin.insurance, '')
        },
        origin
      )
      assert.deepEqual(clearedPreview.request, {
        orderNumber: 'ORDER_001',
        insuredAmount: 0,
        orderExtendFields: [{ key: 'insuranceSource', value: '' }]
      })

      const invalid = {
        ...origin.insurance,
        amount: 1000001
      }
      assert.ok(
        validateOrderEditInsurance(invalid).includes(
          '保价金额最高为 1000000 元'
        )
      )

      const freeOrigin = createOrderEditDraft(
        createOrderDetail({
          transportMode: 'NFLF',
          insuredAmount: 0
        })
      )
      const freePreview = buildOrderModifyRequest(freeOrigin, freeOrigin)

      assert.deepEqual(freePreview.changedFields, ['免费基础保障'])
      assert.deepEqual(freePreview.request, {
        orderNumber: 'ORDER_001',
        insuredAmount: 2000,
        orderExtendFields: [{ key: 'insuranceSource', value: 'DEFAULT' }]
      })
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
