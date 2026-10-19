require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { canPayWithECard, selectPaymentCheckoutChannel } = require('@/services/payment/payment.ecard')

const readyChannel = {
  balance: 100,
  enabled: true,
  passwordSet: true,
  registered: true,
  tips: ''
}

const createItem = (detailNo, amount) => ({
  accountStatementDetailNo: detailNo,
  orderSubType: 'OR',
  unWriteoffAmount: amount,
  waybillNum: 'DPK123456789'
})

test('E card payment requires an enabled registered account with a password and sufficient balance', () => {
  assert.equal(canPayWithECard(readyChannel, 100), true)
  assert.equal(canPayWithECard(readyChannel, 100.01), false)
  assert.equal(canPayWithECard({ ...readyChannel, passwordSet: false }, 80), false)
  assert.equal(canPayWithECard({ ...readyChannel, registered: false }, 80), false)
  assert.equal(canPayWithECard({ ...readyChannel, enabled: false }, 80), false)
  assert.equal(canPayWithECard(null, 80), false)
})

test('default payment channel follows the current selected fees including their combined amount', () => {
  assert.equal(selectPaymentCheckoutChannel([createItem('FEE_1', 80)], readyChannel), 'ECARD')
  assert.equal(selectPaymentCheckoutChannel([createItem('FEE_1', 120)], readyChannel), 'APP')
  assert.equal(selectPaymentCheckoutChannel([createItem('FEE_1', 80), createItem('FEE_2', 30)], readyChannel), 'APP')
  assert.equal(selectPaymentCheckoutChannel([], readyChannel), 'APP')
})

test('accounts without a payment password never default to E card payment', () => {
  assert.equal(selectPaymentCheckoutChannel([createItem('FEE_1', 80)], { ...readyChannel, passwordSet: false }), 'APP')
})
