require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { CACHE_KEYS, createCacheStorageKey } = require('@/cache/keys')
const { getStorageValue, removeStorageValue, setStorageValue } = require('@/cache/storage')
const { shouldShowExpressCouponRow } = require('@/services/express/billing/couponOrder.rules')
const {
  applyExpressPickupTime,
  createExpressDraft,
  isExpressOrderFormReady,
  selectExpressProduct,
  setExpressContact,
  swapExpressContacts,
  updateExpressCouponNumber,
  updateExpressGoods,
  updateExpressPickup,
  updateExpressService,
  validateExpressDraft
} = require('@/services/express/core/express.draft')
const { updateExpressDeliveryPreference } = require('@/services/express/delivery/deliveryPreference.rules')
const { expressDraftStorage } = require('@/services/express/draft/draftStorage')

const { createValidExpressDraft, expressProduct, senderContact } = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'express draft validation accepts complete draft',
    run() {
      const result = validateExpressDraft(createValidExpressDraft(), {
        requireAgreement: true,
        requireProduct: true
      })

      assert.equal(result.valid, true)
      assert.deepEqual(result.messages, [])
    }
  },
  {
    name: 'express draft validation rejects missing agreement, product and identical addresses',
    run() {
      const draft = {
        ...createValidExpressDraft(),
        consignee: {
          ...senderContact,
          name: '李四',
          mobile: '13900139000'
        },
        selectedProduct: null,
        agreementAccepted: false
      }
      const result = validateExpressDraft(draft, {
        requireAgreement: true,
        requireProduct: true
      })

      assert.equal(result.valid, false)
      assert.ok(result.messages.includes('寄件地址和收件地址不能完全一致'))
      assert.ok(result.messages.includes('请先获取并选择产品价格'))
      assert.ok(result.messages.includes('请先勾选电子运单协议'))
    }
  },
  {
    name: 'express mutations clear selected quote when draft inputs change',
    run() {
      const draft = createValidExpressDraft()

      const goodsDraft = updateExpressGoods(draft, { name: '家具' })
      const serviceDraft = updateExpressService(draft, {
        paymentType: 'MONTH_PAY'
      })
      const pickupDraft = updateExpressPickup(draft, { dispatch: 'N' })

      assert.equal(goodsDraft.goods.name, '家具')
      assert.equal(goodsDraft.selectedProduct, null)
      assert.equal(goodsDraft.quoteStaleReason, '货物信息变化，请重新获取价格')
      assert.equal(serviceDraft.service.paymentType, 'MONTH_PAY')
      assert.equal(serviceDraft.quoteStaleReason, '服务方式变化，请重新获取价格')
      assert.equal(pickupDraft.pickup.dispatch, 'N')
      assert.equal(pickupDraft.quoteStaleReason, '取件方式变化，请重新获取价格')

      const preferenceDraft = updateExpressDeliveryPreference(draft, {
        type: 'NOTIFY_SENDER'
      })
      const selfPickupWithPreference = updateExpressService(preferenceDraft, {
        deliveryMode: 'PICKSELF'
      })

      assert.equal(selfPickupWithPreference.deliveryPreference.type, '')
    }
  },
  {
    name: 'express mutations normalize coupon and map pickup response',
    run() {
      const couponDraft = updateExpressCouponNumber(createValidExpressDraft(), ' cp n 001 ')
      const pickupDraft = applyExpressPickupTime(createValidExpressDraft(), {
        deptCode: '021A001',
        deptName: '青浦服务点',
        serviceTime: '09:00-18:00',
        opening: true,
        openingList: [
          {
            date: '2026-07-14',
            dateList: [
              {
                time: '10:00-12:00',
                text: '上午',
                type: 'NORMAL'
              }
            ]
          }
        ],
        endTime: '2026-07-14 18:00:00',
        pickPeriodTime: 2
      })

      assert.equal(couponDraft.couponNumber, 'CPN001')
      assert.equal(couponDraft.selectedProduct, null)
      assert.equal(pickupDraft.pickup.time, '2026-07-14 10:00-12:00')
      assert.equal(pickupDraft.pickup.timeSlot, '上午')
      assert.equal(pickupDraft.pickup.stationCode, '021A001')
      assert.equal(pickupDraft.pickup.stationName, '青浦服务点')
      assert.equal(pickupDraft.pickup.endTime, '2026-07-14 18:00:00')
      assert.equal(pickupDraft.pickup.pickPeriodTime, 2)
    }
  },
  {
    name: 'express mutations select product and reset cross-region pickup state',
    run() {
      const selectedDraft = selectExpressProduct(createExpressDraft(), expressProduct)
      const draftWithPickup = {
        ...createValidExpressDraft(),
        pickup: {
          ...createValidExpressDraft().pickup,
          time: '2026-07-14 10:00-12:00',
          endTime: '2026-07-14 18:00:00',
          timeSlot: '上午',
          stationCode: '021A001',
          stationName: '青浦服务点'
        }
      }
      const swappedDraft = swapExpressContacts(draftWithPickup)

      assert.equal(selectedDraft.selectedProduct, expressProduct)
      assert.equal(selectedDraft.service.transportMode, 'PACKAGE')
      assert.equal(selectedDraft.quoteStaleReason, '')
      assert.equal(swappedDraft.sender.name, '李四')
      assert.equal(swappedDraft.consignee.name, '张三')
      assert.equal(swappedDraft.pickup.time, '')
      assert.equal(swappedDraft.pickup.stationCode, '')
      assert.equal(swappedDraft.quoteStaleReason, '收寄地址互换，请重新获取价格')

      const senderUpdated = setExpressContact(createValidExpressDraft(), 'sender', {
        ...senderContact,
        city: '苏州市'
      })
      assert.equal(senderUpdated.selectedProduct, null)
      assert.equal(senderUpdated.pickup.time, '')
      assert.equal(senderUpdated.quoteStaleReason, '寄件地址变化，请重新获取价格')
    }
  },
  {
    name: 'express form readiness and coupon row visibility follow production state gates',
    run() {
      const empty = createExpressDraft()
      const draft = createValidExpressDraft()

      assert.equal(isExpressOrderFormReady(empty), false)
      assert.equal(isExpressOrderFormReady(draft), true)
      assert.equal(isExpressOrderFormReady({ ...draft, consignee: null }), false)
      assert.equal(isExpressOrderFormReady({ ...draft, sender: { ...draft.sender, address: '  ' } }), false)
      assert.equal(isExpressOrderFormReady({ ...draft, goods: { ...draft.goods, name: '' } }), false)
      assert.equal(isExpressOrderFormReady({ ...draft, goods: { ...draft.goods, weight: 0 } }), false)

      assert.equal(shouldShowExpressCouponRow({ available: 0, unavailable: 0, requestReady: false, selected: false, status: 'idle' }), false)
      assert.equal(shouldShowExpressCouponRow({ available: 0, unavailable: 0, requestReady: false, selected: true, status: 'idle' }), true)
      assert.equal(shouldShowExpressCouponRow({ available: 1, unavailable: 0, requestReady: true, selected: false, status: 'done' }), true)
      assert.equal(shouldShowExpressCouponRow({ available: 0, unavailable: 1, requestReady: true, selected: false, status: 'done' }), true)
      assert.equal(shouldShowExpressCouponRow({ available: 0, unavailable: 0, requestReady: true, selected: false, status: 'loading' }), true)
      assert.equal(shouldShowExpressCouponRow({ available: 0, unavailable: 0, requestReady: true, selected: false, status: 'done' }), true)
      assert.equal(shouldShowExpressCouponRow({ available: 0, unavailable: 0, requestReady: true, selected: false, status: 'idle' }), false)
      assert.equal(shouldShowExpressCouponRow({ available: 0, unavailable: 0, requestReady: true, selected: false, status: 'error' }), true)
    }
  },
  {
    name: 'restored draft drops a stale quote reason when no product is selected',
    async run() {
      const storageKey = createCacheStorageKey(CACHE_KEYS.expressDraft)
      const originalStorageValue = getStorageValue(storageKey)

      try {
        await expressDraftStorage.save({
          ...createValidExpressDraft(),
          selectedProduct: null,
          quoteStaleReason: '寄件地址变化，请重新获取价格'
        })
        assert.equal(expressDraftStorage.restore().quoteStaleReason, '')

        await expressDraftStorage.save({
          ...createValidExpressDraft(),
          quoteStaleReason: '货物信息变化，请重新获取价格'
        })
        assert.equal(expressDraftStorage.restore().quoteStaleReason, '货物信息变化，请重新获取价格')
      } finally {
        if (originalStorageValue) {
          await setStorageValue(storageKey, originalStorageValue)
        } else {
          await removeStorageValue(storageKey)
        }
      }
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
