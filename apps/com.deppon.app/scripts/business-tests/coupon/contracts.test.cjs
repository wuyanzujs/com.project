require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { couponService, createCouponDetailView, expressCouponService, validateCouponExchangeCode } = require('@/services/coupon')
const { expressCouponApi } = require('@/services/coupon/expressCoupon.api')
const {
  EXPRESS_COUPON_AUTO_QUERY_DELAY_MS,
  createExpressCouponQueryRequest,
  createExpressCouponRequestKey,
  getExpressCouponOriginalFee
} = require('@/services/express/billing/couponOrder.rules')
const { applyExpressScanContext } = require('@/services/express/core/express.draft')
const { buildCreateOrderRequest, buildFreightRequest } = require('@/services/express/core/express.payload')

const { createValidExpressDraft, expressProduct } = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'coupon exchange code validation follows legacy length guard',
    run() {
      assert.equal(validateCouponExchangeCode(''), '请输入兑换码')
      assert.equal(validateCouponExchangeCode('ABC123'), '请输入正确的兑换码')
      assert.equal(validateCouponExchangeCode(' ABCDE12345 '), '')
      assert.equal(validateCouponExchangeCode('123456789012345678901'), '兑换码不能超过20个字符')
    }
  },
  {
    name: 'coupon card rules normalize amount, tags and use status',
    run() {
      const discountCard = couponService.toCouponCard(
        {
          couponCode: 'CPN001',
          discountType: '4',
          discountFee: 85,
          useFee: 0,
          subFee: 0,
          limitDiscountFee: 1500,
          subTitle: '寄件折扣券',
          startTime: '2026-07-01 00:00:00',
          endTime: '2026-07-31 23:59:59',
          fitWeek: 'Sunday, Monday, BadDay',
          couponLabel: 'EXPIRE',
          businessStatus: '0',
          fitCouponTagList: ['快递', 'App专享', '超出展示上限']
        },
        'USABLE'
      )
      const disabledCard = couponService.toCouponCard(
        {
          couponCode: 'CPN002',
          discountType: '2',
          discountFee: 0,
          useFee: 2000,
          subFee: 500,
          limitDiscountFee: 0,
          subtitle: '满减优惠',
          startTime: '2026/07/01',
          endTime: '2026/08/01',
          businessStatus: '1'
        },
        'USABLE'
      )
      const transferredCard = couponService.toCouponCard(
        {
          couponCode: 'CPN003',
          discountType: '1',
          discountFee: 300,
          useFee: 0,
          subFee: 0,
          limitDiscountFee: 0,
          startTime: '',
          endTime: '2026-09-01',
          businessStatus: '2'
        },
        'EXPIRED'
      )

      assert.equal(discountCard.typeName, '折扣券')
      assert.equal(discountCard.amountValue, '8.5')
      assert.equal(discountCard.amountUnit, '折')
      assert.equal(discountCard.thresholdText, '最高减免15元')
      assert.equal(discountCard.validityText, '2026.07.01-2026.07.31 有效')
      assert.equal(discountCard.usageTimeText, '限周日一使用')
      assert.equal(discountCard.labelText, '即将到期')
      assert.deepEqual(discountCard.tags, ['即将到期', '限周日一使用', '快递', 'App专享'])
      assert.equal(discountCard.canUse, true)
      assert.equal(disabledCard.amountValue, '5')
      assert.equal(disabledCard.thresholdText, '满20元可用')
      assert.equal(disabledCard.canUse, false)
      assert.equal(transferredCard.statusText, '已转赠')
      assert.equal(transferredCard.canUse, false)
    }
  },
  {
    name: 'coupon detail rules split addresses and descriptions',
    run() {
      const detail = createCouponDetailView({
        couponCode: ' CPN001 ',
        fitProduct: ' 精准卡航 ',
        limit: [' 满50元可用 ', '', '不可与其他券同享'],
        couponDescribe: '使用说明一\n\n 使用说明二 ',
        addressList: [
          {
            type: '1',
            address: ' 上海市 '
          },
          {
            type: '2',
            address: ' 深圳市 '
          },
          {
            type: '3',
            address: '忽略地址'
          },
          {
            type: '1',
            address: '  '
          }
        ]
      })
      const emptyDetail = createCouponDetailView({
        couponCode: 'CPN_EMPTY',
        fitProduct: ' ',
        limit: null,
        couponDescribe: null,
        addressList: []
      })

      assert.deepEqual(detail, {
        code: 'CPN001',
        fitProduct: '精准卡航',
        limits: ['满50元可用', '不可与其他券同享'],
        descriptions: ['使用说明一', '使用说明二'],
        senderAddresses: ['上海市'],
        consigneeAddresses: ['深圳市'],
        hasDetail: true
      })
      assert.equal(emptyDetail.hasDetail, false)
      assert.deepEqual(emptyDetail.senderAddresses, [])
      assert.deepEqual(emptyDetail.descriptions, [])
    }
  },
  {
    name: 'express coupon request restores original freight by fee type',
    run() {
      const draft = createValidExpressDraft()
      const selectedProduct = {
        ...expressProduct,
        producteCode: 'PACKAGE',
        couponRankType: 'BF',
        detail: [
          { priceEntryCode: 'FRT', priceEntryName: '运费', caculateFee: 20 },
          { priceEntryCode: 'BF', priceEntryName: '保价费', caculateFee: 2 },
          { priceEntryCode: 'AD', priceEntryName: '定时派送', caculateFee: 4 },
          { priceEntryCode: 'BZ', priceEntryName: '包装费', caculateFee: 3 }
        ],
        discount: [
          { marketCode: 'YHQ', reduceFee: 5 },
          { marketCode: 'XLYHF', reduceFee: 1 }
        ]
      }
      const request = createExpressCouponQueryRequest({
        ...draft,
        selectedProduct
      })

      assert.deepEqual(request, {
        freight: 21,
        productCode: 'PACKAGE',
        couponFeeList: [
          { feeType: 'FRT', freight: 21 },
          { feeType: 'BF', freight: 7 },
          { feeType: 'AD', freight: 4 },
          { feeType: 'NMBZ', freight: 3 }
        ],
        arriveProvinceName: '广东省',
        channel: 'APP',
        mobile: '13800138000',
        sendAnAddress: '上海市-上海市-青浦区',
        receivesAnAddress: '广东省-深圳市-南山区'
      })
      assert.equal(getExpressCouponOriginalFee({ ...selectedProduct, couponRankType: '' }, 'FRT'), 26)
      assert.equal(
        createExpressCouponRequestKey({
          ...draft,
          selectedProduct: { ...selectedProduct, producteCode: '' }
        }),
        ''
      )
    }
  },
  {
    name: 'express coupon auto query uses a short nonzero debounce window',
    run() {
      assert.equal(EXPRESS_COUPON_AUTO_QUERY_DELAY_MS, 300)
      assert.ok(EXPRESS_COUPON_AUTO_QUERY_DELAY_MS > 0)
      assert.ok(EXPRESS_COUPON_AUTO_QUERY_DELAY_MS <= 500)
    }
  },
  {
    name: 'express coupon service separates available and unavailable cards',
    async run() {
      const originalQueryOrderCoupons = expressCouponApi.queryOrderCoupons
      const couponBase = {
        startTime: '2026-07-01 00:00:00',
        endTime: '2026-07-31 23:59:59',
        discountFee: 500,
        useFee: 0,
        subFee: 0,
        limitDiscountFee: 0,
        discountType: '1'
      }

      try {
        expressCouponApi.queryOrderCoupons = async () => ({
          status: true,
          result: {
            available: [
              {
                ...couponBase,
                couponCode: 'AVAILABLE_001',
                subtitle: 'App寄件券',
                businessStatus: '0'
              }
            ],
            unAvailable: [
              {
                ...couponBase,
                couponCode: 'UNAVAILABLE_001',
                subtitle: '限指定产品',
                useLimit: ['当前产品不可用']
              }
            ]
          }
        })

        const response = await expressCouponService.queryOrderCoupons({
          freight: 20,
          productCode: 'PACKAGE',
          couponFeeList: [{ feeType: 'FRT', freight: 20 }],
          arriveProvinceName: '广东省',
          channel: 'APP',
          mobile: '13800138000',
          sendAnAddress: '上海市-上海市-青浦区',
          receivesAnAddress: '广东省-深圳市-南山区'
        })

        assert.equal(response.status, true)
        assert.equal(response.result.available.length, 1)
        assert.equal(response.result.available[0].canUse, true)
        assert.equal(response.result.unavailable.length, 1)
        assert.equal(response.result.unavailable[0].canUse, false)
        assert.deepEqual(response.result.unavailable[0].raw.useLimit, ['当前产品不可用'])
      } finally {
        expressCouponApi.queryOrderCoupons = originalQueryOrderCoupons
      }
    }
  },
  {
    name: 'express coupon service normalizes runtime request failures',
    async run() {
      const originalQueryOrderCoupons = expressCouponApi.queryOrderCoupons

      try {
        expressCouponApi.queryOrderCoupons = async () => {
          throw new Error('network unavailable')
        }

        const response = await expressCouponService.queryOrderCoupons({
          freight: 20,
          productCode: 'PACKAGE',
          couponFeeList: [{ feeType: 'FRT', freight: 20 }],
          arriveProvinceName: '广东省',
          channel: 'APP',
          mobile: '13800138000',
          sendAnAddress: '上海市-上海市-青浦区',
          receivesAnAddress: '广东省-深圳市-南山区'
        })

        assert.equal(response.status, false)
        assert.equal(response.result, null)
        assert.equal(response.message, '可用优惠券查询失败，请检查网络后重试')
      } finally {
        expressCouponApi.queryOrderCoupons = originalQueryOrderCoupons
      }
    }
  },
  {
    name: 'express coupon request requires a priced product and skips customer code scans',
    run() {
      const draft = {
        ...createValidExpressDraft(),
        selectedProduct: { ...expressProduct, producteCode: 'PACKAGE' }
      }
      const unpriced = { ...draft, selectedProduct: { ...expressProduct, producteCode: 'PACKAGE', totalfee: null, detail: null, discount: null } }
      const customerScan = applyExpressScanContext(draft, {
        role: 'shipperNumber',
        value: 'CUS_001'
      })

      assert.ok(createExpressCouponQueryRequest(draft))
      assert.equal(createExpressCouponQueryRequest(unpriced), null)
      assert.equal(createExpressCouponQueryRequest(customerScan), null)
    }
  },
  {
    name: 'express coupon payload sends promotion code and sender mobile',
    run() {
      const draft = {
        ...createValidExpressDraft(),
        couponNumber: ' CPN001 '
      }
      const freightRequest = buildFreightRequest(draft)
      const orderRequest = buildCreateOrderRequest(draft)
      const noCouponFreightRequest = buildFreightRequest(createValidExpressDraft())

      assert.equal(freightRequest.promotionsCode, 'CPN001')
      assert.equal(freightRequest.customerMobile, '13800138000')
      assert.equal(orderRequest.receive[0].couponNumber, 'CPN001')
      assert.equal(noCouponFreightRequest.promotionsCode, undefined)
      assert.equal(noCouponFreightRequest.customerMobile, undefined)
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
