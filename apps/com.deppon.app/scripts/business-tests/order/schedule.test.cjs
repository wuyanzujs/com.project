require('../support/register.cjs')
const { test } = require('node:test')
const { createOrderEditDraft } = require('@/services/order/order.edit')
const {
  ORDER_EDIT_NIGHT_PICKUP_CACHE_MS,
  buildOrderEditPickupNightRequest,
  buildOrderEditPickupTimeRequest,
  createOrderEditPickupNightCapability,
  createOrderEditScheduleQueryKey,
  createOrderEditScheduleRequestDiff,
  getFreshOrderEditPickupNightCapability,
  validateOrderEditSchedule
} = require('@/services/order/order.edit.schedule')
const assert = require('node:assert/strict')
const {
  createOrderEditPickupDateOptions,
  normalizeOrderEditPickupTimeResponse
} = require('@/services/order/order.edit.schedule.options')
const {
  acceptOrderEditNightPickupNotice,
  applyOrderEditPickupTimeResponse,
  selectOrderEditPickupTime
} = require('@/services/order/order.edit.schedule.selection')
const {
  orderEditScheduleApi
} = require('@/services/order/order.edit.schedule.api')
const {
  queryOrderEditPickupTimes
} = require('@/services/order/order.edit.schedule.service')
const { createOrderDetail } = require('../fixtures/order.cjs')

const cases = [
  {
    name: 'order edit pickup requests bind night capability to address and source zero',
    run() {
      const draft = createOrderEditDraft(
        createOrderDetail({
          contactProvince: '上海市',
          contactCity: '上海市',
          contactArea: '青浦区',
          contactTown: '徐泾镇',
          contactAddress: '明珠路100号',
          goodsNumber: 2,
          totalWeight: 12,
          totalVolume: 0.2,
          transportMode: 'PACKAGE'
        })
      )
      const checkedAt = 1000
      const capability = createOrderEditPickupNightCapability(
        draft,
        {
          nightPickUpEnable: true,
          startTime: '18:00',
          endTime: '23:00'
        },
        checkedAt
      )
      const withCapability = {
        ...draft,
        schedule: {
          ...draft.schedule,
          pickup: { ...draft.schedule.pickup, nightCapability: capability }
        }
      }

      assert.deepEqual(buildOrderEditPickupNightRequest(draft), {
        province: '上海市',
        city: '上海市',
        county: '青浦区',
        address: '明珠路100号'
      })
      assert.deepEqual(buildOrderEditPickupTimeRequest(draft, capability), {
        sysCode: 'APP',
        provinceName: '上海市',
        cityName: '上海市',
        countyName: '青浦区',
        townName: '徐泾镇',
        address: '明珠路100号',
        weight: 12,
        volume: 0.2,
        goodsNumber: 2,
        priceTimeProductCode: 'PACKAGE',
        source: 0,
        nightOpening: 'Y',
        nightStartTime: '18:00',
        nightEndTime: '23:00'
      })
      assert.equal(
        getFreshOrderEditPickupNightCapability(
          withCapability,
          checkedAt + ORDER_EDIT_NIGHT_PICKUP_CACHE_MS - 1
        )?.enabled,
        true
      )
      assert.equal(
        getFreshOrderEditPickupNightCapability(
          withCapability,
          checkedAt + ORDER_EDIT_NIGHT_PICKUP_CACHE_MS
        ),
        undefined
      )
      assert.notEqual(
        createOrderEditScheduleQueryKey(draft),
        createOrderEditScheduleQueryKey({ ...draft, totalWeight: 13 })
      )
    }
  },
  {
    name: 'order edit pickup options merge normal night and disabled windows',
    run() {
      const normalized = normalizeOrderEditPickupTimeResponse({
        opening: true,
        openingList: [
          {
            date: '2026-07-15',
            dateList: [
              { time: '09:00', text: '一小时上门', type: 'NORMAL' },
              { time: '10:00', text: '10:00-12:00', type: 'NORMAL' }
            ]
          }
        ],
        nightOpeningList: [
          {
            date: '2026-07-15',
            dateList: [
              { time: '19:00', text: '一小时上门', type: 'NIGHT' },
              { time: '21:00', text: '21:00-22:00', type: 'NIGHT' }
            ]
          }
        ],
        blankOpeningList: [
          {
            date: '2026-07-15',
            dateList: [{ time: '14:00', text: '14:00-16:00', type: 'DISABLE' }]
          }
        ]
      })
      const options = createOrderEditPickupDateOptions(normalized)
      const items = normalized.openingList[0].dateList

      assert.equal(options.length, 1)
      assert.equal(
        items.some(
          item => item.type === 'NORMAL' && item.text.includes('小时')
        ),
        false
      )
      assert.equal(
        items.some(item => item.type === 'NIGHT'),
        true
      )
      assert.equal(
        options[0].timeOptions.find(item => item.time === '14:00').disabled,
        true
      )
    }
  },
  {
    name: 'order edit night selection requires fresh capability and fee acknowledgement',
    run() {
      const now = new Date('2026-07-14T08:00:00.000Z')
      const draft = createOrderEditDraft(
        createOrderDetail({
          contactProvince: '上海市',
          contactCity: '上海市',
          contactArea: '青浦区',
          contactAddress: '明珠路100号',
          totalWeight: 1,
          totalVolume: 0
        })
      )
      const capability = createOrderEditPickupNightCapability(
        draft,
        {
          nightPickUpEnable: true,
          startTime: '18:00',
          endTime: '23:00'
        },
        now.getTime()
      )
      const ready = {
        ...draft,
        schedule: {
          ...draft.schedule,
          pickup: { ...draft.schedule.pickup, nightCapability: capability }
        }
      }
      const existingNight = {
        ...ready,
        schedule: {
          ...ready.schedule,
          pickup: {
            ...ready.schedule.pickup,
            time: '2026-07-15 20:00',
            type: 'NIGHT',
            nightNoticeAccepted: true
          }
        }
      }
      const hydratedNight = applyOrderEditPickupTimeResponse(existingNight, {
        opening: true,
        openingList: [
          {
            date: '2026-07-15',
            dateList: [{ time: '20:00', text: '20:00-21:00', type: 'NIGHT' }]
          }
        ],
        nightCapability: capability
      })
      const selected = selectOrderEditPickupTime(ready, {
        date: '2026-07-15',
        time: '20:00',
        text: '20:00-21:00',
        type: 'NIGHT'
      })

      assert.equal(selected.schedule.pickup.time, '2026-07-15 20:00')
      assert.equal(selected.schedule.pickup.nightNoticeAccepted, false)
      assert.equal(hydratedNight.schedule.pickup.timeSlot, '20:00-21:00')
      assert.equal(hydratedNight.schedule.pickup.nightNoticeAccepted, true)
      assert.ok(
        validateOrderEditSchedule(selected, { now }).includes(
          '请先确认夜间揽收费用提示'
        )
      )

      const accepted = acceptOrderEditNightPickupNotice(selected)
      assert.deepEqual(validateOrderEditSchedule(accepted, { now }), [])

      const stale = { ...accepted, totalWeight: 2 }
      assert.ok(
        validateOrderEditSchedule(stale, { now }).includes(
          '订单信息已变化，请重新获取并选择上门时间'
        )
      )

      const invalidated = applyOrderEditPickupTimeResponse(stale, {
        opening: true,
        openingList: [
          {
            date: '2026-07-16',
            dateList: [{ time: '10:00', text: '10:00-12:00', type: 'NORMAL' }]
          }
        ],
        nightCapability: capability
      })

      assert.equal(invalidated.schedule.pickup.time, '')
      assert.equal(invalidated.schedule.pickup.type, 'NORMAL')
    }
  },
  {
    name: 'order edit schedule diff maps pickup delivery and ServicePoint fields',
    run() {
      const origin = createOrderEditDraft(
        createOrderDetail({
          beginAcceptTime: '2026-07-15 10:00',
          channelType: 'ServicePoint',
          deliveryType: 'PICKNOTUPSTAIRS',
          transportMode: 'PACKAGE',
          totalWeight: 80,
          totalVolume: 0.5
        })
      )
      const changed = {
        ...origin,
        schedule: {
          ...origin.schedule,
          deliveryMode: 'PICKSELF',
          pickup: {
            ...origin.schedule.pickup,
            time: '2026-07-15 20:00',
            timeSlot: '20:00-21:00',
            type: 'NIGHT',
            pickPeriodTime: 30
          }
        }
      }
      const diff = createOrderEditScheduleRequestDiff(changed, origin)

      assert.deepEqual(diff.changedFields, ['期望上门时间', '送货方式'])
      assert.deepEqual(diff.request, {
        beginAcceptTime: '2026-07-15 20:00',
        channelType: 'VISITING_SERVICE',
        pickPeriodTime: 30,
        orderExtendFields: [
          { key: 'nightAccept', value: 'Y' },
          { key: 'nightAcceptStatus', value: -1 }
        ],
        deliveryMode: 'PICKSELF'
      })
      assert.deepEqual(createOrderEditScheduleRequestDiff(origin, origin), {
        changedFields: [],
        request: {}
      })

      const nightOrigin = createOrderEditDraft(
        createOrderDetail({
          orderExtendFields: [{ key: 'nightAccept', value: 'Y' }]
        })
      )
      const normalDiff = createOrderEditScheduleRequestDiff(
        {
          ...nightOrigin,
          schedule: {
            ...nightOrigin.schedule,
            pickup: { ...nightOrigin.schedule.pickup, type: 'NORMAL' }
          }
        },
        nightOrigin
      )

      assert.deepEqual(normalDiff.request.orderExtendFields, [
        { key: 'nightAccept', value: 'N' },
        { key: 'nightAcceptStatus', value: '' }
      ])

      const bigPackage = createOrderEditDraft(
        createOrderDetail({
          waybillNumber: 'DPL123456789',
          transportMode: 'ZBTH',
          deliveryType: 'PICKNOTUPSTAIRS',
          totalWeight: 200
        })
      )
      const hiddenDiff = createOrderEditScheduleRequestDiff(
        {
          ...bigPackage,
          schedule: { ...bigPackage.schedule, deliveryMode: 'PICKSELF' }
        },
        bigPackage
      )

      assert.equal(hiddenDiff.request.deliveryMode, undefined)
    }
  },
  {
    name: 'order edit pickup service composes capability before source zero slots',
    async run() {
      const originalNight = orderEditScheduleApi.queryPickupNight
      const originalTimes = orderEditScheduleApi.queryPickupTimes
      let nightRequest = null
      let timeRequest = null
      const draft = createOrderEditDraft(
        createOrderDetail({
          contactProvince: '上海市',
          contactCity: '上海市',
          contactArea: '青浦区',
          contactAddress: '明珠路100号',
          goodsNumber: 2,
          totalWeight: 12,
          totalVolume: 0.2,
          transportMode: 'PACKAGE'
        })
      )

      try {
        orderEditScheduleApi.queryPickupNight = async request => {
          nightRequest = request
          return {
            status: true,
            result: {
              nightPickUpEnable: true,
              startTime: '18:00',
              endTime: '23:00'
            }
          }
        }
        orderEditScheduleApi.queryPickupTimes = async request => {
          timeRequest = request
          return {
            status: true,
            result: {
              pickPeriodTime: 30,
              openingList: [
                {
                  date: '2026-07-15',
                  dateList: [
                    { time: '10:00', text: '10:00-12:00', type: 'NORMAL' }
                  ]
                }
              ],
              nightOpeningList: [
                {
                  date: '2026-07-15',
                  dateList: [
                    { time: '20:00', text: '20:00-21:00', type: 'NIGHT' }
                  ]
                }
              ]
            }
          }
        }

        const response = await queryOrderEditPickupTimes(draft)

        assert.equal(response.status, true)
        assert.deepEqual(nightRequest, {
          province: '上海市',
          city: '上海市',
          county: '青浦区',
          address: '明珠路100号'
        })
        assert.equal(timeRequest.source, 0)
        assert.equal(timeRequest.nightOpening, 'Y')
        assert.equal(timeRequest.nightStartTime, '18:00')
        assert.equal(response.result.openingList[0].dateList.length, 2)
      } finally {
        orderEditScheduleApi.queryPickupNight = originalNight
        orderEditScheduleApi.queryPickupTimes = originalTimes
      }
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
