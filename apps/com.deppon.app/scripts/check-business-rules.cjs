const assert = require('node:assert/strict')

// Taro runtime expects compile-time flags when modules are loaded in Node.
globalThis.ENABLE_ADJACENT_HTML = false
globalThis.ENABLE_CLONE_NODE = false
globalThis.ENABLE_CONTAINS = false
globalThis.ENABLE_INNER_HTML = false
globalThis.ENABLE_MUTATION_OBSERVER = false
globalThis.ENABLE_SIZE_APIS = false
globalThis.ENABLE_TEMPLATE_CONTENT = false

require('ts-node').register({
  skipProject: true,
  transpileOnly: true,
  compilerOptions: {
    jsx: 'react-native',
    module: 'CommonJS',
    moduleResolution: 'Node'
  }
})

const {
  applyAnalysisToContact,
  createEmptyContact,
  parseAddressHint
} = require('../src/services/contact')
const {
  BATCH_MAX_CONSIGNEE_COUNT,
  batchService,
  validateBatchDraft
} = require('../src/services/batch')
const {
  createExpressDraft,
  validateExpressDraft,
  validateExpressPriceTimeDraft
} = require('../src/services/express/express.draft')
const {
  expressDraftBridge
} = require('../src/services/express/draftBridge')
const {
  createApplyPreview,
  createApplySubmitPayload,
  validateEmail
} = require('../src/services/invoice/invoice.apply')
const {
  createTaxpayerPayload,
  normalizeTaxpayer,
  validateTaxpayer
} = require('../src/services/invoice/invoice.taxpayer')
const {
  createOrderDetailActions,
  createOrderUrgeContext
} = require('../src/services/order/order.detailActions')
const {
  resolveOrderUrgeMenuAction
} = require('../src/services/order/order.detailUseCases')
const {
  formatAmount,
  formatMeasure,
  maskMobile,
  toDisplayText
} = require('../src/services/order/order.display')
const {
  PRINT_API_ENDPOINTS,
  printService,
  validatePrintSelection
} = require('../src/services/print')
const {
  createSignCodePayload,
  signService
} = require('../src/services/sign')
const {
  appendRouteQuery,
  createAppRouteUrl,
  createRouteQuery
} = require('../src/shared/navigation/routeUrl')
const {
  parseAppScanValue
} = require('../src/shared/platform/scan')
const {
  isDepponSuccessStatus,
  shouldAcceptDepponHttpStatus,
  shouldEmitAuthExpiredEvent,
  shouldEmitRateLimitedEvent
} = require('../src/request/deppon.rules')
const {
  createEcoSessionCookie,
  extractEcoToken,
  getSetCookieFromHeaders,
  normalizeCookieList
} = require('../src/request/cookie.rules')
const {
  createServiceFailure
} = require('../src/services/serviceResponse')

const senderContact = {
  name: '张三',
  mobile: '13800138000',
  province: '上海市',
  city: '上海市',
  county: '青浦区',
  address: '徐泾镇明珠路100号'
}

const consigneeContact = {
  name: '李四',
  mobile: '13900139000',
  province: '广东省',
  city: '深圳市',
  county: '南山区',
  address: '科技园科苑路200号'
}

const expressProduct = {
  productName: '精准卡航',
  omsProductCode: 'PACKAGE',
  days: '1',
  arriveDate: null,
  message: null,
  label: '推荐',
  totalfee: 28,
  detail: null,
  billWeight: 1
}

const invoiceOrder = {
  id: 'ORDER_001',
  waybillNumber: 'DPK123456789',
  businessTime: '2026-07-09 10:00:00',
  senderText: '上海市 张三',
  consigneeText: '深圳市 李四',
  amount: 128.5,
  unverAmount: 0,
  unpaidAmount: 0,
  paymentType: '现付',
  statusText: '可开票',
  statusClass: 'success',
  canApply: true,
  pendingPayment: false,
  electronSupported: true
}

const companyTaxpayer = {
  id: 1,
  name: '德邦测试有限公司',
  taxNumber: '91310000123456789X',
  typeText: '单位',
  phone: '021-12345678',
  address: '上海市青浦区明珠路',
  bank: '招商银行上海分行',
  bankAccount: '6222000000000000',
  isDefault: true,
  customerType: '1',
  remark: ''
}

function createValidExpressDraft() {
  const draft = createExpressDraft()

  return {
    ...draft,
    sender: senderContact,
    consignee: consigneeContact,
    goods: {
      ...draft.goods,
      name: '文件',
      weight: 1,
      count: 1
    },
    selectedProduct: expressProduct,
    agreementAccepted: true
  }
}

function createInvoiceDraft(patch = {}) {
  return {
    order: invoiceOrder,
    taxpayer: companyTaxpayer,
    billCategory: '13',
    email: 'finance@example.com',
    unit: '票',
    remark: '开票测试',
    ...patch
  }
}

function createBatchContact(patch = {}) {
  return {
    name: '张三',
    mobile: '13800138000',
    province: '上海市',
    city: '上海市',
    county: '青浦区',
    address: '徐泾镇明珠路100号',
    ...patch
  }
}

function createValidBatchDraft(patch = {}) {
  return {
    sender: createBatchContact(),
    consignees: [
      {
        contact: createBatchContact({
          name: '李四',
          mobile: '13900139000',
          province: '广东省',
          city: '深圳市',
          county: '南山区',
          address: '科技园科苑路200号'
        }),
        goodsName: '文件'
      }
    ],
    ...patch
  }
}

function createOrderDetail(patch = {}) {
  return {
    isSender: 'Y',
    isReceiver: 'N',
    orderNumber: 'ORDER_001',
    waybillNumber: 'DPK123456789',
    orderClassification: '1',
    orderClassName: '运输中',
    orderStatus: '运输中',
    orderTime: '2026-07-09 10:00:00',
    contactMobile: '13800138000',
    receiverMobile: '13900139000',
    modifyFlag: true,
    isDlyNotified: 'N',
    canBeVoided: 'Y',
    orderTableType: 'EXPRESS',
    ...patch
  }
}

function getActionKinds(actions) {
  return actions.map((item) => item.kind)
}

const tests = [
  {
    name: 'service response factory creates consistent failure responses',
    run() {
      assert.deepEqual(createServiceFailure('业务失败'), {
        status: false,
        message: '业务失败',
        result: null
      })
    }
  },
  {
    name: 'cookie rules extract ECO_TOKEN from response headers and cookie lists',
    run() {
      assert.equal(extractEcoToken('foo=bar; ECO_TOKEN=token-123; path=/'), 'token-123')
      assert.equal(extractEcoToken('foo=bar;'), '')
      assert.equal(
        createEcoSessionCookie('foo=bar; ECO_TOKEN=token-123; path=/'),
        'ECO_TOKEN=token-123;'
      )
      assert.equal(
        getSetCookieFromHeaders({
          'set-cookie': ['foo=bar', 'ECO_TOKEN=token-456; Path=/']
        }),
        'foo=bar;ECO_TOKEN=token-456; Path=/'
      )
      assert.equal(
        normalizeCookieList(['foo=bar', 'ECO_TOKEN=token-789; Path=/']),
        'foo=bar;ECO_TOKEN=token-789; Path=/'
      )
    }
  },
  {
    name: 'deppon request rules normalize OWS success and accepted http status',
    run() {
      assert.equal(isDepponSuccessStatus(true), true)
      assert.equal(isDepponSuccessStatus('1'), true)
      assert.equal(isDepponSuccessStatus(0), true)
      assert.equal(isDepponSuccessStatus('success'), true)
      assert.equal(isDepponSuccessStatus('0'), false)
      assert.equal(isDepponSuccessStatus(1), false)
      assert.equal(shouldAcceptDepponHttpStatus(200), true)
      assert.equal(shouldAcceptDepponHttpStatus(401), true)
      assert.equal(shouldAcceptDepponHttpStatus(429), true)
      assert.equal(shouldAcceptDepponHttpStatus(500), false)
    }
  },
  {
    name: 'deppon request rules detect auth expired and rate limited responses',
    run() {
      assert.equal(shouldEmitAuthExpiredEvent(true, 401, '901'), true)
      assert.equal(shouldEmitAuthExpiredEvent(false, 401, '901'), false)
      assert.equal(shouldEmitAuthExpiredEvent(true, 200, '901'), false)
      assert.equal(shouldEmitRateLimitedEvent(429, false), true)
      assert.equal(shouldEmitRateLimitedEvent(200, 429), true)
      assert.equal(shouldEmitRateLimitedEvent(200, false), false)
    }
  },
  {
    name: 'route query keeps 0/false, drops empty values and encodes text',
    run() {
      assert.equal(
        createRouteQuery({
          keyword: '德邦 快递',
          page: 0,
          enabled: false,
          empty: '',
          nil: null,
          arrayValue: ['A&B', 'ignored']
        }),
        'keyword=%E5%BE%B7%E9%82%A6%20%E5%BF%AB%E9%80%92&page=0&enabled=false&arrayValue=A%26B'
      )
    }
  },
  {
    name: 'route helpers append query to app and h5 urls',
    run() {
      assert.equal(
        createAppRouteUrl('/pages/order/detail/index', {
          waybillNumber: 'DPK123456789',
          source: 'TEST'
        }),
        '/pages/order/detail/index?waybillNumber=DPK123456789&source=TEST'
      )
      assert.equal(
        appendRouteQuery('https://example.com/path?token=abc', {
          pageSource: 'APP'
        }),
        'https://example.com/path?token=abc&pageSource=APP'
      )
    }
  },
  {
    name: 'contact address analysis keeps town separate and ignores null hint parts',
    run() {
      const contact = createEmptyContact(1)
      const nextContact = applyAnalysisToContact(contact, {
        proCityName: '上海市-上海市-青浦区',
        town: '徐泾镇',
        address: '徐泾镇徐泾镇明珠路100号',
        name: ' 李四 ',
        telephone: '139 0013 9000',
        addressType: null,
        extension: null
      })

      assert.equal(nextContact.name, '李四')
      assert.equal(nextContact.telephone, '13900139000')
      assert.equal(nextContact.province, '上海市')
      assert.equal(nextContact.city, '上海市')
      assert.equal(nextContact.county, '青浦区')
      assert.equal(nextContact.town, '徐泾镇')
      assert.equal(nextContact.address, '明珠路100号')
      assert.deepEqual(
        parseAddressHint('上海市,上海市,青浦区,null,明珠路100号'),
        {
          province: '上海市',
          city: '上海市',
          county: '青浦区',
          town: '',
          address: '明珠路100号',
          raw: '上海市,上海市,青浦区,null,明珠路100号'
        }
      )
    }
  },
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
      assert.equal(invalidHost.kind, 'unsupported')
      assert.equal(invalidHost.reason, 'invalidHost')
      assert.equal(unsupported.kind, 'unsupported')
      assert.equal(unsupported.reason, 'unknown')
    }
  },
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
    name: 'batch entry view exposes guarded App, copy and pending capabilities',
    run() {
      const view = batchService.getEntryView()
      const actionStatuses = Object.fromEntries(
        view.actions.map((item) => [item.key, item.status])
      )

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
      assert.equal(
        validateBatchDraft(createValidBatchDraft({ sender: null })).message,
        '请选择发货人'
      )
      assert.equal(
        validateBatchDraft(createValidBatchDraft({ consignees: [] })).message,
        '请至少添加 1 个收货人'
      )
      assert.equal(
        validateBatchDraft(
          createValidBatchDraft({
            consignees: Array.from(
              { length: BATCH_MAX_CONSIGNEE_COUNT + 1 },
              () => createValidBatchDraft().consignees[0]
            )
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
            consignees: [
              {
                contact: createBatchContact(),
                goodsName: '文件'
              }
            ]
          })
        ).step,
        'address'
      )
      assert.equal(
        validateBatchDraft(
          createValidBatchDraft({
            consignees: [
              {
                contact: createBatchContact({
                  name: '李四',
                  mobile: '13900139000',
                  province: '广东省',
                  city: '深圳市',
                  county: '南山区',
                  address: '科技园科苑路200号'
                }),
                goodsName: ''
              }
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
        [
          '李四 13900139000 广东省 深圳市 南山区 科技园科苑路200号 文件',
          '王五 123 广东省 广州市 天河区 体育西路1号 配件'
        ].join('\n')
      )
      const overflow = batchService.recognizeAddressText(
        Array.from({ length: BATCH_MAX_CONSIGNEE_COUNT + 2 }, (_, index) =>
          `客户${index} 13900139000 广东省 深圳市 南山区 科技园${index}号 文件`
        ).join('\n')
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
    name: 'batch recognition draft bridge carries consignee and clears quotes',
    run() {
      const draft = {
        ...createExpressDraft(),
        consignee: {
          name: '李四',
          mobile: '13900139000',
          province: '广东省',
          city: '深圳市',
          county: '南山区',
          address: '科技园科苑路200号'
        },
        goods: {
          ...createExpressDraft().goods,
          name: '文件'
        },
        selectedProduct: expressProduct,
        agreementAccepted: true,
        quoteStaleReason: ''
      }

      expressDraftBridge.carryFromBatchRecognition(draft)
      const carried = expressDraftBridge.consume()

      assert.equal(carried.source, 'BATCH_RECOGNITION')
      assert.equal(carried.draft.consignee.name, '李四')
      assert.equal(carried.draft.goods.name, '文件')
      assert.equal(carried.draft.selectedProduct, null)
      assert.equal(carried.draft.agreementAccepted, false)
      assert.equal(carried.draft.quoteStaleReason, '批量识别带入，请重新获取价格')
      assert.deepEqual(carried.quotes, [])
    }
  },
  {
    name: 'print center view exposes order fallback and pending native print actions',
    run() {
      const view = printService.getCenterView({
        printId: 'PRINT_001',
        source: 'HOME_SCAN'
      })
      const actionStatuses = Object.fromEntries(
        view.actions.map((item) => [item.key, item.status])
      )

      assert.equal(actionStatuses.orderList, 'ready')
      assert.equal(actionStatuses.printOrders, 'pending')
      assert.equal(actionStatuses.printerDevice, 'pending')
      assert.equal(actionStatuses.printConfig, 'pending')
      assert.equal(actionStatuses.cloudPrintCode, 'pending')
      assert.equal(view.nativeReady, false)
      assert.equal(view.cloudCode.printId, 'PRINT_001')
      assert.equal(view.cloudCode.source, 'HOME_SCAN')
      assert.equal(view.cloudCode.statusText, '待接入')
      assert.ok(
        PRINT_API_ENDPOINTS.includes(
          '/gwapi/onlineService/eco/online/print/order/secure/queryNewOrderPrintList'
        )
      )
    }
  },
  {
    name: 'print selection validation requires device, orders and selected waybills',
    run() {
      assert.deepEqual(
        validatePrintSelection({
          deviceConnected: false,
          totalOrders: 1,
          selectedWaybillNumbers: ['DPK123456789']
        }),
        {
          canPrint: false,
          step: 'device',
          message: '请先连接打印机'
        }
      )
      assert.equal(
        validatePrintSelection({
          deviceConnected: true,
          totalOrders: 0,
          selectedWaybillNumbers: ['DPK123456789']
        }).message,
        '暂无待打印订单'
      )
      assert.equal(
        validatePrintSelection({
          deviceConnected: true,
          totalOrders: 1,
          selectedWaybillNumbers: []
        }).message,
        '请选择打印运单后再打印'
      )
      assert.deepEqual(
        validatePrintSelection({
          deviceConnected: true,
          totalOrders: 1,
          selectedWaybillNumbers: ['DPK123456789']
        }),
        {
          canPrint: true,
          step: 'ready',
          message: ''
        }
      )
    }
  },
  {
    name: 'sign code rules create qr payload and validate real names',
    run() {
      assert.equal(
        createSignCodePayload(' CODE 123 '),
        'https://www.deppon.com/user/sign?code=CODE%20123'
      )
      assert.equal(createSignCodePayload(''), '')
      assert.deepEqual(signService.validateRealName(' 张三 '), {
        status: true,
        message: '',
        value: '张三'
      })
      assert.equal(signService.validateRealName('A').message, '请输入 2-20 个字符的签收人姓名')
      assert.equal(signService.validateRealName('张<三').message, '签收人姓名包含非法字符')
    }
  },
  {
    name: 'price-time validation only requires address and goods metrics',
    run() {
      const draft = {
        ...createValidExpressDraft(),
        goods: {
          ...createValidExpressDraft().goods,
          weight: 0,
          count: 0
        }
      }
      const result = validateExpressPriceTimeDraft(draft)

      assert.equal(result.valid, false)
      assert.ok(result.messages.includes('请填写正确的货物重量'))
      assert.ok(result.messages.includes('货物件数至少为1件'))
    }
  },
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
  },
  {
    name: 'order display helpers normalize money, measures and masked mobile',
    run() {
      assert.equal(formatAmount(12), '¥12.00')
      assert.equal(formatAmount(0), '')
      assert.equal(formatMeasure('3.5', 'kg'), '3.5kg')
      assert.equal(formatMeasure(0, 'kg'), '--')
      assert.equal(toDisplayText('  hello  '), 'hello')
      assert.equal(toDisplayText(''), '--')
      assert.equal(maskMobile('13800138000'), '138****8000')
      assert.equal(maskMobile('13****8000'), '13****8000')
    }
  },
  {
    name: 'order detail actions hide secure actions in public track mode',
    run() {
      assert.deepEqual(
        createOrderDetailActions(createOrderDetail(), {
          publicTrackMode: true,
          role: 'sender'
        }),
        []
      )
    }
  },
  {
    name: 'order detail actions expose sender transit action set',
    run() {
      const order = createOrderDetail()
      const kinds = getActionKinds(
        createOrderDetailActions(order, {
          role: 'sender'
        })
      )
      const urge = createOrderUrgeContext(order, {
        role: 'sender'
      })

      assert.deepEqual(kinds, [
        'service',
        'notifyDeliver',
        'invalidWaybill',
        'evaluate',
        'complaint',
        'claim',
        'modifyWaybill'
      ])
      assert.deepEqual(urge, {
        voucherNumber: 'DPK123456789',
        voucherType: '1',
        urgeType: 'URGE_BILL_NO',
        buttonCode: '',
        contactPhone: '95353'
      })
    }
  },
  {
    name: 'order detail actions expose receiver delivery preference without sender-only actions',
    run() {
      const actions = createOrderDetailActions(
        createOrderDetail({
          isSender: 'N',
          isReceiver: 'Y'
        }),
        {
          role: 'receive'
        }
      )
      const kinds = getActionKinds(actions)

      assert.ok(kinds.includes('deliveryPreference'))
      assert.ok(!kinds.includes('notifyDeliver'))
      assert.ok(!kinds.includes('invalidWaybill'))
      assert.ok(!kinds.includes('modifyWaybill'))
    }
  },
  {
    name: 'order detail actions expose signed invoice route and invalid department phone',
    run() {
      const signedActions = createOrderDetailActions(
        createOrderDetail({
          orderClassification: '2',
          orderClassName: '已签收',
          orderStatus: '已签收'
        }),
        {
          role: 'sender'
        }
      )
      const invoiceAction = signedActions.find((item) => item.kind === 'invoice')
      const departmentAction = createOrderDetailActions(
        createOrderDetail({
          orderClassification: '5',
          orderClassName: '已取消',
          orderStatus: '已取消',
          stationCode: '021A001',
          stationPhone: '021-12345678'
        }),
        {
          role: 'sender'
        }
      ).find((item) => item.kind === 'departmentPhone')

      assert.ok(invoiceAction)
      assert.equal(invoiceAction.target, 'route')
      assert.ok(invoiceAction.route.includes('waybillNumber=DPK123456789'))
      assert.deepEqual(departmentAction.departmentPhone, {
        stationCode: '021A001',
        phoneNumber: '021-12345678'
      })
    }
  },
  {
    name: 'order urge menu resolver opens progress web target from modal button',
    run() {
      const webUri =
        '/depponmobile/mow/order/urgeProgress?voucherType=1&voucherNumber=DPK123456789'
      const action = {
        kind: 'urge',
        title: '我要催单',
        summary: '催促当前订单尽快处理',
        target: 'urge',
        tone: 'warning',
        webSource: 'ORDER_DETAIL_URGE_PROGRESS',
        webUri,
        urge: {
          voucherNumber: 'DPK123456789',
          voucherType: '1',
          urgeType: 'URGE_BILL_NO',
          buttonCode: 'FOLLOW_UP',
          contactPhone: '95353'
        },
        loginRequired: true
      }

      assert.deepEqual(
        resolveOrderUrgeMenuAction(
          {
            buttonCode: 'VIEW_PROGRESS',
            buttonName: '查看进度'
          },
          action
        ),
        {
          kind: 'progress',
          webSource: 'ORDER_DETAIL_URGE_PROGRESS',
          webUri,
          title: '查看进度'
        }
      )
    }
  }
]

let failed = 0

for (const test of tests) {
  try {
    test.run()
    console.log(`✓ ${test.name}`)
  } catch (error) {
    failed += 1
    console.error(`✗ ${test.name}`)
    console.error(error)
  }
}

if (failed > 0) {
  console.error(`Business rule check failed: ${failed}/${tests.length}`)
  process.exit(1)
}

console.log(`Business rule check passed: ${tests.length} cases`)
