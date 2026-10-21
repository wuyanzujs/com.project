require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { selectExpressProduct } = require('@/services/express/core/express.draft')
const { buildCreateOrderRequest, buildFreightRequest } = require('@/services/express/core/express.payload')
const {
  buildExpressDeliveryAppointmentRequest,
  createExpressDeliveryAvailabilityKey,
  createExpressDeliveryOrderFields,
  createExpressDeliveryQuoteFields,
  createExpressScheduledDateOptions,
  createExpressScheduledWindow,
  createExpressUnavailableDateOptions,
  isExpressScheduledDeliveryProductSupported,
  updateExpressDeliveryPreference,
  validateExpressDeliveryPreference
} = require('@/services/express/delivery/deliveryPreference.rules')

const { createValidExpressDraft, expressProduct } = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'express delivery preference builds stable date and availability contracts',
    run() {
      const now = new Date(2026, 6, 13)
      const scheduledDates = createExpressScheduledDateOptions('2026-07-15 18:00:00', '', now)
      const unavailableDates = createExpressUnavailableDateOptions(now)
      const draft = createValidExpressDraft()
      const request = buildExpressDeliveryAppointmentRequest(draft)

      assert.equal(scheduledDates[0].value, '2026-07-16')
      assert.equal(scheduledDates[6].value, '2026-07-22')
      assert.equal(unavailableDates[0].value, '2026-07-14')
      assert.equal(unavailableDates[29].value, '2026-08-12')
      assert.deepEqual(request, {
        goodsWeight: 1,
        goodsVolume: 0,
        provinceName: '广东省',
        cityName: '深圳市',
        areaName: '南山区',
        address: '科技园科苑路200号'
      })
    }
  },
  {
    name: 'express scheduled delivery maps quote and order extension fields',
    run() {
      const product = {
        ...expressProduct,
        arriveDate: '2026-07-15 18:00:00'
      }
      const baseDraft = {
        ...createValidExpressDraft(),
        selectedProduct: product
      }
      let draft = updateExpressDeliveryPreference(baseDraft, {
        type: 'SCHEDULED',
        scheduledWindow: createExpressScheduledWindow('2026-07-16', '14:00-16:00'),
        availabilityKey: createExpressDeliveryAvailabilityKey(baseDraft)
      })

      assert.equal(draft.selectedProduct, null)
      assert.equal(draft.quoteStaleReason, '派送偏好变化，请重新获取价格')

      draft = selectExpressProduct(draft, product)

      const freightRequest = buildFreightRequest(draft)
      const orderRequest = buildCreateOrderRequest(draft)

      assert.deepEqual(
        validateExpressDeliveryPreference(draft, {
          requireProduct: true
        }),
        []
      )
      assert.equal(freightRequest.appointmentDelivery, 'Y')
      assert.equal(freightRequest.nightDelivery, '')
      assert.equal(orderRequest.receive[0].appointmentDeliveryTime, '2026-07-16 14:00-16:00')
      assert.deepEqual(orderRequest.receive[0].orderExtendFields, [
        { key: 'isAppointmentDeliver', value: 'Y' },
        { key: 'nightAccept', value: 'N' }
      ])

      const nightFields = createExpressDeliveryOrderFields({
        type: 'SCHEDULED',
        scheduledWindow: '2026-07-16 21:00-23:59',
        unavailableDates: [],
        availabilityKey: 'verified'
      })
      const nightQuoteFields = createExpressDeliveryQuoteFields({
        type: 'SCHEDULED',
        scheduledWindow: '2026-07-16 21:00-23:59',
        unavailableDates: [],
        availabilityKey: 'verified'
      })

      assert.equal(nightQuoteFields.nightDelivery, 'Y')
      assert.equal(nightQuoteFields.appointmentDelivery, '')
      assert.deepEqual(nightFields.orderExtendFields, [{ key: 'nightDelivery', value: 'Y' }])
      assert.equal(isExpressScheduledDeliveryProductSupported('DCZP'), false)
      assert.equal(isExpressScheduledDeliveryProductSupported('TKDR'), false)

      const changedProductDraft = selectExpressProduct(draft, {
        ...product,
        omsProductCode: 'DCZP'
      })

      assert.equal(changedProductDraft.deliveryPreference.type, '')

      const staleDraft = {
        ...draft,
        consignee: {
          ...draft.consignee,
          address: '科技园科苑路300号'
        }
      }

      assert.deepEqual(
        validateExpressDeliveryPreference(staleDraft, {
          requireProduct: true
        }),
        ['定时派送范围已失效，请重新校验']
      )
    }
  },
  {
    name: 'express notify delivery modes stay mutually exclusive in payloads',
    run() {
      const senderPreference = {
        type: 'NOTIFY_SENDER',
        scheduledWindow: '',
        unavailableDates: [],
        availabilityKey: ''
      }
      const receiverPreference = {
        type: 'NOTIFY_RECEIVER',
        scheduledWindow: '',
        unavailableDates: ['2026-07-20', '2026-07-22'],
        availabilityKey: ''
      }

      assert.equal(createExpressDeliveryQuoteFields(senderPreference).notifyIsDeliver, 'N')
      assert.deepEqual(createExpressDeliveryOrderFields(senderPreference).orderExtendFields, [{ key: 'notifyIsDeliver', value: 'N' }])
      assert.deepEqual(createExpressDeliveryOrderFields(receiverPreference).newOrderExtendFields, [
        { key: 'waitReceiveNotifyDeliver', value: 'Y' },
        {
          key: 'waitReceiveNotifyNotDeliverTime',
          value: '2026-07-20,2026-07-22'
        }
      ])

      const selfPickupDraft = {
        ...createValidExpressDraft(),
        service: {
          ...createValidExpressDraft().service,
          deliveryMode: 'PICKSELF'
        },
        deliveryPreference: receiverPreference
      }

      assert.deepEqual(validateExpressDeliveryPreference(selfPickupDraft), ['自提订单不能选择预约或通知派送'])

      const invalidDateDraft = {
        ...createValidExpressDraft(),
        deliveryPreference: {
          ...receiverPreference,
          unavailableDates: ['invalid-date']
        }
      }

      assert.deepEqual(validateExpressDeliveryPreference(invalidDateDraft), ['不可收货日期格式不正确'])
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
