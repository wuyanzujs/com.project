require('../support/register.cjs')
const { test } = require('node:test')
const { parseAppScanValue } = require('@/shared/platform/scan')
const assert = require('node:assert/strict')

const cases = [
  {
    name: 'scan rules classify waybills, cloud print codes and unsupported urls',
    run() {
      const rawWaybill = parseAppScanValue('DPK123456789')
      const urlWaybill = parseAppScanValue(
        'https://www.deppon.com/path?waybillNumber=DPK123456789'
      )
      const billNoWaybill = parseAppScanValue(
        'https://www.deppon.com/path?billNo=DPK987654321'
      )
      const ltlWaybill = parseAppScanValue(
        'https://www.deppon.com/path?waybillNumber=DPL123456789'
      )
      const printCode = parseAppScanValue(
        'https://www.deppon.com/path?printId=PRINT_001'
      )
      const postmanQrCode = parseAppScanValue(
        'https://www.deppon.com/path?courierNo=PM001&sceneId=SCENE_001&partner=Y'
      )
      const customerQrCode = parseAppScanValue(
        'https://www.deppon.com/path?shipperNumber=CUS001'
      )
      const invalidBusinessQrCode = parseAppScanValue(
        'https://www.deppon.com/path?driverId=null'
      )
      const invalidHost = parseAppScanValue(
        'https://example.com/path?waybillNumber=DPK123456789'
      )
      const unsupported = parseAppScanValue('foo=bar')

      assert.equal(rawWaybill.kind, 'waybill')
      assert.equal(rawWaybill.waybillNumber, 'DPK123456789')
      assert.equal(urlWaybill.kind, 'waybill')
      assert.equal(urlWaybill.waybillNumber, 'DPK123456789')
      assert.equal(billNoWaybill.kind, 'waybill')
      assert.equal(billNoWaybill.waybillNumber, 'DPK987654321')
      assert.equal(ltlWaybill.kind, 'waybill')
      assert.equal(ltlWaybill.role, 'ltlWaybillNumber')
      assert.equal(printCode.kind, 'printCode')
      assert.equal(printCode.printId, 'PRINT_001')
      assert.equal(postmanQrCode.kind, 'unsupported')
      assert.equal(postmanQrCode.reason, 'sendQrCode')
      assert.equal(postmanQrCode.role, 'pickupManId')
      assert.equal(postmanQrCode.value, 'PM001')
      assert.equal(postmanQrCode.sceneId, 'SCENE_001')
      assert.equal(postmanQrCode.expressRole, 'PARTNER')
      assert.equal(customerQrCode.kind, 'unsupported')
      assert.equal(customerQrCode.reason, 'sendQrCode')
      assert.equal(customerQrCode.role, 'shipperNumber')
      assert.equal(customerQrCode.value, 'CUS001')
      assert.equal(invalidBusinessQrCode.kind, 'unsupported')
      assert.equal(invalidBusinessQrCode.reason, 'invalidParams')
      assert.equal(invalidBusinessQrCode.role, 'driverId')
      assert.equal(invalidHost.kind, 'unsupported')
      assert.equal(invalidHost.reason, 'invalidHost')
      assert.equal(unsupported.kind, 'unsupported')
      assert.equal(unsupported.reason, 'unknown')
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
