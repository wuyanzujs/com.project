require('../support/register.cjs')
const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  createPaymentEvaluateWebUri,
  createPaymentWaybillQuery,
  getPaymentEvaluateScene,
  getPaymentItemAmount,
  getPaymentOrderTypeLabel,
  getPaymentRangeDays,
  getPaymentWriteOffStatus
} = require('@/services/payment/payment.service')
const { createPaymentFeeSummary } = require('@/services/payment/payment.fees')
const {
  APP_PAYMENT_UNAVAILABLE_MESSAGE,
  buildPaymentCreateRequest,
  createPaymentCancelRequest,
  createPaymentCheckoutUrl,
  createPaymentCheckoutView,
  normalizePaymentCommand,
  paymentCheckoutService,
  selectPaymentCheckoutItems,
  validatePaymentCheckout
} = require('@/services/payment/payment.checkout')
const { paymentApi } = require('@/services/payment/payment.api')

const cases = [
  {
    name: 'payment list status maps to backend status, range and amount rules',
    run() {
      assert.equal(getPaymentWriteOffStatus('UNPAID'), 0)
      assert.equal(getPaymentWriteOffStatus('PAID'), 1)
      assert.equal(getPaymentRangeDays('UNPAID'), 30)
      assert.equal(getPaymentRangeDays('PAID'), 180)
      assert.equal(
        getPaymentItemAmount(
          {
            unWriteoffAmount: 18.5,
            totalAmount: 20,
            writeoffAmount: 0
          },
          'UNPAID'
        ),
        18.5
      )
      assert.equal(
        getPaymentItemAmount(
          {
            unWriteoffAmount: 0,
            totalAmount: 20,
            writeoffAmount: 19.8
          },
          'PAID'
        ),
        19.8
      )
      assert.equal(
        getPaymentEvaluateScene({
          paymentMethod: 'FC'
        }),
        'S0705'
      )
      assert.equal(
        getPaymentEvaluateScene({
          paymentMethod: 'DT'
        }),
        'S0405'
      )
      assert.equal(getPaymentOrderTypeLabel('CR'), '货款')
      assert.equal(getPaymentOrderTypeLabel('DVAR'), '保管费')
      assert.equal(getPaymentOrderTypeLabel('OR'), '运费')
      assert.equal(getPaymentOrderTypeLabel('DR'), '运费')
      assert.equal(getPaymentOrderTypeLabel('PFCR'), '运费')
      assert.equal(getPaymentOrderTypeLabel(), '运费')
      const feeSummary = createPaymentFeeSummary({
        publishCharge: 12,
        transferFee: 1.2,
        insurance: 2,
        writeoffAmount: 5,
        basicFeeDetail: [
          {
            feeAttribute: 'favorFee',
            feeMoney: 1.5,
            feeName: '优惠'
          }
        ],
        incrementFeeDetail: [
          {
            feeAttribute: 'interceptFee',
            feeMoney: 3.3,
            feeName: '拦截费'
          },
          {
            feeAttribute: 'returnFee',
            feeMoney: 9,
            feeName: '返款'
          },
          {
            feeAttribute: 'customFee',
            feeMoney: 4,
            feeName: '上楼费'
          }
        ]
      })

      assert.equal(feeSummary.baseAmount, 12)
      assert.equal(feeSummary.serviceAmount, 10.5)
      assert.deepEqual(
        feeSummary.rows.map(item => [item.label, item.amount, item.tone]),
        [
          ['基础运费', 12, undefined],
          ['转寄/拦截费', 4.5, undefined],
          ['保价服务费', 2, undefined],
          ['上楼费', 4, undefined],
          ['减免费用', 1.5, 'discount'],
          ['已支付费用', 5, 'paid']
        ]
      )
      const evaluateUri = createPaymentEvaluateWebUri(
        {
          waybillNum: 'DPK123456789',
          paymentMethod: 'FC'
        },
        '13800138000'
      )
      const evaluateParams = new URL(evaluateUri, 'https://owstest.deppon.com')
        .searchParams

      assert.equal(evaluateParams.get('channel'), 'APP')
      assert.equal(evaluateParams.get('mobile'), '13800138000')
      assert.equal(evaluateParams.get('scene'), 'S0705')
      assert.deepEqual(JSON.parse(evaluateParams.get('rowData')), [
        {
          field: 'waybillNumber',
          data: 'DPK123456789'
        }
      ])
    }
  },
  {
    name: 'payment waybill query supports single and batched values',
    run() {
      assert.deepEqual(createPaymentWaybillQuery(''), {})
      assert.deepEqual(createPaymentWaybillQuery(' DPK123456789 '), {
        waybillNo: 'DPK123456789'
      })
      assert.deepEqual(
        createPaymentWaybillQuery('DPK123456789, DPL987654321，DPK111111111'),
        {
          waybillNos: ['DPK123456789', 'DPL987654321', 'DPK111111111']
        }
      )
      assert.deepEqual(
        createPaymentWaybillQuery('DPK123456789\nDPL987654321'),
        {
          waybillNos: ['DPK123456789', 'DPL987654321']
        }
      )
    }
  },
  {
    name: 'payment checkout validates selections and maps provider commands',
    run() {
      const item = {
        accountStatementDetailNo: 'PAY_DETAIL_001',
        arriveCity: '上海市',
        businessDate: '2026-07-13 10:00:00',
        consignee: '李四',
        orderSubType: 'OR',
        sender: '张三',
        senderCityName: '北京市',
        totalAmount: 20,
        unWriteoffAmount: 18.5,
        waybillNum: 'DPK123456789'
      }
      const selected = selectPaymentCheckoutItems([item, { ...item }])
      const view = createPaymentCheckoutView(selected)

      assert.equal(selected.length, 1)
      assert.equal(view.amount, 18.5)
      assert.deepEqual(view.waybillNumbers, ['DPK123456789'])
      assert.deepEqual(validatePaymentCheckout(selected), {
        valid: true,
        message: ''
      })
      assert.equal(
        validatePaymentCheckout([
          {
            ...item,
            accountStatementDetailNo: ''
          }
        ]).valid,
        false
      )
      assert.equal(
        validatePaymentCheckout([
          {
            ...item,
            unWriteoffAmount: 0,
            totalAmount: 0
          }
        ]).message,
        '运单 DPK123456789 的待支付金额不正确'
      )

      const createRequest = buildPaymentCreateRequest(selected)

      assert.equal(createRequest.orderSource, 'APP')
      assert.equal(createRequest.returnUrl, '/pages/payment/result/index')
      assert.equal(createRequest.list.length, 1)
      assert.ok(
        createPaymentCheckoutUrl({
          waybillNumber: item.waybillNum,
          detailNo: item.accountStatementDetailNo,
          role: 'sender',
          source: 'PAYMENT_LIST'
        }).includes('detailNo=PAY_DETAIL_001')
      )
      assert.deepEqual(normalizePaymentCommand({ payStatus: 'PAY_SUCCESS' }), {
        kind: 'settled',
        transactionId: undefined
      })
      assert.equal(
        normalizePaymentCommand({ orderInfo: 'alipay-order' }).channel,
        'alipay'
      )
      assert.equal(
        normalizePaymentCommand({
          timeStamp: '1',
          nonceStr: 'nonce',
          packages: 'Sign=WXPay',
          sign: 'signature'
        }).channel,
        'wechat'
      )
      assert.equal(normalizePaymentCommand({}).kind, 'invalid')

      assert.deepEqual(
        createPaymentCancelRequest({
          appId: 'APP_ID',
          isbatch: 'N',
          orderSource: 'APP',
          outTradeNo: 'DPK123456789',
          payNo: 'PAY_001',
          paymentChannelNo: 'APP_PAY',
          paymentTypeNo: 'ONLINE',
          requestFrom: 'APP',
          subject: '运费',
          userId: null,
          waybillType: 'OR'
        }),
        {
          orderSource: 'APP',
          appId: 'APP_ID',
          payNo: 'PAY_001',
          requestFrom: 'APP',
          paymentChannelNo: 'APP_PAY'
        }
      )
    }
  },
  {
    name: 'payment checkout blocks pay creation before native capability is ready',
    async run() {
      const originalCreateOrder = paymentApi.createOrder
      let createCount = 0

      paymentApi.createOrder = async () => {
        createCount += 1
        throw new Error('payCreate should not run')
      }

      try {
        const response = await paymentCheckoutService.submit({
          source: 'PAYMENT_LIST',
          items: [
            {
              accountStatementDetailNo: 'PAY_DETAIL_001',
              arriveCity: '上海市',
              businessDate: '2026-07-13 10:00:00',
              consignee: '李四',
              orderSubType: 'OR',
              sender: '张三',
              senderCityName: '北京市',
              totalAmount: 20,
              unWriteoffAmount: 18.5,
              waybillNum: 'DPK123456789'
            }
          ]
        })

        assert.equal(response.status, false)
        assert.equal(response.message, APP_PAYMENT_UNAVAILABLE_MESSAGE)
        assert.equal(createCount, 0)
      } finally {
        paymentApi.createOrder = originalCreateOrder
      }
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
