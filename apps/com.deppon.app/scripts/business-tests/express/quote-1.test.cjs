require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { CACHE_KEYS } = require('@/cache/keys')
const { getStorageValue, removeStorageValue, setStorageValue } = require('@/cache/storage')
const { customerService } = require('@/services/customer/customer.service')
const { expressApi } = require('@/services/express/express.api')
const { applyExpressScanContext } = require('@/services/express/express.draft')
const { buildFreightRequest } = require('@/services/express/express.payload')
const { expressService } = require('@/services/express/express.service')
const {
  createExpressProductAvailability,
  createExpressProductPointRequest,
  createExpressProductSwitchRequest,
  createExpressProductUpgradeRequest,
  resolveExpressProductCustomerCapability,
  resolveExpressProductRole,
  selectDefaultExpressQuote,
  supportsExpressDczpRecommendation,
  supportsExpressProductSwitch
} = require('@/services/express/productAvailability.rules')

const { createValidExpressDraft, expressProduct } = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'express product capability requests preserve reference address and customer contracts',
    run() {
      const draft = createValidExpressDraft()
      const customer = resolveExpressProductCustomerCapability(draft, {
        customerCode: ' CUS_001 ',
        monthlyEnabled: true,
        contractEnabled: true,
        insuranceLimit: 750000
      })
      const pointRequest = createExpressProductPointRequest(draft)
      const switchRequest = createExpressProductSwitchRequest(draft, customer)
      const upgradeRequest = createExpressProductUpgradeRequest(draft, customer)
      const scanDraft = applyExpressScanContext(draft, {
        role: 'shipperNumber',
        value: 'CUS_SCAN'
      })
      const scanCustomer = resolveExpressProductCustomerCapability(scanDraft, {
        customerCode: 'CUS_001',
        monthlyEnabled: true,
        contractEnabled: true,
        insuranceLimit: 750000
      })
      const matchingScanCustomer = resolveExpressProductCustomerCapability(scanDraft, {
        customerCode: 'CUS_SCAN',
        monthlyEnabled: true,
        contractEnabled: true,
        insuranceLimit: 750000
      })

      assert.deepEqual(customer, {
        customerCode: 'CUS_001',
        monthlyEnabled: true,
        contractEnabled: true,
        insuranceLimit: 750000
      })
      assert.deepEqual(pointRequest, {
        productCode: 'DCZP',
        contactAddressDetail: '上海市-上海市-青浦区',
        receiverCustAddressDetail: '广东省-深圳市-南山区'
      })
      assert.deepEqual(switchRequest, {
        customerCode: 'CUS_001',
        contactAddressDetail: '上海市-上海市-青浦区',
        receiverCustAddressDetail: '广东省-深圳市-南山区',
        ifExistContract: 1
      })
      assert.equal(upgradeRequest.pilotType, 'CUSTOMER_REGION')
      assert.equal(upgradeRequest.isOffSiteTransfer, 'N')
      assert.equal(upgradeRequest.departCountyName, '青浦区')
      assert.equal(upgradeRequest.arriveCountyName, '南山区')
      assert.deepEqual(scanCustomer, {
        customerCode: 'CUS_SCAN',
        monthlyEnabled: false,
        contractEnabled: false,
        insuranceLimit: null
      })
      assert.deepEqual(matchingScanCustomer, {
        customerCode: 'CUS_SCAN',
        monthlyEnabled: true,
        contractEnabled: true,
        insuranceLimit: 750000
      })
    }
  },
  {
    name: 'express product roles cover RN scan inputs without inventing mini-program branches',
    run() {
      const draft = createValidExpressDraft()
      const courierDraft = applyExpressScanContext(draft, {
        role: 'pickupManId',
        value: 'PM_001'
      })
      const customerDraft = applyExpressScanContext(draft, {
        role: 'shipperNumber',
        value: 'CUS_001'
      })
      const driverDraft = applyExpressScanContext(draft, {
        role: 'driverId',
        value: 'DRIVER_001'
      })
      const businessDraft = applyExpressScanContext(draft, {
        role: 'businessCode',
        value: 'DEPT_001'
      })

      assert.equal(supportsExpressProductSwitch(draft), true)
      assert.equal(supportsExpressProductSwitch(courierDraft), true)
      assert.equal(supportsExpressProductSwitch(customerDraft), true)
      assert.equal(supportsExpressProductSwitch(driverDraft), false)
      assert.equal(supportsExpressProductSwitch(businessDraft), false)
      assert.equal(supportsExpressDczpRecommendation(draft), true)
      assert.equal(supportsExpressDczpRecommendation(courierDraft), false)
      assert.equal(resolveExpressProductRole(draft, 'OLD'), '')
      assert.equal(resolveExpressProductRole(courierDraft, 'OLD'), 'EXP')
      assert.equal(resolveExpressProductRole(customerDraft, 'OLD'), '')
      assert.equal(resolveExpressProductRole(driverDraft, 'CONTRACT'), 'DRIVER_QR_CODE')
      assert.equal(resolveExpressProductRole(businessDraft, 'CONTRACT'), 'EXP')
    }
  },
  {
    name: 'express product availability separates fusion roles and DCZP recommendations from OMS products',
    run() {
      const draft = {
        ...createValidExpressDraft(),
        service: {
          ...createValidExpressDraft().service,
          transportMode: 'DCZP',
          deliveryMode: 'PICKSELF'
        }
      }
      const customer = {
        customerCode: 'CUS_001',
        monthlyEnabled: true,
        contractEnabled: true,
        insuranceLimit: 750000
      }
      const availability = createExpressProductAvailability(draft, customer, {
        dczpAvailable: true,
        fusionEnabled: true,
        goodsLabels: [
          {
            tip: '含电池',
            goodsRemarkCode: 'battery_category',
            displayType: 'tips'
          }
        ],
        upgradeResult: 'NEW'
      })
      const request = buildFreightRequest(draft, availability)
      const defaultRequest = buildFreightRequest(draft)
      const dczpProduct = {
        ...expressProduct,
        productName: '特货专配',
        omsProductCode: 'DCZP'
      }

      assert.equal(availability.productSwitch, 'CONTRACT')
      assert.equal(availability.passProductCode, 'CONTRACT')
      assert.equal(availability.recommendDczp, true)
      assert.equal(availability.customer.insuranceLimit, 750000)
      assert.equal(availability.insuranceCapability.inputKey.length > 0, true)
      assert.equal(availability.insuranceCapability.fragile, false)
      assert.equal(request.passProductCode, 'CONTRACT')
      assert.equal(request.isRecommendDczp, 'Y')
      assert.equal(request.collectMode, 'BZLS')
      assert.equal(request.deliveryMode, 'ZDZT')
      assert.equal(request.customerCode, 'CUS_001')
      assert.equal(request.customerMonthly, '1')
      assert.equal(request.customerContract, '1')
      assert.equal(request.isOffSiteTransfer, 'N')
      assert.equal(defaultRequest.passProductCode, 'EXP')
      assert.equal(selectDefaultExpressQuote([expressProduct, dczpProduct], true), dczpProduct)
      assert.equal(selectDefaultExpressQuote([expressProduct, dczpProduct], false), expressProduct)
    }
  },
  {
    name: 'express quote composes optional product capabilities and degrades partial failures',
    async run() {
      const originalCookie = getStorageValue(CACHE_KEYS.cookie)
      const originalPoint = expressApi.queryProductPointCity
      const originalSwitch = expressApi.queryProductSwitch
      const originalUpgrade = expressApi.queryProductUpgrade
      const originalLabels = expressApi.queryGoodsLabels
      const originalFreight = expressApi.queryFreight
      const requests = {}

      await removeStorageValue(CACHE_KEYS.cookie)

      expressApi.queryProductPointCity = async request => {
        requests.point = request
        return { status: true, message: '', result: true }
      }
      expressApi.queryProductSwitch = async request => {
        requests.productSwitch = request
        return { status: true, message: '', result: false }
      }
      expressApi.queryProductUpgrade = async request => {
        requests.upgrade = request
        throw new Error('升级能力暂不可用')
      }
      expressApi.queryGoodsLabels = async request => {
        requests.labels = request
        return {
          status: true,
          message: '',
          result: [
            {
              tip: '含电池',
              goodsRemarkCode: 'battery_category',
              displayType: 'tips'
            }
          ]
        }
      }
      expressApi.queryFreight = async request => {
        requests.freight = request
        return {
          status: true,
          message: '',
          result: [
            expressProduct,
            {
              ...expressProduct,
              productName: '特货专配',
              omsProductCode: 'DCZP'
            }
          ]
        }
      }

      try {
        const response = await expressService.quote(createValidExpressDraft())
        const selected = selectDefaultExpressQuote(response.result.products, response.result.availability.recommendDczp)

        assert.equal(response.status, true)
        assert.equal(response.result.availability.productSwitch, 'OLD')
        assert.equal(response.result.availability.passProductCode, '')
        assert.equal(response.result.availability.recommendDczp, true)
        assert.equal(response.result.availability.insuranceCapability.inputKey.length > 0, true)
        assert.equal(requests.productSwitch.ifExistContract, 0)
        assert.equal(requests.upgrade.pilotType, 'CUSTOMER_REGION')
        assert.equal(requests.labels.goodsName, '文件')
        assert.equal(requests.freight.passProductCode, '')
        assert.equal(requests.freight.isRecommendDczp, 'Y')
        assert.equal(requests.freight.customerMonthly, '0')
        assert.equal(requests.freight.customerContract, '0')
        assert.equal(selected.omsProductCode, 'DCZP')

        expressApi.queryProductPointCity = async () => ({
          status: false,
          message: '点城市不可用',
          result: null
        })
        expressApi.queryProductSwitch = async () => ({
          status: false,
          message: '融合不可用',
          result: null
        })
        expressApi.queryProductUpgrade = async () => ({
          status: false,
          message: '升级不可用',
          result: null
        })
        expressApi.queryGoodsLabels = async () => ({
          status: false,
          message: '货物标签不可用',
          result: null
        })

        const degraded = await expressService.quote(createValidExpressDraft())

        assert.equal(degraded.status, true)
        assert.equal(degraded.result.availability.productSwitch, 'EXP')
        assert.equal(degraded.result.availability.passProductCode, 'EXP')
        assert.equal(degraded.result.availability.recommendDczp, false)
        assert.equal(degraded.result.availability.insuranceCapability.inputKey, '')
        assert.equal(requests.freight.passProductCode, 'EXP')
        assert.equal(requests.freight.isRecommendDczp, undefined)
      } finally {
        expressApi.queryProductPointCity = originalPoint
        expressApi.queryProductSwitch = originalSwitch
        expressApi.queryProductUpgrade = originalUpgrade
        expressApi.queryGoodsLabels = originalLabels
        expressApi.queryFreight = originalFreight

        if (originalCookie) {
          await setStorageValue(CACHE_KEYS.cookie, originalCookie)
        } else {
          await removeStorageValue(CACHE_KEYS.cookie)
        }
      }
    }
  },
  {
    name: 'express quote merges account and scanned customer capabilities conservatively',
    async run() {
      const originalCookie = getStorageValue(CACHE_KEYS.cookie)
      const originalCustomer = customerService.queryCustomerCapability
      const originalPoint = expressApi.queryProductPointCity
      const originalSwitch = expressApi.queryProductSwitch
      const originalUpgrade = expressApi.queryProductUpgrade
      const originalLabels = expressApi.queryGoodsLabels
      const originalFreight = expressApi.queryFreight
      let freightRequest = null

      await setStorageValue(CACHE_KEYS.cookie, 'ECO_TOKEN=product-token;')
      customerService.queryCustomerCapability = async () => ({
        status: true,
        message: '',
        result: {
          customerCode: 'CUS_ACCOUNT',
          collectionLimit: 1000,
          insuranceLimit: 750000,
          hasBoundCustomer: true,
          monthlyEnabled: true,
          contractEnabled: true
        }
      })
      expressApi.queryProductPointCity = async () => ({
        status: true,
        message: '',
        result: false
      })
      expressApi.queryProductSwitch = async () => ({
        status: true,
        message: '',
        result: true
      })
      expressApi.queryProductUpgrade = async () => ({
        status: true,
        message: '',
        result: 'NEW'
      })
      expressApi.queryGoodsLabels = async () => ({
        status: true,
        message: '',
        result: []
      })
      expressApi.queryFreight = async request => {
        freightRequest = request
        return {
          status: true,
          message: '',
          result: [expressProduct]
        }
      }

      try {
        const accountResponse = await expressService.quote(createValidExpressDraft())

        assert.equal(accountResponse.result.availability.passProductCode, 'CONTRACT')
        assert.equal(accountResponse.result.availability.customer.insuranceLimit, 750000)
        assert.equal(freightRequest.customerCode, 'CUS_ACCOUNT')
        assert.equal(freightRequest.customerMonthly, '1')
        assert.equal(freightRequest.customerContract, '1')

        const scanResponse = await expressService.quote(
          applyExpressScanContext(createValidExpressDraft(), {
            role: 'shipperNumber',
            value: 'CUS_SCAN'
          })
        )

        assert.equal(scanResponse.result.availability.passProductCode, 'UNIVERSAL')
        assert.equal(scanResponse.result.availability.customer.insuranceLimit, null)
        assert.equal(freightRequest.customerCode, 'CUS_SCAN')
        assert.equal(freightRequest.customerMonthly, '0')
        assert.equal(freightRequest.customerContract, '0')
      } finally {
        customerService.queryCustomerCapability = originalCustomer
        expressApi.queryProductPointCity = originalPoint
        expressApi.queryProductSwitch = originalSwitch
        expressApi.queryProductUpgrade = originalUpgrade
        expressApi.queryGoodsLabels = originalLabels
        expressApi.queryFreight = originalFreight

        if (originalCookie) {
          await setStorageValue(CACHE_KEYS.cookie, originalCookie)
        } else {
          await removeStorageValue(CACHE_KEYS.cookie)
        }
      }
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
