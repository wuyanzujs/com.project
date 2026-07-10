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
  applyAddressHintToContact,
  applyAnalysis4ToContact,
  applyAnalysisToContact,
  createEmptyContact,
  getAddressHintLabel,
  parseAddressHint
} = require('../src/services/contact')
const {
  couponService,
  createCouponDetailView,
  validateCouponExchangeCode
} = require('../src/services/coupon')
const {
  isAlreadyBoundCourierMessage,
  normalizeCourier
} = require('../src/services/courier/courier.mapper')
const {
  createCourierExpressDraft
} = require('../src/services/courier/courier.rules')
const {
  BATCH_MAX_CONSIGNEE_COUNT,
  batchService,
  validateBatchDraft
} = require('../src/services/batch')
const {
  applyExpressScanContext,
  clearExpressScanContext,
  createAddressOnlyExpressContact,
  createExpressDraft,
  markExpressQuoteStale,
  validateExpressDraft,
  validateExpressPriceTimeDraft
} = require('../src/services/express/express.draft')
const { expressDraftBridge } = require('../src/services/express/draftBridge')
const {
  buildTemplateSaveRequest,
  mapTemplateToExpressDraft,
  validateTemplateDraft,
  validateTemplateMeta
} = require('../src/services/template/template.mapper')
const {
  buildCreateOrderRequest,
  buildFilterOrderRequest,
  buildFreightRequest
} = require('../src/services/express/express.payload')
const {
  createExpressScanContextView
} = require('../src/services/express/scanContext')
const {
  createExpressProductQuoteView
} = require('../src/services/express/express.quoteView')
const {
  createApplyPreview,
  createApplySubmitPayload,
  validateEmail
} = require('../src/services/invoice/invoice.apply')
const {
  createInvoiceModifyAddressPayload
} = require('../src/services/invoice/invoice.actions')
const {
  createECardApplyPreview,
  createECardApplySubmitPayload,
  normalizeInvoiceECard
} = require('../src/services/invoice/invoice.ecard')
const {
  canCancelInvoiceApply,
  canModifyInvoiceAddress,
  canReverseInvoice,
  canSendInvoiceEmail,
  normalizeHistory,
  parseInvoiceAcceptAddress
} = require('../src/services/invoice/invoice.history')
const {
  createTaxpayerPayload,
  normalizeTaxpayer,
  validateTaxpayer
} = require('../src/services/invoice/invoice.taxpayer')
const {
  createMemberMasUrl,
  createMemberWelfareUrl
} = require('../src/services/member/member.service')
const { createECardLinkRequest } = require('../src/services/ecard')
const {
  createOrderDetailActions,
  createOrderUrgeContext
} = require('../src/services/order/order.detailActions')
const {
  buildOrderModifyRequest,
  createOrderEditDraft,
  validateOrderEditDraft
} = require('../src/services/order/order.edit')
const {
  resolveOrderUrgeMenuAction
} = require('../src/services/order/order.detailUseCases')
const {
  createOrderSubscriptionAction,
  normalizeWaybillSubscription
} = require('../src/services/order/order.subscription')
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
  createPaymentEvaluateWebUri,
  getPaymentItemAmount,
  getPaymentEvaluateScene,
  getPaymentOrderTypeLabel,
  getPaymentRangeDays,
  getPaymentWriteOffStatus,
  createPaymentWaybillQuery
} = require('../src/services/payment/payment.service')
const {
  createPaymentFeeSummary
} = require('../src/services/payment/payment.fees')
const { queryService } = require('../src/services/query')
const { supportService } = require('../src/services/support')
const { createSignCodePayload, signService } = require('../src/services/sign')
const {
  appendRouteQuery,
  createAppRouteUrl,
  createRouteQuery
} = require('../src/shared/navigation/routeUrl')
const { APP_WEB_TARGETS } = require('../src/shared/webview/appWeb')
const { parseAppScanValue } = require('../src/shared/platform/scan')
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
const { createServiceFailure } = require('../src/services/serviceResponse')

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

function createExpressTemplateRaw(patch = {}) {
  return {
    id: 'TEMPLATE_001',
    defaultFlag: 1,
    templateName: '常用寄件',
    template: {
      sender: {
        name: ' 张三 ',
        telephone: '13800138000',
        province: '上海市',
        city: '上海市',
        county: '青浦区',
        address: '徐泾镇明珠路100号'
      },
      receiver: {
        name: '李四',
        telephone: '13900139000',
        province: '广东省',
        city: '深圳市',
        county: '南山区',
        address: '科技园科苑路200号'
      },
      isContact: 'N',
      goodInfo: {
        weight: 2.5,
        goodsName: ' 文件 ',
        isExtra: false
      },
      pickupTime: {
        dispatchFlag: 'Y',
        beginAcceptTime: '现在发货',
        beginAcceptTimeText: '现在发货',
        serviceTime: ''
      },
      payment: {
        paymentType: 'PAY_ARIIVE',
        paymentName: '到付'
      },
      product: {
        omsProductCode: 'PACKAGE',
        productCode: 'PACKAGE'
      },
      insurance: {
        insuranceAmount: '100'
      },
      addedService: {
        returnBillType: 'CUSTOMER_SIGNED_FAX',
        returnBillName: '电子签回单',
        returnRequirement: '',
        customReturnRequirement: ''
      }
    },
    ...patch
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

function createECardInvoiceDraft(patch = {}) {
  return {
    ecards: [
      {
        id: 'PAY_001',
        amount: 88.8,
        businessTime: '2026-07-09 10:00:00',
        timestamp: 1783562400000
      }
    ],
    taxpayer: companyTaxpayer,
    billCategory: '06',
    email: 'ecard@example.com',
    unit: '次',
    remark: '',
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
  return actions.map(item => item.kind)
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
    name: 'courier rules normalize profile labels and binding responses',
    run() {
      assert.deepEqual(
        normalizeCourier({
          avgStart: 5.8,
          courierMobile: ' 13800138000 ',
          courierName: ' 王师傅 ',
          courierNo: ' DPK001 ',
          deptName: ' 上海青浦营业部 ',
          deptCode: ' 021A001 ',
          signedCount: 120,
          rewardTimes: -1,
          labels: [
            { labelName: '服务热情', labelCount: 8 },
            { labelName: '上门及时', labelCount: 18 }
          ]
        }),
        {
          id: 'DPK001',
          name: '王师傅',
          mobile: '13800138000',
          departmentName: '上海青浦营业部',
          departmentCode: '021A001',
          rating: 5,
          ratingText: '5.0',
          signedCount: 120,
          rewardTimes: 0,
          labels: [
            { name: '上门及时', count: 18 },
            { name: '服务热情', count: 8 }
          ]
        }
      )
      assert.equal(isAlreadyBoundCourierMessage('当前账号已绑定该快递员'), true)
      assert.equal(isAlreadyBoundCourierMessage('绑定失败'), false)
    }
  },
  {
    name: 'courier express entry maps employee code to pickup scan context',
    run() {
      const draft = createCourierExpressDraft('  DPK001  ')

      assert.ok(draft)
      assert.deepEqual(draft.scanContext, {
        role: 'pickupManId',
        value: 'DPK001',
        sceneId: undefined,
        expressRole: undefined
      })
      assert.equal(draft.selectedProduct, null)
      assert.equal(draft.agreementAccepted, false)
      assert.equal(createCourierExpressDraft(''), null)
    }
  },
  {
    name: 'template mapper normalizes saved fields into a fresh express draft',
    run() {
      const draft = mapTemplateToExpressDraft(createExpressTemplateRaw())

      assert.equal(draft.sender.name, '张三')
      assert.equal(draft.consignee.city, '深圳市')
      assert.equal(draft.goods.name, '文件')
      assert.equal(draft.goods.weight, 2.5)
      assert.equal(draft.goods.insuredAmount, 100)
      assert.equal(draft.service.paymentType, 'PAY_ARIIVE')
      assert.equal(draft.service.transportMode, 'PACKAGE')
      assert.equal(draft.service.returnBillType, 'CUSTOMER_SIGNED_FAX')
      assert.equal(draft.service.needContact, 'N')
      assert.equal(draft.pickup.time, '')
      assert.equal(draft.selectedProduct, null)
      assert.equal(draft.agreementAccepted, false)
      assert.equal(draft.quoteStaleReason, '模板信息已带入，请重新获取价格')
    }
  },
  {
    name: 'template save rules validate metadata and build the backend payload',
    run() {
      const draft = createValidExpressDraft()
      const request = buildTemplateSaveRequest(
        draft,
        { name: ' 常用件 ', defaultFlag: 1 },
        'APP'
      )

      assert.equal(validateTemplateDraft(draft), '')
      assert.equal(
        validateTemplateMeta({ name: '', defaultFlag: 2 }),
        '请输入模板名称'
      )
      assert.equal(
        validateTemplateMeta({ name: '超过五个字模板', defaultFlag: 2 }),
        '模板名称不能超过5个字'
      )
      assert.equal(request.templateName, '常用件')
      assert.equal(request.defaultFlag, 1)
      assert.equal(request.sysCode, 'APP')
      assert.equal(request.template.sender.telephone, '13800138000')
      assert.equal(request.template.receiver.telephone, '13900139000')
      assert.equal(request.template.goodInfo.goodsName, '文件')
      assert.equal(request.template.payment.paymentType, 'MP')
    }
  },
  {
    name: 'template bridge always clears stale quote and agreement state',
    run() {
      const templateDraft = {
        ...createValidExpressDraft(),
        quoteStaleReason: ''
      }

      expressDraftBridge.carryFromTemplate(templateDraft)

      const carried = expressDraftBridge.consume()

      assert.equal(carried.source, 'TEMPLATE')
      assert.deepEqual(carried.quotes, [])
      assert.equal(carried.draft.selectedProduct, null)
      assert.equal(carried.draft.agreementAccepted, false)
      assert.equal(
        carried.draft.quoteStaleReason,
        '模板信息已带入，请重新获取价格'
      )
    }
  },
  {
    name: 'cookie rules extract ECO_TOKEN from response headers and cookie lists',
    run() {
      assert.equal(
        extractEcoToken('foo=bar; ECO_TOKEN=token-123; path=/'),
        'token-123'
      )
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
    name: 'member welfare url appends token and source without losing hash route',
    run() {
      assert.equal(
        createMemberWelfareUrl(
          'https://mastest.deppon.com.cn/cms-h5/h5.html#/welfare-center',
          'COUPON_LIST',
          'tmp-token'
        ),
        'https://mastest.deppon.com.cn/cms-h5/h5.html#/welfare-center?code=tmp-token&source=COUPON_LIST'
      )
      assert.equal(
        createMemberWelfareUrl(
          'https://mas.deppon.com/svip-member/entry',
          'MEMBER_INDEX',
          'svip-token'
        ),
        'https://mas.deppon.com/svip-member/entry?code=svip-token&source=MEMBER_INDEX'
      )
    }
  },
  {
    name: 'member mas urls keep configured environment and append auth context',
    run() {
      assert.equal(
        createMemberMasUrl(
          'MEMBER_POINTS',
          'MEMBER_POINTS',
          'points-token',
          'https://mastest.deppon.com.cn/cms-h5/h5.html#/welfare-center'
        ),
        'https://mastest.deppon.com.cn/points-center/home?code=points-token&source=MEMBER_POINTS'
      )
      assert.equal(
        createMemberMasUrl(
          'MEMBER_STUDENTS',
          'MEMBER_STUDENTS',
          '',
          'https://mas.deppon.com/member/home'
        ),
        'https://mas.deppon.com/student-member/entry?source=MEMBER_STUDENTS'
      )
      assert.equal(APP_WEB_TARGETS.MEMBER_POINTS_CENTER.url, '')
      assert.equal(APP_WEB_TARGETS.MEMBER_STUDENT_CENTER.title, '学生专区')
    }
  },
  {
    name: 'ecard link request preserves legacy target params without mini-program shell',
    run() {
      assert.deepEqual(
        createECardLinkRequest('RECHARGE', {
          type: 'YC',
          targetSource: 'HOME_ECARD',
          postmanId: 'PM001',
          activityCode: 'ACT001'
        }),
        {
          sysCode: 'APP',
          targetPage: 'RECHARGE',
          source: 'HOME_ECARD',
          type: 'YC',
          postmanId: 'PM001',
          activityCode: 'ACT001'
        }
      )
      assert.deepEqual(
        createECardLinkRequest('BILL', {
          targetSource: '  ',
          type: ''
        }),
        {
          sysCode: 'APP',
          targetPage: 'BILL',
          source: 'APP_ECARD_CENTER'
        }
      )
    }
  },
  {
    name: 'customer private bill web target points to controlled OWS page',
    run() {
      assert.equal(
        APP_WEB_TARGETS.CUSTOMER_PRIVATE_BILL.url,
        '/depponmobile/mow/customer/privateSetting'
      )
    }
  },
  {
    name: 'mine about us web target is public and controlled',
    run() {
      assert.equal(
        APP_WEB_TARGETS.MINE_ABOUT_US.url,
        '/depponmobile/h5/index#/homePackagePages/companyOverview/index'
      )
      assert.equal(APP_WEB_TARGETS.MINE_ABOUT_US.auth, false)
    }
  },
  {
    name: 'account preferences web target uses controlled OWS settings page',
    run() {
      assert.equal(
        APP_WEB_TARGETS.ACCOUNT_PREFERENCES.url,
        '/depponmobile/mow/center/accountSet'
      )
    }
  },
  {
    name: 'support chat list keeps hash route query under controlled web target',
    run() {
      const chatPath = '/depponmobile/h5/index#/chatPackagePages/chatList/index'

      assert.equal(APP_WEB_TARGETS.SUPPORT_CHAT_LIST.url, chatPath)
      assert.equal(
        supportService.createSecureWebUri(chatPath, 'APP_SUPPORT_CENTER'),
        '/depponmobile/h5/index#/chatPackagePages/chatList/index?sonSource=APP_SUPPORT_CENTER&pageSource=APP'
      )
    }
  },
  {
    name: 'station feedback web target preserves legacy scene and row data',
    run() {
      assert.equal(
        APP_WEB_TARGETS.STATION_FEEDBACK.url,
        '/depponmobile/survey/noStarEvaluate'
      )

      const stationUri = queryService.createStationFeedbackWebUri(
        {
          code: '021A001'
        },
        {
          province: '上海市',
          provinceCode: '310000',
          city: '上海市',
          cityCode: '310100',
          county: '青浦区',
          countyCode: '310118',
          town: '徐泾镇',
          townCode: '310118109',
          address: '明珠路100号',
          fullAddress: '上海市上海市青浦区徐泾镇明珠路100号'
        }
      )
      const stationParams = new URL(stationUri, 'https://owstest.deppon.com')
        .searchParams

      assert.equal(stationParams.get('scene'), 'P0101')
      assert.equal(stationParams.get('channel'), 'APP')
      assert.deepEqual(JSON.parse(stationParams.get('rowData')), [
        {
          field: 'deptCode',
          data: '021A001'
        },
        {
          field: 'queryAddress',
          data: '上海市上海市青浦区徐泾镇明珠路100号'
        }
      ])

      const emptyParams = new URL(
        queryService.createStationFeedbackWebUri(),
        'https://owstest.deppon.com'
      ).searchParams

      assert.equal(emptyParams.get('scene'), 'P0102')
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
      assert.equal(
        applyAnalysis4ToContact(contact, {
          province: '上海市',
          provinceCode: '310000',
          city: '上海市',
          cityCode: '310100',
          county: '青浦区',
          countyCode: '310118',
          town: '徐泾镇',
          townCode: '310118109',
          detailAddress: '徐泾镇明珠路100号',
          addressType: '0000'
        }).address,
        '明珠路100号'
      )
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
      const hint = parseAddressHint(
        '上海市,上海市,青浦区,徐泾镇,徐泾镇明珠路100号'
      )

      assert.equal(
        getAddressHintLabel(hint),
        '上海市上海市青浦区徐泾镇明珠路100号'
      )
      assert.equal(
        applyAddressHintToContact(contact, hint).address,
        '明珠路100号'
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
  },
  {
    name: 'coupon exchange code validation follows legacy length guard',
    run() {
      assert.equal(validateCouponExchangeCode(''), '请输入兑换码')
      assert.equal(validateCouponExchangeCode('ABC123'), '请输入正确的兑换码')
      assert.equal(validateCouponExchangeCode(' ABCDE12345 '), '')
      assert.equal(
        validateCouponExchangeCode('123456789012345678901'),
        '兑换码不能超过20个字符'
      )
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
      assert.deepEqual(discountCard.tags, [
        '即将到期',
        '限周日一使用',
        '快递',
        'App专享'
      ])
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
    name: 'express coupon payload sends promotion code and sender mobile',
    run() {
      const draft = {
        ...createValidExpressDraft(),
        couponNumber: ' CPN001 '
      }
      const freightRequest = buildFreightRequest(draft)
      const orderRequest = buildCreateOrderRequest(draft)
      const noCouponFreightRequest = buildFreightRequest(
        createValidExpressDraft()
      )

      assert.equal(freightRequest.promotionsCode, 'CPN001')
      assert.equal(freightRequest.customerMobile, '13800138000')
      assert.equal(orderRequest.receive[0].couponNumber, 'CPN001')
      assert.equal(noCouponFreightRequest.promotionsCode, undefined)
      assert.equal(noCouponFreightRequest.customerMobile, undefined)
    }
  },
  {
    name: 'express scan context clears stale quote and maps courier payload fields',
    run() {
      const draft = applyExpressScanContext(createValidExpressDraft(), {
        role: 'driverId',
        value: ' DRIVER_001 ',
        sceneId: ' SCENE_001 ',
        expressRole: 'PARTNER'
      })
      const request = buildCreateOrderRequest(draft)

      assert.equal(draft.scanContext.role, 'driverId')
      assert.equal(draft.scanContext.value, 'DRIVER_001')
      assert.equal(draft.scanContext.sceneId, 'SCENE_001')
      assert.equal(draft.scanContext.expressRole, 'PARTNER')
      assert.equal(draft.selectedProduct, null)
      assert.equal(draft.agreementAccepted, false)
      assert.equal(draft.quoteStaleReason, '扫码寄件信息变化，请重新获取价格')
      assert.equal(request.pickupManId, 'DRIVER_001')
      assert.equal(request.shipperNumber, '')
      assert.equal(request.acceptDept, '')
    }
  },
  {
    name: 'express scan context maps customer and department payload fields',
    run() {
      const customerRequest = buildCreateOrderRequest(
        applyExpressScanContext(createValidExpressDraft(), {
          role: 'shipperNumber',
          value: 'CUS_001'
        })
      )
      const businessRequest = buildCreateOrderRequest(
        applyExpressScanContext(createValidExpressDraft(), {
          role: 'businessCode',
          value: 'DEPT_001'
        })
      )
      const departmentRequest = buildCreateOrderRequest(
        applyExpressScanContext(createValidExpressDraft(), {
          role: 'acceptDept',
          value: 'DEPT_002'
        })
      )

      assert.equal(customerRequest.shipperNumber, 'CUS_001')
      assert.equal(customerRequest.acceptDept, '')
      assert.equal(customerRequest.pickupManId, '')
      assert.equal(businessRequest.acceptDept, 'DEPT_001')
      assert.equal(departmentRequest.acceptDept, 'DEPT_002')
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
  },
  {
    name: 'non-customer scan context does not affect freight customer fields',
    run() {
      const draft = applyExpressScanContext(createValidExpressDraft(), {
        role: 'pickupManId',
        value: 'PM_001'
      })
      const freightRequest = buildFreightRequest(draft)
      const filterRequest = buildFilterOrderRequest(draft)

      assert.equal(freightRequest.customerCode, undefined)
      assert.equal(freightRequest.customerMonthly, undefined)
      assert.equal(freightRequest.customerContract, undefined)
      assert.equal(filterRequest.customerCode, undefined)
      assert.equal(filterRequest.limitCust, 0)
    }
  },
  {
    name: 'express scan context view explains customer code and backend guard',
    run() {
      const view = createExpressScanContextView({
        role: 'shipperNumber',
        value: 'CUS_001',
        sceneId: 'SCENE_001',
        expressRole: 'PARTNER'
      })
      const emptyView = createExpressScanContextView()

      assert.equal(view.title, '扫码寄件信息')
      assert.equal(view.tag, '客户编码二维码')
      assert.equal(view.actionText, '移除')
      assert.equal(view.tone, 'success')
      assert.ok(view.summary.includes('客户编码 CUS_001'))
      assert.ok(view.summary.includes('场景 SCENE_001'))
      assert.ok(view.summary.includes('合作伙伴'))
      assert.ok(view.summary.includes('以后端校验为准'))
      assert.equal(emptyView, null)
    }
  },
  {
    name: 'express scan context view labels courier and department roles',
    run() {
      const courierView = createExpressScanContextView({
        role: 'pickupManId',
        value: 'PM_001'
      })
      const departmentView = createExpressScanContextView({
        role: 'businessCode',
        value: 'DEPT_001'
      })

      assert.equal(courierView.tag, '快递员二维码')
      assert.ok(courierView.summary.includes('pickupManId'))
      assert.equal(departmentView.tag, '服务点二维码')
      assert.ok(departmentView.summary.includes('acceptDept'))
    }
  },
  {
    name: 'clearing express scan context removes payload fields and stale quote',
    run() {
      const scannedDraft = applyExpressScanContext(createValidExpressDraft(), {
        role: 'pickupManId',
        value: 'PM_001'
      })
      const quotedDraft = {
        ...scannedDraft,
        selectedProduct: expressProduct,
        agreementAccepted: true,
        quoteStaleReason: ''
      }
      const clearedDraft = clearExpressScanContext(quotedDraft)
      const request = buildCreateOrderRequest(clearedDraft)

      assert.equal(clearedDraft.scanContext, undefined)
      assert.equal(clearedDraft.selectedProduct, null)
      assert.equal(clearedDraft.agreementAccepted, false)
      assert.equal(
        clearedDraft.quoteStaleReason,
        '扫码寄件信息已移除，请重新获取价格'
      )
      assert.equal(request.pickupManId, '')
      assert.equal(request.shipperNumber, '')
      assert.equal(request.acceptDept, '')
      assert.equal(
        clearExpressScanContext(createValidExpressDraft()).scanContext,
        undefined
      )
    }
  },
  {
    name: 'batch entry view exposes guarded App, copy and pending capabilities',
    run() {
      const view = batchService.getEntryView()
      const actionStatuses = Object.fromEntries(
        view.actions.map(item => [item.key, item.status])
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
        Array.from(
          { length: BATCH_MAX_CONSIGNEE_COUNT + 2 },
          (_, index) =>
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
      assert.equal(
        carried.draft.quoteStaleReason,
        '批量识别带入，请重新获取价格'
      )
      assert.deepEqual(carried.quotes, [])
    }
  },
  {
    name: 'goods query draft bridge carries goods name and marks quote stale',
    run() {
      const draft = markExpressQuoteStale(
        {
          ...createValidExpressDraft(),
          goods: {
            ...createValidExpressDraft().goods,
            name: '电子配件'
          },
          selectedProduct: expressProduct,
          agreementAccepted: true,
          quoteStaleReason: ''
        },
        '货物名称来自违禁品查询，请重新获取价格'
      )

      expressDraftBridge.carryFromGoodsQuery(draft)
      const carried = expressDraftBridge.consume()

      assert.equal(carried.source, 'GOODS_QUERY')
      assert.equal(carried.draft.goods.name, '电子配件')
      assert.equal(carried.draft.selectedProduct, null)
      assert.equal(carried.draft.agreementAccepted, false)
      assert.equal(
        carried.draft.quoteStaleReason,
        '货物名称来自违禁品查询，请重新获取价格'
      )
      assert.deepEqual(carried.quotes, [])
    }
  },
  {
    name: 'scan qr draft bridge carries scan context without quotes',
    run() {
      const draft = applyExpressScanContext(createValidExpressDraft(), {
        role: 'shipperNumber',
        value: 'CUS_002'
      })

      expressDraftBridge.carryFromScanQrCode(draft)
      const carried = expressDraftBridge.consume()

      assert.equal(carried.source, 'SCAN_QR_CODE')
      assert.equal(carried.draft.scanContext.role, 'shipperNumber')
      assert.equal(carried.draft.scanContext.value, 'CUS_002')
      assert.equal(carried.draft.selectedProduct, null)
      assert.equal(carried.draft.agreementAccepted, false)
      assert.equal(
        carried.draft.quoteStaleReason,
        '扫码寄件信息变化，请重新获取价格'
      )
      assert.deepEqual(carried.quotes, [])
    }
  },
  {
    name: 'dispatch query draft bridge carries address-only consignee',
    run() {
      const draft = {
        ...createExpressDraft(),
        consignee: createAddressOnlyExpressContact({
          province: '上海市',
          city: '上海市',
          county: '青浦区',
          town: '徐泾镇',
          address: '明珠路100号'
        }),
        selectedProduct: expressProduct,
        agreementAccepted: true,
        quoteStaleReason: ''
      }

      expressDraftBridge.carryFromDispatchQuery(draft)
      const carried = expressDraftBridge.consume()

      assert.equal(carried.source, 'DISPATCH_QUERY')
      assert.equal(carried.draft.consignee.name, '')
      assert.equal(carried.draft.consignee.mobile, '')
      assert.equal(carried.draft.consignee.province, '上海市')
      assert.equal(carried.draft.consignee.town, '徐泾镇')
      assert.equal(carried.draft.consignee.address, '明珠路100号')
      assert.equal(carried.draft.selectedProduct, null)
      assert.equal(carried.draft.agreementAccepted, false)
      assert.equal(
        carried.draft.quoteStaleReason,
        '收派范围查询带入，请重新获取价格'
      )
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
        view.actions.map(item => [item.key, item.status])
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
      assert.equal(
        signService.validateRealName('A').message,
        '请输入 2-20 个字符的签收人姓名'
      )
      assert.equal(
        signService.validateRealName('张<三').message,
        '签收人姓名包含非法字符'
      )
    }
  },
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
    name: 'price-time validation only requires address and goods metrics',
    run() {
      const quoteView = createExpressProductQuoteView({
        productName: '精准卡航',
        omsProductCode: 'PACKAGE',
        days: null,
        daysFormat: null,
        arriveDate: '明日达',
        message: null,
        label: '',
        totalfee: 28,
        billWeight: 3.5,
        detail: [
          {
            priceEntryCode: 'FRT',
            priceEntryName: '基础运费',
            caculateFee: 20
          },
          {
            priceEntryCode: 'BF',
            priceEntryName: '保价费',
            caculateFee: 0
          }
        ]
      })
      const emptyPriceView = createExpressProductQuoteView({
        productName: '',
        omsProductCode: '',
        days: null,
        arriveDate: null,
        message: null,
        label: '',
        totalfee: null,
        detail: null,
        billWeight: null
      })
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
      assert.equal(quoteView.name, '精准卡航')
      assert.equal(quoteView.priceText, '¥28')
      assert.equal(quoteView.priceWithSuffixText, '¥28起')
      assert.equal(quoteView.timeText, '明日达')
      assert.equal(quoteView.billWeightText, '计费重量 3.5kg')
      assert.deepEqual(quoteView.feeRows, [
        {
          key: 'FRT',
          name: '基础运费',
          amount: 20
        }
      ])
      assert.equal(emptyPriceView.name, '德邦快递')
      assert.equal(emptyPriceView.priceText, '--')
      assert.equal(emptyPriceView.timeText, '时效待确认')
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
    name: 'order edit mapper creates a normalized draft from secure detail',
    run() {
      const draft = createOrderEditDraft(
        createOrderDetail({
          contactName: ' 张三 ',
          contactMobile: '13800138000',
          contactProvince: '上海市',
          contactCity: '上海市',
          contactArea: '青浦区',
          contactTown: '徐泾镇',
          contactAddress: '明珠路100号',
          receiverName: ' 李四 ',
          receiverMobile: '13900139000',
          receiverProvince: '广东省',
          receiverCity: '深圳市',
          receiverArea: '南山区',
          receiverTown: '粤海街道',
          receiverAddress: '科苑路200号',
          goodsName: ' 文件 ',
          goodsNumber: 2,
          totalWeight: 3.5,
          totalVolume: 0.12,
          remark: ' 小心轻放 '
        })
      )

      assert.equal(draft.orderNumber, 'ORDER_001')
      assert.equal(draft.sender.name, '张三')
      assert.equal(draft.sender.town, '徐泾镇')
      assert.equal(draft.receiver.name, '李四')
      assert.equal(draft.goodsName, '文件')
      assert.equal(draft.goodsNumber, 2)
      assert.equal(draft.totalWeight, 3.5)
      assert.equal(draft.totalVolume, 0.12)
      assert.equal(draft.remark, '小心轻放')
    }
  },
  {
    name: 'order edit request sends only changed fields and grouped regions',
    run() {
      const origin = createOrderEditDraft(
        createOrderDetail({
          contactName: '张三',
          contactMobile: '13800138000',
          contactProvince: '上海市',
          contactCity: '上海市',
          contactArea: '青浦区',
          contactAddress: '明珠路100号',
          receiverName: '李四',
          receiverMobile: '13900139000',
          receiverProvince: '广东省',
          receiverCity: '深圳市',
          receiverArea: '南山区',
          receiverAddress: '科苑路200号',
          goodsName: '文件',
          goodsNumber: 1,
          totalWeight: 1,
          totalVolume: 0,
          remark: ''
        })
      )
      const preview = buildOrderModifyRequest(
        {
          ...origin,
          sender: {
            ...origin.sender,
            province: '江苏省',
            city: '苏州市',
            county: '工业园区'
          },
          goodsName: '电子配件',
          totalWeight: 2.5,
          remark: ' 加急 '
        },
        origin
      )

      assert.equal(preview.changed, true)
      assert.deepEqual(preview.changedFields, [
        '寄件地区',
        '货物名称',
        '货物重量',
        '备注'
      ])
      assert.deepEqual(preview.request, {
        orderNumber: 'ORDER_001',
        contactProvince: '江苏省',
        contactCity: '苏州市',
        contactArea: '工业园区',
        goodsName: '电子配件',
        totalWeight: 2.5,
        remark: '加急'
      })
      assert.deepEqual(buildOrderModifyRequest(origin, origin), {
        changed: false,
        changedFields: [],
        request: {
          orderNumber: 'ORDER_001'
        }
      })
    }
  },
  {
    name: 'order edit validation blocks identical addresses and invalid metrics',
    run() {
      const draft = createOrderEditDraft(
        createOrderDetail({
          contactName: '张三',
          contactMobile: '13800138000',
          contactProvince: '上海市',
          contactCity: '上海市',
          contactArea: '青浦区',
          contactAddress: '明珠路100号',
          receiverName: '李四',
          receiverMobile: '13900139000',
          receiverProvince: '上海市',
          receiverCity: '上海市',
          receiverArea: '青浦区',
          receiverAddress: '明珠路100号',
          goodsName: '文件',
          goodsNumber: 0,
          totalWeight: 0,
          totalVolume: -1
        })
      )
      const invalidDraft = {
        ...draft,
        goodsNumber: 0,
        totalWeight: 0,
        totalVolume: -1
      }
      const validation = validateOrderEditDraft(invalidDraft)

      assert.equal(validation.valid, false)
      assert.ok(validation.messages.includes('寄件和收件地址不能相同'))
      assert.ok(validation.messages.includes('货物件数至少为1件'))
      assert.ok(validation.messages.includes('请填写正确的货物重量'))
      assert.ok(validation.messages.includes('请填写正确的货物体积'))
    }
  },
  {
    name: 'order subscription mapper normalizes role, status and waybill fields',
    run() {
      const subscription = normalizeWaybillSubscription({
        sender: ' 张三 ',
        sendCity: ' 上海 ',
        consignee: ' 李四 ',
        consignCity: ' 深圳 ',
        wayBillNo: ' DPK123456789 ',
        tableType: 'EXPRESS',
        statusType: '派送中',
        orderClassification: '6',
        createWaybillTime: 'invalid-time',
        isSender: 'N',
        isReceiver: 'Y'
      })

      assert.deepEqual(subscription, {
        id: 'DPK123456789',
        role: 'receive',
        senderName: '张三',
        senderCity: '上海',
        consigneeName: '李四',
        consigneeCity: '深圳',
        waybillNumber: 'DPK123456789',
        statusText: '派送中',
        createdAt: 'invalid-time',
        isExpress: true
      })
      assert.equal(normalizeWaybillSubscription({ wayBillNo: ' ' }), null)
    }
  },
  {
    name: 'order subscription action reflects loading and followed state',
    run() {
      assert.equal(createOrderSubscriptionAction(null), null)
      assert.equal(createOrderSubscriptionAction(false).title, '关注运单')
      assert.equal(createOrderSubscriptionAction(true).title, '取消关注')
      assert.equal(createOrderSubscriptionAction(true, true).title, '处理中')
      assert.equal(createOrderSubscriptionAction(false).target, 'subscription')
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
    name: 'order detail routes wait-allot edits to App and transit edits to H5',
    run() {
      const waitActions = createOrderDetailActions(
        createOrderDetail({
          orderClassification: '0',
          orderClassName: '待揽件',
          orderStatus: '待揽件',
          waybillNumber: '',
          modifyFlag: true
        }),
        {
          role: 'sender'
        }
      )
      const transitActions = createOrderDetailActions(createOrderDetail(), {
        role: 'sender'
      })
      const modifyOrder = waitActions.find(item => item.kind === 'modifyOrder')
      const modifyWaybill = transitActions.find(
        item => item.kind === 'modifyWaybill'
      )

      assert.ok(modifyOrder)
      assert.equal(modifyOrder.target, 'route')
      assert.ok(modifyOrder.route.includes('/pages/order/edit/index'))
      assert.ok(modifyOrder.route.includes('orderNumber=ORDER_001'))
      assert.equal(
        waitActions.some(item => item.kind === 'modifyWaybill'),
        false
      )
      assert.ok(modifyWaybill)
      assert.equal(modifyWaybill.target, 'web')
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
      const invoiceAction = signedActions.find(item => item.kind === 'invoice')
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
      ).find(item => item.kind === 'departmentPhone')

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
