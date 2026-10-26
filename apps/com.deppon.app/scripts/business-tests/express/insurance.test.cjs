require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { expressApi } = require('@/services/express/core/express.api')
const { setExpressContact, updateExpressGoods } = require('@/services/express/core/express.draft')
const { buildCreateOrderRequest, buildFreightRequest, buildInsurancePriceRequest } = require('@/services/express/core/express.payload')
const { expressService } = require('@/services/express/core/express.service')
const { expressDraftBridge } = require('@/services/express/draft/draftBridge')
const { getExpressInsuranceProductPolicy } = require('@/services/express/insurance/insurance.product')
const {
  EXPRESS_INSURANCE_DEFAULT_LIMIT,
  EXPRESS_INSURANCE_FREE_AMOUNT,
  EXPRESS_INSURANCE_REQUIRED_LIMIT,
  EXPRESS_INSURANCE_SXB_LIMIT,
  applyExpressInsuranceCapability,
  createExpressInsuranceCapability,
  createExpressInsuranceOrderFields,
  createExpressInsuranceQuoteFields,
  getExpressInsuranceEffectiveAmount,
  getExpressInsuranceLimit,
  getExpressInsurancePriceSubtype,
  isExpressInsuranceCapabilityCurrent,
  updateExpressInsurance,
  validateExpressInsurance
} = require('@/services/express/insurance/insurance.rules')
const { createExpressInsuranceView } = require('@/services/express/insurance/insurance.view')
const { templateDraftBridge } = require('@/services/template/template.bridge')

const { consigneeContact, createValidExpressDraft, expressProduct } = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'express draft and template bridges isolate insurance capability state',
    run() {
      const draft = createValidExpressDraft()
      const source = applyExpressInsuranceCapability(draft, createExpressInsuranceCapability(draft, []), 750000)

      expressDraftBridge.carryFromQueryPrice(source, expressProduct)
      templateDraftBridge.stage(source)
      source.insurance.capability.inputKey = 'mutated'
      source.insurance.limit = 1

      const carried = expressDraftBridge.consume().draft
      const staged = templateDraftBridge.consume()

      assert.notEqual(carried.insurance, source.insurance)
      assert.notEqual(carried.insurance.capability, source.insurance.capability)
      assert.notEqual(staged.insurance.capability, source.insurance.capability)
      assert.notEqual(carried.insurance.capability.inputKey, 'mutated')
      assert.equal(carried.insurance.limit, 750000)
      assert.equal(staged.insurance.limit, 750000)
    }
  },
  {
    name: 'express insurance product policies enforce required free and dynamic limits',
    run() {
      const base = createValidExpressDraft()
      const capability = createExpressInsuranceCapability(base, [])
      const regular = applyExpressInsuranceCapability(
        {
          ...base,
          goods: { ...base.goods, insuredAmount: 750000 },
          insurance: { ...base.insurance, type: 'QEB' }
        },
        capability,
        750000
      )
      const overLimit = {
        ...regular,
        goods: { ...regular.goods, insuredAmount: 750001 }
      }
      const sxb = {
        ...regular,
        goods: { ...regular.goods, insuredAmount: 501 },
        insurance: { ...regular.insurance, type: 'SXB' }
      }
      const required = {
        ...regular,
        goods: { ...regular.goods, insuredAmount: 0 },
        service: { ...regular.service, transportMode: 'JZZH' },
        selectedProduct: { ...expressProduct, omsProductCode: 'JZZH' }
      }

      assert.equal(EXPRESS_INSURANCE_DEFAULT_LIMIT, 1000000)
      assert.equal(EXPRESS_INSURANCE_REQUIRED_LIMIT, 9990000)
      assert.equal(EXPRESS_INSURANCE_SXB_LIMIT, 500)
      assert.equal(getExpressInsuranceLimit(regular), 750000)
      assert.equal(validateExpressInsurance(regular).length, 0)
      assert.match(validateExpressInsurance(overLimit)[0], /750000/)
      assert.equal(getExpressInsuranceLimit(sxb), 500)
      assert.match(validateExpressInsurance(sxb)[0], /500/)
      assert.equal(getExpressInsuranceProductPolicy('DJBK').required, false)
      assert.equal(getExpressInsuranceProductPolicy('DJTH').required, false)
      assert.equal(
        getExpressInsuranceLimit({
          ...required,
          service: { ...required.service, transportMode: 'DJBK' },
          selectedProduct: { ...expressProduct, omsProductCode: 'DJBK' }
        }),
        750000
      )
      assert.equal(getExpressInsuranceProductPolicy('JZZH').required, true)
      assert.equal(getExpressInsuranceLimit(required), 9990000)
      assert.match(validateExpressInsurance(required)[0], /必须填写/)
      assert.equal(getExpressInsuranceProductPolicy('NFLF').free, true)
    }
  },
  {
    name: 'express insurance goods labels drive fragile worry-free and disabled capability',
    run() {
      const base = createValidExpressDraft()
      const fragileCapability = createExpressInsuranceCapability(base, [
        {
          tip: '易碎品',
          goodsRemarkCode: 'fragile_articles',
          displayType: 'tips'
        }
      ])
      const fragileDraft = applyExpressInsuranceCapability(
        {
          ...base,
          goods: { ...base.goods, insuredAmount: 300 }
        },
        fragileCapability,
        600000
      )
      const worryFreeDraft = applyExpressInsuranceCapability(
        base,
        createExpressInsuranceCapability(base, [
          {
            tip: '推荐省心保',
            goodsRemarkCode: 'worry_free_protection',
            displayType: 'tips'
          }
        ]),
        600000
      )
      const disabledDraft = applyExpressInsuranceCapability(
        {
          ...base,
          goods: { ...base.goods, insuredAmount: 300 },
          insurance: { ...base.insurance, type: 'QEB' }
        },
        createExpressInsuranceCapability(base, [
          {
            tip: '限制保价',
            goodsRemarkCode: 'limitation_insure',
            displayType: 'tips'
          }
        ]),
        600000
      )

      assert.equal(getExpressInsurancePriceSubtype(fragileDraft), 'YSB')
      assert.deepEqual(createExpressInsuranceQuoteFields(fragileDraft), {
        insuredAmount: 300,
        isFragileArticles: 'Y'
      })
      assert.deepEqual(createExpressInsuranceOrderFields(fragileDraft), {
        insuredAmount: 300,
        orderExtendFields: [{ key: 'bjlx', value: 4 }]
      })
      assert.equal(createExpressInsuranceView(worryFreeDraft).options.find(option => option.type === 'SXB').recommended, true)
      assert.equal(disabledDraft.goods.insuredAmount, 0)
      assert.equal(disabledDraft.insurance.type, 'NORMAL')
      assert.equal(createExpressInsuranceView(disabledDraft).disabled, true)
      assert.equal(isExpressInsuranceCapabilityCurrent(fragileDraft, fragileCapability), true)
    }
  },
  {
    name: 'express insurance quote and trial payloads map QEB SXB and YSB independently',
    run() {
      const base = createValidExpressDraft()
      const capability = createExpressInsuranceCapability(base, [])
      const qeb = applyExpressInsuranceCapability(
        {
          ...base,
          goods: { ...base.goods, insuredAmount: 300 },
          insurance: { ...base.insurance, type: 'QEB' }
        },
        capability,
        750000
      )
      const sxb = {
        ...qeb,
        goods: { ...qeb.goods, insuredAmount: 500 },
        insurance: { ...qeb.insurance, type: 'SXB' }
      }
      const fragileCapability = createExpressInsuranceCapability(base, [
        {
          tip: '易碎品',
          goodsRemarkCode: 'fragile_articles',
          displayType: 'tips'
        }
      ])
      const fragile = applyExpressInsuranceCapability({ ...qeb, insurance: { ...qeb.insurance, type: 'NORMAL' } }, fragileCapability, 750000)

      assert.equal(buildFreightRequest(qeb).fullCoverage, 'Y')
      assert.equal(buildFreightRequest(qeb).sxb, undefined)
      assert.equal(buildInsurancePriceRequest(qeb).subType, 'QEB')
      assert.deepEqual(buildInsurancePriceRequest(qeb).statements, [300])
      assert.equal(buildFreightRequest(sxb).sxb, 'Y')
      assert.equal(buildFreightRequest(sxb).fullCoverage, undefined)
      assert.equal(buildInsurancePriceRequest(sxb).subType, 'SXB')
      assert.equal(buildFreightRequest(fragile).isFragileArticles, 'Y')
      assert.equal(buildFreightRequest(fragile).sxb, undefined)
      assert.equal(buildInsurancePriceRequest(fragile).subType, 'YSB')
    }
  },
  {
    name: 'express insurance order payload maps bjlx and free default protection',
    run() {
      const base = createValidExpressDraft()
      const capability = createExpressInsuranceCapability(base, [])
      const freeDraft = applyExpressInsuranceCapability(
        {
          ...base,
          service: { ...base.service, transportMode: 'NFLF' },
          selectedProduct: { ...expressProduct, omsProductCode: 'NFLF' }
        },
        capability,
        null
      )
      const request = buildCreateOrderRequest(freeDraft, capability)
      const insuranceFields = request.receive[0].orderExtendFields.filter(field => field.key === 'insuranceSource' || field.key === 'bjlx')

      assert.equal(EXPRESS_INSURANCE_FREE_AMOUNT, 2000)
      assert.equal(getExpressInsuranceEffectiveAmount(freeDraft), 2000)
      assert.deepEqual(createExpressInsuranceOrderFields(freeDraft), {
        insuredAmount: 2000,
        orderExtendFields: [
          { key: 'insuranceSource', value: 'DEFAULT' },
          { key: 'bjlx', value: 3 }
        ]
      })
      assert.equal(request.receive[0].insuredAmount, 2000)
      assert.deepEqual(insuranceFields, [
        { key: 'insuranceSource', value: 'DEFAULT' },
        { key: 'bjlx', value: 3 }
      ])
    }
  },
  {
    name: 'express insurance mutations invalidate quotes and reset stale capability proofs',
    run() {
      const base = createValidExpressDraft()
      const capability = createExpressInsuranceCapability(base, [])
      const current = applyExpressInsuranceCapability(base, capability, 750000)
      const changed = updateExpressInsurance(current, {
        amount: 300,
        type: 'QEB'
      })
      const renamed = updateExpressGoods(current, { name: '玻璃制品' })
      const moved = setExpressContact(current, 'consignee', {
        ...consigneeContact,
        county: '福田区'
      })

      assert.equal(changed.selectedProduct, null)
      assert.match(changed.quoteStaleReason, /保价信息变化/)
      assert.equal(renamed.insurance.capability.inputKey, '')
      assert.equal(moved.insurance.capability.inputKey, '')
      assert.equal(moved.insurance.limit, 750000)
      assert.equal(
        isExpressInsuranceCapabilityCurrent(
          current,
          createExpressInsuranceCapability(current, [
            {
              tip: '易碎品',
              goodsRemarkCode: 'fragile_articles',
              displayType: 'tips'
            }
          ])
        ),
        false
      )
      assert.equal(applyExpressInsuranceCapability(current, capability, null).insurance.limit, 0)
    }
  },
  {
    name: 'express submit rechecks insurance labels and rejects stale capability proofs',
    async run() {
      const originalLabels = expressApi.queryGoodsLabels
      const originalFilter = expressApi.filterOrder
      const originalIntercept = expressApi.checkCanCreateOrder
      const originalCreate = expressApi.createOrder
      const base = createValidExpressDraft()
      const capability = createExpressInsuranceCapability(base, [])
      const draft = applyExpressInsuranceCapability(
        {
          ...base,
          goods: { ...base.goods, insuredAmount: 300 },
          insurance: { ...base.insurance, type: 'QEB' }
        },
        capability,
        750000
      )
      let labels = []
      let createCount = 0
      let createRequest = null

      expressApi.queryGoodsLabels = async () => ({
        status: true,
        message: '',
        result: labels
      })
      expressApi.filterOrder = async () => ({
        status: true,
        message: '',
        result: { type: 0, reason: '' }
      })
      expressApi.checkCanCreateOrder = async () => ({
        status: true,
        message: '',
        result: { orderFlag: 'Y' }
      })
      expressApi.createOrder = async request => {
        createCount += 1
        createRequest = request
        return {
          status: true,
          message: '',
          result: {
            orderNumbers: ['ORDER_001'],
            waybillNumbers: ['DPK001'],
            waybillNumber: 'DPK001'
          }
        }
      }

      try {
        const accepted = await expressService.submitDraft(draft)
        const insuranceTypeField = createRequest.receive[0].orderExtendFields.find(field => field.key === 'bjlx')

        assert.equal(accepted.status, true)
        assert.equal(createCount, 1)
        assert.equal(createRequest.receive[0].insuredAmount, 300)
        assert.deepEqual(insuranceTypeField, { key: 'bjlx', value: 0 })

        labels = [
          {
            tip: '易碎品',
            goodsRemarkCode: 'fragile_articles',
            displayType: 'tips'
          }
        ]

        const rejected = await expressService.submitDraft(draft)

        assert.equal(rejected.status, false)
        assert.match(rejected.message, /保价规则已更新/)
        assert.equal(createCount, 1)
      } finally {
        expressApi.queryGoodsLabels = originalLabels
        expressApi.filterOrder = originalFilter
        expressApi.checkCanCreateOrder = originalIntercept
        expressApi.createOrder = originalCreate
      }
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
