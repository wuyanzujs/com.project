require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const {
  getSelectedInvoiceECardAmount,
  getSelectedInvoiceECards,
  parseInvoiceCenterTab
} = require('@/pages/invoice/index/invoiceCenterViewModel')
const {
  createInvoiceModifyAddressPayload
} = require('@/services/invoice/invoice.actions')
const {
  createApplyPreview,
  createApplySubmitPayload,
  validateEmail
} = require('@/services/invoice/invoice.apply')
const {
  invoiceApplyService
} = require('@/services/invoice/invoice.apply.service')
const {
  invoiceCenterService
} = require('@/services/invoice/invoice.center.service')
const {
  createECardApplyPreview,
  createECardApplySubmitPayload,
  normalizeInvoiceECard
} = require('@/services/invoice/invoice.ecard')
const {
  canCancelInvoiceApply,
  canModifyInvoiceAddress,
  canReverseInvoice,
  canSendInvoiceEmail,
  normalizeHistory,
  parseInvoiceAcceptAddress
} = require('@/services/invoice/invoice.history')
const {
  calculateInvoiceOrderAuthCountdown,
  getInvoiceOrderAuthValidationMessage
} = require('@/services/invoice/invoice.orderAuth')
const { invoiceService } = require('@/services/invoice/invoice.service')
const {
  createTaxpayerPayload,
  normalizeTaxpayer,
  validateTaxpayer
} = require('@/services/invoice/invoice.taxpayer')
const {
  invoiceTaxpayerService
} = require('@/services/invoice/invoice.taxpayer.service')

const {
  companyTaxpayer,
  createECardInvoiceDraft,
  createInvoiceDraft
} = require('../fixtures/invoice.cjs')

const cases = [
  {
    name: 'invoice email and preview validation block invalid submit states',
    run() {
      assert.equal(validateEmail('finance@example.com'), '')
      assert.equal(validateEmail('bad-email'), '邮箱格式不正确')

      const personTaxpayer = {
        ...companyTaxpayer,
        customerType: '0',
        typeText: '个人'
      }
      const preview = createApplyPreview(
        createInvoiceDraft({
          taxpayer: personTaxpayer,
          billCategory: '13'
        })
      )

      assert.equal(preview.canSubmit, false)
      assert.equal(preview.message, '电子专票需要选择单位抬头')
    }
  },
  {
    name: 'invoice center view model isolates tab, auth and card selection rules',
    run() {
      assert.equal(parseInvoiceCenterTab('history'), 'history')
      assert.equal(parseInvoiceCenterTab('unknown'), 'orders')
      assert.equal(
        getInvoiceOrderAuthValidationMessage({ authType: '02' }, '123'),
        '请输入付款人手机号后四位'
      )
      assert.equal(
        getInvoiceOrderAuthValidationMessage({ authType: '04' }, '123456'),
        ''
      )
      assert.equal(calculateInvoiceOrderAuthCountdown(1000, 30500), 31)
      assert.equal(calculateInvoiceOrderAuthCountdown(1000, 62000), 0)

      const cards = [
        { id: 'E1', amount: 12 },
        { id: 'E2', amount: 8 }
      ]

      assert.deepEqual(getSelectedInvoiceECards(cards, ['E2']), [cards[1]])
      assert.equal(getSelectedInvoiceECardAmount(cards, ['E1', 'E2']), 20)
    }
  },
  {
    name: 'invoice service facade preserves domain service contracts',
    run() {
      assert.equal(
        invoiceService.submitApplyDraft,
        invoiceApplyService.submitApplyDraft
      )
      assert.equal(
        invoiceService.queryPreview,
        invoiceApplyService.queryPreview
      )
      assert.equal(invoiceService.queryOrders, invoiceCenterService.queryOrders)
      assert.equal(
        invoiceService.queryHistory,
        invoiceCenterService.queryHistory
      )
      assert.equal(
        invoiceService.queryTaxpayers,
        invoiceTaxpayerService.queryTaxpayers
      )
      assert.equal(
        invoiceService.saveTaxpayer,
        invoiceTaxpayerService.saveTaxpayer
      )
    }
  },
  {
    name: 'invoice submit payload maps company tax info and amount',
    run() {
      const payload = createApplySubmitPayload(createInvoiceDraft())

      assert.equal(payload.TaskDetailList[0].sourceBillNo, 'DPK123456789')
      assert.equal(payload.TaskInfo.taxName, '德邦测试有限公司')
      assert.equal(payload.TaskInfo.customerType, '1')
      assert.equal(payload.TaskInfo.openAmount, 128.5)
      assert.equal(payload.TaskInfo.taxEmail, 'finance@example.com')
      assert.equal(payload.TaskInfo.taxBankNumber, '6222000000000000')
    }
  },
  {
    name: 'invoice paper address payload folds town into legacy address field',
    run() {
      const payload = createInvoiceModifyAddressPayload(' APPLY_001 ', {
        name: ' 王五 ',
        telephone: '13800138000',
        province: ' 上海市 ',
        city: '上海市',
        county: '青浦区',
        town: '徐泾镇',
        address: '明珠路100号'
      })

      assert.deepEqual(payload, {
        applyNo: 'APPLY_001',
        acceptCustomer: '王五',
        acceptPhone: '13800138000',
        acceptAddress: '上海市|上海市|青浦区|徐泾镇明珠路100号'
      })
      assert.deepEqual(
        parseInvoiceAcceptAddress('上海市|上海市|青浦区|徐泾镇明珠路100号'),
        {
          province: '上海市',
          city: '上海市',
          county: '青浦区',
          address: '徐泾镇明珠路100号'
        }
      )
    }
  },
  {
    name: 'invoice history exposes email sending eligibility from legacy statuses',
    run() {
      assert.equal(canSendInvoiceEmail(4), true)
      assert.equal(canSendInvoiceEmail(7), true)
      assert.equal(canSendInvoiceEmail(27), true)
      assert.equal(canSendInvoiceEmail(3), false)
      assert.equal(canCancelInvoiceApply(1, '01'), true)
      assert.equal(canCancelInvoiceApply(3, '01'), true)
      assert.equal(canCancelInvoiceApply(28, '01'), true)
      assert.equal(canCancelInvoiceApply(4, '06'), false)
      assert.equal(canReverseInvoice(4, '06'), true)
      assert.equal(canReverseInvoice(47, '13'), true)
      assert.equal(canReverseInvoice(4, '01'), false)
      assert.equal(canModifyInvoiceAddress(3, '01'), true)
      assert.equal(canModifyInvoiceAddress(4, '01'), true)
      assert.equal(canModifyInvoiceAddress(1, '01'), false)
      assert.equal(canModifyInvoiceAddress(4, '06'), false)
      assert.equal(
        normalizeHistory({
          id: 1,
          applyNo: 'APPLY_001',
          acceptTinName: '德邦测试有限公司',
          acceptTinCode: '91310000123456789X',
          billAmount: 100,
          billCategory: '06',
          applyTime: 1783562400000,
          email: 'finance@example.com',
          elecLinkAdress: 'https://example.com/invoice.pdf',
          status: '4'
        }).canSendEmail,
        true
      )
      const paperPending = normalizeHistory({
        id: 3,
        applyNo: 'APPLY_003',
        billAmount: 50,
        billCategory: '01',
        acceptCustomer: '王五',
        acceptPhone: '13800138000',
        acceptAddress: '上海市|上海市|青浦区|徐泾镇明珠路100号',
        status: '3'
      })
      const electronicOpened = normalizeHistory({
        id: 4,
        applyNo: 'APPLY_004',
        billAmount: 50,
        billCategory: '06',
        status: '4'
      })

      assert.equal(paperPending.canCancel, true)
      assert.equal(paperPending.canReverse, false)
      assert.equal(paperPending.canModifyAddress, true)
      assert.equal(paperPending.contactName, '王五')
      assert.equal(paperPending.contactAddress, '徐泾镇明珠路100号')
      assert.equal(electronicOpened.canCancel, false)
      assert.equal(electronicOpened.canReverse, true)
      assert.equal(
        normalizeHistory({
          id: 2,
          applyNo: 'APPLY_002',
          billAmount: 50,
          status: '3'
        }).canSendEmail,
        false
      )
    }
  },
  {
    name: 'invoice ecard rules normalize recharge records and create prepay payload',
    run() {
      const item = normalizeInvoiceECard({
        payNo: ' PAY_001 ',
        unbillAmount: 88.8,
        chargeAmountTime: 1783562400000
      })
      const preview = createECardApplyPreview(createECardInvoiceDraft())
      const payload = createECardApplySubmitPayload(createECardInvoiceDraft())

      assert.deepEqual(item, {
        id: 'PAY_001',
        amount: 88.8,
        timestamp: 1783562400000,
        businessTime: '2026-07-09 10:00:00'
      })
      assert.equal(preview.canSubmit, true)
      assert.equal(preview.billCategoryText, '电子普票')
      assert.equal(preview.amount, 88.8)
      assert.equal(
        createECardApplyPreview(
          createECardInvoiceDraft({
            ecards: []
          })
        ).message,
        '请选择储值卡开票记录'
      )
      assert.deepEqual(payload.TaskDetailList[0], {
        orderNo: 'PAY_001',
        sourceBillNo: 'PAY_001',
        amount: 88.8,
        payFlag: true
      })
      const batchPayload = createECardApplySubmitPayload(
        createECardInvoiceDraft({
          ecards: [
            {
              id: 'PAY_001',
              amount: 88.8,
              businessTime: '2026-07-09 10:00:00',
              timestamp: 1783562400000
            },
            {
              id: 'PAY_002',
              amount: 11.2,
              businessTime: '2026-07-09 11:00:00',
              timestamp: 1783566000000
            }
          ]
        })
      )

      assert.equal(batchPayload.TaskDetailList.length, 2)
      assert.equal(batchPayload.TaskInfo.openAmount, 100)
      assert.equal(batchPayload.TaskInfo.totalAmount, 100)
      assert.equal(payload.TaskInfo.applyType, '171')
      assert.equal(payload.TaskInfo.sourceType, '17')
      assert.equal(payload.TaskInfo.SourceSystem, 'WX')
      assert.equal(payload.TaskInfo.invoiceContent, '预存卡销售和充值')
      assert.equal(payload.TaskInfo.remark, '收派服务费')
      assert.equal(payload.TaskInfo.billCategory, '06')
    }
  },
  {
    name: 'invoice taxpayer rules normalize, validate and trim payload fields',
    run() {
      const raw = {
        id: 8,
        acceptTinName: ' 德邦科技有限公司 ',
        acceptTinCode: '91310000123456789X',
        phone: ' 021-12345678 ',
        address: ' 上海市青浦区明珠路 ',
        openBank: ' 招商银行上海分行 ',
        bankNo: ' 6222000000000000 ',
        isDefault: '1',
        customerType: '1',
        remark: ' 常用抬头 '
      }
      const view = normalizeTaxpayer(raw)

      assert.equal(view.name, '德邦科技有限公司')
      assert.equal(view.typeText, '单位')
      assert.equal(view.isDefault, true)
      assert.equal(validateTaxpayer(view), '')
      assert.equal(
        validateTaxpayer({
          ...view,
          name: '短名'
        }),
        '单位抬头不能少于6个字'
      )
      assert.equal(
        validateTaxpayer({
          ...view,
          taxNumber: '123'
        }),
        '税号格式错误，请输入正确的企业纳税人识别号'
      )

      const payload = createTaxpayerPayload({
        ...view,
        name: ' 德邦科技有限公司 ',
        remark: ' 常用抬头 '
      })

      assert.equal(payload.acceptTinName, '德邦科技有限公司')
      assert.equal(payload.acceptTinCode, '91310000123456789X')
      assert.equal(payload.isDefault, '1')
      assert.equal(payload.remark, '常用抬头')
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
