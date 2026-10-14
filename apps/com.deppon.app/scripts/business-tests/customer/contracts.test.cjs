require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { customerApi } = require('@/services/customer/customer.api')
const { createCustomerCapabilitySummary, customerService, normalizeCustomerCapability } = require('@/services/customer/customer.service')
const { applyExpressScanContext } = require('@/services/express/express.draft')
const { buildFilterOrderRequest, buildFreightRequest } = require('@/services/express/express.payload')
const { APP_WEB_TARGETS } = require('@/shared/webview/appWeb')

const { createValidExpressDraft } = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'customer private bill web target points to controlled OWS page',
    run() {
      assert.equal(APP_WEB_TARGETS.CUSTOMER_PRIVATE_BILL.url, '/depponmobile/mow/customer/privateSetting')
    }
  },
  {
    name: 'customer capability normalizes collection limits and contract flags',
    run() {
      assert.deepEqual(
        normalizeCustomerCapability({
          custNumber: ' CUS_001 ',
          teanLimit: '50000',
          insuredPriceCap: '750000',
          exPayWay: true,
          ifExistContract: '1'
        }),
        {
          customerCode: 'CUS_001',
          collectionLimit: 50000,
          insuranceLimit: 750000,
          hasBoundCustomer: true,
          monthlyEnabled: true,
          contractEnabled: true
        }
      )
      assert.deepEqual(normalizeCustomerCapability({ teanLimit: 0 }), {
        customerCode: '',
        collectionLimit: null,
        insuranceLimit: null,
        hasBoundCustomer: false,
        monthlyEnabled: false,
        contractEnabled: false
      })
    }
  },
  {
    name: 'customer capability summary keeps backend capability semantics',
    run() {
      assert.deepEqual(
        createCustomerCapabilitySummary(
          {
            customerCode: 'CUS_001',
            collectionLimit: 50000.5,
            insuranceLimit: 750000,
            hasBoundCustomer: true,
            monthlyEnabled: true,
            contractEnabled: false
          },
          null
        ),
        {
          available: true,
          collectionLimitText: '50000.5 元',
          contractText: '未签约',
          customerCode: 'CUS_001',
          monthlyPaymentText: '已开通'
        }
      )
      assert.deepEqual(
        createCustomerCapabilitySummary(
          {
            customerCode: '',
            collectionLimit: null,
            insuranceLimit: null,
            hasBoundCustomer: false,
            monthlyEnabled: false,
            contractEnabled: false
          },
          null
        ),
        {
          available: false,
          collectionLimitText: '--',
          contractText: '--',
          customerCode: '',
          monthlyPaymentText: '--'
        }
      )
    }
  },
  {
    name: 'customer overview keeps partial data when one capability request fails',
    async run() {
      const originalInfo = customerApi.queryCustomerInfo
      const originalCapability = customerApi.queryCustomerCapability

      try {
        customerApi.queryCustomerInfo = async () => ({
          status: true,
          result: {
            cusCode: 'CUS_001',
            custName: '测试客户',
            isMainLinkman: 'Y',
            privateBill: 'N'
          }
        })
        customerApi.queryCustomerCapability = async () => ({
          status: false,
          message: '额度接口暂不可用',
          result: null
        })

        const partial = await customerService.queryCustomerOverview()

        assert.equal(partial.status, true)
        assert.equal(partial.result.customer.code, 'CUS_001')
        assert.equal(partial.result.capability, null)
        assert.equal(partial.result.warning, '额度接口暂不可用')

        customerApi.queryCustomerInfo = async () => ({
          status: false,
          message: '客户接口暂不可用',
          result: null
        })

        const failed = await customerService.queryCustomerOverview()

        assert.equal(failed.status, false)
        assert.equal(failed.message, '客户接口暂不可用；额度接口暂不可用')
      } finally {
        customerApi.queryCustomerInfo = originalInfo
        customerApi.queryCustomerCapability = originalCapability
      }
    }
  },
  {
    name: 'customer scan context flows into freight and filter requests',
    run() {
      const draft = applyExpressScanContext(createValidExpressDraft(), {
        role: 'shipperNumber',
        value: 'CUS_001'
      })
      const freightRequest = buildFreightRequest(draft)
      const filterRequest = buildFilterOrderRequest(draft)

      assert.equal(freightRequest.customerCode, 'CUS_001')
      assert.equal(freightRequest.customerMonthly, '1')
      assert.equal(freightRequest.customerContract, '1')
      assert.equal(filterRequest.customerCode, 'CUS_001')
      assert.equal(filterRequest.limitCust, 1)
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
