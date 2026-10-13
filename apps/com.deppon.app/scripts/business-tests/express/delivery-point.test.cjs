require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const {
  createExpressDeliveryPointDraft,
  getExpressDeliveryPointOrderFields,
  normalizeExpressDeliveryPointDraft,
  updateExpressDeliveryPoint
} = require('@/services/express/deliveryPoint.rules')
const { expressDraftBridge } = require('@/services/express/draftBridge')
const {
  setExpressContact,
  updateExpressService
} = require('@/services/express/express.draft')
const {
  buildCreateOrderRequest
} = require('@/services/express/express.payload')
const {
  EXPRESS_DELIVERY_POINT_MAX_DISTANCE_KM,
  stationSelection
} = require('@/services/query')
const {
  getStationMatchTypes,
  normalizeAddressStation
} = require('@/services/query/query.station')

const {
  consigneeContact,
  createValidExpressDraft
} = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'express delivery point selection keeps pickup-self stations within twenty kilometers',
    run() {
      const addressStation = normalizeAddressStation({
        deptNo: 'DP_NO_001',
        deptCode: 'DP_CODE_001',
        deptName: '深圳南山自提点',
        deptAddress: '深圳市南山区科技园',
        distance: 6.5,
        contactway: '0755-12345678',
        businessScope: '快递 自提',
        baiduLat: '22.5401',
        baiduLng: '113.9345',
        pickupSelf: true,
        matchAddress: '科技园',
        startTime: '08:00',
        endTime: '20:00'
      })
      const params = stationSelection.createParams(
        'EXPRESS_DELIVERY_POINT',
        {
          province: '广东省',
          city: '深圳市',
          county: '南山区',
          town: '粤海街道',
          address: '科技园科苑路200号'
        },
        'DP_NO_001'
      )
      const farStation = {
        ...addressStation,
        id: 'DP_NO_FAR',
        distance: '20.01km',
        distanceKm: EXPRESS_DELIVERY_POINT_MAX_DISTANCE_KM + 0.01
      }
      const boundaryStation = {
        ...addressStation,
        id: 'DP_NO_BOUNDARY',
        distance: '20km',
        distanceKm: EXPRESS_DELIVERY_POINT_MAX_DISTANCE_KM
      }
      const negativeDistanceStation = {
        ...addressStation,
        id: 'DP_NO_NEGATIVE',
        distance: '-1km',
        distanceKm: -1
      }
      const missingDeptNoStation = {
        ...addressStation,
        id: '',
        code: 'DP_CODE_ONLY'
      }
      const unsupportedStation = {
        ...addressStation,
        id: 'DP_NO_UNSUPPORTED',
        pickupSelf: false
      }
      const cityStation = {
        ...addressStation,
        id: 'DP_CITY',
        source: 'City',
        distance: '',
        distanceKm: null,
        pickupSelf: false
      }
      const filtered = stationSelection.filterResult(params.source, {
        address: {
          province: '广东省',
          provinceCode: '',
          city: '深圳市',
          cityCode: '',
          county: '南山区',
          countyCode: '',
          town: '粤海街道',
          townCode: '',
          address: '科技园科苑路200号',
          fullAddress: '广东省深圳市南山区粤海街道科技园科苑路200号'
        },
        type: 'PICKUP',
        subType: 'EXPRESS',
        list: [
          addressStation,
          boundaryStation,
          farStation,
          negativeDistanceStation,
          missingDeptNoStation,
          unsupportedStation,
          cityStation
        ],
        totalRows: 7,
        source: 'Address'
      })

      assert.deepEqual(getStationMatchTypes('PICKUP', 'EXPRESS'), [
        'expressPickup'
      ])
      assert.equal(addressStation.id, 'DP_NO_001')
      assert.equal(addressStation.code, 'DP_CODE_001')
      assert.equal(addressStation.pickupSelf, true)
      assert.equal(addressStation.distanceKm, 6.5)
      assert.equal(params.address, '粤海街道科技园科苑路200号')
      assert.deepEqual(stationSelection.createQuery(params), {
        province: '广东省',
        city: '深圳市',
        county: '南山区',
        address: '粤海街道科技园科苑路200号',
        type: 'PICKUP',
        subType: 'EXPRESS'
      })
      assert.equal(filtered.totalRows, 2)
      assert.equal(filtered.list[0], addressStation)
      assert.equal(filtered.list[1], boundaryStation)

      stationSelection.select(params.source, addressStation)
      assert.equal(
        stationSelection.consumeSelection(params.source).station.id,
        'DP_NO_001'
      )
      assert.equal(stationSelection.consumeSelection(params.source), null)
    }
  },
  {
    name: 'express delivery point clears with consignee or delivery mode and maps exact order fields',
    run() {
      const selfPickupDraft = updateExpressService(createValidExpressDraft(), {
        deliveryMode: 'PICKSELF'
      })
      const selectedDraft = updateExpressDeliveryPoint(selfPickupDraft, {
        id: 'DP_NO_001',
        code: 'DP_CODE_001',
        name: '深圳南山自提点'
      })
      const deptCodeOnlyDraft = updateExpressDeliveryPoint(selfPickupDraft, {
        id: '',
        code: 'DP_CODE_ONLY',
        name: '缺少统一网点编号的异常数据'
      })
      const orderRequest = buildCreateOrderRequest(selectedDraft)
      const homeDeliveryDraft = updateExpressService(selectedDraft, {
        deliveryMode: 'PICKNOTUPSTAIRS'
      })
      const changedConsigneeDraft = setExpressContact(
        selectedDraft,
        'consignee',
        {
          ...consigneeContact,
          address: '科技园科苑路300号'
        }
      )
      const bridgedDraft = expressDraftBridge.carryFromCoupon(selectedDraft)
      const consumedDraft = expressDraftBridge.consume().draft

      assert.deepEqual(createExpressDeliveryPointDraft(), {
        code: '',
        name: ''
      })
      assert.deepEqual(selectedDraft.deliveryPoint, {
        code: 'DP_NO_001',
        name: '深圳南山自提点'
      })
      assert.deepEqual(deptCodeOnlyDraft.deliveryPoint, {
        code: '',
        name: ''
      })
      assert.deepEqual(getExpressDeliveryPointOrderFields(deptCodeOnlyDraft), {
        receivingToPoint: '',
        receivingToPointName: ''
      })
      assert.equal(selectedDraft.selectedProduct, null)
      assert.equal(
        selectedDraft.quoteStaleReason,
        '自提服务点变化，请重新获取价格'
      )
      assert.deepEqual(getExpressDeliveryPointOrderFields(selectedDraft), {
        receivingToPoint: 'DP_NO_001',
        receivingToPointName: '深圳南山自提点'
      })
      assert.equal(orderRequest.receive[0].receivingToPoint, 'DP_NO_001')
      assert.equal(
        orderRequest.receive[0].receivingToPointName,
        '深圳南山自提点'
      )
      assert.deepEqual(homeDeliveryDraft.deliveryPoint, {
        code: '',
        name: ''
      })
      assert.deepEqual(changedConsigneeDraft.deliveryPoint, {
        code: '',
        name: ''
      })
      assert.deepEqual(consumedDraft.deliveryPoint, selectedDraft.deliveryPoint)
      assert.deepEqual(
        normalizeExpressDeliveryPointDraft(
          { code: 'DP_NO_001', name: '深圳南山自提点' },
          'PICKNOTUPSTAIRS'
        ),
        { code: '', name: '' }
      )
      assert.equal(bridgedDraft, undefined)
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
