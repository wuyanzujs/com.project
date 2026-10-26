require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { applyExpressPickupTime, isExpressOrderFormReady, selectExpressPickupTime } = require('@/services/express/core/express.draft')
const { createExpressPickupDateOptions } = require('@/services/express/pickup/pickupTime.options')
const { acceptExpressNightPickupNotice } = require('@/services/express/pickup/pickupTime.rules')

const { createValidExpressDraft, expressProduct } = require('../fixtures/express.cjs')
const { createReactHarness, loadReactModule } = require('../support/react-harness.cjs')

function createResponse(date = '2026-10-25') {
  return {
    serviceTime: '2026-10-25 09:00:00',
    opening: true,
    openingList: [
      {
        date,
        dateList: [
          { time: '09:00-11:00', text: '09:00-11:00', type: 'NORMAL' },
          { time: '14:00-16:00', text: '14:00-16:00', type: 'NORMAL' }
        ]
      }
    ],
    blankOpeningList: [],
    nightOpeningList: []
  }
}

function createPickupTime(t, response = createResponse()) {
  const harness = createReactHarness()
  let draft = createValidExpressDraft()
  const queryPickupTime = t.mock.fn(async () => ({ status: true, message: '', result: response }))
  const { useExpressPickupTime } = loadReactModule('pages/express/hooks/useExpressPickupTime.ts', {
    react: harness.react,
    '@/services/express': {
      acceptExpressNightPickupNotice,
      applyExpressPickupTime,
      createExpressPickupDateOptions,
      isExpressOrderFormReady,
      selectExpressPickupTime,
      expressService: { queryPickupTime }
    }
  })

  const setDraft = next => {
    draft = typeof next === 'function' ? next(draft) : next
  }

  return {
    get draft() {
      return draft
    },
    queryPickupTime,
    render: () => harness.render(() => useExpressPickupTime({ draft, setDraft })),
    setDraft(next) {
      draft = next
    }
  }
}

async function flush() {
  await new Promise(resolve => setImmediate(resolve))
  await new Promise(resolve => setImmediate(resolve))
}

test('pickup time loads automatically and selects the first normal slot once the form is ready', async t => {
  const page = createPickupTime(t)

  page.render()
  await flush()

  assert.equal(page.queryPickupTime.mock.callCount(), 1)
  assert.equal(page.draft.pickup.time, '2026-10-25 09:00-11:00')
  assert.equal(page.draft.pickup.timeSlot, '09:00-11:00')
  assert.equal(page.draft.pickup.type, 'NORMAL')

  page.render()
  await flush()
  assert.equal(page.queryPickupTime.mock.callCount(), 1)
})

test('a weight change re-queries pickup slots and keeps the selected slot when it is still available', async t => {
  const page = createPickupTime(t)

  page.render()
  await flush()
  assert.equal(page.draft.pickup.time, '2026-10-25 09:00-11:00')

  page.setDraft({ ...page.draft, goods: { ...page.draft.goods, weight: 5 } })
  page.render()
  page.render()
  await flush()

  assert.equal(page.queryPickupTime.mock.calls.length, 2)
  assert.equal(page.draft.pickup.time, '2026-10-25 09:00-11:00')
})

test('switching products does not re-query pickup slots', async t => {
  const page = createPickupTime(t)

  page.render()
  await flush()
  assert.equal(page.queryPickupTime.mock.callCount(), 1)

  page.setDraft({
    ...page.draft,
    selectedProduct: { ...expressProduct, omsProductCode: 'RCP' },
    service: { ...page.draft.service, transportMode: 'RCP' }
  })
  page.render()
  page.render()
  await flush()

  assert.equal(page.queryPickupTime.mock.callCount(), 1)
  assert.equal(page.draft.pickup.time, '2026-10-25 09:00-11:00')
})

test('self-send mode does not query pickup slots', async t => {
  const page = createPickupTime(t)

  page.setDraft({ ...page.draft, pickup: { ...page.draft.pickup, dispatch: 'N' } })
  page.render()
  await flush()

  assert.equal(page.queryPickupTime.mock.callCount(), 0)
})
