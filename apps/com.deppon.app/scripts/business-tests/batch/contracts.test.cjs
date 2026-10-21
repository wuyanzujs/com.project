require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const {
  BATCH_MAX_CONSIGNEE_COUNT,
  applyBatchQuoteResults,
  batchService,
  buildBatchCreateOrderRequest,
  createBatchConsigneeDraft,
  createBatchConsigneeFromRecognition,
  createBatchDraftFromExpressDraft,
  createBatchSubmitSummary,
  resetBatchQuotes,
  updateBatchConsigneeGoods,
  validateBatchDraft,
  validateBatchSubmitDraft
} = require('@/services/batch')
const { expressApi } = require('@/services/express/core/express.api')

const { createBatchContact, createValidBatchDraft } = require('../fixtures/batch.cjs')
const { createValidExpressDraft } = require('../fixtures/express.cjs')

const cases = [
  {
    name: 'batch draft inherits sender and pickup settings from express draft',
    run() {
      const expressDraft = createValidExpressDraft()
      expressDraft.service.paymentType = 'MONTH_PAY'
      expressDraft.service.needContact = 'N'
      expressDraft.pickup = {
        ...expressDraft.pickup,
        dispatch: 'N',
        time: '2026-07-14 10:00:00',
        stationCode: '021A001',
        stationName: '青浦服务点'
      }
      const draft = createBatchDraftFromExpressDraft(expressDraft)
      const recognized = createBatchConsigneeFromRecognition({
        lineNumber: 1,
        rawText: '李四 13900139000 广东省 深圳市 南山区 科技园 文件',
        status: 'ready',
        message: '已识别',
        contact: createBatchContact({
          name: '李四',
          mobile: '13900139000'
        }),
        goodsName: '文件'
      })

      assert.equal(draft.sender.name, '张三')
      assert.equal(draft.sender.mobile, '13800138000')
      assert.equal(draft.paymentType, 'MONTH_PAY')
      assert.equal(draft.needContact, 'N')
      assert.equal(draft.pickup.dispatch, 'N')
      assert.equal(draft.pickup.stationCode, '021A001')
      assert.equal(recognized.goods.name, '文件')
      assert.equal(
        createBatchConsigneeFromRecognition({
          lineNumber: 2,
          rawText: '无效地址',
          status: 'error',
          message: '地址不完整',
          contact: null,
          goodsName: ''
        }),
        null
      )
    }
  },
  {
    name: 'batch quote mutations clear stale products and apply fresh results',
    run() {
      const draft = createValidBatchDraft()
      const updated = updateBatchConsigneeGoods(draft, 0, { weight: 2 })

      assert.equal(validateBatchSubmitDraft(draft).valid, true)
      assert.equal(updated.consignees[0].goods.weight, 2)
      assert.equal(updated.consignees[0].productCode, '')
      assert.equal(validateBatchSubmitDraft(updated).step, 'product')

      const quoted = applyBatchQuoteResults(updated, [
        {
          consigneeIndex: 0,
          productCode: 'PACKAGE',
          productName: '大件快递',
          estimatedFee: 20
        }
      ])

      assert.equal(quoted.consignees[0].productCode, 'PACKAGE')
      assert.equal(quoted.consignees[0].estimatedFee, 20)
      assert.equal(resetBatchQuotes(quoted).consignees[0].productCode, '')
    }
  },
  {
    name: 'batch entry view exposes guarded App, copy and pending capabilities',
    run() {
      const view = batchService.getEntryView()
      const actionStatuses = Object.fromEntries(view.actions.map(item => [item.key, item.status]))

      assert.equal(view.maxConsigneeCount, BATCH_MAX_CONSIGNEE_COUNT)
      assert.equal(actionStatuses.singleExpress, 'ready')
      assert.equal(actionStatuses.excelImport, 'copy')
      assert.equal(actionStatuses.addressRecognition, 'ready')
      assert.equal(actionStatuses.print, 'pending')
      assert.ok(view.excelUrl.includes('source=APP_BATCHORDER'))
    }
  },
  {
    name: 'batch validation protects sender, count, address, goods and region rules',
    run() {
      assert.deepEqual(validateBatchDraft(createValidBatchDraft()), {
        valid: true,
        step: 'ready',
        consigneeIndex: -1,
        message: ''
      })
      assert.equal(validateBatchDraft(createValidBatchDraft({ sender: null })).message, '请选择发货人')
      assert.equal(validateBatchDraft(createValidBatchDraft({ consignees: [] })).message, '请至少添加 1 个收货人')
      assert.equal(
        validateBatchDraft(
          createValidBatchDraft({
            consignees: Array.from({ length: BATCH_MAX_CONSIGNEE_COUNT + 1 }, () => createValidBatchDraft().consignees[0])
          })
        ).message,
        `最多只能添加 ${BATCH_MAX_CONSIGNEE_COUNT} 个收货人`
      )
      assert.equal(
        validateBatchDraft(
          createValidBatchDraft({
            sender: createBatchContact({
              mobile: '123'
            })
          })
        ).message,
        '请输入正确的寄件人手机号'
      )
      assert.equal(
        validateBatchDraft(
          createValidBatchDraft({
            consignees: [createBatchConsigneeDraft(createBatchContact(), '文件')]
          })
        ).step,
        'address'
      )
      assert.equal(
        validateBatchDraft(
          createValidBatchDraft({
            consignees: [
              createBatchConsigneeDraft(
                createBatchContact({
                  name: '李四',
                  mobile: '13900139000',
                  province: '广东省',
                  city: '深圳市',
                  county: '南山区',
                  address: '科技园科苑路200号'
                })
              )
            ]
          })
        ).step,
        'goods'
      )
      assert.equal(
        validateBatchDraft(
          createValidBatchDraft({
            sender: createBatchContact({
              province: '台湾省'
            })
          })
        ).step,
        'specialRegion'
      )
    }
  },
  {
    name: 'batch address recognition parses local text and reports invalid lines',
    run() {
      const result = batchService.recognizeAddressText(
        ['李四 13900139000 广东省 深圳市 南山区 科技园科苑路200号 文件', '王五 123 广东省 广州市 天河区 体育西路1号 配件'].join('\n')
      )
      const overflow = batchService.recognizeAddressText(
        Array.from({ length: BATCH_MAX_CONSIGNEE_COUNT + 2 }, (_, index) => `客户${index} 13900139000 广东省 深圳市 南山区 科技园${index}号 文件`).join('\n')
      )

      assert.equal(result.totalLines, 2)
      assert.equal(result.acceptedCount, 1)
      assert.equal(result.rejectedCount, 1)
      assert.equal(result.items[0].contact.name, '李四')
      assert.equal(result.items[0].goodsName, '文件')
      assert.equal(result.items[1].message, '收货人手机号格式不正确')
      assert.equal(overflow.items.length, BATCH_MAX_CONSIGNEE_COUNT)
      assert.equal(overflow.ignoredCount, 2)
    }
  },
  {
    name: 'batch submit summary distinguishes success partial and failure',
    run() {
      assert.deepEqual(
        createBatchSubmitSummary({
          orderNumbers: ['ORDER_001', 'ORDER_002'],
          waybillNumbers: ['DPK001', 'DPK002'],
          waybillNumber: null
        }),
        {
          status: 'success',
          successCount: 2,
          failedCount: 0,
          message: '已成功提交 2 票'
        }
      )

      const partial = createBatchSubmitSummary({
        orderNumbers: ['ORDER_001'],
        waybillNumbers: ['DPK001'],
        waybillNumber: null,
        orderErrorInfo: [{ index: 1, errorMessage: '地址超区' }]
      })
      const failure = createBatchSubmitSummary({
        orderNumbers: null,
        waybillNumbers: null,
        waybillNumber: null,
        orderErrorInfo: [{ index: 0, errorMessage: '货物不支持寄递' }]
      })

      assert.equal(partial.status, 'partial')
      assert.equal(partial.successCount, 1)
      assert.equal(partial.failedCount, 1)
      assert.ok(partial.message.includes('第 2 票：地址超区'))
      assert.deepEqual(failure, {
        status: 'failure',
        successCount: 0,
        failedCount: 1,
        message: '第 1 票：货物不支持寄递'
      })
    }
  },
  {
    name: 'batch payload keeps multiple receivers in one request',
    run() {
      const second = createBatchConsigneeDraft(
        createBatchContact({
          id: 'CONSIGNEE_002',
          name: '王五',
          mobile: '13700137000',
          province: '广东省',
          city: '广州市',
          county: '天河区',
          address: '体育西路1号'
        }),
        '配件'
      )
      second.productCode = 'PACKAGE'
      second.deliveryMode = 'PICKSELF'
      second.service.insuredAmount = 500
      second.waybillNumber = 'DPK0002'

      const request = buildBatchCreateOrderRequest({
        ...createValidBatchDraft(),
        scanContext: {
          role: 'businessCode',
          value: 'DEPT_001'
        },
        consignees: [createValidBatchDraft().consignees[0], second]
      })

      assert.equal(request.batch, true)
      assert.deepEqual(request.contactIdList, ['SENDER_001', 'CONSIGNEE_001', 'CONSIGNEE_002'])
      assert.equal(request.acceptDept, 'DEPT_001')
      assert.equal(request.receive.length, 2)
      assert.equal(request.receive[0].goodsName, '文件')
      assert.equal(request.receive[1].goodsName, '配件')
      assert.equal(request.receive[1].transportMode, 'PACKAGE')
      assert.equal(request.receive[1].insuredAmount, 500)
      assert.equal(request.receive[1].waybillNumber, 'DPK0002')
      assert.equal(request.receive[0].beginAcceptTime, request.receive[1].beginAcceptTime)
    }
  },
  {
    name: 'batch submit performs one guarded batch create request',
    async run() {
      const originalCheck = expressApi.checkCanCreateOrder
      const originalCreate = expressApi.createOrder
      let createCallCount = 0

      expressApi.checkCanCreateOrder = async () => ({
        status: true,
        message: '',
        result: { orderFlag: 'Y' }
      })
      expressApi.createOrder = async request => {
        createCallCount += 1
        return {
          status: true,
          message: '',
          result: {
            orderNumbers: ['ORDER_BATCH_001'],
            waybillNumbers: ['DPK0001', 'DPK0002'],
            waybillNumber: null
          },
          request
        }
      }

      try {
        const response = await batchService.submitDraft(createValidBatchDraft())

        assert.equal(response.status, true)
        assert.equal(createCallCount, 1)
        assert.equal(response.result.orderNumbers[0], 'ORDER_BATCH_001')
      } finally {
        expressApi.checkCanCreateOrder = originalCheck
        expressApi.createOrder = originalCreate
      }
    }
  },
  {
    name: 'batch quote requests every receiver and selects default products',
    async run() {
      const originalQueryFreight = expressApi.queryFreight
      const requestedReceivers = []
      const second = createBatchConsigneeDraft(
        createBatchContact({
          name: '王五',
          mobile: '13700137000',
          province: '广东省',
          city: '广州市',
          county: '天河区',
          address: '体育西路1号'
        }),
        '配件'
      )

      expressApi.queryFreight = async request => {
        requestedReceivers.push(request.receiverAddress)
        return {
          status: true,
          message: '',
          result: [
            {
              productName: '大件快递',
              omsProductCode: 'PACKAGE',
              label: '推荐',
              totalfee: 20
            }
          ]
        }
      }

      try {
        const draft = createValidBatchDraft({
          consignees: [createValidBatchDraft().consignees[0], second]
        })
        const response = await batchService.quoteDraft(draft)

        assert.equal(response.status, true)
        assert.equal(response.result.length, 2)
        assert.deepEqual(requestedReceivers, ['科技园科苑路200号', '体育西路1号'])
        assert.equal(response.result[1].productCode, 'PACKAGE')
        assert.equal(response.result[1].estimatedFee, 20)

        expressApi.queryFreight = async () => {
          throw new Error('计价服务暂不可用')
        }

        const failure = await batchService.quoteDraft(draft)

        assert.equal(failure.status, false)
        assert.equal(failure.message, '计价服务暂不可用')
      } finally {
        expressApi.queryFreight = originalQueryFreight
      }
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
