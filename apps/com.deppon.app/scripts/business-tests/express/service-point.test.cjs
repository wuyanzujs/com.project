require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { setExpressContact, updateExpressGoods, updateExpressPickup, validateExpressDraft } = require('@/services/express/core/express.draft')
const { buildCreateOrderRequest } = require('@/services/express/core/express.payload')
const { applyExpressServicePoint, applyExpressServicePointCandidates } = require('@/services/express/pickup/servicePoint.rules')
const { getStationMatchTypes, normalizeAddressStation } = require('@/services/query/query.station')
const { stationSelection } = require('@/services/query/stationSelection')

const { createValidExpressDraft } = require('../fixtures/express.cjs')
const { createDeferred } = require('../support/deferred.cjs')
const { createReactHarness, loadReactModule } = require('../support/react-harness.cjs')

function createSelfSendDraft() {
  return updateExpressPickup(createValidExpressDraft(), { dispatch: 'N' })
}

function station(patch = {}) {
  return {
    ...normalizeAddressStation({
      deptNo: 'INTERNAL_NO',
      deptCode: 'DEPT_CODE',
      deptName: '青浦服务点',
      deptAddress: '明珠路200号',
      distance: 2,
      pickupSelf: false,
      businessScope: '快递',
      baiduLat: '',
      baiduLng: '',
      startTime: '08:00',
      endTime: '18:00'
    }),
    ...patch
  }
}

test('自送网点使用寄件地址和 leave 匹配，收件自提来源保持隔离', () => {
  const draft = createSelfSendDraft()
  const params = stationSelection.createParams('EXPRESS_SERVICE_POINT', { ...draft.sender, town: '徐泾镇', address: '明珠路100号' }, 'DEPT_CODE')
  const parsed = stationSelection.parseParams(params)

  assert.equal(parsed.source, 'EXPRESS_SERVICE_POINT')
  assert.equal(parsed.address, '徐泾镇明珠路100号')
  assert.equal(parsed.selectedCode, 'DEPT_CODE')
  assert.deepEqual(stationSelection.createQuery(parsed), {
    province: '上海市',
    city: '上海市',
    county: '青浦区',
    address: '徐泾镇明珠路100号',
    type: 'LEAVE',
    subType: 'EXPRESS'
  })
  assert.deepEqual(getStationMatchTypes('LEAVE', 'EXPRESS'), ['leave'])
  assert.equal(stationSelection.createQuery(stationSelection.createParams('EXPRESS_DELIVERY_POINT', draft.consignee)).type, 'PICKUP')
  assert.equal(stationSelection.createAddressKey(draft.sender), stationSelection.createAddressKey(parsed))
  assert.equal(stationSelection.createAddressKey({ ...draft.sender, address: '' }), '')

  stationSelection.select(parsed.source, station(), parsed)
  assert.equal(stationSelection.consumeSelection('EXPRESS_DELIVERY_POINT'), null)
  const selection = stationSelection.consumeSelection(parsed.source)
  assert.equal(selection.station.code, 'DEPT_CODE')
  assert.equal(selection.addressKey, stationSelection.createAddressKey(draft.sender))
  assert.equal(stationSelection.consumeSelection(parsed.source), null)
})

test('自送仅保留 20 公里内地址匹配的有效网点，按距离排序且不要求收件自提标记', () => {
  const near = station({ distanceKm: 0 })
  const boundary = station({ code: 'BOUNDARY', distanceKm: 20 })
  const filtered = stationSelection.filterResult('EXPRESS_SERVICE_POINT', {
    list: [
      boundary,
      station({ distanceKm: 20.01 }),
      station({ distanceKm: null }),
      station({ distanceKm: -1 }),
      station({ code: '' }),
      station({ name: ' ' }),
      station({ source: 'City' }),
      near
    ],
    totalRows: 8,
    source: 'Address'
  })

  assert.deepEqual(filtered.list, [near, boundary])
  assert.equal(filtered.totalRows, 2)
  assert.equal(filtered.list[0].pickupSelf, false)
})

test('自送选择回填 deptCode 并映射下单起始网点，切换模式或寄件地址后清空', () => {
  const draft = createSelfSendDraft()
  const key = stationSelection.createAddressKey(draft.sender)
  const selected = applyExpressServicePoint(draft, station(), key)
  const request = buildCreateOrderRequest(selected)

  assert.equal(selected.pickup.stationCode, 'DEPT_CODE')
  assert.equal(selected.pickup.stationName, '青浦服务点')
  assert.equal(selected.selectedProduct, null)
  assert.equal(request.startStation, 'DEPT_CODE')
  assert.equal(request.startStationName, '青浦服务点')
  assert.equal(request.dispatchFlag, 'N')
  assert.equal(updateExpressPickup(selected, { dispatch: 'Y' }).pickup.stationCode, '')
  assert.equal(setExpressContact(selected, 'sender', { ...draft.sender, address: '明珠路101号' }).pickup.stationCode, '')
})

test('旧地址、已切换上门和缺少地址上下文的返回结果不得覆盖草稿', () => {
  const draft = createSelfSendDraft()
  const key = stationSelection.createAddressKey(draft.sender)
  const moved = setExpressContact(draft, 'sender', { ...draft.sender, address: '另一条路' })
  const pickupDraft = updateExpressPickup(draft, { dispatch: 'Y' })

  assert.equal(applyExpressServicePoint(moved, station(), key), moved)
  assert.equal(applyExpressServicePoint(pickupDraft, station(), key), pickupDraft)
  assert.equal(applyExpressServicePoint(draft, station(), ''), draft)
  assert.equal(applyExpressServicePoint(draft, station({ code: '' }), key), draft)
})

test('默认最近网点，保留有效手动选择，无匹配结果允许空网点', () => {
  const draft = createSelfSendDraft()
  const key = stationSelection.createAddressKey(draft.sender)
  const nearest = station()
  const farther = station({ code: 'ANOTHER_CODE', name: '另一个服务点' })
  const automatic = applyExpressServicePointCandidates(draft, [nearest, farther], key)
  const manual = applyExpressServicePoint(draft, farther, key)

  assert.equal(automatic.pickup.stationCode, 'DEPT_CODE')
  assert.equal(applyExpressServicePointCandidates(manual, [nearest, farther], key), manual)
  assert.equal(applyExpressServicePointCandidates(manual, [nearest], key).pickup.stationCode, 'DEPT_CODE')
  const empty = applyExpressServicePointCandidates(manual, [], key)
  assert.equal(empty.pickup.stationCode, '')
  assert.equal(empty.pickup.stationName, '')
  assert.equal(buildCreateOrderRequest(empty).startStation, '')
  assert.equal(validateExpressDraft(empty).valid, true)
})

test('修改货物按快递/零担切换自送网点，仍有效的取件时间保留', () => {
  const draft = createSelfSendDraft()
  const selected = applyExpressServicePoint(draft, station(), stationSelection.createAddressKey(draft.sender))
  const withOldSchedule = { ...selected, pickup: { ...selected.pickup, time: '2026-10-20 10:00', timeSlot: '10:00-11:00' } }
  const changed = updateExpressGoods(withOldSchedule, { name: '衣物', weight: 2 })

  assert.equal(changed.pickup.stationCode, '')
  assert.equal(changed.pickup.stationName, '')
  assert.equal(changed.pickup.time, '2026-10-20 10:00')
  assert.equal(changed.pickup.timeSlot, '10:00-11:00')
  assert.equal(buildCreateOrderRequest(changed).startStation, '')
  assert.equal(setExpressContact(changed, 'sender', { ...draft.sender, address: '另一条路' }).pickup.stationCode, '')
  assert.equal(updateExpressPickup(changed, { dispatch: 'Y' }).pickup.stationCode, '')

  const pickupDraft = { ...withOldSchedule, pickup: { ...withOldSchedule.pickup, dispatch: 'Y' } }
  assert.equal(updateExpressGoods(pickupDraft, { weight: 2 }).pickup.stationCode, '')

  const ltlDraft = updateExpressGoods(withOldSchedule, { weight: 61 })
  const ltlSelected = applyExpressServicePoint(ltlDraft, station(), stationSelection.createAddressKey(draft.sender))
  assert.equal(updateExpressGoods(ltlSelected, { weight: 62 }).pickup.stationCode, 'DEPT_CODE')
})

function createServicePointHookFixture(t) {
  const harness = createReactHarness()
  const requests = []
  let draft = createSelfSendDraft()
  let onShow
  const setDraft = update => {
    draft = typeof update === 'function' ? update(draft) : update
  }
  const { useExpressServicePoint } = loadReactModule('pages/express/hooks/useExpressServicePoint.ts', {
    react: harness.react,
    '@tarojs/taro': {
      useDidShow: callback => {
        onShow = callback
      }
    },
    '@/services/express/pickup/servicePoint.rules': require('@/services/express/pickup/servicePoint.rules'),
    '@/services/query': {
      stationSelection,
      queryService: {
        queryStations: t.mock.fn(() => {
          const pending = createDeferred()
          requests.push(pending)
          return pending.promise
        })
      }
    }
  })
  return {
    requests,
    harness,
    getDraft: () => draft,
    setDraft,
    show: () => onShow(),
    render: () => harness.render(() => useExpressServicePoint({ draft, setDraft }))
  }
}

test('用户手动回填后，较早发出的默认网点查询不得覆盖新选择', async t => {
  const fixture = createServicePointHookFixture(t)
  fixture.render()
  assert.equal(fixture.requests.length, 1)

  const manualStation = station({ code: 'MANUAL_CODE', name: '手动选择服务点' })
  const params = stationSelection.createParams('EXPRESS_SERVICE_POINT', fixture.getDraft().sender)
  stationSelection.select('EXPRESS_SERVICE_POINT', manualStation, params)
  fixture.show()
  fixture.render()
  assert.equal(fixture.getDraft().pickup.stationCode, 'MANUAL_CODE')

  fixture.requests[0].resolve({ status: true, result: { list: [station()], totalRows: 1 } })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(fixture.getDraft().pickup.stationCode, 'MANUAL_CODE')
  assert.equal(fixture.getDraft().pickup.stationName, '手动选择服务点')
  assert.equal(fixture.requests.length, 1)
  fixture.harness.unmount()
})

test('默认网点查询在地址变化或卸载后到达时，不得回填旧地址服务点', async t => {
  const fixture = createServicePointHookFixture(t)
  fixture.render()
  fixture.setDraft(current => setExpressContact(current, 'sender', { ...current.sender, address: '另一条路' }))
  fixture.render()
  assert.equal(fixture.requests.length, 2)

  fixture.requests[0].resolve({ status: true, result: { list: [station()], totalRows: 1 } })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(fixture.getDraft().pickup.stationCode, '')

  fixture.harness.unmount()
  fixture.requests[1].resolve({ status: true, result: { list: [station({ code: 'AFTER_UNMOUNT' })], totalRows: 1 } })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(fixture.getDraft().pickup.stationCode, '')
})
