require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { expressApi } = require('@/services/express/core/express.api')
const { applyExpressPickupTime, applyExpressScanContext, selectExpressProduct, updateExpressPickup } = require('@/services/express/core/express.draft')
const { buildCreateOrderRequest, buildFreightRequest, buildPickupTimeRequest } = require('@/services/express/core/express.payload')
const { expressService } = require('@/services/express/core/express.service')
const {
  createExpressPickupDateOptions,
  findExpressPickupTimeSelection,
  getFirstExpressPickupTimeSelection,
  normalizeExpressPickupTimeResponse
} = require('@/services/express/pickup/pickupTime.options')
const {
  EXPRESS_NIGHT_PICKUP_CACHE_MS,
  acceptExpressNightPickupNotice,
  buildExpressPickupNightRequest,
  createExpressPickupNightCapability,
  getFreshExpressPickupNightCapability,
  isExpressNightPickupTimeValid,
  normalizeExpressPickup,
  selectExpressPickupTime,
  validateExpressPickupTime
} = require('@/services/express/pickup/pickupTime.rules')

const { createValidExpressDraft, expressProduct } = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'template pickup time matches the first day slot by hour',
    run() {
      const response = normalizeExpressPickupTimeResponse({
        serviceTime: '2026-07-14 07:30:00',
        opening: true,
        openingList: [
          {
            date: '2026-07-14',
            dateList: [
              { time: '07:00-08:00', text: '07:00-08:00', type: 'NORMAL' },
              { time: '08:00-10:00', text: '08:00-10:00', type: 'NORMAL' }
            ]
          }
        ]
      })
      const base = createValidExpressDraft()
      const draft = applyExpressPickupTime({ ...base, pickup: { ...base.pickup, time: '08:00-10:00' } }, response)

      assert.equal(draft.pickup.time, '2026-07-14 08:00-10:00')
      assert.equal(draft.pickup.timeSlot, '08:00-10:00')
    }
  },
  {
    name: 'quick pickup label keeps the reference time string',
    run() {
      const response = normalizeExpressPickupTimeResponse({
        serviceTime: '2026-07-13 12:00:00',
        opening: true,
        openingList: [
          {
            date: '2026-07-13',
            dateList: [{ time: '现在发货', text: '一小时内', type: 'NORMAL' }]
          }
        ]
      })
      const draft = applyExpressPickupTime(createValidExpressDraft(), response)

      assert.equal(draft.pickup.time, '现在发货')
      assert.equal(buildFreightRequest(draft).sendDateTime, '现在发货')
      assert.equal(buildCreateOrderRequest(draft).receive[0].beginAcceptTime, '一小时内')
      assert.ok(findExpressPickupTimeSelection(response, draft.pickup))
    }
  },
  {
    name: 'pickup time request source follows the scanned role',
    run() {
      const draft = createValidExpressDraft()
      const sourceOf = role => buildPickupTimeRequest(applyExpressScanContext(draft, { role, value: 'SCAN_001' })).source

      assert.equal(buildPickupTimeRequest(draft).source, 0)
      assert.equal(sourceOf('pickupManId'), 1)
      assert.equal(sourceOf('shipperNumber'), 2)
      assert.equal(sourceOf('acceptDept'), 3)
      assert.equal(sourceOf('driverId'), 5)
    }
  },
  {
    name: 'express night pickup capability uses address key and two hour cache',
    run() {
      const checkedAt = Date.UTC(2026, 6, 13, 8)
      const draft = createValidExpressDraft()
      const request = buildExpressPickupNightRequest(draft)
      const capability = createExpressPickupNightCapability(
        draft,
        {
          nightPickUpEnable: true,
          startTime: '18:00:00',
          endTime: '23:00:00'
        },
        checkedAt
      )
      const capableDraft = {
        ...draft,
        pickup: {
          ...draft.pickup,
          nightCapability: capability
        }
      }
      const pickupRequest = buildPickupTimeRequest(capableDraft, capability)

      assert.deepEqual(request, {
        province: '上海市',
        city: '上海市',
        county: '青浦区',
        address: '徐泾镇明珠路100号'
      })
      assert.equal(pickupRequest.nightOpening, 'Y')
      assert.equal(pickupRequest.nightStartTime, '18:00:00')
      assert.equal(pickupRequest.nightEndTime, '23:00:00')
      assert.equal(getFreshExpressPickupNightCapability(capableDraft, checkedAt + EXPRESS_NIGHT_PICKUP_CACHE_MS - 1).enabled, true)
      assert.equal(getFreshExpressPickupNightCapability(capableDraft, checkedAt + EXPRESS_NIGHT_PICKUP_CACHE_MS), undefined)
      assert.equal(
        getFreshExpressPickupNightCapability(
          {
            ...capableDraft,
            sender: {
              ...capableDraft.sender,
              address: '盈港东路200号'
            }
          },
          checkedAt + 1
        ),
        undefined
      )
    }
  },
  {
    name: 'express pickup service composes night capability before time slots',
    async run() {
      const originalNight = expressApi.queryPickupNight
      const originalPickupTime = expressApi.queryPickupTime
      let nightCalls = 0
      let pickupRequest = null

      expressApi.queryPickupNight = async request => {
        nightCalls += 1
        assert.equal(request.address, '徐泾镇明珠路100号')

        return {
          status: true,
          result: {
            nightPickUpEnable: true,
            startTime: '18:00:00',
            endTime: '23:00:00'
          },
          message: ''
        }
      }
      expressApi.queryPickupTime = async request => {
        pickupRequest = request

        return {
          status: true,
          result: {
            serviceTime: '2026-07-13 12:00:00',
            opening: true,
            openingList: [],
            nightOpeningList: [
              {
                date: '2026-07-14',
                dateList: [
                  {
                    time: '20:00-22:00',
                    text: '20:00-22:00',
                    type: 'NORMAL'
                  }
                ]
              }
            ]
          },
          message: ''
        }
      }

      try {
        const response = await expressService.queryPickupTime(createValidExpressDraft())

        assert.equal(nightCalls, 1)
        assert.equal(pickupRequest.nightOpening, 'Y')
        assert.equal(pickupRequest.nightStartTime, '18:00:00')
        assert.equal(pickupRequest.nightEndTime, '23:00:00')
        assert.equal(response.result.openingList[0].dateList[0].type, 'NIGHT')
        assert.equal(response.result.nightCapability.enabled, true)
      } finally {
        expressApi.queryPickupNight = originalNight
        expressApi.queryPickupTime = originalPickupTime
      }
    }
  },
  {
    name: 'express pickup time merges normal night and disabled windows',
    run() {
      const response = normalizeExpressPickupTimeResponse({
        serviceTime: '2026-07-13 12:00:00',
        opening: true,
        openingList: [
          {
            date: '2026-07-14',
            dateList: [
              {
                time: '19:00-20:00',
                text: '一小时上门',
                type: 'NORMAL'
              },
              {
                time: '10:00-12:00',
                text: '10:00-12:00',
                type: 'NORMAL'
              }
            ]
          }
        ],
        nightOpeningList: [
          {
            date: '2026-07-14',
            dateList: [
              {
                time: '19:00-20:00',
                text: '一小时上门',
                type: 'NORMAL'
              },
              {
                time: '20:00-22:00',
                text: '20:00-22:00',
                type: 'NORMAL'
              }
            ]
          }
        ],
        blankOpeningList: [
          {
            date: '2026-07-14',
            dateList: [
              {
                time: '18:00-19:00',
                text: '18:00-19:00',
                type: 'NORMAL'
              }
            ]
          }
        ]
      })
      const options = createExpressPickupDateOptions(response)

      assert.equal(response.openingList.length, 1)
      assert.deepEqual(
        response.openingList[0].dateList.map(item => item.type),
        ['NORMAL', 'DISABLE', 'NIGHT', 'NIGHT']
      )
      assert.equal(
        response.openingList[0].dateList.some(item => item.type === 'NORMAL' && item.text.includes('小时')),
        false
      )
      assert.equal(options[0].timeOptions[1].disabled, true)
      assert.equal(options[0].timeOptions[2].night, true)
      assert.equal(
        getFirstExpressPickupTimeSelection({
          ...response,
          openingList: [
            {
              date: '2026-07-14',
              dateList: response.openingList[0].dateList.filter(item => item.type === 'NIGHT')
            }
          ]
        }),
        null
      )
    }
  },
  {
    name: 'express night pickup preserves valid selection and enforces Beijing cutoff',
    run() {
      const beforeCutoff = new Date('2026-07-13T09:59:00.000Z')
      const atCutoff = new Date('2026-07-13T10:00:00.000Z')
      const draft = createValidExpressDraft()
      const capability = createExpressPickupNightCapability(
        draft,
        {
          nightPickUpEnable: true,
          startTime: '18:00:00',
          endTime: '23:00:00'
        },
        beforeCutoff.getTime()
      )
      const response = normalizeExpressPickupTimeResponse(
        {
          serviceTime: '2026-07-13 12:00:00',
          opening: true,
          openingList: [
            {
              date: '2026-07-13',
              dateList: [
                {
                  time: '14:00-16:00',
                  text: '14:00-16:00',
                  type: 'NORMAL'
                }
              ]
            }
          ],
          nightOpeningList: [
            {
              date: '2026-07-13',
              dateList: [
                {
                  time: '20:00-22:00',
                  text: '20:00-22:00',
                  type: 'NORMAL'
                }
              ]
            }
          ]
        },
        capability
      )
      let selected = selectExpressPickupTime(
        {
          ...draft,
          pickup: {
            ...draft.pickup,
            nightCapability: capability
          }
        },
        {
          date: '2026-07-13',
          time: '20:00-22:00',
          text: '20:00-22:00',
          type: 'NIGHT'
        }
      )

      selected = acceptExpressNightPickupNotice(selected)

      assert.equal(selected.pickup.type, 'NIGHT')
      assert.equal(selected.pickup.nightNoticeAccepted, true)
      assert.deepEqual(
        validateExpressPickupTime(selected, {
          now: beforeCutoff
        }),
        []
      )
      assert.equal(isExpressNightPickupTimeValid(selected.pickup.time, atCutoff), false)
      assert.equal(isExpressNightPickupTimeValid('2026-07-14 06:00-08:00', atCutoff), true)
      assert.equal(findExpressPickupTimeSelection(response, selected.pickup).type, 'NIGHT')

      const refreshed = applyExpressPickupTime(selected, response)
      const selfSent = updateExpressPickup(refreshed, { dispatch: 'N' })

      assert.equal(refreshed.pickup.type, 'NIGHT')
      assert.equal(refreshed.pickup.nightNoticeAccepted, true)
      assert.equal(selfSent.pickup.type, 'NORMAL')
      assert.equal(selfSent.pickup.time, '')
      assert.equal(selfSent.pickup.nightCapability, undefined)
    }
  },
  {
    name: 'express night pickup maps quote order and quick pickup fields',
    run() {
      const now = Date.now()
      let draft = createValidExpressDraft()
      const capability = createExpressPickupNightCapability(
        draft,
        {
          nightPickUpEnable: true,
          startTime: '18:00:00',
          endTime: '23:00:00'
        },
        now
      )

      draft = selectExpressPickupTime(
        {
          ...draft,
          pickup: {
            ...draft.pickup,
            nightCapability: capability,
            pickPeriodTime: 2
          }
        },
        {
          date: '2026-07-14',
          time: '20:00-22:00',
          text: '20:00-22:00',
          type: 'NIGHT'
        }
      )
      draft = acceptExpressNightPickupNotice(draft)
      draft = selectExpressProduct(draft, expressProduct)

      const freightRequest = buildFreightRequest(draft)
      const orderRequest = buildCreateOrderRequest(draft)

      assert.equal(freightRequest.nightAccept, 'Y')
      assert.equal(freightRequest.nightAcceptServiceTime, '20:00-22:00')
      assert.deepEqual(orderRequest.receive[0].orderExtendFields, [
        { key: 'nightAccept', value: 'Y' },
        { key: 'nightAcceptStatus', value: -1 },
        { key: 'productPrice', value: '28' }
      ])

      const quickDraft = {
        ...createValidExpressDraft(),
        pickup: {
          ...createValidExpressDraft().pickup,
          time: '2026-07-14 10:00:00',
          timeSlot: '下单后 1 小时内',
          pickPeriodTime: 1
        }
      }
      const quickRequest = buildCreateOrderRequest(quickDraft)

      assert.equal(quickRequest.receive[0].beginAcceptTime, '下单后 1 小时内')
      assert.equal(quickRequest.receive[0].currentFirstTime, 'Y')
      assert.deepEqual(quickRequest.receive[0].orderExtendFields, [
        { key: 'nightAccept', value: 'N' },
        { key: 'productPrice', value: '28' }
      ])

      assert.equal(normalizeExpressPickup({ type: 0 }).type, 'NORMAL')
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
