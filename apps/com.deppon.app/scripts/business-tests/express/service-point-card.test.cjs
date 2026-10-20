require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { createExpressDraft, setExpressContact, updateExpressPickup } = require('@/services/express/express.draft')
const { applyExpressPickupTime } = require('@/services/express/express.mutations')
const { normalizeExpressPickup } = require('@/services/express/pickupTime.rules')
const { applyExpressServicePoint, createExpressPickupStationDetail } = require('@/services/express/servicePoint.rules')
const { normalizeAddressStation } = require('@/services/query/query.station')
const { stationSelection } = require('@/services/query/stationSelection')

const { createValidExpressDraft } = require('../fixtures/express.cjs')
const { createReactHarness, findElement, loadReactModule } = require('../support/react-harness.cjs')

function createSelfSendDraft() {
  return updateExpressPickup(createValidExpressDraft(), { dispatch: 'N' })
}

function station(patch = {}) {
  return {
    ...normalizeAddressStation({
      deptNo: 'INTERNAL_NO',
      deptCode: 'DEPT_CODE',
      deptName: '上海青浦区徐泾镇经营分部',
      deptAddress: '华徐公路628号虹桥奇点科创园F栋',
      contactway: '021-60382670',
      distance: 3.2,
      pickupSelf: false,
      businessScope: '快递',
      baiduLat: '31.197',
      baiduLng: '121.297',
      startTime: '08:00',
      endTime: '19:00'
    }),
    ...patch
  }
}

test('自送网点展示信息取地址、主号码、空格分隔的营业时间和坐标', () => {
  assert.deepEqual(createExpressPickupStationDetail(station()), {
    address: '华徐公路628号虹桥奇点科创园F栋',
    phone: '021-60382670',
    hours: '周一至周日 08:00-19:00',
    longitude: '121.297',
    latitude: '31.197'
  })
  // 只有星期文案时保留原文，不补时段。
  assert.equal(createExpressPickupStationDetail(station({ time: '周一至周日' })).hours, '周一至周日')
})

test('选中自送网点后草稿带展示信息，网点未变只补信息不判定报价过期', () => {
  const draft = createSelfSendDraft()
  const key = stationSelection.createAddressKey(draft.sender)
  const selected = applyExpressServicePoint(draft, station(), key)

  assert.equal(selected.pickup.stationDetail.address, '华徐公路628号虹桥奇点科创园F栋')
  assert.equal(selected.pickup.stationDetail.phone, '021-60382670')
  assert.equal(selected.pickup.stationDetail.hours, '周一至周日 08:00-19:00')
  assert.equal(selected.quoteStaleReason, '自送服务点变化，请重新获取价格')

  const quoted = { ...selected, selectedProduct: null, quoteStaleReason: '' }
  const refilled = applyExpressServicePoint(quoted, station(), key)
  assert.equal(refilled.quoteStaleReason, '', '同网点只补展示信息时不清空报价')
  assert.equal(refilled.pickup.stationDetail.hours, '周一至周日 08:00-19:00')
  assert.equal(applyExpressServicePoint(refilled, station(), key), refilled, '信息一致时返回原草稿')

  const moved = applyExpressServicePoint(quoted, station({ code: 'OTHER_CODE', name: '另一个服务点' }), key)
  assert.equal(moved.pickup.stationCode, 'OTHER_CODE')
  assert.equal(moved.pickup.stationDetail.hours, '周一至周日 08:00-19:00')
  assert.equal(moved.quoteStaleReason, '自送服务点变化，请重新获取价格')
})

test('切换上门取件、修改货物或寄件地址后清空网点展示信息', () => {
  const draft = createSelfSendDraft()
  const selected = applyExpressServicePoint(draft, station(), stationSelection.createAddressKey(draft.sender))

  assert.equal(updateExpressPickup(selected, { dispatch: 'Y' }).pickup.stationDetail, undefined, '切回上门取件清空展示信息')
  assert.equal(updateExpressPickup(selected, { dispatch: 'N' }).pickup.stationDetail.hours, '周一至周日 08:00-19:00', '保持自送态不清空展示信息')
  assert.equal(setExpressContact(selected, 'sender', { ...draft.sender, address: '明珠路101号' }).pickup.stationDetail, undefined, '寄件地址变化清空展示信息')
  assert.equal(normalizeExpressPickup({ ...selected.pickup, stationDetail: {} }).stationDetail, undefined)
  assert.equal(normalizeExpressPickup({ ...selected.pickup, stationDetail: { address: ' ' } }).stationDetail, undefined)
})

test('取件时间响应换网点时丢弃旧展示信息，同网点时保留', () => {
  const draft = createSelfSendDraft()
  const selected = applyExpressServicePoint(draft, station(), stationSelection.createAddressKey(draft.sender))
  const response = {
    deptCode: 'DEPT_CODE',
    deptName: '上海青浦区徐泾镇经营分部',
    startTime: '08:00',
    endTime: '19:00',
    serviceTime: '今天',
    opening: true,
    openingList: []
  }

  assert.equal(applyExpressPickupTime(selected, response).pickup.stationDetail.hours, '周一至周日 08:00-19:00')
  assert.equal(applyExpressPickupTime(selected, { ...response, deptCode: 'NEW_DEPT' }).pickup.stationDetail, undefined)
  assert.equal(applyExpressPickupTime(createExpressDraft(), response).pickup.stationDetail, undefined)
})

test('自送服务点卡片渲染名称、地址、营业时间与导航/拨号入口', () => {
  const { ExpressServicePointCard } = loadReactModule('pages/express/components/ExpressServicePointCard/index.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/components': { Text: 'Text', View: 'View' },
    '@tarojs/taro': { showToast() {}, navigateBack() {} },
    '@/shared/components': { AppPressable: 'AppPressable' },
    '@/shared/components/AppIcon': { AppIcon: 'AppIcon' },
    '@/shared/platform/capabilities': { getNativeCapabilityErrorMessage: () => '' },
    '@/shared/platform/map': { openMapLocation: async () => {} },
    '@/shared/platform/phone': { dialPhone: async () => '', PhoneNumberError: class extends Error {} },
    '@/styles/nativeTokens': {
      APP_NATIVE_TOKENS: { icon: { small: 20, default: 24 } },
      APP_STYLE_COLORS: { text: { ink: '#111111', secondary: '#475467', placeholder: '#98a2b3' } }
    },
    './index.scss': {}
  })
  const harness = createReactHarness()
  const pickup = { ...createSelfSendDraft().pickup, stationName: '上海青浦区徐泾镇经营分部', stationDetail: createExpressPickupStationDetail(station()) }
  const view = harness.render(() => ExpressServicePointCard({ pickup, onOpenStations() {} }))
  const textOf = element => [element.props?.children].flat(Infinity).join('')
  const byText = value => findElement(view, element => textOf(element) === value)

  const name = byText('上海青浦区徐泾镇经营分部')
  assert.equal(name.props.numberOfLines, 1, '服务点名称保持单行')
  assert.equal(byText('华徐公路628号虹桥奇点科创园F栋').props.numberOfLines, 1, '地址保持单行')
  assert.ok(byText('周一至周日 08:00-19:00'), '营业时间渲染')
  assert.ok(byText('导航'), '导航入口渲染')
  assert.ok(byText('手机'), '拨号入口渲染')
  assert.ok(byText('更多网点'), '更多网点入口渲染')

  const empty = harness.render(() => ExpressServicePointCard({ pickup: { ...pickup, stationName: '', stationDetail: undefined }, onOpenStations() {} }))
  const emptyText = element => [element.props?.children].flat(Infinity).join('')
  assert.ok(
    findElement(empty, element => emptyText(element) === '查看附近服务点'),
    '缺少网点时展示占位文案'
  )
  assert.ok(
    findElement(empty, element => emptyText(element) === '更多网点'),
    '缺少网点时仍可进入网点查询'
  )
  assert.equal(
    findElement(empty, element => emptyText(element) === '周一至周日 08:00-19:00'),
    undefined,
    '缺少网点时不渲染营业时间'
  )
})
