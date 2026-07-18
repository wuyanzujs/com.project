const assert = require('node:assert/strict')
const runtimeBuild = require('../config/runtime-build.cjs')

// Taro runtime expects compile-time flags when modules are loaded in Node.
globalThis.ENABLE_ADJACENT_HTML = false
globalThis.ENABLE_CLONE_NODE = false
globalThis.ENABLE_CONTAINS = false
globalThis.ENABLE_INNER_HTML = false
globalThis.ENABLE_MUTATION_OBSERVER = false
globalThis.ENABLE_SIZE_APIS = false
globalThis.ENABLE_TEMPLATE_CONTENT = false
globalThis.__APP_RUNTIME_CONFIG__ = {
  env: 'test',
  apiBaseURL: 'https://owstest.deppon.com',
  webBaseURL: 'https://owstest.deppon.com',
  serviceWebURL:
    'https://osstest.deppon.com.cn/dzfront/web/home?showChat=true&layout=true',
  memberWebURL:
    'https://mastest.deppon.com.cn/cms-h5/h5.html#/welfare-center',
  webAllowedHosts: [
    'owstest.deppon.com',
    'ows.deppon.com',
    'osstest.deppon.com.cn',
    'mastest.deppon.com.cn'
  ],
  systemCode: 'APP',
  appClientChannel: 'APP',
  omsChannel: 'APP',
  ecardPmcSystemCode: 'APP',
  mobileLoginType: 'MOBILE_VERIFICATION_CODE',
  supportSurveyConfigKey: 'app_survey_config'
}

require('ts-node').register({
  skipProject: true,
  transpileOnly: true,
  compilerOptions: {
    jsx: 'react-native',
    module: 'CommonJS',
    moduleResolution: 'Node'
  }
})

const TaroModule = require('@tarojs/taro')
const Taro = TaroModule.default ?? TaroModule

const {
  applyAddressHintToContact,
  applyAnalysis4ToContact,
  applyAnalysisToContact,
  contactApi,
  contactSelection,
  contactService,
  createContactAddressCheckRequest,
  createEmptyContact,
  getAddressHintLabel,
  parseAddressHint,
  resolveContactAddressIntegrity
} = require('../src/services/contact')
const {
  couponService,
  createCouponDetailView,
  expressCouponService,
  validateCouponExchangeCode
} = require('../src/services/coupon')
const {
  expressCouponApi
} = require('../src/services/coupon/expressCoupon.api')
const {
  isAlreadyBoundCourierMessage,
  normalizeCourier
} = require('../src/services/courier/courier.mapper')
const {
  createCourierExpressDraft
} = require('../src/services/courier/courier.rules')
const {
  BATCH_MAX_CONSIGNEE_COUNT,
  applyBatchQuoteResults,
  batchService,
  buildBatchCreateOrderRequest,
  createBatchConsigneeFromRecognition,
  createBatchConsigneeDraft,
  createBatchDraft,
  createBatchDraftFromExpressDraft,
  createBatchSubmitSummary,
  resetBatchQuotes,
  updateBatchConsigneeGoods,
  validateBatchSubmitDraft,
  validateBatchDraft
} = require('../src/services/batch')
const {
  applyExpressPickupTime,
  applyExpressScanContext,
  clearExpressScanContext,
  createAddressOnlyExpressContact,
  createExpressDraft,
  markExpressQuoteStale,
  selectExpressProduct,
  setExpressContact,
  swapExpressContacts,
  updateExpressCouponNumber,
  updateExpressGoods,
  updateExpressPickup,
  updateExpressService,
  validateExpressDraft,
  validateExpressPriceTimeDraft
} = require('../src/services/express/express.draft')
const { expressDraftBridge } = require('../src/services/express/draftBridge')
const { expressDraftStorage } = require('../src/services/express/draftStorage')
const {
  EXPRESS_COUPON_AUTO_QUERY_DELAY_MS,
  createExpressCouponQueryRequest,
  createExpressCouponRequestKey,
  getExpressCouponOriginalFee
} = require('../src/services/express/couponOrder.rules')
const {
  EXPRESS_CARTON_OPTIONS,
  EXPRESS_UNPACKING_OPTIONS,
  EXPRESS_WOODEN_PACKAGING_OPTIONS
} = require('../src/services/express/packaging.catalog')
const {
  createExpressOrderPackageInfoList,
  createExpressOrderPackingText,
  createExpressOrderUnpackageLtlInfo,
  createExpressQuotePackageInfoList,
  createExpressUnpackingNumbers,
  getExpressPackageLtlType
} = require('../src/services/express/packaging.payload')
const {
  getExpressPackagingQuoteVolume,
  normalizeExpressCartonCode,
  normalizeExpressPackagingDraft,
  normalizeExpressUnpackingCodes,
  normalizeExpressWoodenPackagingCodes,
  updateExpressPackaging
} = require('../src/services/express/packaging.rules')
const {
  applyTemplateMetadataUpdate,
  buildTemplateMetadataSaveRequest,
  buildTemplateSaveRequest,
  isTemplateMetadataChanged,
  mapTemplateToExpressDraft,
  normalizeExpressTemplate,
  validateTemplateDraft,
  validateTemplateMeta
} = require('../src/services/template/template.mapper')
const { templateApi } = require('../src/services/template/template.api')
const { templateService } = require('../src/services/template/template.service')
const {
  buildCreateOrderRequest,
  buildFilterOrderRequest,
  buildFreightRequest,
  buildInsurancePriceRequest,
  buildPickupTimeRequest
} = require('../src/services/express/express.payload')
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
} = require('../src/services/express/insurance.rules')
const {
  getExpressInsuranceProductPolicy
} = require('../src/services/express/insurance.product')
const {
  createExpressInsuranceView
} = require('../src/services/express/insurance.view')
const {
  getExpressReturnBillPpcType,
  getExpressReturnBillOptions,
  isExpressCloudSignType,
  normalizeExpressReturnBillDraft,
  normalizeExpressReturnBillForTemplate,
  updateExpressReturnBillDraft,
  validateExpressReturnBill
} = require('../src/services/express/valueAdded')
const {
  clearExpressCollection,
  createExpressCollectionDraft,
  getExpressCollectionFee,
  maskExpressCollectionAccount,
  normalizeExpressCollectionAmountInput,
  parseExpressCollectionAmount,
  updateExpressCollectionDetails,
  updateExpressCollectionPricing,
  validateExpressCollection
} = require('../src/services/express/collection.rules')
const {
  buildExpressDeliveryAppointmentRequest,
  createExpressDeliveryAvailabilityKey,
  createExpressDeliveryOrderFields,
  createExpressDeliveryQuoteFields,
  createExpressScheduledDateOptions,
  createExpressScheduledWindow,
  createExpressUnavailableDateOptions,
  isExpressScheduledDeliveryProductSupported,
  updateExpressDeliveryPreference,
  validateExpressDeliveryPreference
} = require('../src/services/express/deliveryPreference.rules')
const {
  EXPRESS_NIGHT_PICKUP_CACHE_MS,
  acceptExpressNightPickupNotice,
  buildExpressPickupNightRequest,
  createExpressPickupNightCapability,
  getFreshExpressPickupNightCapability,
  isExpressNightPickupTimeValid,
  normalizeExpressPickup,
  selectExpressPickupTime,
  validateExpressPickupTime
} = require('../src/services/express/pickupTime.rules')
const {
  createExpressPickupDateOptions,
  findExpressPickupTimeSelection,
  getFirstExpressPickupTimeSelection,
  normalizeExpressPickupTimeResponse
} = require('../src/services/express/pickupTime.options')
const {
  createExpressQuoteRequestKey
} = require('../src/services/express/requestKey')
const {
  applyExpressWarehouseScreening,
  clearExpressWarehouse,
  createExpressWarehouseInputKey,
  createExpressWarehouseScreening,
  isExpressWarehouseScreeningCurrent,
  normalizeExpressWarehouseScreeningType,
  updateExpressWarehouse,
  validateExpressWarehouse
} = require('../src/services/express/warehouse.rules')
const {
  acknowledgeExpressWarehouseScreening,
  rejectExpressWarehouse
} = require('../src/services/express/warehouse.decisions')
const {
  queryExpressWarehouseScreening,
  stageExpressWarehouse
} = require('../src/services/express/warehouse.service')
const { expressApi } = require('../src/services/express/express.api')
const { expressService } = require('../src/services/express/express.service')
const {
  createExpressScanContextView
} = require('../src/services/express/scanContext')
const {
  createExpressProductQuoteView
} = require('../src/services/express/express.quoteView')
const {
  createExpressDeliveryPointDraft,
  getExpressDeliveryPointOrderFields,
  normalizeExpressDeliveryPointDraft,
  updateExpressDeliveryPoint
} = require('../src/services/express/deliveryPoint.rules')
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
} = require('../src/services/express/productAvailability.rules')
const {
  createApplyPreview,
  createApplySubmitPayload,
  validateEmail
} = require('../src/services/invoice/invoice.apply')
const {
  createInvoiceModifyAddressPayload
} = require('../src/services/invoice/invoice.actions')
const {
  invoiceApplyService
} = require('../src/services/invoice/invoice.apply.service')
const {
  invoiceCenterService
} = require('../src/services/invoice/invoice.center.service')
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
  calculateInvoiceOrderAuthCountdown,
  getInvoiceOrderAuthValidationMessage
} = require('../src/services/invoice/invoice.orderAuth')
const {
  getSelectedInvoiceECards,
  getSelectedInvoiceECardAmount,
  parseInvoiceCenterTab
} = require('../src/pages/invoice/index/invoiceCenterViewModel')
const {
  createTaxpayerPayload,
  normalizeTaxpayer,
  validateTaxpayer
} = require('../src/services/invoice/invoice.taxpayer')
const {
  invoiceTaxpayerService
} = require('../src/services/invoice/invoice.taxpayer.service')
const {
  invoiceService
} = require('../src/services/invoice/invoice.service')
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
  ORDER_EVALUATION_SUGGESTION_MAX_LENGTH,
  applyOrderEvaluationSubmission,
  createOrderEvaluationContext,
  createOrderEvaluationDraft,
  createOrderEvaluationFallbackWebUri,
  createOrderEvaluationRoute,
  createOrderEvaluationSubmitRequest,
  createOrderEvaluationView,
  toggleOrderEvaluationLabel,
  updateOrderEvaluationLevel,
  updateOrderEvaluationSuggestion,
  validateOrderEvaluationDraft
} = require('../src/services/order/order.evaluation.rules')
const {
  getOrderEvaluationLabels
} = require('../src/services/order/order.evaluation.catalog')
const {
  ORDER_EVALUATION_API_ENDPOINTS
} = require('../src/services/order/order.evaluation.api')
const {
  buildOrderModifyRequest,
  createOrderEditDraft,
  getOrderEditUnavailableMessage,
  validateOrderEditDraft
} = require('../src/services/order/order.edit')
const {
  clearOrderEditCollection,
  updateOrderEditCollection
} = require('../src/services/order/order.edit.collection')
const {
  createOrderEditInsuranceDraft,
  isOrderEditInsuranceChanged,
  updateOrderEditInsuranceAmount,
  validateOrderEditInsurance
} = require('../src/services/order/order.edit.insurance')
const {
  ORDER_EDIT_PACKAGING_MAX_COUNT,
  ORDER_EDIT_PACKAGING_UNIT_FEE,
  getOrderEditPackagingFee,
  normalizeOrderEditPackagingCountInput,
  updateOrderEditPackagingCount,
  validateOrderEditPackaging
} = require('../src/services/order/order.edit.packaging')
const {
  ORDER_EDIT_DELIVERY_OPTIONS,
  ORDER_EDIT_NIGHT_PICKUP_CACHE_MS,
  buildOrderEditPickupNightRequest,
  buildOrderEditPickupTimeRequest,
  createOrderEditPickupNightCapability,
  createOrderEditScheduleQueryKey,
  createOrderEditScheduleRequestDiff,
  getFreshOrderEditPickupNightCapability,
  isOrderEditDeliveryModeVisible,
  validateOrderEditSchedule
} = require('../src/services/order/order.edit.schedule')
const {
  createOrderEditPickupDateOptions,
  normalizeOrderEditPickupTimeResponse
} = require('../src/services/order/order.edit.schedule.options')
const {
  acceptOrderEditNightPickupNotice,
  applyOrderEditPickupTimeResponse,
  selectOrderEditPickupTime
} = require('../src/services/order/order.edit.schedule.selection')
const {
  queryOrderEditPickupTimes
} = require('../src/services/order/order.edit.schedule.service')
const {
  orderEditScheduleApi
} = require('../src/services/order/order.edit.schedule.api')
const {
  resolveOrderUrgeMenuAction
} = require('../src/services/order/order.detailUseCases')
const {
  createOrderPdcFeedbackContext,
  createOrderPdcFeedbackRequest
} = require('../src/services/order/order.pdcFeedback')
const {
  ORDER_PDC_FEEDBACK_API_ENDPOINTS
} = require('../src/services/order/order.pdcFeedback.api')
const {
  ORDER_NPS_SURVEY_API_ENDPOINTS,
  orderNpsSurveyApi
} = require('../src/services/order/order.npsSurvey.api')
const {
  createOrderNpsDraft,
  createOrderNpsLabelContent,
  createOrderNpsSubmitRequest,
  toggleOrderNpsReason,
  updateOrderNpsCategory,
  updateOrderNpsScore
} = require('../src/services/order/order.npsSurvey.rules')
const {
  ORDER_SCENE_SURVEY_API_ENDPOINTS,
  orderSceneSurveyApi
} = require('../src/services/order/order.sceneSurvey.api')
const {
  ORDER_SCENE_SURVEY_WINDOW_MS,
  createOrderSceneLabelSubmitRequest,
  createOrderSceneScoreSubmitRequest,
  createOrderSceneSurveyContext,
  getOrderSceneScoreLabels,
  normalizeOrderSceneSurveyQuestion,
  parseOrderSceneSurveyTime,
  validateOrderSceneScoreDraft
} = require('../src/services/order/order.sceneSurvey.rules')
const {
  orderSceneSurveyOrchestrator
} = require('../src/services/order/order.sceneSurvey.orchestrator')
const {
  createOrderDetailViewModel,
  getOrderDetailRouteParams
} = require('../src/pages/order/detail/orderDetailViewModel')
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
  DEFAULT_PRINT_DATE_RANGE_KEY,
  PRINT_API_ENDPOINTS,
  createPrintDateRangeOptions,
  createPrintRecipientAddress,
  mergePrintOrderPages,
  normalizePrintListResult,
  printApi,
  printService,
  resolvePrintListCounts,
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
} = require('../src/services/payment/payment.checkout')
const { paymentApi } = require('../src/services/payment/payment.api')
const {
  EXPRESS_DELIVERY_POINT_MAX_DISTANCE_KM,
  queryService,
  stationSelection
} = require('../src/services/query')
const {
  getStationMatchTypes,
  normalizeAddressStation
} = require('../src/services/query/query.station')
const { supportService } = require('../src/services/support')
const { createSignCodePayload, signService } = require('../src/services/sign')
const {
  appendRouteQuery,
  createAppRouteUrl,
  createRouteQuery,
  normalizeAppRouteUrlParam
} = require('../src/shared/navigation/routeUrl')
const {
  APP_WEB_TARGETS,
  createAppWebUrl,
  getAppWebWarehouseStagingId,
  isAllowedAppWebTargetUrl,
  requiresAppWebLogin
} = require('../src/shared/webview/appWeb')
const {
  appWebMessageBridge,
  parseAppWebMessage
} = require('../src/shared/webview/appWebMessage')
const {
  templateDraftBridge
} = require('../src/services/template/template.bridge')
const {
  createCustomerCapabilitySummary,
  customerService,
  normalizeCustomerCapability
} = require('../src/services/customer/customer.service')
const { customerApi } = require('../src/services/customer/customer.api')
const { parseAppScanValue } = require('../src/shared/platform/scan')
const {
  isDepponSuccessStatus,
  isResponseForCurrentSession,
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
  clearSessionCookie,
  configureSessionCookieRuntime,
  getResponseSetCookie,
  hydrateSessionCookie,
  saveSessionCookieFromResponse
} = require('../src/request/cookieJar')
const { depponHttp } = require('../src/request/deppon')
const {
  RequestError,
  getRequestFailureMessage
} = require('../src/request/error')
const {
  ACCOUNT_SCOPED_CACHE_KEYS,
  ACCOUNT_SCOPED_STORAGE_KEYS,
  CACHE_KEYS,
  createCacheStorageKey
} = require('../src/cache/keys')
const {
  clearAccountScopedCache,
  preserveAccountScopedCacheForLogin
} = require('../src/cache/accountScope')
const {
  getStorageValue,
  removeStorageValue,
  setStorageValue
} = require('../src/cache/storage')
const {
  authApi,
  authService,
  clearAppSession,
  createAppLoginRegisterRecord,
  createAppSmsLoginRequest,
  saveCurrentUser
} = require('../src/services/auth')
const authSession = require('../src/services/auth/session')
const {
  createAppUserIdentity,
  isSameAppUser,
  shouldClearAccountScopedCache
} = require('../src/services/auth/sessionIdentity')
const { sanitizeAppRouteUrl } = require('../src/shared/navigation/appNavigation')
const {
  dispatchAppRoute,
  dispatchAppRouteAsync
} = require('../src/shared/navigation/navigationRuntime')
const {
  createLoginRedirectUrl,
  navigateToLogin
} = require('../src/shared/navigation/authGuard')
const {
  LatestRequestCoordinator
} = require('../src/shared/async/latestRequest')
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
  const draft = createBatchDraft()
  const consignee = createBatchConsigneeDraft(
    createBatchContact({
      id: 'CONSIGNEE_001',
      name: '李四',
      mobile: '13900139000',
      province: '广东省',
      city: '深圳市',
      county: '南山区',
      address: '科技园科苑路200号'
    }),
    '文件'
  )

  consignee.productCode = 'PACKAGE'
  consignee.productName = '大件快递'
  consignee.estimatedFee = 18

  return {
    ...draft,
    sender: createBatchContact({ id: 'SENDER_001' }),
    consignees: [consignee],
    pickup: {
      ...draft.pickup,
      time: '2026-07-13 10:00:00',
      stationCode: '021A001',
      stationName: '上海青浦营业部'
    },
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
    beginAcceptTime: '2026-07-15 10:00:00',
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
    name: 'runtime config rejects credentials embedded in every app url',
    run() {
      const tokenViolations = runtimeBuild.validateRuntimeEnvironment({
        APP_MEMBER_WEB_URL:
          'https://mastest.deppon.com.cn/cms-h5/h5.html#/welfare?access_Token=fixed'
      })
      const userInfoViolations = runtimeBuild.validateRuntimeEnvironment({
        APP_API_BASE_URL: 'https://user:password@owstest.deppon.com'
      })

      assert.equal(
        tokenViolations.some((message) => message.includes('固定 token')),
        true
      )
      assert.equal(
        userInfoViolations.some((message) => message.includes('用户名或密码')),
        true
      )
    }
  },
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
      assert.equal(draft.insurance.type, 'NORMAL')
      assert.equal(draft.insurance.capability.inputKey, '')
      assert.equal(draft.service.paymentType, 'PAY_ARIIVE')
      assert.equal(draft.service.transportMode, 'PACKAGE')
      assert.equal(draft.service.returnBill.type, 'CUSTOMER_SIGNED_FAX')
      assert.equal(draft.service.returnBill.returnCount, 1)
      assert.equal(draft.service.needContact, 'N')
      assert.equal(draft.pickup.time, '')
      assert.equal(draft.selectedProduct, null)
      assert.equal(draft.agreementAccepted, false)
      assert.equal(draft.quoteStaleReason, '模板信息已带入，请重新获取价格')
    }
  },
  {
    name: 'return bill rules preserve reference OMS PPC and requirement contracts',
    run() {
      const normalized = normalizeExpressReturnBillDraft({
        type: 'CUSTOMER_SIGNED_FAX',
        returnRequirement: ' R8,R1,R8,XX,R2 ',
        customReturnRequirement: ' 其他要求 ',
        returnCount: 100,
        fileCode: 'stale-file'
      })

      assert.deepEqual(normalized, {
        type: 'CUSTOMER_SIGNED_FAX',
        requirements: ['R1', 'R2', 'R8'],
        customRequirement: '其他要求',
        returnCount: 99,
        fileCode: ''
      })
      assert.equal(getExpressReturnBillPpcType('NO_RETURN_SIGNED'), 'NONE')
      assert.equal(
        getExpressReturnBillPpcType('CUSTOMER_SIGNED_FAX'),
        'FAX'
      )
      assert.equal(
        getExpressReturnBillPpcType('CUSTOMER_SIGNED_ORIGINAL'),
        'ORIGINAL'
      )
      assert.equal(
        getExpressReturnBillPpcType('RETURNBILL_TYPE_ONLINE'),
        'ONLINE'
      )
      assert.equal(
        getExpressReturnBillPpcType('ORIGINAL_ONLINE'),
        'ORIGINAL_ONLINE'
      )
      assert.equal(isExpressCloudSignType('RETURNBILL_TYPE_ONLINE'), true)
      assert.equal(isExpressCloudSignType('CUSTOMER_SIGNED_FAX'), false)
      assert.equal(getExpressReturnBillOptions('DCZP').some(item =>
        isExpressCloudSignType(item.value)
      ), false)
    }
  },
  {
    name: 'return bill validation distinguishes paper requirements and cloud sign',
    run() {
      const draft = createExpressDraft().service.returnBill

      assert.equal(
        validateExpressReturnBill({
          ...draft,
          type: 'CUSTOMER_SIGNED_FAX',
          customRequirement: '只有备注不能替代 R1-R8'
        }).includes('请选择至少一种签收单要求'),
        true
      )
      assert.equal(
        validateExpressReturnBill({
          ...draft,
          type: 'CUSTOMER_SIGNED_FAX',
          requirements: ['UNKNOWN']
        }).includes('请选择至少一种签收单要求'),
        true
      )
      assert.deepEqual(
        validateExpressReturnBill({
          ...draft,
          type: 'RETURNBILL_TYPE_ONLINE',
          fileCode: 'FILE-001'
        }),
        []
      )
      assert.equal(
        validateExpressReturnBill({
          ...draft,
          type: 'RETURNBILL_TYPE_ONLINE'
        }).includes('请先完成电子云签'),
        true
      )
      assert.equal(
        validateExpressReturnBill({
          ...draft,
          type: 'ORIGINAL_ONLINE',
          requirements: ['R1'],
          fileCode: 'FILE-001'
        }).length,
        0
      )
      assert.equal(
        validateExpressReturnBill({
          ...draft,
          type: 'ORIGINAL_ONLINE',
          fileCode: 'FILE-001'
        }).includes('请选择至少一种签收单要求'),
        true
      )
      assert.equal(
        validateExpressReturnBill(
          {
            ...draft,
            type: 'RETURNBILL_TYPE_ONLINE',
            fileCode: 'FILE-001'
          },
          'DCZP'
        ).includes('当前产品不支持电子云签'),
        true
      )
    }
  },
  {
    name: 'return bill mutations and payload fail closed across product changes',
    run() {
      const draft = createValidExpressDraft()
      const paperDraft = {
        ...draft,
        service: {
          ...draft.service,
          returnBill: normalizeExpressReturnBillDraft({
            type: 'CUSTOMER_SIGNED_ORIGINAL',
            requirements: ['R1'],
            returnCount: 2
          })
        }
      }
      const paperRequest = buildCreateOrderRequest(paperDraft)

      assert.equal(paperRequest.receive[0].returnBillType, 'CUSTOMER_SIGNED_ORIGINAL')
      assert.equal(
        paperRequest.receive[0].orderExtendFields.some(
          field => field.key === 'returnBillQty' && field.value === 2
        ),
        true
      )

      const singlePaperRequest = buildCreateOrderRequest({
        ...paperDraft,
        service: {
          ...paperDraft.service,
          returnBill: {
            ...paperDraft.service.returnBill,
            returnCount: 1
          }
        }
      })
      assert.equal(
        singlePaperRequest.receive[0].orderExtendFields?.some(
          field => field.key === 'returnBillQty'
        ),
        false
      )

      const cloudDraft = {
        ...draft,
        service: {
          ...draft.service,
          returnBill: normalizeExpressReturnBillDraft({
            type: 'RETURNBILL_TYPE_ONLINE',
            fileCode: 'FILE-ONLINE',
            requirements: ['R1'],
            customRequirement: 'stale paper value'
          })
        }
      }
      const cloudRequest = buildCreateOrderRequest(cloudDraft)

      assert.equal(cloudRequest.receive[0].returnBillType, 'RETURNBILL_TYPE_ONLINE')
      assert.equal(cloudRequest.receive[0].returnRequirement, '')
      assert.equal(cloudRequest.receive[0].customReturnRequirement, '')
      assert.deepEqual(
        cloudRequest.receive[0].orderExtendFields?.filter(
          field => field.key === 'fileCode'
        ),
        [{ key: 'fileCode', value: 'FILE-ONLINE' }]
      )

      const dcCloudDraft = selectExpressProduct(cloudDraft, {
        ...expressProduct,
        omsProductCode: 'DCZP'
      })
      assert.equal(dcCloudDraft.service.returnBill.type, 'NO_RETURN_SIGNED')
      assert.equal(dcCloudDraft.service.returnBill.fileCode, '')
      assert.equal(
        buildCreateOrderRequest(dcCloudDraft).receive[0].returnBillType,
        'NO_RETURN_SIGNED'
      )
      assert.equal(
        buildFreightRequest(dcCloudDraft).returnBillType,
        'NONE'
      )

      const switchedToOnline = updateExpressReturnBillDraft(
        paperDraft.service.returnBill,
        { type: 'RETURNBILL_TYPE_ONLINE' }
      )
      assert.deepEqual(switchedToOnline.requirements, [])
      assert.equal(switchedToOnline.customRequirement, '')
      assert.equal(switchedToOnline.fileCode, '')
    }
  },
  {
    name: 'return bill templates never persist transient cloud sign files',
    run() {
      const cloud = normalizeExpressReturnBillDraft({
        type: 'ORIGINAL_ONLINE',
        requirements: ['R2'],
        returnCount: 3,
        fileCode: 'FILE-TRANSIENT'
      })
      const templateDraft = normalizeExpressReturnBillForTemplate(cloud)

      assert.equal(templateDraft.type, 'ORIGINAL_ONLINE')
      assert.deepEqual(templateDraft.requirements, ['R2'])
      assert.equal(templateDraft.returnCount, 3)
      assert.equal(templateDraft.fileCode, '')

      const saveDraft = {
        ...createValidExpressDraft(),
        service: {
          ...createValidExpressDraft().service,
          returnBill: cloud
        }
      }
      const saved = buildTemplateSaveRequest(
        saveDraft,
        { name: '云签件', defaultFlag: 2 },
        'APP'
      )

      assert.equal(saved.template.addedService.returnBillType, 'ORIGINAL_ONLINE')
      assert.equal(saved.template.addedService.returnRequirement, 'R2')
      assert.equal('fileCode' in saved.template.addedService, false)

      const loaded = mapTemplateToExpressDraft(
        createExpressTemplateRaw({
          template: {
            ...createExpressTemplateRaw().template,
            addedService: {
              returnBillType: 'RETURNBILL_TYPE_ONLINE',
              returnBillName: '电子云签',
              returnRequirement: '',
              customReturnRequirement: ''
            }
          }
        })
      )
      assert.equal(loaded.service.returnBill.type, 'RETURNBILL_TYPE_ONLINE')
      assert.equal(loaded.service.returnBill.fileCode, '')
      assert.equal(
        validateExpressReturnBill(loaded.service.returnBill).includes(
          '请先完成电子云签'
        ),
        true
      )

      const dczpTemplate = mapTemplateToExpressDraft(
        createExpressTemplateRaw({
          template: {
            ...createExpressTemplateRaw().template,
            product: {
              omsProductCode: 'DCZP',
              productCode: 'DCZP'
            },
            addedService: {
              returnBillType: 'RETURNBILL_TYPE_ONLINE',
              returnBillName: '电子云签',
              returnRequirement: '',
              customReturnRequirement: ''
            }
          }
        })
      )
      assert.equal(dczpTemplate.service.returnBill.type, 'NO_RETURN_SIGNED')
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

      const specialInsuranceRequest = buildTemplateSaveRequest(
        {
          ...draft,
          goods: { ...draft.goods, insuredAmount: 500 },
          insurance: { ...draft.insurance, type: 'SXB' }
        },
        { name: '省心件', defaultFlag: 2 },
        'APP'
      )

      assert.deepEqual(specialInsuranceRequest.template.insurance, {
        insuranceAmount: '500'
      })
    }
  },
  {
    name: 'template metadata keeps the full body and one default item',
    run() {
      const first = normalizeExpressTemplate(
        createExpressTemplateRaw({
          id: 'TEMPLATE_001',
          defaultFlag: 1,
          templateName: '原默认'
        })
      )
      const second = normalizeExpressTemplate(
        createExpressTemplateRaw({
          id: 'TEMPLATE_002',
          defaultFlag: 2,
          templateName: '普通件'
        })
      )
      const meta = { name: ' 新默认 ', defaultFlag: 1 }
      const request = buildTemplateMetadataSaveRequest(second, meta, 'APP')

      assert.equal(isTemplateMetadataChanged(second, meta), true)
      assert.equal(request.id, 'TEMPLATE_002')
      assert.equal(request.templateName, '新默认')
      assert.equal(request.defaultFlag, 1)
      assert.equal(request.sysCode, 'APP')
      assert.deepEqual(request.template, second.raw.template)

      const updated = applyTemplateMetadataUpdate(
        [first, second],
        second.id,
        meta
      )

      assert.equal(updated[0].isDefault, false)
      assert.equal(updated[0].raw.defaultFlag, 2)
      assert.equal(updated[1].name, '新默认')
      assert.equal(updated[1].isDefault, true)
      assert.equal(updated[1].raw.templateName, '新默认')
      assert.equal(updated[1].raw.defaultFlag, 1)
      assert.equal(first.isDefault, true)
    }
  },
  {
    name: 'template metadata update skips list limits and preserves failures',
    async run() {
      const originalQuery = templateApi.query
      const originalSave = templateApi.save
      const template = normalizeExpressTemplate(createExpressTemplateRaw())
      let queryCount = 0
      let saveRequest = null

      try {
        templateApi.query = async () => {
          queryCount += 1

          return { status: true, result: [] }
        }
        templateApi.save = async request => {
          saveRequest = request

          return { status: true, result: true }
        }

        const unchanged = await templateService.updateMetadata(template, {
          name: template.name,
          defaultFlag: template.isDefault ? 1 : 2
        })

        assert.equal(unchanged.status, false)
        assert.equal(unchanged.message, '您还没有修改模板信息')
        assert.equal(saveRequest, null)

        const updated = await templateService.updateMetadata(template, {
          name: '新模板',
          defaultFlag: 2
        })

        assert.equal(updated.status, true)
        assert.equal(queryCount, 0)
        assert.equal(saveRequest.id, template.id)
        assert.equal(saveRequest.templateName, '新模板')
        assert.deepEqual(saveRequest.template, template.raw.template)

        templateApi.save = async () => ({
          status: false,
          message: '后端拒绝修改',
          result: false
        })

        const failed = await templateService.updateMetadata(template, {
          name: '失败件',
          defaultFlag: 2
        })

        assert.equal(failed.status, false)
        assert.equal(failed.message, '后端拒绝修改')
      } finally {
        templateApi.query = originalQuery
        templateApi.save = originalSave
      }
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
      const fetchHeaders = {
        get(name) {
          return name === 'set-cookie'
            ? 'foo=bar; Path=/, ECO_TOKEN=rn-token; Path=/'
            : null
        }
      }
      const fetchHeadersWithSetCookie = {
        getSetCookie() {
          return [
            'foo=bar; Path=/',
            'ECO_TOKEN=rn-set-cookie-token; Path=/'
          ]
        }
      }

      assert.equal(
        getSetCookieFromHeaders(fetchHeaders),
        'foo=bar; Path=/, ECO_TOKEN=rn-token; Path=/'
      )
      assert.equal(
        extractEcoToken(getSetCookieFromHeaders(fetchHeaders)),
        'rn-token'
      )
      assert.equal(
        extractEcoToken(
          getSetCookieFromHeaders(fetchHeadersWithSetCookie)
        ),
        'rn-set-cookie-token'
      )
      assert.equal(
        normalizeCookieList(['foo=bar', 'ECO_TOKEN=token-789; Path=/']),
        'foo=bar;ECO_TOKEN=token-789; Path=/'
      )
      assert.equal(
        normalizeCookieList([
          { name: 'foo', value: 'bar' },
          { name: 'ECO_TOKEN', value: 'token-object' }
        ]),
        'foo=bar;ECO_TOKEN=token-object'
      )
      assert.equal(
        getSetCookieFromHeaders({
          raw() {
            return {
              'set-cookie': ['ECO_TOKEN=token-raw; Path=/']
            }
          }
        }),
        'ECO_TOKEN=token-raw; Path=/'
      )
      assert.equal(
        getSetCookieFromHeaders({
          map: {
            'set-cookie': 'ECO_TOKEN=token-map; Path=/'
          }
        }),
        'ECO_TOKEN=token-map; Path=/'
      )
    }
  },
  {
    name: 'cookie facade falls back to alternate response headers',
    run() {
      assert.equal(
        getResponseSetCookie({
          headers: {},
          fallbackHeaders: {
            'set-cookie': ['ECO_TOKEN=fallback-token; Path=/']
          },
          cookies: []
        }),
        'ECO_TOKEN=fallback-token; Path=/'
      )
    }
  },
  {
    name: 'RN cookie facade recovers ECO_TOKEN from the native session jar',
    async run() {
      const originalCookie = getStorageValue(CACHE_KEYS.cookie)
      const originalSetStorage = Taro.setStorage
      const originalRemoveStorage = Taro.removeStorage
      const readUrls = []
      const writtenCookies = []
      let clearCount = 0

      configureSessionCookieRuntime({
        async read(url) {
          readUrls.push(url)
          return 'ECO_TOKEN=native-login-token;'
        },
        async write(cookie) {
          writtenCookies.push(cookie)
          return true
        },
        async clear() {
          clearCount += 1
          return true
        }
      })

      try {
        Taro.setStorage = () => Promise.resolve({ errMsg: 'setStorage:ok' })
        Taro.removeStorage = () =>
          Promise.resolve({ errMsg: 'removeStorage:ok' })
        await removeStorageValue(CACHE_KEYS.cookie)

        const savedCookie = await saveSessionCookieFromResponse({
          data: { status: true },
          statusCode: 200,
          headers: {
            get() {
              return null
            }
          },
          url: 'https://owstest.deppon.com/gwapi/user/login',
          method: 'POST'
        })

        assert.equal(savedCookie, 'ECO_TOKEN=native-login-token;')
        assert.equal(
          getStorageValue(CACHE_KEYS.cookie),
          'ECO_TOKEN=native-login-token;'
        )
        assert.deepEqual(readUrls, [
          'https://owstest.deppon.com/gwapi/user/login'
        ])
        assert.deepEqual(writtenCookies, [
          'ECO_TOKEN=native-login-token;'
        ])

        await removeStorageValue(CACHE_KEYS.cookie)
        assert.equal(
          await hydrateSessionCookie('https://owstest.deppon.com'),
          'ECO_TOKEN=native-login-token;'
        )
        await clearSessionCookie()
        assert.equal(clearCount, 1)
        assert.equal(getStorageValue(CACHE_KEYS.cookie), '')
      } finally {
        configureSessionCookieRuntime(null)

        if (originalSetStorage) {
          Taro.setStorage = originalSetStorage
        } else {
          delete Taro.setStorage
        }

        if (originalRemoveStorage) {
          Taro.removeStorage = originalRemoveStorage
        } else {
          delete Taro.removeStorage
        }

        if (originalCookie) {
          await setStorageValue(CACHE_KEYS.cookie, originalCookie)
        } else {
          await removeStorageValue(CACHE_KEYS.cookie)
        }
      }
    }
  },
  {
    name: 'public login endpoints never emit authenticated-request expiry',
    async run() {
      const originalPost = depponHttp.post
      const calls = []

      try {
        depponHttp.post = async (url, data, options) => {
          calls.push({ url, data, options })
          return { status: true, result: null }
        }

        await authApi.login(
          createAppSmsLoginRequest('13800138000', '123456'),
          false
        )
        await authApi.sendSmsMessage({
          mobile: '13800138000',
          sysCode: 'APP',
          messageType: 'login'
        })

        assert.deepEqual(
          calls.map(call => ({ url: call.url, options: call.options })),
          [
            {
              url: '/gwapi/userService/eco/user/login',
              options: { loading: false, login: false }
            },
            {
              url: '/gwapi/messageService/eco/message/sendSmsMessage',
              options: { login: false }
            }
          ]
        )
      } finally {
        depponHttp.post = originalPost
      }
    }
  },
  {
    name: 'sms auth request keeps the reference login contract for App runtime',
    async run() {
      const originalSendSmsMessage = authApi.sendSmsMessage
      const originalLogin = authApi.login
      let smsRequest = null
      let loginRequest = null

      try {
        authApi.sendSmsMessage = async request => {
          smsRequest = request

          return { status: true, result: null }
        }
        authApi.login = async request => {
          loginRequest = request

          return {
            status: false,
            message: 'mock login rejected',
            result: null
          }
        }

        const smsResponse = await authService.sendLoginSms('13800138000')
        const loginResponse = await authService.loginWithSms(
          '13800138000',
          '123456'
        )

        assert.equal(smsResponse.status, true)
        assert.deepEqual(smsRequest, {
          mobile: '13800138000',
          sysCode: 'APP',
          messageType: 'login'
        })
        assert.deepEqual(loginRequest, {
          account: '13800138000',
          verifyCode: '123456',
          loginType: 'MOBILE_VERIFICATION_CODE',
          sysCode: 'APP',
          registerRecord: createAppLoginRegisterRecord('')
        })
        assert.equal(loginResponse.status, false)
        assert.equal(loginResponse.message, 'mock login rejected')
      } finally {
        authApi.sendSmsMessage = originalSendSmsMessage
        authApi.login = originalLogin
      }
    }
  },
  {
    name: 'App login register record keeps only safe return context',
    run() {
      assert.deepEqual(
        createAppSmsLoginRequest(
          ' 13800138000 ',
          ' 123456 ',
          '/pages/express/index?source=LOGIN'
        ),
        {
          account: '13800138000',
          verifyCode: '123456',
          loginType: 'MOBILE_VERIFICATION_CODE',
          sysCode: 'APP',
          registerRecord: {
            ...createAppLoginRegisterRecord('/pages/express/index'),
            registerPage: 'pages/express/index'
          }
        }
      )
      assert.equal(
        createAppLoginRegisterRecord('https://example.com').registerPage,
        ''
      )
    }
  },
  {
    name: 'navigation does not rewrite an explicit login route to mine',
    run() {
      assert.equal(
        sanitizeAppRouteUrl('/pages/login/index?redirectUrl=%2Fpages%2Fmine%2Findex'),
        '/pages/login/index?redirectUrl=%2Fpages%2Fmine%2Findex'
      )
      assert.equal(sanitizeAppRouteUrl('https://example.com'), '/pages/mine/index')
    }
  },
  {
    name: 'mine login entry dispatches the registered login route',
    async run() {
      const originalGetCurrentPages = Taro.getCurrentPages
      const originalNavigateTo = Taro.navigateTo
      let navigateOptions = null
      let currentRoute = 'pages/mine/index'

      try {
        Taro.getCurrentPages = () => [
          {
            route: currentRoute,
            options: {}
          }
        ]
        Taro.navigateTo = options => {
          navigateOptions = options
          currentRoute = 'pages/login/index'

          return Promise.resolve({ errMsg: 'navigateTo:ok' })
        }

        const redirectUrl = createLoginRedirectUrl('/pages/mine/index')
        const dispatched = navigateToLogin({
          redirectUrl: '/pages/mine/index',
          message: false
        })

        assert.equal(dispatched, true)
        assert.equal(
          redirectUrl,
          '/pages/login/index?redirectUrl=%2Fpages%2Fmine%2Findex'
        )
        assert.deepEqual(navigateOptions, { url: redirectUrl })
        await new Promise(resolve => setImmediate(resolve))
      } finally {
        if (originalGetCurrentPages) {
          Taro.getCurrentPages = originalGetCurrentPages
        } else {
          delete Taro.getCurrentPages
        }

        if (originalNavigateTo) {
          Taro.navigateTo = originalNavigateTo
        } else {
          delete Taro.navigateTo
        }
      }
    }
  },
  {
    name: 'login redirect keeps one navigation in flight and releases after confirmation',
    async run() {
      const originalGetCurrentPages = Taro.getCurrentPages
      const originalRedirectTo = Taro.redirectTo
      let currentRoute = 'pages/mine/index'
      let redirectCount = 0
      let releaseFirstNavigation = null

      try {
        Taro.getCurrentPages = () => [
          {
            route: currentRoute,
            options: {}
          }
        ]
        Taro.redirectTo = () => {
          redirectCount += 1

          if (redirectCount === 1) {
            return new Promise(resolve => {
              releaseFirstNavigation = () => {
                currentRoute = 'pages/login/index'
                resolve({ errMsg: 'redirectTo:ok' })
              }
            })
          }

          currentRoute = 'pages/login/index'
          return Promise.resolve({ errMsg: 'redirectTo:ok' })
        }

        assert.equal(
          navigateToLogin({
            redirectUrl: '/pages/mine/index',
            replace: true,
            message: false
          }),
          true
        )
        assert.equal(
          navigateToLogin({
            redirectUrl: '/pages/order/list/index',
            replace: true,
            message: false
          }),
          false
        )
        assert.equal(redirectCount, 1)

        releaseFirstNavigation()
        await new Promise(resolve => setImmediate(resolve))
        await new Promise(resolve => setImmediate(resolve))

        currentRoute = 'pages/mine/index'
        assert.equal(
          navigateToLogin({
            redirectUrl: '/pages/order/list/index',
            replace: true,
            message: false
          }),
          true
        )
        assert.equal(redirectCount, 2)
        await new Promise(resolve => setImmediate(resolve))
      } finally {
        if (originalGetCurrentPages) {
          Taro.getCurrentPages = originalGetCurrentPages
        } else {
          delete Taro.getCurrentPages
        }

        if (originalRedirectTo) {
          Taro.redirectTo = originalRedirectTo
        } else {
          delete Taro.redirectTo
        }
      }
    }
  },
  {
    name: 'login redirect continues when feedback is unavailable',
    async run() {
      const originalGetCurrentPages = Taro.getCurrentPages
      const originalRedirectTo = Taro.redirectTo
      const originalShowToast = Taro.showToast
      let currentRoute = 'pages/mine/index'
      let redirectCount = 0

      try {
        Taro.getCurrentPages = () => [
          {
            route: currentRoute,
            options: {}
          }
        ]
        Taro.showToast = () => {
          throw new Error('toast unavailable')
        }
        Taro.redirectTo = () => {
          redirectCount += 1
          currentRoute = 'pages/login/index'
          return Promise.resolve({ errMsg: 'redirectTo:ok' })
        }

        assert.equal(
          navigateToLogin({
            redirectUrl: '/pages/mine/index',
            replace: true
          }),
          true
        )
        assert.equal(redirectCount, 1)
        await new Promise(resolve => setImmediate(resolve))
      } finally {
        if (originalGetCurrentPages) {
          Taro.getCurrentPages = originalGetCurrentPages
        } else {
          delete Taro.getCurrentPages
        }

        if (originalRedirectTo) {
          Taro.redirectTo = originalRedirectTo
        } else {
          delete Taro.redirectTo
        }

        if (originalShowToast) {
          Taro.showToast = originalShowToast
        } else {
          delete Taro.showToast
        }
      }
    }
  },
  {
    name: 'RN navigation failures stay visible and release caller recovery',
    async run() {
      const originalRedirectTo = Taro.redirectTo
      const originalShowToast = Taro.showToast
      let failureCount = 0
      let toastOptions = null

      try {
        Taro.redirectTo = () => Promise.reject(new Error('route rejected'))
        Taro.showToast = options => {
          toastOptions = options

          return Promise.resolve({ errMsg: 'showToast:ok' })
        }

        const dispatched = dispatchAppRoute('/pages/login/index', {
          failureMessage: '登录页打开失败，请重试',
          replace: true,
          onFailure: () => {
            failureCount += 1
          }
        })

        assert.equal(dispatched, true)
        await new Promise(resolve => setImmediate(resolve))
        assert.equal(failureCount, 1)
        assert.deepEqual(toastOptions, {
          title: '登录页打开失败，请重试',
          icon: 'none'
        })
      } finally {
        if (originalRedirectTo) {
          Taro.redirectTo = originalRedirectTo
        } else {
          delete Taro.redirectTo
        }

        if (originalShowToast) {
          Taro.showToast = originalShowToast
        } else {
          delete Taro.showToast
        }
      }
    }
  },
  {
    name: 'critical replace navigation never dispatches a second competing replace',
    async run() {
      const originalGetCurrentPages = Taro.getCurrentPages
      const originalRedirectTo = Taro.redirectTo
      const originalShowToast = Taro.showToast
      let currentRoute = 'pages/mine/index'
      let redirectCount = 0
      let toastCount = 0

      try {
        Taro.getCurrentPages = () => [{ route: currentRoute, options: {} }]
        Taro.redirectTo = () => {
          redirectCount += 1

          return Promise.resolve({ errMsg: 'redirectTo:ok' })
        }
        Taro.showToast = () => {
          toastCount += 1
          return Promise.resolve({ errMsg: 'showToast:ok' })
        }

        const navigated = await dispatchAppRouteAsync('/pages/login/index', {
          failureMessage: '登录页打开失败，请重试',
          replace: true
        })

        assert.equal(navigated, false)
        assert.equal(redirectCount, 1)
        assert.equal(toastCount, 1)
      } finally {
        if (originalGetCurrentPages) {
          Taro.getCurrentPages = originalGetCurrentPages
        } else {
          delete Taro.getCurrentPages
        }

        if (originalRedirectTo) {
          Taro.redirectTo = originalRedirectTo
        } else {
          delete Taro.redirectTo
        }

        if (originalShowToast) {
          Taro.showToast = originalShowToast
        } else {
          delete Taro.showToast
        }
      }
    }
  },
  {
    name: 'critical replace navigation observes a late route without redispatch',
    async run() {
      const originalGetCurrentPages = Taro.getCurrentPages
      const originalRedirectTo = Taro.redirectTo
      let currentRoute = 'pages/mine/index'
      let redirectCount = 0
      let routeReadCount = 0

      try {
        Taro.getCurrentPages = () => {
          routeReadCount += 1

          if (redirectCount === 1 && routeReadCount >= 10) {
            currentRoute = 'pages/login/index'
          }

          return [{ route: currentRoute, options: {} }]
        }
        Taro.redirectTo = () => {
          redirectCount += 1
          return Promise.resolve({ errMsg: 'redirectTo:ok' })
        }

        const navigated = await dispatchAppRouteAsync('/pages/login/index', {
          replace: true
        })

        assert.equal(navigated, true)
        assert.equal(redirectCount, 1)
      } finally {
        if (originalGetCurrentPages) {
          Taro.getCurrentPages = originalGetCurrentPages
        } else {
          delete Taro.getCurrentPages
        }

        if (originalRedirectTo) {
          Taro.redirectTo = originalRedirectTo
        } else {
          delete Taro.redirectTo
        }
      }
    }
  },
  {
    name: 'empty RN page snapshots never count as successful navigation',
    async run() {
      const originalGetCurrentPages = Taro.getCurrentPages
      const originalRedirectTo = Taro.redirectTo
      const originalShowToast = Taro.showToast
      let navigationStarted = false
      let redirectCount = 0
      let toastCount = 0

      try {
        Taro.getCurrentPages = () =>
          navigationStarted ? [] : [{ route: 'pages/mine/index', options: {} }]
        Taro.redirectTo = () => {
          navigationStarted = true
          redirectCount += 1
          return Promise.resolve({ errMsg: 'redirectTo:ok' })
        }
        Taro.showToast = () => {
          toastCount += 1
          return Promise.resolve({ errMsg: 'showToast:ok' })
        }

        const navigated = await dispatchAppRouteAsync('/pages/login/index', {
          replace: true
        })

        assert.equal(navigated, false)
        assert.equal(redirectCount, 1)
        assert.equal(toastCount, 1)
      } finally {
        if (originalGetCurrentPages) {
          Taro.getCurrentPages = originalGetCurrentPages
        } else {
          delete Taro.getCurrentPages
        }

        if (originalRedirectTo) {
          Taro.redirectTo = originalRedirectTo
        } else {
          delete Taro.redirectTo
        }

        if (originalShowToast) {
          Taro.showToast = originalShowToast
        } else {
          delete Taro.showToast
        }
      }
    }
  },
  {
    name: 'sms login rejects a successful body without a persisted session cookie',
    async run() {
      const originalLogin = authApi.login
      const originalSaveCurrentUser = authSession.saveCurrentUser
      const sessionKeys = [
        CACHE_KEYS.cookie,
        CACHE_KEYS.userInfo,
        CACHE_KEYS.accountCacheOwner
      ]
      const originalValues = new Map(
        sessionKeys.map(key => [key, getStorageValue(key)])
      )

      try {
        await clearAppSession()
        authApi.login = async () => ({
          status: true,
          result: { mobile: '13800138000' }
        })

        const missingCookie = await authService.loginWithSms(
          '13800138000',
          '123456'
        )

        assert.equal(missingCookie.status, false)
        assert.equal(missingCookie.message, '登录凭证保存失败，请重试')
        assert.equal(getStorageValue(CACHE_KEYS.userInfo), '')

        await setStorageValue(CACHE_KEYS.cookie, 'ECO_TOKEN=login-token;')
        authSession.saveCurrentUser = async user => user
        authApi.login = async () => ({
          status: true,
          result: { mobile: '13800138000' },
          sessionCookieSaved: true
        })

        const authenticated = await authService.loginWithSms(
          '13800138000',
          '123456'
        )

        assert.equal(authenticated.status, true)
        assert.equal(authenticated.user.mobile, '13800138000')
      } finally {
        authApi.login = originalLogin
        authSession.saveCurrentUser = originalSaveCurrentUser
        await clearAppSession()

        for (const [key, value] of originalValues) {
          if (value) {
            await setStorageValue(key, value)
          } else {
            await removeStorageValue(key)
          }
        }
      }
    }
  },
  {
    name: 'sms login waits for a delayed native session cookie',
    async run() {
      const originalLogin = authApi.login
      const originalSaveCurrentUser = authSession.saveCurrentUser
      const sessionKeys = [
        CACHE_KEYS.cookie,
        CACHE_KEYS.userInfo,
        CACHE_KEYS.accountCacheOwner
      ]
      const originalValues = new Map(
        sessionKeys.map(key => [key, getStorageValue(key)])
      )
      let readCount = 0

      try {
        await clearAppSession()
        configureSessionCookieRuntime({
          async read() {
            readCount += 1

            return readCount >= 3
              ? 'ECO_TOKEN=delayed-native-token;'
              : ''
          },
          async write() {
            return true
          },
          async clear() {
            return true
          }
        })
        authSession.saveCurrentUser = async user => user
        authApi.login = async () => ({
          status: true,
          result: { mobile: '13800138000' }
        })

        const authenticated = await authService.loginWithSms(
          '13800138000',
          '123456'
        )

        assert.equal(authenticated.status, true)
        assert.equal(authenticated.user.mobile, '13800138000')
        assert.equal(readCount, 3)
        assert.equal(
          getStorageValue(CACHE_KEYS.cookie),
          'ECO_TOKEN=delayed-native-token;'
        )
      } finally {
        configureSessionCookieRuntime(null)
        authApi.login = originalLogin
        authSession.saveCurrentUser = originalSaveCurrentUser
        await clearAppSession()

        for (const [key, value] of originalValues) {
          if (value) {
            await setStorageValue(key, value)
          } else {
            await removeStorageValue(key)
          }
        }
      }
    }
  },
  {
    name: 'account scoped cache registry covers private business storage',
    run() {
      assert.deepEqual(ACCOUNT_SCOPED_CACHE_KEYS, [
        CACHE_KEYS.batchDraft,
        CACHE_KEYS.expressDraft,
        CACHE_KEYS.goodsQueryHistory,
        CACHE_KEYS.invoiceOrderAuth,
        CACHE_KEYS.invoiceOrderAuthCodeSend,
        CACHE_KEYS.invoiceEmail
      ])

      for (const key of ACCOUNT_SCOPED_CACHE_KEYS) {
        assert.equal(ACCOUNT_SCOPED_STORAGE_KEYS.includes(key), true)
        assert.equal(
          ACCOUNT_SCOPED_STORAGE_KEYS.includes(createCacheStorageKey(key)),
          true
        )
      }

      assert.equal(
        ACCOUNT_SCOPED_STORAGE_KEYS.includes(CACHE_KEYS.expressPrivacyConfirm),
        false
      )
    }
  },
  {
    name: 'first login preserves only explicitly staged anonymous drafts',
    async run() {
      const expressDraftKey = createCacheStorageKey(CACHE_KEYS.expressDraft)
      const historyKey = createCacheStorageKey(CACHE_KEYS.goodsQueryHistory)

      await setStorageValue(expressDraftKey, 'anonymous-express-draft')
      await setStorageValue(historyKey, 'private-history')
      preserveAccountScopedCacheForLogin(CACHE_KEYS.expressDraft)

      await clearAccountScopedCache({ preserveLoginReturnDrafts: true })

      assert.equal(
        getStorageValue(expressDraftKey),
        'anonymous-express-draft'
      )
      assert.equal(getStorageValue(historyKey), '')

      await clearAccountScopedCache()
      assert.equal(getStorageValue(expressDraftKey), '')
    }
  },
  {
    name: 'clearing app session removes account data but keeps device consent',
    async run() {
      for (const key of ACCOUNT_SCOPED_STORAGE_KEYS) {
        await setStorageValue(key, `private:${key}`)
      }

      await setStorageValue(CACHE_KEYS.cookie, 'ECO_TOKEN=old-token;')
      await setStorageValue(CACHE_KEYS.userInfo, '{"mobile":"13800138000"}')
      await setStorageValue(
        CACHE_KEYS.accountCacheOwner,
        '{"mobile":"13800138000"}'
      )
      await setStorageValue(CACHE_KEYS.userSession, 'legacy-session')
      await setStorageValue(
        CACHE_KEYS.expressPrivacyConfirm,
        'device-consent'
      )

      const warehouseMessage = JSON.stringify({
        event: 'SEND_WAREHOUSE',
        args: { isWarehousingService: 'N' }
      })

      appWebMessageBridge.clear()
      assert.equal(
        appWebMessageBridge.expectWarehouse({
          inputKey: 'session-expected-input',
          stagingId: 'SESSION-EXPECTED-STAGE'
        }),
        true
      )

      await clearAppSession()

      assert.equal(
        appWebMessageBridge.stage('EXPRESS_WAREHOUSE', warehouseMessage)
          .handled,
        false
      )
      assert.equal(appWebMessageBridge.consumeWarehouse(), null)

      await setStorageValue(CACHE_KEYS.userInfo, '{"mobile":"13800138000"}')
      await setStorageValue(
        CACHE_KEYS.accountCacheOwner,
        '{"mobile":"13800138000"}'
      )
      assert.equal(
        appWebMessageBridge.expectWarehouse({
          inputKey: 'session-pending-input',
          stagingId: 'SESSION-PENDING-STAGE'
        }),
        true
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          warehouseMessage,
          { stagingId: 'SESSION-PENDING-STAGE' }
        ).handled,
        true
      )

      await saveCurrentUser({ mobile: '13900139000' })

      assert.equal(appWebMessageBridge.consumeWarehouse(), null)
      assert.equal(
        appWebMessageBridge.expectWarehouse({
          inputKey: 'session-clear-input',
          stagingId: 'SESSION-CLEAR-STAGE'
        }),
        true
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          warehouseMessage,
          { stagingId: 'SESSION-CLEAR-STAGE' }
        ).handled,
        true
      )

      await clearAppSession()

      assert.equal(appWebMessageBridge.consumeWarehouse(), null)

      for (const key of ACCOUNT_SCOPED_STORAGE_KEYS) {
        assert.equal(getStorageValue(key), '')
      }

      assert.equal(getStorageValue(CACHE_KEYS.cookie), '')
      assert.equal(getStorageValue(CACHE_KEYS.userInfo), '')
      assert.equal(getStorageValue(CACHE_KEYS.accountCacheOwner), '')
      assert.equal(getStorageValue(CACHE_KEYS.userSession), '')
      assert.equal(
        getStorageValue(CACHE_KEYS.expressPrivacyConfirm),
        'device-consent'
      )
    }
  },
  {
    name: 'account identity rules detect user switches conservatively',
    run() {
      assert.equal(
        isSameAppUser(
          { id: 'USER_1', mobile: '13800138000' },
          { id: 'USER_1', mobile: '13900139000' }
        ),
        true
      )
      assert.equal(
        isSameAppUser(
          { mobile: '13800138000' },
          { mobile: '13800138000', nickName: 'new profile' }
        ),
        true
      )
      assert.equal(
        shouldClearAccountScopedCache(
          { id: 'USER_1', mobile: '13800138000' },
          { id: 'USER_2', mobile: '13800138000' },
          { id: 'USER_1' }
        ),
        true
      )
      assert.equal(
        shouldClearAccountScopedCache(
          null,
          { id: 'USER_2', mobile: '13900139000' },
          null
        ),
        true
      )
      assert.equal(
        shouldClearAccountScopedCache(
          null,
          { id: 'USER_2', mobile: '13900139000' },
          { id: 'USER_2' }
        ),
        false
      )
      assert.deepEqual(
        createAppUserIdentity({
          id: ' USER_2 ',
          mobile: '13900139000',
          nickName: '不应进入 owner'
        }),
        { id: 'USER_2', mobile: '13900139000' }
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
      assert.equal(shouldEmitAuthExpiredEvent(true, 200, '901'), true)
      assert.equal(shouldEmitAuthExpiredEvent(true, 401, 'failed'), true)
      assert.equal(shouldEmitRateLimitedEvent(429, false), true)
      assert.equal(shouldEmitRateLimitedEvent(200, 429), true)
      assert.equal(shouldEmitRateLimitedEvent(200, false), false)
      assert.equal(isResponseForCurrentSession('cookie-a', 'cookie-a'), true)
      assert.equal(isResponseForCurrentSession('cookie-a', 'cookie-b'), false)
      assert.equal(isResponseForCurrentSession('', ''), true)
    }
  },
  {
    name: 'request failures expose stable user-facing retry messages',
    run() {
      assert.equal(
        getRequestFailureMessage(
          new RequestError({
            type: 'NETWORK_ERROR',
            message: 'network failed',
            url: '/orders',
            method: 'GET'
          })
        ),
        '网络连接失败，请检查网络后重试'
      )
      assert.equal(
        getRequestFailureMessage(
          new RequestError({
            type: 'NETWORK_ERROR',
            message: 'network failed',
            url: '/orders',
            method: 'GET',
            cause: { errMsg: 'request:fail timeout' }
          })
        ),
        '请求超时，请稍后重试'
      )
      assert.equal(
        getRequestFailureMessage(
          new RequestError({
            type: 'HTTP_ERROR',
            message: 'http failed',
            url: '/orders',
            method: 'GET',
            statusCode: 503
          })
        ),
        '服务暂时不可用，请稍后重试'
      )
      assert.equal(
        getRequestFailureMessage(
          new RequestError({
            type: 'HTTP_ERROR',
            message: 'not found',
            url: '/orders',
            method: 'GET',
            statusCode: 404
          })
        ),
        null
      )
      assert.equal(getRequestFailureMessage(new Error('boom')), null)
    }
  },
  {
    name: 'latest request coordinator deduplicates and promotes repeated filters',
    run() {
      const coordinator = new LatestRequestCoordinator()
      const first = coordinator.begin('orders:1')

      assert.ok(first)
      assert.equal(coordinator.begin('orders:1'), null)
      assert.equal(coordinator.isLatest(first), true)

      const second = coordinator.begin('orders:2')

      assert.ok(second)
      assert.equal(coordinator.isLatest(first), false)
      assert.equal(coordinator.isLatest(second), true)
      assert.equal(coordinator.begin('orders:1'), null)
      assert.equal(coordinator.isLatest(first), true)
      assert.equal(coordinator.isLatest(second), false)
      assert.equal(coordinator.finish(second), false)
      assert.equal(coordinator.finish(first), true)

      const retried = coordinator.begin('orders:1')

      assert.ok(retried)
      assert.equal(coordinator.finish(retried), true)
      assert.ok(coordinator.begin('orders:2'))

      const refresh = coordinator.begin('orders:2', { force: true })

      assert.ok(refresh)
      assert.equal(coordinator.isLatest(refresh), true)
      coordinator.invalidate()
      assert.equal(coordinator.isLatest(refresh), false)
      assert.ok(coordinator.begin('orders:2'))
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
      assert.equal(
        normalizeAppRouteUrlParam(
          '/pages/order/detail/index?keyword=A%26B%3DC'
        ),
        '/pages/order/detail/index?keyword=A%26B%3DC'
      )
      assert.equal(
        normalizeAppRouteUrlParam(
          '%2Fpages%2Forder%2Fdetail%2Findex%3Fkeyword%3DA%2526B%253DC'
        ),
        '/pages/order/detail/index?keyword=A%26B%3DC'
      )
      assert.equal(
        normalizeAppRouteUrlParam('https%3A%2F%2Fexample.com'),
        ''
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
        assert.equal(
          failed.message,
          '客户接口暂不可用；额度接口暂不可用'
        )
      } finally {
        customerApi.queryCustomerInfo = originalInfo
        customerApi.queryCustomerCapability = originalCapability
      }
    }
  },
  {
    name: 'collection account web messages require source and context expectations',
    run() {
      const message = JSON.stringify({
        event: 'COLLECTION_CHANGE',
        args: { bankAccount: '6222 0000 1234', countName: '张三' }
      })
      const expressContext = {
        source: 'EXPRESS_COLLECTION_ACCOUNT',
        messageContext: 'EXPRESS_DRAFT'
      }
      const orderContext = {
        source: 'ORDER_EDIT_COLLECTION_ACCOUNT',
        messageContext: 'ORDER_EDIT:ORDER_001'
      }

      appWebMessageBridge.clear()

      assert.deepEqual(
        parseAppWebMessage(
          JSON.stringify({
            data: [
              {
                event: 'COLLECTION_CHANGE',
                args: {
                  bankAccount: ' 6222 0000 1234 ',
                  countName: '张三'
                }
              }
            ]
          })
        ),
        {
          event: 'COLLECTION_CHANGE',
          args: {
            bankAccount: ' 6222 0000 1234 ',
            countName: '张三'
          }
        }
      )
      assert.equal(
        appWebMessageBridge.stage(
          'CUSTOMER_CENTER',
          message
        ).handled,
        false
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_COLLECTION_ACCOUNT',
          message,
          { messageContext: 'EXPRESS_DRAFT' }
        ).handled,
        false
      )
      assert.equal(
        appWebMessageBridge.expectCollectionAccount(expressContext),
        true
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_COLLECTION_ACCOUNT',
          message,
          { messageContext: 'ORDER_EDIT:ORDER_001' }
        ).handled,
        false
      )
      assert.deepEqual(
        appWebMessageBridge.stage(
          'EXPRESS_COLLECTION_ACCOUNT',
          message,
          { messageContext: 'EXPRESS_DRAFT' }
        ),
        {
          handled: true,
          closeAfterReceive: true
        }
      )
      assert.equal(
        appWebMessageBridge.consumeCollectionAccount(orderContext),
        null
      )
      assert.deepEqual(
        appWebMessageBridge.consumeCollectionAccount(expressContext),
        {
          account: '622200001234',
          accountName: '张三'
        }
      )
      assert.equal(
        appWebMessageBridge.consumeCollectionAccount(expressContext),
        null
      )

      assert.equal(
        appWebMessageBridge.expectCollectionAccount(orderContext),
        true
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_COLLECTION_ACCOUNT',
          message,
          { messageContext: 'ORDER_EDIT:ORDER_001' }
        ).handled,
        false
      )
      assert.equal(
        appWebMessageBridge.stage(
          'ORDER_EDIT_COLLECTION_ACCOUNT',
          message,
          { messageContext: 'ORDER_EDIT:ORDER_002' }
        ).handled,
        false
      )
      assert.equal(
        appWebMessageBridge.stage(
          'ORDER_EDIT_COLLECTION_ACCOUNT',
          message,
          { messageContext: 'ORDER_EDIT:ORDER_001' }
        ).handled,
        true
      )
      assert.equal(
        appWebMessageBridge.consumeCollectionAccount({
          ...orderContext,
          messageContext: 'ORDER_EDIT:ORDER_002'
        }),
        null
      )
      assert.deepEqual(
        appWebMessageBridge.consumeCollectionAccount(orderContext),
        {
          account: '622200001234',
          accountName: '张三'
        }
      )
      assert.equal(
        APP_WEB_TARGETS.ORDER_EDIT_COLLECTION_ACCOUNT.url,
        APP_WEB_TARGETS.EXPRESS_COLLECTION_ACCOUNT.url
      )
      assert.equal(
        isAllowedAppWebTargetUrl(
          'ORDER_EDIT_COLLECTION_ACCOUNT',
          globalThis.__APP_RUNTIME_CONFIG__.webBaseURL +
            APP_WEB_TARGETS.ORDER_EDIT_COLLECTION_ACCOUNT.url
        ),
        true
      )
      assert.equal(
        isAllowedAppWebTargetUrl(
          'ORDER_EDIT_COLLECTION_ACCOUNT',
          globalThis.__APP_RUNTIME_CONFIG__.webBaseURL +
            '/depponmobile/h5/index#/claimPackagePages/index'
        ),
        false
      )
      assert.equal(APP_WEB_TARGETS.EXPRESS_COLLECTION_RULES.auth, false)
    }
  },
  {
    name: 'return bill cloud sign messages require one source context and consume once',
    run() {
      const context = {
        messageContext: 'EXPRESS_RETURN_BILL:001'
      }
      const validMessage = JSON.stringify({
        event: 'ONLINE_SIGN',
        args: { value: ' FILE-CLOUD-001 ' }
      })

      appWebMessageBridge.clear()
      assert.equal(appWebMessageBridge.expectOnlineSign(context), true)
      assert.equal(
        appWebMessageBridge.stage(
          'CUSTOMER_CENTER',
          validMessage,
          context
        ).handled,
        false
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_RETURN_BILL_CLOUD_SIGN',
          validMessage,
          { messageContext: 'EXPRESS_RETURN_BILL:WRONG' }
        ).handled,
        false
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_RETURN_BILL_CLOUD_SIGN',
          JSON.stringify({
            event: 'ONLINE_SIGN',
            args: { value: 'FILE', extra: 'reject' }
          }),
          context
        ).handled,
        false
      )
      assert.deepEqual(
        appWebMessageBridge.stage(
          'EXPRESS_RETURN_BILL_CLOUD_SIGN',
          validMessage,
          context
        ),
        { handled: true, closeAfterReceive: true }
      )
      assert.deepEqual(
        appWebMessageBridge.consumeOnlineSign(context),
        {
          context,
          fileCode: 'FILE-CLOUD-001'
        }
      )
      assert.equal(appWebMessageBridge.consumeOnlineSign(context), null)

      assert.equal(appWebMessageBridge.expectOnlineSign(context), true)
      appWebMessageBridge.cancelOnlineSign(context)
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_RETURN_BILL_CLOUD_SIGN',
          validMessage,
          context
        ).handled,
        false
      )

      const url = createAppWebUrl({
        source: 'EXPRESS_RETURN_BILL_CLOUD_SIGN',
        uri: '/depponmobile/electronCloudSign/index?fileCode=FILE A+B',
        messageContext: context.messageContext
      })
      assert.equal(url.includes('EXPRESS_RETURN_BILL_CLOUD_SIGN'), true)
      assert.equal(decodeURIComponent(url).includes('fileCode=FILE A+B'), true)
      assert.equal(
        isAllowedAppWebTargetUrl(
          'EXPRESS_RETURN_BILL_CLOUD_SIGN',
          `${globalThis.__APP_RUNTIME_CONFIG__.webBaseURL}/depponmobile/electronCloudSign/index?fileCode=FILE%20A%2BB`
        ),
        true
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
    name: 'authenticated web targets fail closed without an App session',
    run() {
      assert.equal(
        requiresAppWebLogin({ allowed: true, auth: true }, false),
        true
      )
      assert.equal(
        requiresAppWebLogin({ allowed: true, auth: true }, true),
        false
      )
      assert.equal(
        requiresAppWebLogin({ allowed: true, auth: false }, false),
        false
      )
      assert.equal(
        requiresAppWebLogin({ allowed: false, auth: true }, false),
        false
      )
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
    name: 'support aftercare records preserve controlled paths and login guards',
    run() {
      const aftercare = supportService
        .getSections()
        .find(section => section.title === '售后处理')
      const entries = new Map(
        (aftercare?.entries ?? []).map(entry => [entry.id, entry])
      )
      const expected = [
        [
          'complaint-record',
          'SUPPORT_COMPLAINT_RECORD',
          '/depponmobile/complaint/record'
        ],
        [
          'claim-processing',
          'SUPPORT_CLAIM_PROCESSING',
          '/depponmobile/h5/index#/claimPackagePages/list?tab=2'
        ],
        [
          'claim-completed',
          'SUPPORT_CLAIM_COMPLETED',
          '/depponmobile/h5/index#/claimPackagePages/list?tab=3'
        ]
      ]

      for (const [id, source, path] of expected) {
        assert.equal(APP_WEB_TARGETS[source].url, path)
        assert.equal(entries.get(id)?.webSource, source)
        assert.equal(entries.get(id)?.webPath, path)
        assert.equal(entries.get(id)?.webParamSource, 'APP_SUPPORT_CENTER')
        assert.equal(entries.get(id)?.loginRequired, true)
      }

      assert.equal(
        supportService.createSecureWebUri(
          APP_WEB_TARGETS.SUPPORT_COMPLAINT_RECORD.url,
          'APP_SUPPORT_CENTER'
        ),
        '/depponmobile/complaint/record?sonSource=APP_SUPPORT_CENTER&pageSource=APP'
      )
      assert.equal(
        supportService.createSecureWebUri(
          APP_WEB_TARGETS.SUPPORT_CLAIM_PROCESSING.url,
          'APP_SUPPORT_CENTER'
        ),
        '/depponmobile/h5/index#/claimPackagePages/list?tab=2&sonSource=APP_SUPPORT_CENTER&pageSource=APP'
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
    name: 'express delivery point selection keeps pickup-self stations within twenty kilometers',
    run() {
      const addressStation = normalizeAddressStation({
        deptNo: 'DP_NO_001',
        deptCode: 'DP_CODE_001',
        deptName: '深圳南山自提点',
        deptAddress: '深圳市南山区科技园',
        distance: 6.5,
        contactway: '0755-12345678',
        businessScope: '快递 自提',
        baiduLat: '22.5401',
        baiduLng: '113.9345',
        pickupSelf: true,
        matchAddress: '科技园',
        startTime: '08:00',
        endTime: '20:00'
      })
      const params = stationSelection.createParams(
        'EXPRESS_DELIVERY_POINT',
        {
          province: '广东省',
          city: '深圳市',
          county: '南山区',
          town: '粤海街道',
          address: '科技园科苑路200号'
        },
        'DP_NO_001'
      )
      const farStation = {
        ...addressStation,
        id: 'DP_NO_FAR',
        distance: '20.01km',
        distanceKm: EXPRESS_DELIVERY_POINT_MAX_DISTANCE_KM + 0.01
      }
      const boundaryStation = {
        ...addressStation,
        id: 'DP_NO_BOUNDARY',
        distance: '20km',
        distanceKm: EXPRESS_DELIVERY_POINT_MAX_DISTANCE_KM
      }
      const negativeDistanceStation = {
        ...addressStation,
        id: 'DP_NO_NEGATIVE',
        distance: '-1km',
        distanceKm: -1
      }
      const missingDeptNoStation = {
        ...addressStation,
        id: '',
        code: 'DP_CODE_ONLY'
      }
      const unsupportedStation = {
        ...addressStation,
        id: 'DP_NO_UNSUPPORTED',
        pickupSelf: false
      }
      const cityStation = {
        ...addressStation,
        id: 'DP_CITY',
        source: 'City',
        distance: '',
        distanceKm: null,
        pickupSelf: false
      }
      const filtered = stationSelection.filterResult(params.source, {
        address: {
          province: '广东省',
          provinceCode: '',
          city: '深圳市',
          cityCode: '',
          county: '南山区',
          countyCode: '',
          town: '粤海街道',
          townCode: '',
          address: '科技园科苑路200号',
          fullAddress: '广东省深圳市南山区粤海街道科技园科苑路200号'
        },
        type: 'PICKUP',
        subType: 'EXPRESS',
        list: [
          addressStation,
          boundaryStation,
          farStation,
          negativeDistanceStation,
          missingDeptNoStation,
          unsupportedStation,
          cityStation
        ],
        totalRows: 7,
        source: 'Address'
      })

      assert.deepEqual(getStationMatchTypes('PICKUP', 'EXPRESS'), [
        'expressPickup'
      ])
      assert.equal(addressStation.id, 'DP_NO_001')
      assert.equal(addressStation.code, 'DP_CODE_001')
      assert.equal(addressStation.pickupSelf, true)
      assert.equal(addressStation.distanceKm, 6.5)
      assert.equal(params.address, '粤海街道科技园科苑路200号')
      assert.deepEqual(stationSelection.createQuery(params), {
        province: '广东省',
        city: '深圳市',
        county: '南山区',
        address: '粤海街道科技园科苑路200号',
        type: 'PICKUP',
        subType: 'EXPRESS'
      })
      assert.equal(filtered.totalRows, 2)
      assert.equal(filtered.list[0], addressStation)
      assert.equal(filtered.list[1], boundaryStation)

      stationSelection.select(params.source, addressStation)
      assert.equal(
        stationSelection.consumeSelection(params.source).station.id,
        'DP_NO_001'
      )
      assert.equal(stationSelection.consumeSelection(params.source), null)
    }
  },
  {
    name: 'express delivery point clears with consignee or delivery mode and maps exact order fields',
    run() {
      const selfPickupDraft = updateExpressService(createValidExpressDraft(), {
        deliveryMode: 'PICKSELF'
      })
      const selectedDraft = updateExpressDeliveryPoint(selfPickupDraft, {
        id: 'DP_NO_001',
        code: 'DP_CODE_001',
        name: '深圳南山自提点'
      })
      const deptCodeOnlyDraft = updateExpressDeliveryPoint(selfPickupDraft, {
        id: '',
        code: 'DP_CODE_ONLY',
        name: '缺少统一网点编号的异常数据'
      })
      const orderRequest = buildCreateOrderRequest(selectedDraft)
      const homeDeliveryDraft = updateExpressService(selectedDraft, {
        deliveryMode: 'PICKNOTUPSTAIRS'
      })
      const changedConsigneeDraft = setExpressContact(
        selectedDraft,
        'consignee',
        {
          ...consigneeContact,
          address: '科技园科苑路300号'
        }
      )
      const bridgedDraft = expressDraftBridge.carryFromCoupon(selectedDraft)
      const consumedDraft = expressDraftBridge.consume().draft

      assert.deepEqual(createExpressDeliveryPointDraft(), {
        code: '',
        name: ''
      })
      assert.deepEqual(selectedDraft.deliveryPoint, {
        code: 'DP_NO_001',
        name: '深圳南山自提点'
      })
      assert.deepEqual(deptCodeOnlyDraft.deliveryPoint, {
        code: '',
        name: ''
      })
      assert.deepEqual(getExpressDeliveryPointOrderFields(deptCodeOnlyDraft), {
        receivingToPoint: '',
        receivingToPointName: ''
      })
      assert.equal(selectedDraft.selectedProduct, null)
      assert.equal(
        selectedDraft.quoteStaleReason,
        '自提服务点变化，请重新获取价格'
      )
      assert.deepEqual(getExpressDeliveryPointOrderFields(selectedDraft), {
        receivingToPoint: 'DP_NO_001',
        receivingToPointName: '深圳南山自提点'
      })
      assert.equal(orderRequest.receive[0].receivingToPoint, 'DP_NO_001')
      assert.equal(
        orderRequest.receive[0].receivingToPointName,
        '深圳南山自提点'
      )
      assert.deepEqual(homeDeliveryDraft.deliveryPoint, {
        code: '',
        name: ''
      })
      assert.deepEqual(changedConsigneeDraft.deliveryPoint, {
        code: '',
        name: ''
      })
      assert.deepEqual(consumedDraft.deliveryPoint, selectedDraft.deliveryPoint)
      assert.deepEqual(
        normalizeExpressDeliveryPointDraft(
          { code: 'DP_NO_001', name: '深圳南山自提点' },
          'PICKNOTUPSTAIRS'
        ),
        { code: '', name: '' }
      )
      assert.equal(bridgedDraft, undefined)
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
    name: 'contact address integrity separates review transport and auth outcomes',
    run() {
      assert.deepEqual(
        createContactAddressCheckRequest({
          province: ' 上海市 ',
          city: ' 上海市 ',
          county: ' 青浦区 ',
          address: ' 明珠路100号 '
        }),
        {
          province: '上海市',
          city: '上海市',
          county: '青浦区',
          address: '明珠路100号'
        }
      )
      assert.deepEqual(
        resolveContactAddressIntegrity({ status: true }),
        { kind: 'pass', message: '' }
      )
      assert.deepEqual(
        resolveContactAddressIntegrity({
          status: false,
          message: ' 请补充门牌号 '
        }),
        { kind: 'review', message: '请补充门牌号' }
      )
      assert.deepEqual(
        resolveContactAddressIntegrity({
          status: false,
          message: '网络连接失败',
          transportFailure: true
        }),
        { kind: 'unavailable', message: '网络连接失败' }
      )
      assert.deepEqual(
        resolveContactAddressIntegrity({
          status: false,
          authExpired: true
        }),
        { kind: 'blocked', message: '登录状态已失效，请重新登录' }
      )
      assert.deepEqual(
        resolveContactAddressIntegrity({ status: false, message: '' }),
        {
          kind: 'review',
          message: '地址可能不完整，请确认是否继续使用'
        }
      )
    }
  },
  {
    name: 'contact address integrity service sends normalized address fields',
    async run() {
      const originalCheckAddressDetail = contactApi.checkAddressDetail
      let request = null

      try {
        contactApi.checkAddressDetail = async nextRequest => {
          request = nextRequest

          return {
            status: false,
            message: '地址不够详细',
            result: null
          }
        }

        const response = await contactService.checkAddressDetail({
          province: ' 浙江省 ',
          city: ' 杭州市 ',
          county: ' 西湖区 ',
          address: ' 文一路1号 '
        })

        assert.deepEqual(request, {
          province: '浙江省',
          city: '杭州市',
          county: '西湖区',
          address: '文一路1号'
        })
        assert.equal(response.status, false)
        assert.equal(response.message, '地址不够详细')
      } finally {
        contactApi.checkAddressDetail = originalCheckAddressDetail
      }
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
    name: 'express coupon request restores original freight by fee type',
    run() {
      const draft = createValidExpressDraft()
      const selectedProduct = {
        ...expressProduct,
        producteCode: 'PACKAGE',
        couponRankType: 'BF',
        detail: [
          { priceEntryCode: 'FRT', priceEntryName: '运费', caculateFee: 20 },
          { priceEntryCode: 'BF', priceEntryName: '保价费', caculateFee: 2 },
          { priceEntryCode: 'AD', priceEntryName: '定时派送', caculateFee: 4 },
          { priceEntryCode: 'BZ', priceEntryName: '包装费', caculateFee: 3 }
        ],
        discount: [
          { marketCode: 'YHQ', reduceFee: 5 },
          { marketCode: 'XLYHF', reduceFee: 1 }
        ]
      }
      const request = createExpressCouponQueryRequest({
        ...draft,
        selectedProduct
      })

      assert.deepEqual(request, {
        freight: 21,
        productCode: 'PACKAGE',
        couponFeeList: [
          { feeType: 'FRT', freight: 21 },
          { feeType: 'BF', freight: 7 },
          { feeType: 'AD', freight: 4 },
          { feeType: 'NMBZ', freight: 3 }
        ],
        arriveProvinceName: '广东省',
        channel: 'APP',
        mobile: '13800138000',
        sendAnAddress: '上海市-上海市-青浦区',
        receivesAnAddress: '广东省-深圳市-南山区'
      })
      assert.equal(
        getExpressCouponOriginalFee(
          { ...selectedProduct, couponRankType: '' },
          'FRT'
        ),
        26
      )
      assert.equal(
        createExpressCouponRequestKey({
          ...draft,
          selectedProduct: { ...selectedProduct, producteCode: '' }
        }),
        ''
      )
    }
  },
  {
    name: 'express coupon auto query uses a short nonzero debounce window',
    run() {
      assert.equal(EXPRESS_COUPON_AUTO_QUERY_DELAY_MS, 300)
      assert.ok(EXPRESS_COUPON_AUTO_QUERY_DELAY_MS > 0)
      assert.ok(EXPRESS_COUPON_AUTO_QUERY_DELAY_MS <= 500)
    }
  },
  {
    name: 'express coupon service separates available and unavailable cards',
    async run() {
      const originalQueryOrderCoupons = expressCouponApi.queryOrderCoupons
      const couponBase = {
        startTime: '2026-07-01 00:00:00',
        endTime: '2026-07-31 23:59:59',
        discountFee: 500,
        useFee: 0,
        subFee: 0,
        limitDiscountFee: 0,
        discountType: '1'
      }

      try {
        expressCouponApi.queryOrderCoupons = async () => ({
          status: true,
          result: {
            available: [
              {
                ...couponBase,
                couponCode: 'AVAILABLE_001',
                subtitle: 'App寄件券',
                businessStatus: '0'
              }
            ],
            unAvailable: [
              {
                ...couponBase,
                couponCode: 'UNAVAILABLE_001',
                subtitle: '限指定产品',
                useLimit: ['当前产品不可用']
              }
            ]
          }
        })

        const response = await expressCouponService.queryOrderCoupons({
          freight: 20,
          productCode: 'PACKAGE',
          couponFeeList: [{ feeType: 'FRT', freight: 20 }],
          arriveProvinceName: '广东省',
          channel: 'APP',
          mobile: '13800138000',
          sendAnAddress: '上海市-上海市-青浦区',
          receivesAnAddress: '广东省-深圳市-南山区'
        })

        assert.equal(response.status, true)
        assert.equal(response.result.available.length, 1)
        assert.equal(response.result.available[0].canUse, true)
        assert.equal(response.result.unavailable.length, 1)
        assert.equal(response.result.unavailable[0].canUse, false)
        assert.deepEqual(
          response.result.unavailable[0].raw.useLimit,
          ['当前产品不可用']
        )
      } finally {
        expressCouponApi.queryOrderCoupons = originalQueryOrderCoupons
      }
    }
  },
  {
    name: 'express coupon service normalizes runtime request failures',
    async run() {
      const originalQueryOrderCoupons = expressCouponApi.queryOrderCoupons

      try {
        expressCouponApi.queryOrderCoupons = async () => {
          throw new Error('network unavailable')
        }

        const response = await expressCouponService.queryOrderCoupons({
          freight: 20,
          productCode: 'PACKAGE',
          couponFeeList: [{ feeType: 'FRT', freight: 20 }],
          arriveProvinceName: '广东省',
          channel: 'APP',
          mobile: '13800138000',
          sendAnAddress: '上海市-上海市-青浦区',
          receivesAnAddress: '广东省-深圳市-南山区'
        })

        assert.equal(response.status, false)
        assert.equal(response.result, null)
        assert.equal(response.message, '可用优惠券查询失败，请检查网络后重试')
      } finally {
        expressCouponApi.queryOrderCoupons = originalQueryOrderCoupons
      }
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
    name: 'express carton catalog keeps exact backend codes and quote volumes',
    run() {
      assert.deepEqual(
        EXPRESS_CARTON_OPTIONS.map(({ code, volume }) => ({ code, volume })),
        [
          { code: 'ZX_DP', volume: 0.003 },
          { code: 'ZX_DP_01', volume: 0.009 },
          { code: 'ZX_DP_2S', volume: 0.015 },
          { code: 'ZX_DP_02', volume: 0.015 },
          { code: 'ZX_DP_03', volume: 0.026 },
          { code: 'ZX_DP_04', volume: 0.036 },
          { code: 'ZX_DP_05', volume: 0.038 },
          { code: 'ZX_DP_06', volume: 0.083 },
          { code: 'ZX_DP_07', volume: 0.12 }
        ]
      )
      assert.equal(
        new Set(EXPRESS_CARTON_OPTIONS.map(option => option.code)).size,
        9
      )
      assert.equal(normalizeExpressCartonCode(' ZX_DP_2S '), 'ZX_DP_2S')

      for (const value of [
        'ZX_DP_08',
        'ZX_DP_2',
        'zx_dp',
        1,
        null,
        undefined,
        {}
      ]) {
        assert.equal(normalizeExpressCartonCode(value), '')
      }
    }
  },
  {
    name: 'express wooden packaging catalog keeps exact order mappings',
    run() {
      assert.deepEqual(
        EXPRESS_WOODEN_PACKAGING_OPTIONS.map(
          ({ code, orderType, orderPackageCode, packingName }) => ({
            code,
            orderType,
            orderPackageCode,
            packingName
          })
        ),
        [
          {
            code: 'WOOD_03',
            orderType: 'VOLUME',
            orderPackageCode: 'SJ',
            packingName: '木架'
          },
          {
            code: 'WOOD_04',
            orderType: 'VOLUME',
            orderPackageCode: 'BG',
            packingName: '木箱'
          },
          {
            code: 'WOOD_01',
            orderType: 'COUNT',
            orderPackageCode: 'SP',
            packingName: '木托'
          },
          {
            code: 'WOOD_02',
            orderType: 'COUNT',
            orderPackageCode: 'NSP',
            packingName: '木托'
          }
        ]
      )
      assert.deepEqual(
        normalizeExpressWoodenPackagingCodes([
          ' WOOD_02 ',
          'WOOD_03',
          'WOOD_02',
          'WOOD_UNKNOWN',
          null
        ]),
        ['WOOD_03', 'WOOD_02']
      )
      assert.deepEqual(
        normalizeExpressPackagingDraft({
          cartonCode: 'ZX_UNKNOWN',
          woodenCodes: ['WOOD_04', 'WOOD_04', 'WOOD_UNKNOWN']
        }),
        {
          cartonCode: '',
          woodenCodes: ['WOOD_04'],
          unpackingCodes: []
        }
      )
    }
  },
  {
    name: 'express unpacking catalog keeps exact quantity mappings',
    run() {
      assert.deepEqual(
        EXPRESS_UNPACKING_OPTIONS.map(
          ({ code, name, priceLabel, numberField }) => ({
            code,
            name,
            priceLabel,
            numberField
          })
        ),
        [
          {
            code: 'UNPACKING_01',
            name: '拆木包装',
            priceLabel: '¥20',
            numberField: 'unpackingWoodPackagingNumber'
          },
          {
            code: 'UNPACKING_02',
            name: '拆非木包装',
            priceLabel: '¥10',
            numberField: 'unpackingNonWoodPackagingNumber'
          }
        ]
      )
      assert.deepEqual(
        normalizeExpressUnpackingCodes([
          ' UNPACKING_02 ',
          'UNPACKING_01',
          'UNPACKING_02',
          'UNPACKING_UNKNOWN',
          null
        ]),
        ['UNPACKING_01', 'UNPACKING_02']
      )
    }
  },
  {
    name: 'express carton packaging floors quote volume without changing goods volume',
    run() {
      const source = {
        ...createValidExpressDraft(),
        goods: {
          ...createValidExpressDraft().goods,
          volume: 0.01
        },
        packaging: {
          cartonCode: 'ZX_DP_04',
          woodenCodes: [],
          unpackingCodes: []
        }
      }
      const goodsBeforeQuote = { ...source.goods }

      assert.equal(getExpressPackagingQuoteVolume(source), 0.036)
      assert.deepEqual(source.goods, goodsBeforeQuote)
      assert.equal(source.packaging.cartonCode, 'ZX_DP_04')
      assert.equal(
        getExpressPackagingQuoteVolume({
          ...source,
          goods: { ...source.goods, volume: 0.08 }
        }),
        0.08
      )
    }
  },
  {
    name: 'express carton packaging maps exact quote and order payloads',
    run() {
      const draft = {
        ...createValidExpressDraft(),
        goods: {
          ...createValidExpressDraft().goods,
          volume: 0.01
        },
        packaging: {
          cartonCode: 'ZX_DP_04',
          woodenCodes: [],
          unpackingCodes: []
        }
      }
      const expectedPackageInfoList = [
        {
          type: 'COUNT',
          data: '1',
          packageCode: 'ZX_DP_04'
        }
      ]
      const freightRequest = buildFreightRequest(draft)
      const orderRequest = buildCreateOrderRequest(draft)

      assert.deepEqual(
        createExpressQuotePackageInfoList(draft.packaging),
        expectedPackageInfoList
      )
      assert.deepEqual(
        createExpressOrderPackageInfoList(draft.packaging),
        expectedPackageInfoList
      )
      assert.equal(getExpressPackageLtlType(draft.packaging), '')
      assert.equal(createExpressOrderPackingText(draft.packaging), '')
      assert.equal(freightRequest.totalVolume, 0.036)
      assert.equal(freightRequest.packageLtlType, '')
      assert.equal(freightRequest.unpackingWoodPackagingNumber, 0)
      assert.equal(freightRequest.unpackingNonWoodPackagingNumber, 0)
      assert.deepEqual(
        freightRequest.packageInfoList,
        expectedPackageInfoList
      )
      assert.deepEqual(orderRequest.packageInfoList, expectedPackageInfoList)
      assert.deepEqual(orderRequest.unpackageLtlInfo, {
        unpackingNonWoodPackagingNumber: 0,
        unpackingWoodPackagingNumber: 0
      })
      assert.equal(orderRequest.receive[0].totalVolume, 0.01)
      assert.equal(orderRequest.receive[0].packing, '')
      assert.equal(draft.goods.volume, 0.01)

      const unpackagedDraft = {
        ...draft,
        packaging: {
          cartonCode: '',
          woodenCodes: [],
          unpackingCodes: []
        }
      }
      const unpackagedFreightRequest = buildFreightRequest(unpackagedDraft)
      const unpackagedOrderRequest = buildCreateOrderRequest(unpackagedDraft)

      assert.equal(
        Object.prototype.hasOwnProperty.call(
          unpackagedFreightRequest,
          'packageInfoList'
        ),
        false
      )
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          unpackagedOrderRequest,
          'packageInfoList'
        ),
        false
      )
      assert.equal(
        createExpressQuotePackageInfoList(unpackagedDraft.packaging),
        undefined
      )
      assert.equal(
        createExpressOrderPackageInfoList(unpackagedDraft.packaging),
        undefined
      )
      assert.equal(unpackagedFreightRequest.packageLtlType, '')
      assert.deepEqual(createExpressUnpackingNumbers(draft.packaging), {
        unpackingNonWoodPackagingNumber: 0,
        unpackingWoodPackagingNumber: 0
      })
      assert.equal(unpackagedOrderRequest.receive[0].packing, '')
    }
  },
  {
    name: 'express wooden packaging separates quote and order contracts',
    run() {
      const draft = {
        ...createValidExpressDraft(),
        goods: {
          ...createValidExpressDraft().goods,
          volume: 0.01
        },
        packaging: {
          cartonCode: 'ZX_DP_04',
          woodenCodes: [
            'WOOD_02',
            'WOOD_03',
            'WOOD_04',
            'WOOD_01',
            'WOOD_02'
          ],
          unpackingCodes: []
        }
      }
      const quotePackageInfoList = [
        { type: 'COUNT', data: '1', packageCode: 'ZX_DP_04' }
      ]
      const orderPackageInfoList = [
        ...quotePackageInfoList,
        { type: 'VOLUME', data: '1', packageCode: 'SJ' },
        { type: 'VOLUME', data: '1', packageCode: 'BG' },
        { type: 'COUNT', data: '1', packageCode: 'SP' },
        { type: 'COUNT', data: '1', packageCode: 'NSP' }
      ]
      const freightRequest = buildFreightRequest(draft)
      const orderRequest = buildCreateOrderRequest(draft)

      assert.deepEqual(
        createExpressQuotePackageInfoList(draft.packaging),
        quotePackageInfoList
      )
      assert.deepEqual(
        createExpressOrderPackageInfoList(draft.packaging),
        orderPackageInfoList
      )
      assert.equal(getExpressPackageLtlType(draft.packaging), 'WOOD_PACKAGE')
      assert.equal(
        createExpressOrderPackingText(draft.packaging),
        '木架,木箱,木托'
      )
      assert.equal(freightRequest.packageLtlType, 'WOOD_PACKAGE')
      assert.deepEqual(freightRequest.packageInfoList, quotePackageInfoList)
      assert.deepEqual(orderRequest.packageInfoList, orderPackageInfoList)
      assert.equal(orderRequest.receive[0].packing, '木架,木箱,木托')
      assert.equal(orderRequest.receive[0].totalVolume, 0.01)

      const woodOnlyDraft = {
        ...draft,
        packaging: {
          cartonCode: '',
          woodenCodes: ['WOOD_04'],
          unpackingCodes: []
        }
      }
      const woodOnlyFreightRequest = buildFreightRequest(woodOnlyDraft)
      const woodOnlyOrderRequest = buildCreateOrderRequest(woodOnlyDraft)

      assert.equal(
        Object.prototype.hasOwnProperty.call(
          woodOnlyFreightRequest,
          'packageInfoList'
        ),
        false
      )
      assert.equal(woodOnlyFreightRequest.packageLtlType, 'WOOD_PACKAGE')
      assert.deepEqual(woodOnlyOrderRequest.packageInfoList, [
        { type: 'VOLUME', data: '1', packageCode: 'BG' }
      ])
      assert.equal(woodOnlyOrderRequest.receive[0].packing, '木箱')
    }
  },
  {
    name: 'express unpacking separates quote and order quantity contracts',
    run() {
      const draft = {
        ...createValidExpressDraft(),
        packaging: {
          cartonCode: 'ZX_DP_03',
          woodenCodes: ['WOOD_04'],
          unpackingCodes: ['UNPACKING_02', 'UNPACKING_01']
        }
      }
      const freightRequest = buildFreightRequest(draft)
      const orderRequest = buildCreateOrderRequest(draft)
      const expectedNumbers = {
        unpackingNonWoodPackagingNumber: 1,
        unpackingWoodPackagingNumber: 1
      }
      const quoteView = createExpressProductQuoteView({
        ...expressProduct,
        detail: [
          {
            priceEntryCode: 'BZ',
            priceEntryName: '包装费',
            caculateFee: 3
          },
          {
            priceEntryCode: 'CBF',
            priceEntryName: '拆包服务费',
            caculateFee: 20
          }
        ]
      })

      assert.equal(
        getExpressPackageLtlType(draft.packaging),
        'WOOD_PACKAGE,UN_PACKAGE'
      )
      assert.deepEqual(createExpressUnpackingNumbers(draft.packaging), {
        ...expectedNumbers
      })
      assert.deepEqual(
        createExpressOrderUnpackageLtlInfo(draft.packaging),
        expectedNumbers
      )
      assert.equal(freightRequest.packageLtlType, 'WOOD_PACKAGE,UN_PACKAGE')
      assert.equal(freightRequest.unpackingWoodPackagingNumber, 1)
      assert.equal(freightRequest.unpackingNonWoodPackagingNumber, 1)
      assert.deepEqual(freightRequest.packageInfoList, [
        { type: 'COUNT', data: '1', packageCode: 'ZX_DP_03' }
      ])
      assert.deepEqual(orderRequest.unpackageLtlInfo, expectedNumbers)
      assert.deepEqual(orderRequest.packageInfoList, [
        { type: 'COUNT', data: '1', packageCode: 'ZX_DP_03' },
        { type: 'VOLUME', data: '1', packageCode: 'BG' }
      ])
      assert.equal(orderRequest.receive[0].packing, '木箱')
      assert.deepEqual(quoteView.feeRows, [
        { key: 'BZ', name: '包装服务-纸箱', amount: 3 },
        { key: 'CBF', name: '包装服务-拆包装', amount: 20 }
      ])

      const unpackOnly = {
        cartonCode: '',
        woodenCodes: [],
        unpackingCodes: ['UNPACKING_02']
      }

      assert.equal(getExpressPackageLtlType(unpackOnly), 'UN_PACKAGE')
      assert.deepEqual(createExpressUnpackingNumbers(unpackOnly), {
        unpackingNonWoodPackagingNumber: 1,
        unpackingWoodPackagingNumber: 0
      })
      assert.equal(createExpressQuotePackageInfoList(unpackOnly), undefined)
      assert.equal(createExpressOrderPackageInfoList(unpackOnly), undefined)
    }
  },
  {
    name: 'express packaging changes invalidate the selected quote',
    run() {
      const source = createValidExpressDraft()
      const updated = updateExpressPackaging(source, {
        cartonCode: 'ZX_DP_03',
        woodenCodes: ['WOOD_04', 'WOOD_01'],
        unpackingCodes: ['UNPACKING_02']
      })

      assert.deepEqual(updated.packaging, {
        cartonCode: 'ZX_DP_03',
        woodenCodes: ['WOOD_04', 'WOOD_01'],
        unpackingCodes: ['UNPACKING_02']
      })
      assert.equal(updated.selectedProduct, null)
      assert.equal(
        updated.quoteStaleReason,
        '包装服务变化，请重新获取价格'
      )
      assert.equal(source.packaging.cartonCode, '')
      assert.deepEqual(source.packaging.woodenCodes, [])
      assert.deepEqual(source.packaging.unpackingCodes, [])
      assert.equal(source.selectedProduct, expressProduct)
      assert.equal(
        updateExpressPackaging(updated, {
          woodenCodes: ['WOOD_01', 'WOOD_04', 'WOOD_01'],
          unpackingCodes: ['UNPACKING_02', 'UNPACKING_02']
        }),
        updated
      )
    }
  },
  {
    name: 'express packaging is isolated across storage and draft bridges',
    async run() {
      const storageKey = createCacheStorageKey(CACHE_KEYS.expressDraft)
      const originalStorageValue = getStorageValue(storageKey)
      const source = {
        ...createValidExpressDraft(),
        packaging: {
          cartonCode: 'ZX_DP_05',
          woodenCodes: ['WOOD_03', 'WOOD_01'],
          unpackingCodes: ['UNPACKING_01']
        }
      }

      try {
        await expressDraftStorage.save(source)
        source.packaging.cartonCode = 'ZX_DP_06'
        source.packaging.woodenCodes.push('WOOD_02')
        source.packaging.unpackingCodes.push('UNPACKING_02')

        const restored = expressDraftStorage.restore()

        assert.ok(restored)
        assert.deepEqual(restored.packaging, {
          cartonCode: 'ZX_DP_05',
          woodenCodes: ['WOOD_03', 'WOOD_01'],
          unpackingCodes: ['UNPACKING_01']
        })
        assert.notEqual(restored.packaging, source.packaging)
        assert.notEqual(
          restored.packaging.woodenCodes,
          source.packaging.woodenCodes
        )
        assert.notEqual(
          restored.packaging.unpackingCodes,
          source.packaging.unpackingCodes
        )

        expressDraftBridge.carryFromCoupon(restored)
        restored.packaging.cartonCode = 'ZX_DP_07'
        restored.packaging.woodenCodes.push('WOOD_04')
        restored.packaging.unpackingCodes.push('UNPACKING_02')

        const carried = expressDraftBridge.consume().draft

        assert.deepEqual(carried.packaging, {
          cartonCode: 'ZX_DP_05',
          woodenCodes: ['WOOD_03', 'WOOD_01'],
          unpackingCodes: ['UNPACKING_01']
        })
        assert.notEqual(carried.packaging, restored.packaging)
        assert.notEqual(
          carried.packaging.woodenCodes,
          restored.packaging.woodenCodes
        )
        assert.notEqual(
          carried.packaging.unpackingCodes,
          restored.packaging.unpackingCodes
        )

        templateDraftBridge.stage(carried)
        carried.packaging.cartonCode = 'ZX_DP'
        carried.packaging.woodenCodes.push('WOOD_02')
        carried.packaging.unpackingCodes.push('UNPACKING_02')

        const staged = templateDraftBridge.consume()

        assert.deepEqual(staged.packaging, {
          cartonCode: 'ZX_DP_05',
          woodenCodes: ['WOOD_03', 'WOOD_01'],
          unpackingCodes: ['UNPACKING_01']
        })
        assert.notEqual(staged.packaging, carried.packaging)
        assert.notEqual(
          staged.packaging.woodenCodes,
          carried.packaging.woodenCodes
        )
        assert.notEqual(
          staged.packaging.unpackingCodes,
          carried.packaging.unpackingCodes
        )

        const woodOnlyDraft = createExpressDraft()

        woodOnlyDraft.packaging.woodenCodes = ['WOOD_04']
        await expressDraftStorage.save(woodOnlyDraft)

        assert.deepEqual(expressDraftStorage.restore()?.packaging, {
          cartonCode: '',
          woodenCodes: ['WOOD_04'],
          unpackingCodes: []
        })

        const unpackingOnlyDraft = createExpressDraft()

        unpackingOnlyDraft.packaging.unpackingCodes = ['UNPACKING_02']
        await expressDraftStorage.save(unpackingOnlyDraft)

        assert.deepEqual(expressDraftStorage.restore()?.packaging, {
          cartonCode: '',
          woodenCodes: [],
          unpackingCodes: ['UNPACKING_02']
        })
      } finally {
        if (originalStorageValue) {
          await setStorageValue(storageKey, originalStorageValue)
        } else {
          await removeStorageValue(storageKey)
        }
      }
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
    name: 'express collection rules validate account agreement amount and limit',
    run() {
      const emptyCollection = createExpressCollectionDraft()

      assert.deepEqual(validateExpressCollection(emptyCollection), [])
      assert.equal(parseExpressCollectionAmount('12.345'), 12.35)
      assert.equal(parseExpressCollectionAmount('-1'), 0)
      assert.equal(normalizeExpressCollectionAmountInput('0012.345元'), '12.34')
      assert.equal(normalizeExpressCollectionAmountInput('.5'), '0.5')
      assert.equal(maskExpressCollectionAccount('6222 0000 1234'), '**** 1234')

      assert.deepEqual(
        validateExpressCollection({
          ...emptyCollection,
          type: 'NORMAL'
        }),
        [
          '请填写代收货款金额',
          '请选择代收货款收款账户',
          '请阅读并同意代收货款服务协议'
        ]
      )
      assert.equal(
        validateExpressCollection({
          ...emptyCollection,
          type: 'INTRADAY',
          amount: 1000,
          account: '622200001234',
          accountName: '张三',
          limit: 500,
          agreementAccepted: true
        })[0],
        '代收货款金额不能超过 500 元'
      )
    }
  },
  {
    name: 'express collection mutations drive quote and order payloads',
    run() {
      let draft = updateExpressCollectionPricing(createValidExpressDraft(), {
        type: 'INTRADAY',
        amount: 125.555
      })

      assert.equal(draft.collection.amount, 125.56)
      assert.equal(draft.selectedProduct, null)
      assert.equal(
        draft.quoteStaleReason,
        '代收货款信息变化，请重新获取价格'
      )

      draft = updateExpressCollectionDetails(draft, {
        account: ' 6222 0000 1234 ',
        accountName: ' 张三 ',
        limit: 500,
        agreementAccepted: true
      })
      draft = selectExpressProduct(draft, {
        ...expressProduct,
        detail: [
          {
            priceEntryCode: 'HK',
            priceEntryName: '代收手续费',
            caculateFee: 3.5
          }
        ]
      })

      const freightRequest = buildFreightRequest(draft)
      const orderRequest = buildCreateOrderRequest(draft)

      assert.deepEqual(validateExpressCollection(draft.collection), [])
      assert.equal(freightRequest.reciveLoanType, 'R1')
      assert.equal(freightRequest.reviceMoneyAmount, 125.56)
      assert.equal(orderRequest.receive[0].reciveLoanType, 'INTRADAY')
      assert.equal(orderRequest.receive[0].reciveLoanAccount, '622200001234')
      assert.equal(orderRequest.receive[0].accountName, '张三')
      assert.equal(orderRequest.receive[0].reviceMoneyAmount, 125.56)
      assert.equal(getExpressCollectionFee(draft.selectedProduct), 3.5)

      const cleared = clearExpressCollection(draft)

      assert.equal(cleared.collection.type, '')
      assert.equal(cleared.collection.limit, 500)
      assert.equal(cleared.selectedProduct, null)
    }
  },
  {
    name: 'express delivery preference builds stable date and availability contracts',
    run() {
      const now = new Date(2026, 6, 13)
      const scheduledDates = createExpressScheduledDateOptions(
        '2026-07-15 18:00:00',
        '',
        now
      )
      const unavailableDates = createExpressUnavailableDateOptions(now)
      const draft = createValidExpressDraft()
      const request = buildExpressDeliveryAppointmentRequest(draft)

      assert.equal(scheduledDates[0].value, '2026-07-16')
      assert.equal(scheduledDates[6].value, '2026-07-22')
      assert.equal(unavailableDates[0].value, '2026-07-14')
      assert.equal(unavailableDates[29].value, '2026-08-12')
      assert.deepEqual(request, {
        goodsWeight: 1,
        goodsVolume: 0,
        provinceName: '广东省',
        cityName: '深圳市',
        areaName: '南山区',
        address: '科技园科苑路200号'
      })
    }
  },
  {
    name: 'express scheduled delivery maps quote and order extension fields',
    run() {
      const product = {
        ...expressProduct,
        arriveDate: '2026-07-15 18:00:00'
      }
      const baseDraft = {
        ...createValidExpressDraft(),
        selectedProduct: product
      }
      let draft = updateExpressDeliveryPreference(
        baseDraft,
        {
          type: 'SCHEDULED',
          scheduledWindow: createExpressScheduledWindow(
            '2026-07-16',
            '14:00-16:00'
          ),
          availabilityKey: createExpressDeliveryAvailabilityKey(baseDraft)
        }
      )

      assert.equal(draft.selectedProduct, null)
      assert.equal(draft.quoteStaleReason, '派送偏好变化，请重新获取价格')

      draft = selectExpressProduct(draft, product)

      const freightRequest = buildFreightRequest(draft)
      const orderRequest = buildCreateOrderRequest(draft)

      assert.deepEqual(validateExpressDeliveryPreference(draft, {
        requireProduct: true
      }), [])
      assert.equal(freightRequest.appointmentDelivery, 'Y')
      assert.equal(freightRequest.nightDelivery, '')
      assert.equal(orderRequest.receive[0].appointmentDeliveryTime,
        '2026-07-16 14:00-16:00')
      assert.deepEqual(orderRequest.receive[0].orderExtendFields, [
        { key: 'isAppointmentDeliver', value: 'Y' },
        { key: 'nightAccept', value: 'N' }
      ])

      const nightFields = createExpressDeliveryOrderFields({
        type: 'SCHEDULED',
        scheduledWindow: '2026-07-16 21:00-23:59',
        unavailableDates: [],
        availabilityKey: 'verified'
      })
      const nightQuoteFields = createExpressDeliveryQuoteFields({
        type: 'SCHEDULED',
        scheduledWindow: '2026-07-16 21:00-23:59',
        unavailableDates: [],
        availabilityKey: 'verified'
      })

      assert.equal(nightQuoteFields.nightDelivery, 'Y')
      assert.equal(nightQuoteFields.appointmentDelivery, '')
      assert.deepEqual(nightFields.orderExtendFields, [
        { key: 'nightDelivery', value: 'Y' }
      ])
      assert.equal(isExpressScheduledDeliveryProductSupported('DCZP'), false)
      assert.equal(isExpressScheduledDeliveryProductSupported('TKDR'), false)

      const changedProductDraft = selectExpressProduct(draft, {
        ...product,
        omsProductCode: 'DCZP'
      })

      assert.equal(changedProductDraft.deliveryPreference.type, '')

      const staleDraft = {
        ...draft,
        consignee: {
          ...draft.consignee,
          address: '科技园科苑路300号'
        }
      }

      assert.deepEqual(
        validateExpressDeliveryPreference(staleDraft, {
          requireProduct: true
        }),
        ['定时派送范围已失效，请重新校验']
      )
    }
  },
  {
    name: 'express notify delivery modes stay mutually exclusive in payloads',
    run() {
      const senderPreference = {
        type: 'NOTIFY_SENDER',
        scheduledWindow: '',
        unavailableDates: [],
        availabilityKey: ''
      }
      const receiverPreference = {
        type: 'NOTIFY_RECEIVER',
        scheduledWindow: '',
        unavailableDates: ['2026-07-20', '2026-07-22'],
        availabilityKey: ''
      }

      assert.equal(
        createExpressDeliveryQuoteFields(senderPreference).notifyIsDeliver,
        'N'
      )
      assert.deepEqual(
        createExpressDeliveryOrderFields(senderPreference).orderExtendFields,
        [{ key: 'notifyIsDeliver', value: 'N' }]
      )
      assert.deepEqual(
        createExpressDeliveryOrderFields(receiverPreference)
          .newOrderExtendFields,
        [
          { key: 'waitReceiveNotifyDeliver', value: 'Y' },
          {
            key: 'waitReceiveNotifyNotDeliverTime',
            value: '2026-07-20,2026-07-22'
          }
        ]
      )

      const selfPickupDraft = {
        ...createValidExpressDraft(),
        service: {
          ...createValidExpressDraft().service,
          deliveryMode: 'PICKSELF'
        },
        deliveryPreference: receiverPreference
      }

      assert.deepEqual(validateExpressDeliveryPreference(selfPickupDraft), [
        '自提订单不能选择预约或通知派送'
      ])

      const invalidDateDraft = {
        ...createValidExpressDraft(),
        deliveryPreference: {
          ...receiverPreference,
          unavailableDates: ['invalid-date']
        }
      }

      assert.deepEqual(validateExpressDeliveryPreference(invalidDateDraft), [
        '不可收货日期格式不正确'
      ])
    }
  },
  {
    name: 'express night pickup capability uses address key and two hour cache',
    run() {
      const checkedAt = Date.UTC(2026, 6, 13, 8)
      const draft = createValidExpressDraft()
      const request = buildExpressPickupNightRequest(draft)
      const capability = createExpressPickupNightCapability(
        draft,
        {
          nightPickUpEnable: true,
          startTime: '18:00:00',
          endTime: '23:00:00'
        },
        checkedAt
      )
      const capableDraft = {
        ...draft,
        pickup: {
          ...draft.pickup,
          nightCapability: capability
        }
      }
      const pickupRequest = buildPickupTimeRequest(capableDraft, capability)

      assert.deepEqual(request, {
        province: '上海市',
        city: '上海市',
        county: '青浦区',
        address: '徐泾镇明珠路100号'
      })
      assert.equal(pickupRequest.nightOpening, 'Y')
      assert.equal(pickupRequest.nightStartTime, '18:00:00')
      assert.equal(pickupRequest.nightEndTime, '23:00:00')
      assert.equal(
        getFreshExpressPickupNightCapability(
          capableDraft,
          checkedAt + EXPRESS_NIGHT_PICKUP_CACHE_MS - 1
        ).enabled,
        true
      )
      assert.equal(
        getFreshExpressPickupNightCapability(
          capableDraft,
          checkedAt + EXPRESS_NIGHT_PICKUP_CACHE_MS
        ),
        undefined
      )
      assert.equal(
        getFreshExpressPickupNightCapability(
          {
            ...capableDraft,
            sender: {
              ...capableDraft.sender,
              address: '盈港东路200号'
            }
          },
          checkedAt + 1
        ),
        undefined
      )
    }
  },
  {
    name: 'express pickup service composes night capability before time slots',
    async run() {
      const originalNight = expressApi.queryPickupNight
      const originalPickupTime = expressApi.queryPickupTime
      let nightCalls = 0
      let pickupRequest = null

      expressApi.queryPickupNight = async request => {
        nightCalls += 1
        assert.equal(request.address, '徐泾镇明珠路100号')

        return {
          status: true,
          result: {
            nightPickUpEnable: true,
            startTime: '18:00:00',
            endTime: '23:00:00'
          },
          message: ''
        }
      }
      expressApi.queryPickupTime = async request => {
        pickupRequest = request

        return {
          status: true,
          result: {
            serviceTime: '2026-07-13 12:00:00',
            opening: true,
            openingList: [],
            nightOpeningList: [
              {
                date: '2026-07-14',
                dateList: [
                  {
                    time: '20:00-22:00',
                    text: '20:00-22:00',
                    type: 'NORMAL'
                  }
                ]
              }
            ]
          },
          message: ''
        }
      }

      try {
        const response = await expressService.queryPickupTime(
          createValidExpressDraft()
        )

        assert.equal(nightCalls, 1)
        assert.equal(pickupRequest.nightOpening, 'Y')
        assert.equal(pickupRequest.nightStartTime, '18:00:00')
        assert.equal(pickupRequest.nightEndTime, '23:00:00')
        assert.equal(response.result.openingList[0].dateList[0].type, 'NIGHT')
        assert.equal(response.result.nightCapability.enabled, true)
      } finally {
        expressApi.queryPickupNight = originalNight
        expressApi.queryPickupTime = originalPickupTime
      }
    }
  },
  {
    name: 'express pickup time merges normal night and disabled windows',
    run() {
      const response = normalizeExpressPickupTimeResponse({
        serviceTime: '2026-07-13 12:00:00',
        opening: true,
        openingList: [
          {
            date: '2026-07-14',
            dateList: [
              {
                time: '19:00-20:00',
                text: '一小时上门',
                type: 'NORMAL'
              },
              {
                time: '10:00-12:00',
                text: '10:00-12:00',
                type: 'NORMAL'
              }
            ]
          }
        ],
        nightOpeningList: [
          {
            date: '2026-07-14',
            dateList: [
              {
                time: '19:00-20:00',
                text: '一小时上门',
                type: 'NORMAL'
              },
              {
                time: '20:00-22:00',
                text: '20:00-22:00',
                type: 'NORMAL'
              }
            ]
          }
        ],
        blankOpeningList: [
          {
            date: '2026-07-14',
            dateList: [
              {
                time: '18:00-19:00',
                text: '18:00-19:00',
                type: 'NORMAL'
              }
            ]
          }
        ]
      })
      const options = createExpressPickupDateOptions(response)

      assert.equal(response.openingList.length, 1)
      assert.deepEqual(
        response.openingList[0].dateList.map(item => item.type),
        ['NORMAL', 'DISABLE', 'NIGHT', 'NIGHT']
      )
      assert.equal(
        response.openingList[0].dateList.some(
          item => item.type === 'NORMAL' && item.text.includes('小时')
        ),
        false
      )
      assert.equal(options[0].timeOptions[1].disabled, true)
      assert.equal(options[0].timeOptions[2].night, true)
      assert.equal(
        getFirstExpressPickupTimeSelection({
          ...response,
          openingList: [
            {
              date: '2026-07-14',
              dateList: response.openingList[0].dateList.filter(
                item => item.type === 'NIGHT'
              )
            }
          ]
        }),
        null
      )
    }
  },
  {
    name: 'express night pickup preserves valid selection and enforces Beijing cutoff',
    run() {
      const beforeCutoff = new Date('2026-07-13T09:59:00.000Z')
      const atCutoff = new Date('2026-07-13T10:00:00.000Z')
      const draft = createValidExpressDraft()
      const capability = createExpressPickupNightCapability(
        draft,
        {
          nightPickUpEnable: true,
          startTime: '18:00:00',
          endTime: '23:00:00'
        },
        beforeCutoff.getTime()
      )
      const response = normalizeExpressPickupTimeResponse(
        {
          serviceTime: '2026-07-13 12:00:00',
          opening: true,
          openingList: [
            {
              date: '2026-07-13',
              dateList: [
                {
                  time: '14:00-16:00',
                  text: '14:00-16:00',
                  type: 'NORMAL'
                }
              ]
            }
          ],
          nightOpeningList: [
            {
              date: '2026-07-13',
              dateList: [
                {
                  time: '20:00-22:00',
                  text: '20:00-22:00',
                  type: 'NORMAL'
                }
              ]
            }
          ]
        },
        capability
      )
      let selected = selectExpressPickupTime(
        {
          ...draft,
          pickup: {
            ...draft.pickup,
            nightCapability: capability
          }
        },
        {
          date: '2026-07-13',
          time: '20:00-22:00',
          text: '20:00-22:00',
          type: 'NIGHT'
        }
      )

      selected = acceptExpressNightPickupNotice(selected)

      assert.equal(selected.pickup.type, 'NIGHT')
      assert.equal(selected.pickup.nightNoticeAccepted, true)
      assert.deepEqual(validateExpressPickupTime(selected, {
        now: beforeCutoff
      }), [])
      assert.equal(
        isExpressNightPickupTimeValid(selected.pickup.time, atCutoff),
        false
      )
      assert.equal(
        isExpressNightPickupTimeValid(
          '2026-07-14 06:00-08:00',
          atCutoff
        ),
        true
      )
      assert.equal(
        findExpressPickupTimeSelection(response, selected.pickup).type,
        'NIGHT'
      )

      const refreshed = applyExpressPickupTime(selected, response)
      const selfSent = updateExpressPickup(refreshed, { dispatch: 'N' })

      assert.equal(refreshed.pickup.type, 'NIGHT')
      assert.equal(refreshed.pickup.nightNoticeAccepted, true)
      assert.equal(selfSent.pickup.type, 'NORMAL')
      assert.equal(selfSent.pickup.time, '')
      assert.equal(selfSent.pickup.nightCapability, undefined)
    }
  },
  {
    name: 'express night pickup maps quote order and quick pickup fields',
    run() {
      const now = Date.now()
      let draft = createValidExpressDraft()
      const capability = createExpressPickupNightCapability(
        draft,
        {
          nightPickUpEnable: true,
          startTime: '18:00:00',
          endTime: '23:00:00'
        },
        now
      )

      draft = selectExpressPickupTime(
        {
          ...draft,
          pickup: {
            ...draft.pickup,
            nightCapability: capability,
            pickPeriodTime: 2
          }
        },
        {
          date: '2026-07-14',
          time: '20:00-22:00',
          text: '20:00-22:00',
          type: 'NIGHT'
        }
      )
      draft = acceptExpressNightPickupNotice(draft)
      draft = selectExpressProduct(draft, expressProduct)

      const freightRequest = buildFreightRequest(draft)
      const orderRequest = buildCreateOrderRequest(draft)

      assert.equal(freightRequest.nightAccept, 'Y')
      assert.deepEqual(orderRequest.receive[0].orderExtendFields, [
        { key: 'nightAccept', value: 'Y' },
        { key: 'nightAcceptStatus', value: -1 }
      ])

      const quickDraft = {
        ...createValidExpressDraft(),
        pickup: {
          ...createValidExpressDraft().pickup,
          time: '2026-07-14 10:00:00',
          timeSlot: '下单后 1 小时内',
          pickPeriodTime: 1
        }
      }
      const quickRequest = buildCreateOrderRequest(quickDraft)

      assert.equal(
        quickRequest.receive[0].beginAcceptTime,
        '下单后 1 小时内'
      )
      assert.equal(quickRequest.receive[0].currentFirstTime, 'Y')
      assert.deepEqual(quickRequest.receive[0].orderExtendFields, [
        { key: 'nightAccept', value: 'N' }
      ])

      assert.equal(normalizeExpressPickup({ type: 0 }).type, 'NORMAL')
    }
  },
  {
    name: 'express draft bridge isolates nested night pickup capability',
    run() {
      const draft = createValidExpressDraft()
      const capability = createExpressPickupNightCapability(
        draft,
        {
          nightPickUpEnable: true,
          startTime: '18:00:00',
          endTime: '23:00:00'
        }
      )
      const source = {
        ...draft,
        pickup: {
          ...draft.pickup,
          nightCapability: capability
        }
      }

      expressDraftBridge.carryFromQueryPrice(source, expressProduct)
      capability.startTime = '00:00:00'

      const carried = expressDraftBridge.consume()

      assert.equal(carried.draft.pickup.nightCapability.startTime, '18:00:00')
      assert.notEqual(
        carried.draft.pickup.nightCapability,
        source.pickup.nightCapability
      )
    }
  },
  {
    name: 'express draft and template bridges isolate insurance capability state',
    run() {
      const draft = createValidExpressDraft()
      const source = applyExpressInsuranceCapability(
        draft,
        createExpressInsuranceCapability(draft, []),
        750000
      )

      expressDraftBridge.carryFromQueryPrice(source, expressProduct)
      templateDraftBridge.stage(source)
      source.insurance.capability.inputKey = 'mutated'
      source.insurance.limit = 1

      const carried = expressDraftBridge.consume().draft
      const staged = templateDraftBridge.consume()

      assert.notEqual(carried.insurance, source.insurance)
      assert.notEqual(
        carried.insurance.capability,
        source.insurance.capability
      )
      assert.notEqual(staged.insurance.capability, source.insurance.capability)
      assert.notEqual(carried.insurance.capability.inputKey, 'mutated')
      assert.equal(carried.insurance.limit, 750000)
      assert.equal(staged.insurance.limit, 750000)
    }
  },
  {
    name: 'express mutations clear selected quote when draft inputs change',
    run() {
      const draft = createValidExpressDraft()

      const goodsDraft = updateExpressGoods(draft, { name: '家具' })
      const serviceDraft = updateExpressService(draft, {
        paymentType: 'MONTH_PAY'
      })
      const pickupDraft = updateExpressPickup(draft, { dispatch: 'N' })

      assert.equal(goodsDraft.goods.name, '家具')
      assert.equal(goodsDraft.selectedProduct, null)
      assert.equal(goodsDraft.quoteStaleReason, '货物信息变化，请重新获取价格')
      assert.equal(serviceDraft.service.paymentType, 'MONTH_PAY')
      assert.equal(
        serviceDraft.quoteStaleReason,
        '服务方式变化，请重新获取价格'
      )
      assert.equal(pickupDraft.pickup.dispatch, 'N')
      assert.equal(
        pickupDraft.quoteStaleReason,
        '取件方式变化，请重新获取价格'
      )

      const preferenceDraft = updateExpressDeliveryPreference(draft, {
        type: 'NOTIFY_SENDER'
      })
      const selfPickupWithPreference = updateExpressService(preferenceDraft, {
        deliveryMode: 'PICKSELF'
      })

      assert.equal(selfPickupWithPreference.deliveryPreference.type, '')
    }
  },
  {
    name: 'express mutations normalize coupon and map pickup response',
    run() {
      const couponDraft = updateExpressCouponNumber(
        createValidExpressDraft(),
        ' cp n 001 '
      )
      const pickupDraft = applyExpressPickupTime(createValidExpressDraft(), {
        deptCode: '021A001',
        deptName: '青浦服务点',
        serviceTime: '09:00-18:00',
        opening: true,
        openingList: [
          {
            date: '2026-07-14',
            dateList: [
              {
                time: '10:00-12:00',
                text: '上午',
                type: 'NORMAL'
              }
            ]
          }
        ],
        endTime: '2026-07-14 18:00:00',
        pickPeriodTime: 2
      })

      assert.equal(couponDraft.couponNumber, 'CPN001')
      assert.equal(couponDraft.selectedProduct, null)
      assert.equal(pickupDraft.pickup.time, '2026-07-14 10:00-12:00')
      assert.equal(pickupDraft.pickup.timeSlot, '上午')
      assert.equal(pickupDraft.pickup.stationCode, '021A001')
      assert.equal(pickupDraft.pickup.stationName, '青浦服务点')
      assert.equal(pickupDraft.pickup.endTime, '2026-07-14 18:00:00')
      assert.equal(pickupDraft.pickup.pickPeriodTime, 2)
    }
  },
  {
    name: 'express mutations select product and reset cross-region pickup state',
    run() {
      const selectedDraft = selectExpressProduct(
        createExpressDraft(),
        expressProduct
      )
      const draftWithPickup = {
        ...createValidExpressDraft(),
        pickup: {
          ...createValidExpressDraft().pickup,
          time: '2026-07-14 10:00-12:00',
          endTime: '2026-07-14 18:00:00',
          timeSlot: '上午',
          stationCode: '021A001',
          stationName: '青浦服务点'
        }
      }
      const swappedDraft = swapExpressContacts(draftWithPickup)

      assert.equal(selectedDraft.selectedProduct, expressProduct)
      assert.equal(selectedDraft.service.transportMode, 'PACKAGE')
      assert.equal(selectedDraft.quoteStaleReason, '')
      assert.equal(swappedDraft.sender.name, '李四')
      assert.equal(swappedDraft.consignee.name, '张三')
      assert.equal(swappedDraft.pickup.time, '')
      assert.equal(swappedDraft.pickup.stationCode, '')
      assert.equal(swappedDraft.quoteStaleReason, '收寄地址互换，请重新获取价格')

      const senderUpdated = setExpressContact(
        createValidExpressDraft(),
        'sender',
        {
          ...senderContact,
          city: '苏州市'
        }
      )
      assert.equal(senderUpdated.selectedProduct, null)
      assert.equal(senderUpdated.pickup.time, '')
      assert.equal(senderUpdated.quoteStaleReason, '寄件地址变化，请重新获取价格')
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
      const matchingScanCustomer = resolveExpressProductCustomerCapability(
        scanDraft,
        {
          customerCode: 'CUS_SCAN',
          monthlyEnabled: true,
          contractEnabled: true,
          insuranceLimit: 750000
        }
      )

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
      assert.equal(
        resolveExpressProductRole(driverDraft, 'CONTRACT'),
        'DRIVER_QR_CODE'
      )
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
      assert.equal(
        selectDefaultExpressQuote([expressProduct, dczpProduct], true),
        dczpProduct
      )
      assert.equal(
        selectDefaultExpressQuote([expressProduct, dczpProduct], false),
        expressProduct
      )
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
        service: { ...regular.service, transportMode: 'DJBK' },
        selectedProduct: { ...expressProduct, omsProductCode: 'DJBK' }
      }

      assert.equal(EXPRESS_INSURANCE_DEFAULT_LIMIT, 1000000)
      assert.equal(EXPRESS_INSURANCE_REQUIRED_LIMIT, 9990000)
      assert.equal(EXPRESS_INSURANCE_SXB_LIMIT, 500)
      assert.equal(getExpressInsuranceLimit(regular), 750000)
      assert.equal(validateExpressInsurance(regular).length, 0)
      assert.match(validateExpressInsurance(overLimit)[0], /750000/)
      assert.equal(getExpressInsuranceLimit(sxb), 500)
      assert.match(validateExpressInsurance(sxb)[0], /500/)
      assert.equal(getExpressInsuranceProductPolicy('DJBK').required, true)
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
      assert.equal(
        createExpressInsuranceView(worryFreeDraft).options.find(
          option => option.type === 'SXB'
        ).recommended,
        true
      )
      assert.equal(disabledDraft.goods.insuredAmount, 0)
      assert.equal(disabledDraft.insurance.type, 'NORMAL')
      assert.equal(createExpressInsuranceView(disabledDraft).disabled, true)
      assert.equal(
        isExpressInsuranceCapabilityCurrent(fragileDraft, fragileCapability),
        true
      )
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
      const fragile = applyExpressInsuranceCapability(
        { ...qeb, insurance: { ...qeb.insurance, type: 'NORMAL' } },
        fragileCapability,
        750000
      )

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
      const insuranceFields = request.receive[0].orderExtendFields.filter(
        field => field.key === 'insuranceSource' || field.key === 'bjlx'
      )

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
      assert.equal(
        applyExpressInsuranceCapability(current, capability, null).insurance
          .limit,
        0
      )
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
        const selected = selectDefaultExpressQuote(
          response.result.products,
          response.result.availability.recommendDczp
        )

        assert.equal(response.status, true)
        assert.equal(response.result.availability.productSwitch, 'OLD')
        assert.equal(response.result.availability.passProductCode, '')
        assert.equal(response.result.availability.recommendDczp, true)
        assert.equal(
          response.result.availability.insuranceCapability.inputKey.length > 0,
          true
        )
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
        assert.equal(
          degraded.result.availability.insuranceCapability.inputKey,
          ''
        )
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
        const accountResponse = await expressService.quote(
          createValidExpressDraft()
        )

        assert.equal(
          accountResponse.result.availability.passProductCode,
          'CONTRACT'
        )
        assert.equal(
          accountResponse.result.availability.customer.insuranceLimit,
          750000
        )
        assert.equal(freightRequest.customerCode, 'CUS_ACCOUNT')
        assert.equal(freightRequest.customerMonthly, '1')
        assert.equal(freightRequest.customerContract, '1')

        const scanResponse = await expressService.quote(
          applyExpressScanContext(createValidExpressDraft(), {
            role: 'shipperNumber',
            value: 'CUS_SCAN'
          })
        )

        assert.equal(
          scanResponse.result.availability.passProductCode,
          'UNIVERSAL'
        )
        assert.equal(
          scanResponse.result.availability.customer.insuranceLimit,
          null
        )
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
        const insuranceTypeField =
          createRequest.receive[0].orderExtendFields.find(
            field => field.key === 'bjlx'
          )

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
    name: 'contact selection preserves batch source across navigation',
    run() {
      const params = contactSelection.createParams('sender', 'select', 'BATCH')
      const contact = {
        id: 'CONTACT_BATCH_001',
        name: '张三',
        telephone: '13800138000',
        province: '上海市',
        city: '上海市',
        county: '青浦区',
        address: '明珠路100号',
        type: 0,
        defaultAddress: '0',
        regionType: ''
      }

      assert.equal(contactSelection.parseParams(params).source, 'BATCH')
      contactSelection.select('sender', contact, 'BATCH')

      const selection = contactSelection.consumeSelection('sender', 'BATCH')

      assert.equal(selection.source, 'BATCH')
      assert.equal(selection.contact.id, 'CONTACT_BATCH_001')
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
              createBatchConsigneeDraft(createBatchContact(), '文件')
            ]
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
      assert.deepEqual(request.contactIdList, [
        'SENDER_001',
        'CONSIGNEE_001',
        'CONSIGNEE_002'
      ])
      assert.equal(request.acceptDept, 'DEPT_001')
      assert.equal(request.receive.length, 2)
      assert.equal(request.receive[0].goodsName, '文件')
      assert.equal(request.receive[1].goodsName, '配件')
      assert.equal(request.receive[1].transportMode, 'PACKAGE')
      assert.equal(request.receive[1].insuredAmount, 500)
      assert.equal(request.receive[1].waybillNumber, 'DPK0002')
      assert.equal(
        request.receive[0].beginAcceptTime,
        request.receive[1].beginAcceptTime
      )
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
      expressApi.createOrder = async (request) => {
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
        assert.deepEqual(requestedReceivers, [
          '科技园科苑路200号',
          '体育西路1号'
        ])
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
    name: 'print center exposes the read-only list while native print actions stay pending',
    run() {
      const view = printService.getCenterView({
        printId: 'PRINT_001',
        source: 'HOME_SCAN'
      })
      const actions = Object.fromEntries(
        view.actions.map(item => [item.key, item])
      )

      assert.equal(actions.orderList.status, 'ready')
      assert.equal(actions.printOrders.status, 'ready')
      assert.equal(actions.printOrders.route, '/pages/print/list/index')
      assert.equal(actions.printerDevice.status, 'pending')
      assert.equal(actions.printConfig.status, 'pending')
      assert.equal(actions.cloudPrintCode.status, 'pending')
      assert.equal(view.nativeReady, false)
      assert.equal(view.cloudCode.printId, 'PRINT_001')
      assert.equal(view.cloudCode.source, 'HOME_SCAN')
      assert.equal(view.cloudCode.statusText, '暂不可用')
      assert.ok(
        PRINT_API_ENDPOINTS.includes(
          '/gwapi/onlineService/eco/online/print/order/secure/queryNewOrderPrintList'
        )
      )
    }
  },
  {
    name: 'print date ranges use inclusive local calendar boundaries',
    run() {
      const options = createPrintDateRangeOptions(
        new Date(2026, 6, 16, 12, 30, 15)
      )
      const byKey = Object.fromEntries(
        options.map(option => [option.key, option])
      )

      assert.equal(DEFAULT_PRINT_DATE_RANGE_KEY, 'threeDays')
      assert.equal(byKey.today.startTime, '2026-07-16 00:00:00')
      assert.equal(byKey.today.endTime, '2026-07-16 23:59:59')
      assert.equal(byKey.threeDays.startTime, '2026-07-14 00:00:00')
      assert.equal(byKey.oneWeek.startTime, '2026-07-10 00:00:00')
      assert.equal(byKey.oneMonth.startTime, '2026-06-17 00:00:00')
      assert.equal(byKey.threeMonths.startTime, '2026-04-18 00:00:00')
    }
  },
  {
    name: 'print list mapper masks recipients and normalizes pagination',
    run() {
      const result = normalizePrintListResult(
        {
          pageNum: 2,
          pageSize: 10,
          totalPage: 0,
          totalRows: 11,
          list: [
            {
              id: ' PRINT_1 ',
              waybillNumber: ' DPK123456789 ',
              receiveName: ' 张三 ',
              receivePhone: '13800138000',
              receiveProvince: '上海市',
              receiveCity: '上海市',
              receiveArea: '青浦区',
              receiveAddress: '明珠路100号',
              deviceType: '2'
            }
          ]
        },
        { pageIndex: 1, pageSize: 10 }
      )

      assert.equal(result.pageIndex, 2)
      assert.equal(result.totalPage, 2)
      assert.equal(result.totalRows, 11)
      assert.equal(result.list[0].key, 'PRINT_1')
      assert.equal(result.list[0].waybillNumber, 'DPK123456789')
      assert.equal(result.list[0].recipientPhone, '138****8000')
      assert.equal(result.list[0].address, '上海市青浦区明珠路100号')
      assert.equal(
        createPrintRecipientAddress('', '', '', ''),
        '地址信息暂缺'
      )
      assert.equal(
        normalizePrintListResult(
          {
            pageNum: 2,
            pageSize: 10,
            totalRows: 11,
            list: [{}]
          },
          { pageIndex: 1, pageSize: 10 }
        ).list[0].key,
        'print-order-11'
      )
      assert.equal(
        normalizePrintListResult(
          {
            totalRows: null,
            list: [{}]
          },
          { pageIndex: 1, pageSize: 10 }
        ).totalRows,
        1
      )
    }
  },
  {
    name: 'print pagination deduplicates items and count failures stay isolated',
    run() {
      const first = {
        key: 'PRINT_1',
        id: 'PRINT_1',
        waybillNumber: 'DPK1',
        recipientName: '张三',
        recipientPhone: '138****8000',
        address: '上海市青浦区'
      }
      const second = {
        ...first,
        key: 'PRINT_2',
        id: 'PRINT_2',
        waybillNumber: 'DPK2'
      }
      const merged = mergePrintOrderPages([first], [first, second])
      const counts = resolvePrintListCounts(
        {
          status: true,
          result: { totalRows: 8, list: [] }
        },
        {
          status: false,
          message: 'printed count failed',
          result: null
        }
      )

      assert.deepEqual(
        merged.map(item => item.key),
        ['PRINT_1', 'PRINT_2']
      )
      assert.deepEqual(counts, {
        waiting: 8,
        printed: null,
        failedSearchTypes: ['2']
      })
    }
  },
  {
    name: 'print service sends the exact list contract and maps the response',
    async run() {
      const originalQueryList = printApi.queryList
      let request = null
      let loading = null

      try {
        printApi.queryList = async (nextRequest, nextLoading) => {
          request = nextRequest
          loading = nextLoading

          return {
            status: true,
            result: {
              pageNum: 2,
              pageSize: 10,
              totalPage: 3,
              totalRows: 21,
              list: [
                {
                  id: 'PRINT_21',
                  waybillNumber: 'DPK21',
                  receiveName: '李四',
                  receivePhone: '13900139000',
                  receiveProvince: '浙江省',
                  receiveCity: '杭州市',
                  receiveArea: '西湖区',
                  receiveAddress: '文一路1号'
                }
              ]
            }
          }
        }

        const response = await printService.queryList({
          searchType: '1',
          rangeKey: 'threeDays',
          pageIndex: 2,
          pageSize: 10,
          now: new Date(2026, 6, 16, 12, 30, 15)
        })

        assert.deepEqual(request, {
          pageNum: 2,
          pageSize: 10,
          searchType: '1',
          startTime: '2026-07-14 00:00:00',
          endTime: '2026-07-16 23:59:59'
        })
        assert.equal(loading, false)
        assert.equal(response.status, true)
        assert.equal(response.result.pageIndex, 2)
        assert.equal(response.result.list[0].recipientPhone, '139****9000')
      } finally {
        printApi.queryList = originalQueryList
      }
    }
  },
  {
    name: 'print tab counts degrade independently when one query rejects',
    async run() {
      const originalQueryList = printApi.queryList
      const requests = []

      try {
        printApi.queryList = async request => {
          requests.push(request)

          if (request.searchType === '2') {
            throw new Error('printed count unavailable')
          }

          return {
            status: true,
            result: {
              pageNum: 1,
              pageSize: 1,
              totalPage: 7,
              totalRows: 7,
              list: []
            }
          }
        }

        const response = await printService.queryCounts({
          rangeKey: 'oneWeek',
          now: new Date(2026, 6, 16, 12, 30, 15)
        })

        assert.equal(response.status, true)
        assert.equal(response.message, '部分打印数量暂未更新')
        assert.deepEqual(response.result, {
          waiting: 7,
          printed: null,
          failedSearchTypes: ['2']
        })
        assert.deepEqual(
          requests.map(item => [item.searchType, item.pageNum, item.pageSize]),
          [
            ['1', 1, 1],
            ['2', 1, 1]
          ]
        )
        assert.equal(requests[0].startTime, requests[1].startTime)
        assert.equal(requests[0].endTime, requests[1].endTime)
      } finally {
        printApi.queryList = originalQueryList
      }
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
      assert.deepEqual(
        normalizePaymentCommand({ payStatus: 'PAY_SUCCESS' }),
        {
          kind: 'settled',
          transactionId: undefined
        }
      )
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
    name: 'invoice center view model isolates tab, auth and card selection rules',
    run() {
      assert.equal(parseInvoiceCenterTab('history'), 'history')
      assert.equal(parseInvoiceCenterTab('unknown'), 'orders')
      assert.equal(
        getInvoiceOrderAuthValidationMessage(
          { authType: '02' },
          '123'
        ),
        '请输入付款人手机号后四位'
      )
      assert.equal(
        getInvoiceOrderAuthValidationMessage(
          { authType: '04' },
          '123456'
        ),
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
      assert.equal(invoiceService.queryPreview, invoiceApplyService.queryPreview)
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
          transportMode: 'PACKAGE',
          deliveryType: 'PICKSELF',
          endAcceptTime: '2026-07-15 12:00:00',
          channelType: 'ServicePoint',
          tableType: 'EXPRESS',
          orderExtendFields: [{ key: 'nightAccept', value: 'Y' }],
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
      assert.equal(draft.collection.enabled, false)
      assert.equal(draft.schedule.deliveryMode, 'PICKSELF')
      assert.equal(draft.schedule.pickup.type, 'NIGHT')
      assert.equal(draft.schedule.pickup.endTime, '2026-07-15 12:00:00')
      assert.equal(draft.schedule.orderChannel, 'ServicePoint')
      assert.equal(draft.schedule.productCode, 'PACKAGE')
      assert.equal(draft.remark, '小心轻放')
    }
  },
  {
    name: 'order edit delivery modes follow logistics thresholds and big package locks',
    run() {
      const lightExpress = createOrderEditDraft(
        createOrderDetail({
          transportMode: 'PACKAGE',
          deliveryType: 'PICKNOTUPSTAIRS',
          totalWeight: 60,
          totalVolume: 0.36
        })
      )
      const heavyExpress = { ...lightExpress, totalWeight: 60.01 }
      const largeExpress = { ...lightExpress, totalVolume: 0.361 }
      const logistics = createOrderEditDraft(
        createOrderDetail({
          waybillNumber: 'DPL123456789',
          transportMode: 'PACKAGE',
          totalWeight: 1,
          totalVolume: 0
        })
      )
      const bigPackage = createOrderEditDraft(
        createOrderDetail({
          waybillNumber: 'DPL123456789',
          transportMode: 'NZBRH',
          totalWeight: 200,
          totalVolume: 2
        })
      )

      assert.deepEqual(
        ORDER_EDIT_DELIVERY_OPTIONS.map(item => item.value),
        ['PICKNOTUPSTAIRS', 'PICKUPSTAIRS', 'PICKSELF']
      )
      assert.equal(isOrderEditDeliveryModeVisible(lightExpress), false)
      assert.equal(isOrderEditDeliveryModeVisible(heavyExpress), true)
      assert.equal(isOrderEditDeliveryModeVisible(largeExpress), true)
      assert.equal(isOrderEditDeliveryModeVisible(logistics), true)
      assert.equal(isOrderEditDeliveryModeVisible(bigPackage), false)
    }
  },
  {
    name: 'order edit pickup requests bind night capability to address and source zero',
    run() {
      const draft = createOrderEditDraft(
        createOrderDetail({
          contactProvince: '上海市',
          contactCity: '上海市',
          contactArea: '青浦区',
          contactTown: '徐泾镇',
          contactAddress: '明珠路100号',
          goodsNumber: 2,
          totalWeight: 12,
          totalVolume: 0.2,
          transportMode: 'PACKAGE'
        })
      )
      const checkedAt = 1000
      const capability = createOrderEditPickupNightCapability(
        draft,
        {
          nightPickUpEnable: true,
          startTime: '18:00',
          endTime: '23:00'
        },
        checkedAt
      )
      const withCapability = {
        ...draft,
        schedule: {
          ...draft.schedule,
          pickup: { ...draft.schedule.pickup, nightCapability: capability }
        }
      }

      assert.deepEqual(buildOrderEditPickupNightRequest(draft), {
        province: '上海市',
        city: '上海市',
        county: '青浦区',
        address: '明珠路100号'
      })
      assert.deepEqual(buildOrderEditPickupTimeRequest(draft, capability), {
        sysCode: 'APP',
        provinceName: '上海市',
        cityName: '上海市',
        countyName: '青浦区',
        townName: '徐泾镇',
        address: '明珠路100号',
        weight: 12,
        volume: 0.2,
        goodsNumber: 2,
        priceTimeProductCode: 'PACKAGE',
        source: 0,
        nightOpening: 'Y',
        nightStartTime: '18:00',
        nightEndTime: '23:00'
      })
      assert.equal(
        getFreshOrderEditPickupNightCapability(
          withCapability,
          checkedAt + ORDER_EDIT_NIGHT_PICKUP_CACHE_MS - 1
        )?.enabled,
        true
      )
      assert.equal(
        getFreshOrderEditPickupNightCapability(
          withCapability,
          checkedAt + ORDER_EDIT_NIGHT_PICKUP_CACHE_MS
        ),
        undefined
      )
      assert.notEqual(
        createOrderEditScheduleQueryKey(draft),
        createOrderEditScheduleQueryKey({ ...draft, totalWeight: 13 })
      )
    }
  },
  {
    name: 'order edit pickup options merge normal night and disabled windows',
    run() {
      const normalized = normalizeOrderEditPickupTimeResponse({
        opening: true,
        openingList: [
          {
            date: '2026-07-15',
            dateList: [
              { time: '09:00', text: '一小时上门', type: 'NORMAL' },
              { time: '10:00', text: '10:00-12:00', type: 'NORMAL' }
            ]
          }
        ],
        nightOpeningList: [
          {
            date: '2026-07-15',
            dateList: [
              { time: '19:00', text: '一小时上门', type: 'NIGHT' },
              { time: '21:00', text: '21:00-22:00', type: 'NIGHT' }
            ]
          }
        ],
        blankOpeningList: [
          {
            date: '2026-07-15',
            dateList: [
              { time: '14:00', text: '14:00-16:00', type: 'DISABLE' }
            ]
          }
        ]
      })
      const options = createOrderEditPickupDateOptions(normalized)
      const items = normalized.openingList[0].dateList

      assert.equal(options.length, 1)
      assert.equal(
        items.some(item => item.type === 'NORMAL' && item.text.includes('小时')),
        false
      )
      assert.equal(items.some(item => item.type === 'NIGHT'), true)
      assert.equal(
        options[0].timeOptions.find(item => item.time === '14:00').disabled,
        true
      )
    }
  },
  {
    name: 'order edit night selection requires fresh capability and fee acknowledgement',
    run() {
      const now = new Date('2026-07-14T08:00:00.000Z')
      const draft = createOrderEditDraft(
        createOrderDetail({
          contactProvince: '上海市',
          contactCity: '上海市',
          contactArea: '青浦区',
          contactAddress: '明珠路100号',
          totalWeight: 1,
          totalVolume: 0
        })
      )
      const capability = createOrderEditPickupNightCapability(
        draft,
        {
          nightPickUpEnable: true,
          startTime: '18:00',
          endTime: '23:00'
        },
        now.getTime()
      )
      const ready = {
        ...draft,
        schedule: {
          ...draft.schedule,
          pickup: { ...draft.schedule.pickup, nightCapability: capability }
        }
      }
      const existingNight = {
        ...ready,
        schedule: {
          ...ready.schedule,
          pickup: {
            ...ready.schedule.pickup,
            time: '2026-07-15 20:00',
            type: 'NIGHT',
            nightNoticeAccepted: true
          }
        }
      }
      const hydratedNight = applyOrderEditPickupTimeResponse(existingNight, {
        opening: true,
        openingList: [
          {
            date: '2026-07-15',
            dateList: [
              { time: '20:00', text: '20:00-21:00', type: 'NIGHT' }
            ]
          }
        ],
        nightCapability: capability
      })
      const selected = selectOrderEditPickupTime(ready, {
        date: '2026-07-15',
        time: '20:00',
        text: '20:00-21:00',
        type: 'NIGHT'
      })

      assert.equal(selected.schedule.pickup.time, '2026-07-15 20:00')
      assert.equal(selected.schedule.pickup.nightNoticeAccepted, false)
      assert.equal(hydratedNight.schedule.pickup.timeSlot, '20:00-21:00')
      assert.equal(hydratedNight.schedule.pickup.nightNoticeAccepted, true)
      assert.ok(
        validateOrderEditSchedule(selected, { now }).includes(
          '请先确认夜间揽收费用提示'
        )
      )

      const accepted = acceptOrderEditNightPickupNotice(selected)
      assert.deepEqual(validateOrderEditSchedule(accepted, { now }), [])

      const stale = { ...accepted, totalWeight: 2 }
      assert.ok(
        validateOrderEditSchedule(stale, { now }).includes(
          '订单信息已变化，请重新获取并选择上门时间'
        )
      )

      const invalidated = applyOrderEditPickupTimeResponse(stale, {
        opening: true,
        openingList: [
          {
            date: '2026-07-16',
            dateList: [
              { time: '10:00', text: '10:00-12:00', type: 'NORMAL' }
            ]
          }
        ],
        nightCapability: capability
      })

      assert.equal(invalidated.schedule.pickup.time, '')
      assert.equal(invalidated.schedule.pickup.type, 'NORMAL')
    }
  },
  {
    name: 'order edit schedule diff maps pickup delivery and ServicePoint fields',
    run() {
      const origin = createOrderEditDraft(
        createOrderDetail({
          beginAcceptTime: '2026-07-15 10:00',
          channelType: 'ServicePoint',
          deliveryType: 'PICKNOTUPSTAIRS',
          transportMode: 'PACKAGE',
          totalWeight: 80,
          totalVolume: 0.5
        })
      )
      const changed = {
        ...origin,
        schedule: {
          ...origin.schedule,
          deliveryMode: 'PICKSELF',
          pickup: {
            ...origin.schedule.pickup,
            time: '2026-07-15 20:00',
            timeSlot: '20:00-21:00',
            type: 'NIGHT',
            pickPeriodTime: 30
          }
        }
      }
      const diff = createOrderEditScheduleRequestDiff(changed, origin)

      assert.deepEqual(diff.changedFields, [
        '期望上门时间',
        '送货方式'
      ])
      assert.deepEqual(diff.request, {
        beginAcceptTime: '2026-07-15 20:00',
        channelType: 'VISITING_SERVICE',
        pickPeriodTime: 30,
        orderExtendFields: [
          { key: 'nightAccept', value: 'Y' },
          { key: 'nightAcceptStatus', value: -1 }
        ],
        deliveryMode: 'PICKSELF'
      })
      assert.deepEqual(createOrderEditScheduleRequestDiff(origin, origin), {
        changedFields: [],
        request: {}
      })

      const nightOrigin = createOrderEditDraft(
        createOrderDetail({
          orderExtendFields: [{ key: 'nightAccept', value: 'Y' }]
        })
      )
      const normalDiff = createOrderEditScheduleRequestDiff(
        {
          ...nightOrigin,
          schedule: {
            ...nightOrigin.schedule,
            pickup: { ...nightOrigin.schedule.pickup, type: 'NORMAL' }
          }
        },
        nightOrigin
      )

      assert.deepEqual(normalDiff.request.orderExtendFields, [
        { key: 'nightAccept', value: 'N' },
        { key: 'nightAcceptStatus', value: '' }
      ])

      const bigPackage = createOrderEditDraft(
        createOrderDetail({
          waybillNumber: 'DPL123456789',
          transportMode: 'ZBTH',
          deliveryType: 'PICKNOTUPSTAIRS',
          totalWeight: 200
        })
      )
      const hiddenDiff = createOrderEditScheduleRequestDiff(
        {
          ...bigPackage,
          schedule: { ...bigPackage.schedule, deliveryMode: 'PICKSELF' }
        },
        bigPackage
      )

      assert.equal(hiddenDiff.request.deliveryMode, undefined)
    }
  },
  {
    name: 'order edit merges insurance and night pickup extension fields',
    run() {
      const origin = createOrderEditDraft(
        createOrderDetail({
          insuredAmount: 1000,
          transportMode: 'PACKAGE',
          beginAcceptTime: '2026-07-15 10:00'
        })
      )
      const preview = buildOrderModifyRequest(
        {
          ...origin,
          insurance: updateOrderEditInsuranceAmount(origin.insurance, 2000),
          schedule: {
            ...origin.schedule,
            pickup: {
              ...origin.schedule.pickup,
              time: '2026-07-15 20:00',
              type: 'NIGHT',
              pickPeriodTime: 20
            }
          }
        },
        origin
      )

      assert.deepEqual(preview.changedFields, [
        '保价金额',
        '期望上门时间'
      ])
      assert.deepEqual(preview.request.orderExtendFields, [
        { key: 'insuranceSource', value: '' },
        { key: 'nightAccept', value: 'Y' },
        { key: 'nightAcceptStatus', value: -1 }
      ])
      assert.equal(preview.request.insuredAmount, 2000)
      assert.equal(preview.request.beginAcceptTime, '2026-07-15 20:00')
      assert.equal(preview.request.pickPeriodTime, 20)
    }
  },
  {
    name: 'order edit pickup service composes capability before source zero slots',
    async run() {
      const originalNight = orderEditScheduleApi.queryPickupNight
      const originalTimes = orderEditScheduleApi.queryPickupTimes
      let nightRequest = null
      let timeRequest = null
      const draft = createOrderEditDraft(
        createOrderDetail({
          contactProvince: '上海市',
          contactCity: '上海市',
          contactArea: '青浦区',
          contactAddress: '明珠路100号',
          goodsNumber: 2,
          totalWeight: 12,
          totalVolume: 0.2,
          transportMode: 'PACKAGE'
        })
      )

      try {
        orderEditScheduleApi.queryPickupNight = async request => {
          nightRequest = request
          return {
            status: true,
            result: {
              nightPickUpEnable: true,
              startTime: '18:00',
              endTime: '23:00'
            }
          }
        }
        orderEditScheduleApi.queryPickupTimes = async request => {
          timeRequest = request
          return {
            status: true,
            result: {
              pickPeriodTime: 30,
              openingList: [
                {
                  date: '2026-07-15',
                  dateList: [
                    { time: '10:00', text: '10:00-12:00', type: 'NORMAL' }
                  ]
                }
              ],
              nightOpeningList: [
                {
                  date: '2026-07-15',
                  dateList: [
                    { time: '20:00', text: '20:00-21:00', type: 'NIGHT' }
                  ]
                }
              ]
            }
          }
        }

        const response = await queryOrderEditPickupTimes(draft)

        assert.equal(response.status, true)
        assert.deepEqual(nightRequest, {
          province: '上海市',
          city: '上海市',
          county: '青浦区',
          address: '明珠路100号'
        })
        assert.equal(timeRequest.source, 0)
        assert.equal(timeRequest.nightOpening, 'Y')
        assert.equal(timeRequest.nightStartTime, '18:00')
        assert.equal(response.result.openingList[0].dateList.length, 2)
      } finally {
        orderEditScheduleApi.queryPickupNight = originalNight
        orderEditScheduleApi.queryPickupTimes = originalTimes
      }
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
    name: 'order edit packaging maps count limits and reference fee',
    run() {
      const draft = createOrderEditDraft(
        createOrderDetail({
          orderExtendFields: [
            { key: 'packingService', value: '3' },
            { key: 'packingService', value: '4' }
          ]
        })
      )

      assert.deepEqual(draft.packaging, { count: 4 })
      assert.equal(normalizeOrderEditPackagingCountInput('00a12'), '12')
      assert.deepEqual(
        updateOrderEditPackagingCount(draft.packaging, 1000),
        { count: ORDER_EDIT_PACKAGING_MAX_COUNT }
      )
      assert.equal(
        getOrderEditPackagingFee(draft.packaging),
        4 * ORDER_EDIT_PACKAGING_UNIT_FEE
      )
      assert.deepEqual(validateOrderEditPackaging({ count: 1.5 }), [
        '打包服务件数须为 0 到 999 的整数'
      ])
    }
  },
  {
    name: 'order edit packaging emits string diffs for enable and clear',
    run() {
      const origin = createOrderEditDraft(
        createOrderDetail({
          orderExtendFields: [{ key: 'packingService', value: '2' }]
        })
      )
      const changedPreview = buildOrderModifyRequest(
        {
          ...origin,
          packaging: updateOrderEditPackagingCount(origin.packaging, 5)
        },
        origin
      )
      const clearedPreview = buildOrderModifyRequest(
        {
          ...origin,
          packaging: updateOrderEditPackagingCount(origin.packaging, 0)
        },
        origin
      )
      const combinedPreview = buildOrderModifyRequest(
        {
          ...origin,
          packaging: updateOrderEditPackagingCount(origin.packaging, 5),
          insurance: updateOrderEditInsuranceAmount(origin.insurance, 2000)
        },
        origin
      )

      assert.deepEqual(changedPreview.changedFields, ['打包服务'])
      assert.deepEqual(changedPreview.request, {
        orderNumber: 'ORDER_001',
        orderExtendFields: [{ key: 'packingService', value: '5' }]
      })
      assert.deepEqual(clearedPreview.request, {
        orderNumber: 'ORDER_001',
        orderExtendFields: [{ key: 'packingService', value: '0' }]
      })
      assert.deepEqual(combinedPreview.request, {
        orderNumber: 'ORDER_001',
        insuredAmount: 2000,
        orderExtendFields: [
          { key: 'packingService', value: '5' },
          { key: 'insuranceSource', value: '' }
        ]
      })
    }
  },
  {
    name: 'order edit insurance maps product policy and special coverage locks',
    run() {
      const basic = createOrderEditDraft(
        createOrderDetail({
          transportMode: 'PACKAGE',
          insuredAmount: '1200',
          orderExtendFields: [
            { key: 'insuranceSource', value: 'USER' }
          ]
        })
      )

      assert.deepEqual(basic.insurance, {
        amount: 1200,
        defaultPending: false,
        editable: true,
        freeCoverage: false,
        lockedType: '',
        maxAmount: 1000000,
        productCode: 'PACKAGE',
        required: false,
        source: 'USER'
      })

      const required = createOrderEditDraft(
        createOrderDetail({
          transportMode: 'DJBK',
          insuredAmount: 0
        })
      )
      assert.equal(required.insurance.required, true)
      assert.equal(required.insurance.maxAmount, 9990000)
      assert.ok(
        validateOrderEditInsurance(required.insurance).includes(
          '当前产品必须填写保价金额'
        )
      )

      const free = createOrderEditDraft(
        createOrderDetail({
          transportMode: 'NFLF',
          insuredAmount: 0
        })
      )
      assert.equal(free.insurance.amount, 2000)
      assert.equal(free.insurance.defaultPending, true)
      assert.equal(free.insurance.source, 'DEFAULT')

      const secondFree = createOrderEditDraft(
        createOrderDetail({
          transportMode: 'NLRF',
          insuredAmount: 0
        })
      )
      assert.equal(secondFree.insurance.defaultPending, true)

      const locked = createOrderEditInsuranceDraft(
        createOrderDetail({
          transportMode: 'PACKAGE',
          insuredAmount: 3000,
          orderExtendFields: [{ key: 'bjlx', value: '0' }]
        })
      )
      assert.equal(locked.lockedType, 'QEB')
      assert.equal(locked.editable, false)
      assert.deepEqual(
        updateOrderEditInsuranceAmount(locked, '5000'),
        locked
      )

      const worryFree = createOrderEditInsuranceDraft(
        createOrderDetail({
          orderExtendFields: [{ key: 'bjlx', value: '1' }]
        })
      )
      const unknown = createOrderEditInsuranceDraft(
        createOrderDetail({
          orderExtendFields: [{ key: 'bjlx', value: 'UNKNOWN' }]
        })
      )
      assert.equal(worryFree.lockedType, 'SXB')
      assert.equal(unknown.lockedType, 'SPECIAL')
    }
  },
  {
    name: 'order edit insurance emits grouped amount and source diffs',
    run() {
      const origin = createOrderEditDraft(
        createOrderDetail({
          transportMode: 'PACKAGE',
          insuredAmount: 1000
        })
      )
      const changedInsurance = updateOrderEditInsuranceAmount(
        origin.insurance,
        '2500.129'
      )
      const changedDraft = {
        ...origin,
        insurance: changedInsurance
      }
      const changedPreview = buildOrderModifyRequest(
        changedDraft,
        origin
      )

      assert.equal(changedInsurance.amount, 2500.13)
      assert.equal(isOrderEditInsuranceChanged(changedInsurance, origin.insurance), true)
      assert.deepEqual(changedPreview.changedFields, ['保价金额'])
      assert.deepEqual(changedPreview.request, {
        orderNumber: 'ORDER_001',
        insuredAmount: 2500.13,
        orderExtendFields: [{ key: 'insuranceSource', value: '' }]
      })

      const clearedPreview = buildOrderModifyRequest(
        {
          ...origin,
          insurance: updateOrderEditInsuranceAmount(origin.insurance, '')
        },
        origin
      )
      assert.deepEqual(clearedPreview.request, {
        orderNumber: 'ORDER_001',
        insuredAmount: 0,
        orderExtendFields: [{ key: 'insuranceSource', value: '' }]
      })

      const invalid = {
        ...origin.insurance,
        amount: 1000001
      }
      assert.ok(
        validateOrderEditInsurance(invalid).includes(
          '保价金额最高为 1000000 元'
        )
      )

      const freeOrigin = createOrderEditDraft(
        createOrderDetail({
          transportMode: 'NFLF',
          insuredAmount: 0
        })
      )
      const freePreview = buildOrderModifyRequest(freeOrigin, freeOrigin)

      assert.deepEqual(freePreview.changedFields, ['免费基础保障'])
      assert.deepEqual(freePreview.request, {
        orderNumber: 'ORDER_001',
        insuredAmount: 2000,
        orderExtendFields: [
          { key: 'insuranceSource', value: 'DEFAULT' }
        ]
      })
    }
  },
  {
    name: 'order edit collection maps detail and emits all-or-nothing diffs',
    run() {
      const activeOrigin = createOrderEditDraft(
        createOrderDetail({
          receiverLoanType: '即日退',
          receiverMoneyAmount: '88.5',
          reciveLoanAccount: ' 622200001234 ',
          reciveLoanAccountName: ' 张三 '
        })
      )

      assert.deepEqual(activeOrigin.collection, {
        enabled: true,
        type: 'INTRADAY',
        amount: 88.5,
        account: '622200001234',
        accountName: '张三',
        limit: 1000000,
        agreementAccepted: true
      })

      const clearedPreview = buildOrderModifyRequest(
        {
          ...activeOrigin,
          collection: clearOrderEditCollection(activeOrigin.collection)
        },
        activeOrigin
      )

      assert.deepEqual(clearedPreview.request, {
        orderNumber: 'ORDER_001',
        reciveLoanType: 'NORMAL',
        reviceMoneyAmount: 0,
        accountName: '',
        reciveLoanAccount: ''
      })
      assert.deepEqual(clearedPreview.changedFields, ['代收货款'])

      const disabledOrigin = createOrderEditDraft(createOrderDetail())
      const enabledPreview = buildOrderModifyRequest(
        {
          ...disabledOrigin,
          collection: updateOrderEditCollection(disabledOrigin.collection, {
            enabled: true,
            type: 'NORMAL',
            amount: 120.25,
            account: '622200009999',
            accountName: '李四',
            agreementAccepted: true
          })
        },
        disabledOrigin
      )

      assert.deepEqual(enabledPreview.request, {
        orderNumber: 'ORDER_001',
        reciveLoanType: 'NORMAL',
        reviceMoneyAmount: 120.25,
        accountName: '李四',
        reciveLoanAccount: '622200009999'
      })

      const localOnlyPreview = buildOrderModifyRequest(
        {
          ...activeOrigin,
          collection: {
            ...activeOrigin.collection,
            limit: 500000
          }
        },
        activeOrigin
      )

      assert.equal(localOnlyPreview.changed, false)
    }
  },
  {
    name: 'order edit access requires sender state flag and product permission',
    run() {
      const editable = createOrderDetail({
        orderClassification: '0',
        modifyFlag: true,
        isSender: 'Y',
        productCodeFlag: true
      })

      assert.equal(getOrderEditUnavailableMessage(editable), '')
      assert.equal(
        getOrderEditUnavailableMessage({ ...editable, modifyFlag: false }),
        '当前订单不允许修改'
      )
      assert.equal(
        getOrderEditUnavailableMessage({ ...editable, isSender: 'N' }),
        '您没有权限修改此订单'
      )
      assert.equal(
        getOrderEditUnavailableMessage({
          ...editable,
          orderClassification: '1'
        }),
        '当前订单状态不支持修改'
      )
      assert.equal(
        getOrderEditUnavailableMessage({
          ...editable,
          productCodeFlag: false
        }),
        '当前产品不允许修改'
      )
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
      const invalidCollection = validateOrderEditDraft({
        ...draft,
        collection: {
          ...draft.collection,
          enabled: true,
          amount: 1000001,
          agreementAccepted: false
        }
      })

      assert.ok(
        invalidCollection.messages.includes(
          '代收货款金额不能超过 1000000 元'
        )
      )
      assert.ok(
        invalidCollection.messages.includes('请选择代收货款收款账户')
      )
      assert.ok(
        invalidCollection.messages.includes('请阅读并同意代收货款服务协议')
      )
      const invalidPackaging = validateOrderEditDraft({
        ...draft,
        packaging: { count: 1000 }
      })

      assert.ok(
        invalidPackaging.messages.includes(
          '打包服务件数须为 0 到 999 的整数'
        )
      )
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
    name: 'order detail view model normalizes public and secure route state',
    run() {
      const publicView = createOrderDetailViewModel(
        getOrderDetailRouteParams({ waybillNo: 'DPK123456789' }),
        null
      )

      assert.equal(publicView.publicTrackMode, true)
      assert.equal(publicView.detailRole, 'sender')
      assert.equal(publicView.cancelable, false)
      assert.equal(publicView.deletable, false)

      const secureView = createOrderDetailViewModel(
        getOrderDetailRouteParams({
          orderNo: 'ORDER_001',
          role: 'receive',
          view: 'secure'
        }),
        createOrderDetail({
          isSender: 'N',
          isReceiver: 'Y',
          orderClassification: '0',
          waybillNumber: null
        })
      )

      assert.equal(secureView.publicTrackMode, false)
      assert.equal(secureView.detailRole, 'receive')
      assert.equal(secureView.cancelable, true)
      assert.equal(secureView.deletable, false)
      assert.equal(secureView.resendActionText, '一键回寄')
    }
  },
  {
    name: 'order PDC feedback stays signed source gated and maps exact payload',
    run() {
      const signedOrder = {
        orderClassification: '2',
        waybillNumber: 'DP123456789'
      }
      const first = createOrderPdcFeedbackContext(
        signedOrder,
        'APP_PDC_KDYZJO_ENTRY'
      )
      const second = createOrderPdcFeedbackContext(
        signedOrder,
        'APP_PDC_KDYZJT_ENTRY'
      )

      assert.deepEqual(first, {
        waybillNumber: 'DP123456789',
        source: 'APP_PDC_KDYZJO_ENTRY',
        sendFrequency: 'ONE'
      })
      assert.deepEqual(second, {
        waybillNumber: 'DP123456789',
        source: 'APP_PDC_KDYZJT_ENTRY',
        sendFrequency: 'TWO'
      })
      assert.deepEqual(createOrderPdcFeedbackRequest(second, 'N'), {
        waybillNo: 'DP123456789',
        sendFrequency: 'TWO',
        feedbackResult: 'N'
      })
      assert.deepEqual(ORDER_PDC_FEEDBACK_API_ENDPOINTS, {
        query: '/gwapi/commentService/eco/comment/secure/queryFeedback',
        submit: '/gwapi/commentService/eco/comment/secure/submitFeedback'
      })
      assert.equal(
        createOrderPdcFeedbackContext(
          { ...signedOrder, orderClassification: '1' },
          'PDC_KDYZJO'
        ),
        null
      )
      assert.equal(
        createOrderPdcFeedbackContext(signedOrder, 'ORDER_DETAIL'),
        null
      )
      assert.equal(
        createOrderPdcFeedbackContext(
          signedOrder,
          'PDC_KDYZJO',
          true
        ),
        null
      )
    }
  },
  {
    name: 'order scene survey selects exact role state source and seven day plans',
    run() {
      const now = new Date(2026, 6, 15, 12, 0, 0).getTime()
      const createContext = (
        detail,
        role = 'sender',
        source = 'ORDER_DETAIL',
        mobile = '13800138000',
        publicTrackMode = false
      ) =>
        createOrderSceneSurveyContext({
          detail,
          role,
          source,
          publicTrackMode,
          mobile,
          childChannel: 'APP',
          now
        })
      const getCodes = context => context?.plan.map(item => item.code) ?? []
      const sameDay = createContext(
        createOrderDetail({
          orderTime: new Date(2026, 6, 15, 8, 0, 0).getTime()
        })
      )
      const earlierSender = createContext(
        createOrderDetail({ orderTime: now - 24 * 60 * 60 * 1000 })
      )
      const transitReceiver = createContext(
        createOrderDetail({ orderTime: now - 24 * 60 * 60 * 1000 }),
        'receive'
      )
      const signedSender = createContext(
        createOrderDetail({
          orderClassification: '2',
          signTime: now - 60 * 60 * 1000
        })
      )
      const signedReceiver = createContext(
        createOrderDetail({
          orderClassification: '2',
          signTime: now - 60 * 60 * 1000
        }),
        'receive'
      )
      const pdc = createContext(
        createOrderDetail({
          orderClassification: '2',
          signTime: now - 60 * 60 * 1000
        }),
        'sender',
        'PDC_KDYZJO'
      )
      const npsWithoutCachedMobile = createContext(
        createOrderDetail({
          orderClassification: '2',
          signTime: now - 60 * 60 * 1000
        }),
        'receive',
        'ECS_MESSAGE',
        ''
      )

      assert.deepEqual(getCodes(sameDay), ['S0206', 'T0101', 'T0401'])
      assert.deepEqual(getCodes(earlierSender), ['S0601', 'T0101', 'T0401'])
      assert.deepEqual(getCodes(transitReceiver), ['S0601'])
      assert.deepEqual(getCodes(signedSender), ['N0101', 'S0908'])
      assert.deepEqual(getCodes(signedReceiver), [
        'N0101',
        'T0201',
        'S0907_1',
        'T0501'
      ])
      assert.deepEqual(getCodes(pdc), ['N0101'])
      assert.deepEqual(getCodes(npsWithoutCachedMobile), ['N0101'])
      assert.equal(
        createContext(
          createOrderDetail({
            orderClassification: '2',
            signTime: now - ORDER_SCENE_SURVEY_WINDOW_MS
          })
        ),
        null
      )
      assert.equal(
        createContext(
          createOrderDetail({
            orderClassification: '2',
            signTime: now + 1000
          })
        ),
        null
      )
      assert.equal(
        createContext(createOrderDetail(), 'sender', 'ORDER_DETAIL', '', true),
        null
      )
      assert.equal(parseOrderSceneSurveyTime(Math.floor(now / 1000)), now)
      assert.equal(parseOrderSceneSurveyTime('2026年07月15日 12:00'), now)
      assert.equal(parseOrderSceneSurveyTime('not-a-time'), null)
    }
  },
  {
    name: 'order scene survey normalizes first question and exact endpoints',
    run() {
      const scoreItem = normalizeOrderSceneSurveyQuestion(
        { code: 'S0206', kind: 'SCORE' },
        {
          questionId: 'QUESTION_SCORE',
          title: '您对本次揽收服务满意吗？',
          labelList: [
            {
              id: 'LABEL_NEGATIVE',
              labelName: '上门不及时',
              starMin: '1',
              starMax: '3'
            },
            {
              id: 'LABEL_POSITIVE',
              labelName: '服务专业',
              starMin: '4',
              starMax: '5'
            },
            {
              id: '',
              labelName: '无效标签',
              starMin: '1',
              starMax: '5'
            }
          ]
        }
      )

      assert.equal(scoreItem.kind, 'SCORE')
      assert.equal(scoreItem.labels.length, 2)
      assert.deepEqual(
        getOrderSceneScoreLabels(scoreItem, 5).map(item => item.id),
        ['LABEL_POSITIVE']
      )
      assert.equal(
        normalizeOrderSceneSurveyQuestion(
          { code: 'S0206', kind: 'SCORE' },
          {
            questionId: 'QUESTION_INVALID_RANGE',
            title: '无效评分范围不应生成问卷',
            labelList: [
              {
                id: 'LABEL_OUT_OF_RANGE',
                labelName: '越界标签',
                starMin: '0',
                starMax: '6'
              },
              {
                id: 'LABEL_FRACTIONAL',
                labelName: '小数标签',
                starMin: '1.5',
                starMax: '5'
              }
            ]
          }
        ),
        null
      )
      assert.equal(
        normalizeOrderSceneSurveyQuestion(
          { code: 'T0101', kind: 'LABEL' },
          {
            questionId: 'QUESTION_LABEL',
            title: '请选择原因',
            labelList: []
          }
        ),
        null
      )
      assert.deepEqual(ORDER_SCENE_SURVEY_API_ENDPOINTS, {
        query: '/gwapi/commentService/eco/comment/queryComment',
        definition: '/gwapi/commentService/eco/comment/queryCommentScene',
        submit: '/gwapi/commentService/eco/comment/insertComment'
      })
    }
  },
  {
    name: 'order scene score and label submissions keep distinct payload rules',
    run() {
      const context = {
        key: 'DPK123456789|sender',
        waybillNumber: 'DPK123456789',
        mobile: '13800138000',
        childChannel: 'APP',
        role: 'sender',
        source: 'ORDER_DETAIL',
        plan: []
      }
      const scoreItem = {
        key: 'SCORE:S0206',
        id: 'QUESTION_SCORE',
        code: 'S0206',
        title: '您对本次服务满意吗？',
        kind: 'SCORE',
        labels: [
          { id: 'NEGATIVE', name: '上门不及时', min: 1, max: 3 },
          { id: 'POSITIVE', name: '服务专业', min: 4, max: 5 }
        ]
      }
      const labelItem = {
        key: 'LABEL:T0101',
        id: 'QUESTION_LABEL',
        code: 'T0101',
        title: '请选择主要原因',
        kind: 'LABEL',
        labels: [
          { id: 'LABEL_01', name: '服务专业', min: 4, max: 5 }
        ]
      }
      const draft = {
        score: 5,
        selectedLabelIds: ['NEGATIVE', 'POSITIVE'],
        content: ' 服务很好 '
      }
      const scoreRequest = createOrderSceneScoreSubmitRequest(
        context,
        scoreItem,
        draft
      )
      const labelRequest = createOrderSceneLabelSubmitRequest(
        context,
        labelItem,
        'LABEL_01'
      )

      assert.equal(validateOrderSceneScoreDraft(scoreItem, draft), '')
      assert.equal(
        validateOrderSceneScoreDraft(scoreItem, {
          score: 5,
          selectedLabelIds: [],
          content: ''
        }),
        '请选择评价标签或填写补充说明'
      )
      assert.deepEqual(scoreRequest.question, [
        {
          star: '5',
          questionId: 'QUESTION_SCORE',
          labelIds: ['POSITIVE']
        }
      ])
      assert.equal(scoreRequest.content, '服务很好')
      assert.equal(scoreRequest.channel, 'OWS')
      assert.equal(scoreRequest.childChannel, 'APP')
      assert.deepEqual(scoreRequest.additionalData, [
        { field: 'waybillNumber', data: 'DPK123456789' }
      ])
      assert.deepEqual(labelRequest.question, [
        {
          star: '5',
          questionId: 'QUESTION_LABEL',
          labelIds: ['LABEL_01']
        }
      ])
      assert.equal(labelRequest.content, '')
    }
  },
  {
    name: 'order NPS keeps zero to ten cascade catalog and submit contract',
    run() {
      const context = {
        key: 'DPK123456789|receive',
        waybillNumber: 'DPK123456789',
        mobile: '',
        childChannel: 'APP',
        role: 'receive',
        source: 'ORDER_DETAIL',
        plan: []
      }
      let draft = updateOrderNpsScore(createOrderNpsDraft(), 9)

      draft = updateOrderNpsCategory(draft, '价格')
      draft = toggleOrderNpsReason(draft, '不会乱收费')
      draft = toggleOrderNpsReason(draft, '运费明细清晰')
      draft = toggleOrderNpsReason(draft, '实际运费与预估一致')
      const maxedDraft = toggleOrderNpsReason(draft, '不会私自保价')
      const labelContent = createOrderNpsLabelContent(draft)
      const request = createOrderNpsSubmitRequest(context, {
        ...draft,
        content: ' 继续保持 '
      })

      assert.equal(maxedDraft, draft)
      assert.equal(labelContent.type, 'CASCADE')
      assert.equal(labelContent.option[0].level, 1)
      assert.equal(labelContent.option[0].name, '价格')
      assert.deepEqual(
        labelContent.option.slice(1).map(item => item.level),
        [2, 2, 2]
      )
      assert.deepEqual(request, {
        sysCode: 'OWS',
        sceneCode: 'N0101',
        childSysCode: 'APP',
        commentCode: 'DPK123456789',
        commentType: 'WaybillNumber',
        content: '继续保持',
        labelName: '9',
        labelContent,
        personType: 'consignee'
      })
      assert.deepEqual(
        updateOrderNpsScore(draft, 8),
        {
          score: 8,
          category: '',
          reasons: [],
          content: ''
        }
      )
      assert.deepEqual(ORDER_NPS_SURVEY_API_ENDPOINTS, {
        query:
          '/gwapi/commentService/eco/comment/queryCustomerQuestionnaire',
        submit:
          '/gwapi/commentService/eco/comment/addCustomerQuestionnaire'
      })
    }
  },
  {
    name: 'order scene survey keeps valid items when one scene query fails',
    async run() {
      const originalNpsQuery = orderNpsSurveyApi.query
      const originalSceneQuery = orderSceneSurveyApi.query
      const originalDefinitionQuery = orderSceneSurveyApi.queryDefinition
      const now = new Date(2026, 6, 15, 12, 0, 0).getTime()
      const context = createOrderSceneSurveyContext({
        detail: createOrderDetail({
          orderClassification: '2',
          signTime: now - 60 * 60 * 1000
        }),
        role: 'receive',
        source: 'ORDER_DETAIL',
        publicTrackMode: false,
        mobile: '13900139000',
        childChannel: 'APP',
        now
      })

      try {
        orderNpsSurveyApi.query = async () => ({
          status: true,
          result: false
        })
        orderSceneSurveyApi.query = async request => {
          if (request.sceneCode === 'S0907_1') {
            throw new Error('mock scene failure')
          }

          if (request.sceneCode === 'T0501') {
            return { status: true, result: null }
          }

          return { status: false, result: null }
        }
        orderSceneSurveyApi.queryDefinition = async sceneCode => ({
          status: true,
          result: {
            sceneCode,
            questionList: [
              {
                questionId: `QUESTION_${sceneCode}`,
                title: `问题 ${sceneCode}`,
                labelList: [
                  {
                    id: `LABEL_${sceneCode}`,
                    labelName: '服务专业',
                    starMin: '1',
                    starMax: '5'
                  }
                ]
              }
            ]
          }
        })

        const result = await orderSceneSurveyOrchestrator.query(context)

        assert.deepEqual(
          result.items.map(item => item.code),
          ['N0101', 'T0201']
        )
        assert.equal(result.failedCount, 1)
      } finally {
        orderNpsSurveyApi.query = originalNpsQuery
        orderSceneSurveyApi.query = originalSceneQuery
        orderSceneSurveyApi.queryDefinition = originalDefinitionQuery
      }
    }
  },
  {
    name: 'order evaluation maps sender receiver and signed contexts exactly',
    run() {
      const collection = createOrderEvaluationContext(
        createOrderDetail({ orderClassification: '1' }),
        'sender'
      )
      const signed = createOrderEvaluationContext(
        createOrderDetail({ orderClassification: '2' }),
        'sender'
      )
      const delivery = createOrderEvaluationContext(
        createOrderDetail({
          isSender: 'N',
          isReceiver: 'Y',
          orderClassification: '6'
        }),
        'receive'
      )

      assert.deepEqual(collection, {
        orderNumber: 'ORDER_001',
        waybillNumber: 'DPK123456789',
        role: 'sender',
        recordType: 'COLLECTION',
        query: {
          waybillNo: 'DPK123456789',
          cateGory: 1,
          sign: 'N'
        }
      })
      assert.equal(signed.recordType, 'DELIVERY')
      assert.deepEqual(signed.query, {
        waybillNo: 'DPK123456789',
        cateGory: 0,
        sign: 'Y'
      })
      assert.equal(delivery.recordType, 'DELIVERY')
      assert.deepEqual(delivery.query, {
        waybillNo: 'DPK123456789',
        cateGory: 0,
        sign: 'N'
      })
      assert.equal(
        createOrderEvaluationContext(
          createOrderDetail({ orderClassification: '0' }),
          'sender'
        ),
        null
      )
      assert.equal(
        createOrderEvaluationContext(
          createOrderDetail({ waybillNumber: '' }),
          'sender'
        ),
        null
      )
      assert.deepEqual(ORDER_EVALUATION_API_ENDPOINTS, {
        queryDetail:
          '/gwapi/onlineService/eco/online/evaluate/secure/queryEvaluateDetail',
        submit:
          '/gwapi/onlineService/eco/online/courier/evaluation/secure/commit'
      })
    }
  },
  {
    name: 'order evaluation normalizes pending and committed courier identity',
    run() {
      const context = createOrderEvaluationContext(createOrderDetail(), 'sender')
      const pending = createOrderEvaluationView(
        context,
        {
          avgStarLevel: '4.6',
          evaluateType: 'Courier',
          evaluateDetail: null,
          evaluateCourierMessage: {
            courierName: '王师傅',
            courierNo: 'EMP001',
            courierPhone: '13800138000',
            isCourier: 'Y',
            licensePlate: null,
            courierType: 'JD'
          }
        },
        'NOT_EVALUATED'
      )
      const committed = createOrderEvaluationView(
        context,
        {
          avgStarLevel: '7',
          evaluateType: 'Courier',
          evaluateCourierMessage: null,
          evaluateDetail: {
            courierNo: 'EMP002',
            courierName: '李师傅',
            courierPhone: null,
            courierRole: 'Driver',
            starLevel: '4',
            evaluateCode: '服务态度好',
            degree: 4,
            evaluateNpsCode: null,
            licensePlate: null
          }
        },
        'SUCCESS'
      )

      assert.equal(pending.committed, false)
      assert.equal(pending.courierCode, 'EMP001')
      assert.equal(pending.courierCompany, 'JD')
      assert.equal(pending.averageLevel, 4.6)
      assert.equal(pending.level, 5)
      assert.equal(committed.committed, true)
      assert.equal(committed.courierRole, 'Driver')
      assert.equal(committed.averageLevel, 5)
      assert.equal(committed.level, 4)
      assert.equal(committed.label, '服务态度好')
      assert.equal(
        createOrderEvaluationView(
          context,
          {
            avgStarLevel: null,
            evaluateType: 'Courier',
            evaluateDetail: null,
            evaluateCourierMessage: {
              courierName: '王师傅',
              courierNo: '',
              courierPhone: null,
              isCourier: 'Y',
              licensePlate: null
            }
          },
          'NOT_EVALUATED'
        ),
        null
      )
    }
  },
  {
    name: 'order evaluation catalog keeps exact role and sentiment labels',
    run() {
      const collectionNegative = getOrderEvaluationLabels('COLLECTION', 1)
      const collectionPositive = getOrderEvaluationLabels('COLLECTION', 5)
      const deliveryNegative = getOrderEvaluationLabels('DELIVERY', 4)
      const deliveryPositive = getOrderEvaluationLabels('DELIVERY', 5)

      assert.equal(collectionNegative.length, 12)
      assert.equal(collectionPositive.length, 11)
      assert.equal(deliveryNegative.length, 10)
      assert.equal(deliveryPositive.length, 9)
      assert.ok(collectionNegative.includes('小哥让线下转账'))
      assert.ok(collectionPositive.includes('主动上门取件'))
      assert.ok(deliveryNegative.includes('私自签收/放代收点'))
      assert.ok(deliveryPositive.includes('派送前主动联系'))
      assert.deepEqual(
        getOrderEvaluationLabels('COLLECTION', 2),
        collectionNegative
      )
      assert.deepEqual(
        getOrderEvaluationLabels('DELIVERY', 1),
        deliveryNegative
      )
    }
  },
  {
    name: 'order evaluation draft resets labels and maps validated submit payload',
    run() {
      const context = createOrderEvaluationContext(createOrderDetail(), 'sender')
      const view = createOrderEvaluationView(
        context,
        {
          avgStarLevel: '4.8',
          evaluateType: 'Courier',
          evaluateDetail: null,
          evaluateCourierMessage: {
            courierName: '王师傅',
            courierNo: 'EMP001',
            courierPhone: null,
            isCourier: 'Y',
            licensePlate: null
          }
        },
        'NOT_EVALUATED'
      )
      let draft = createOrderEvaluationDraft()

      assert.equal(validateOrderEvaluationDraft(draft).valid, false)
      draft = toggleOrderEvaluationLabel(draft, 'COLLECTION', '服务态度好')
      assert.deepEqual(draft.selectedLabels, ['服务态度好'])
      assert.equal(validateOrderEvaluationDraft(draft).valid, true)
      draft = updateOrderEvaluationSuggestion(draft, '太短')
      assert.equal(validateOrderEvaluationDraft(draft).valid, false)
      draft = updateOrderEvaluationSuggestion(
        draft,
        '服务很专业，取件也非常及时' + '好'.repeat(300)
      )
      assert.equal(
        draft.suggestion.length,
        ORDER_EVALUATION_SUGGESTION_MAX_LENGTH
      )
      assert.equal(validateOrderEvaluationDraft(draft).valid, true)
      assert.deepEqual(createOrderEvaluationSubmitRequest(view, draft), {
        waybillNo: 'DPK123456789',
        recordType: 'COLLECTION',
        courierCode: 'EMP001',
        courierName: '王师傅',
        starLevel: 5,
        suggestion: draft.suggestion,
        evaluationLabels: ['服务态度好']
      })
      assert.equal(applyOrderEvaluationSubmission(view, draft).committed, true)
      assert.deepEqual(
        updateOrderEvaluationLevel(draft, 4).selectedLabels,
        []
      )
    }
  },
  {
    name: 'order evaluation detail action uses App route with controlled web fallback',
    run() {
      const order = createOrderDetail()
      const route = createOrderEvaluationRoute(order, 'sender')
      const action = createOrderDetailActions(order, {
        role: 'sender'
      }).find(item => item.kind === 'evaluate')
      const senderFallback = new URL(
        createOrderEvaluationFallbackWebUri(
          order,
          'sender',
          '13800138000'
        ),
        'https://owstest.deppon.com'
      )
      const receiverFallback = new URL(
        createOrderEvaluationFallbackWebUri(
          { ...order, isSender: 'N', isReceiver: 'Y' },
          'receive',
          '13900139000'
        ),
        'https://owstest.deppon.com'
      )

      assert.ok(route.startsWith('/pages/order/evaluation/index?'))
      assert.equal(action.target, 'route')
      assert.equal(action.badgeText, 'App')
      assert.equal(action.route, route)
      assert.equal(senderFallback.pathname, '/depponmobile/survey/land')
      assert.equal(senderFallback.searchParams.get('scene'), 'S0505')
      assert.equal(senderFallback.searchParams.get('channel'), 'APP')
      assert.equal(receiverFallback.searchParams.get('scene'), 'S0907')
      assert.deepEqual(
        JSON.parse(senderFallback.searchParams.get('rowData')),
        [
          { field: 'orderNumber', data: 'ORDER_001' },
          { field: 'waybillNumber', data: 'DPK123456789' }
        ]
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
  },
  {
    name: 'warehouse screening normalizes type zero through four and fingerprints every input',
    run() {
      const draft = {
        ...createValidExpressDraft(),
        service: {
          ...createValidExpressDraft().service,
          transportMode: 'PACKAGE'
        }
      }
      const inputKey = createExpressWarehouseInputKey(draft)
      const input = JSON.parse(inputKey)

      assert.deepEqual(
        [0, 1, 2, 3, 4, 5, -1, 1.5, '3', 'invalid'].map(value =>
          normalizeExpressWarehouseScreeningType(value)
        ),
        [0, 1, 2, 3, 4, 0, 0, 0, 3, 0]
      )
      assert.equal(input.goodsName, '文件')
      assert.equal(input.totalWeight, 1)
      assert.equal(input.transportMode, 'PACKAGE')
      assert.equal(input.deliveryMode, 'PICKNOTUPSTAIRS')

      for (let type = 0; type <= 4; type += 1) {
        const screening = createExpressWarehouseScreening(draft, {
          type,
          reason: ` 类型 ${type} `,
          depotType: '2'
        })

        assert.equal(screening.type, type)
        assert.equal(screening.inputKey, inputKey)
        assert.equal(screening.reason, `类型 ${type}`)
        assert.equal(screening.depotType, '2')
      }

      assert.notEqual(
        createExpressWarehouseInputKey({
          ...draft,
          consignee: {
            ...draft.consignee,
            address: '科技园科苑路201号'
          }
        }),
        inputKey
      )
      assert.notEqual(
        createExpressWarehouseInputKey({
          ...draft,
          goods: { ...draft.goods, name: '家具' }
        }),
        inputKey
      )
      assert.notEqual(
        createExpressWarehouseInputKey({
          ...draft,
          selectedProduct: {
            ...expressProduct,
            omsProductCode: 'DEAP'
          }
        }),
        inputKey
      )
    }
  },
  {
    name: 'warehouse precise screening auto selects once at 100kg and keeps explicit rejection',
    run() {
      let draft = {
        ...createValidExpressDraft(),
        goods: {
          ...createValidExpressDraft().goods,
          name: '家具',
          weight: 100
        },
        service: {
          ...createValidExpressDraft().service,
          transportMode: 'PACKAGE'
        }
      }
      const response = {
        type: 3,
        reason: '当前地址为精准进仓地址',
        depotType: '4'
      }
      const firstScreening = createExpressWarehouseScreening(draft, response)

      assert.equal(firstScreening.autoSelected, true)
      assert.equal(firstScreening.acknowledged, true)

      draft = applyExpressWarehouseScreening(draft, firstScreening)
      assert.equal(draft.warehouse.enabled, true)
      assert.equal(draft.warehouse.warehouseType, '4')

      draft = rejectExpressWarehouse(draft)
      assert.equal(draft.warehouse.enabled, false)
      assert.equal(draft.warehouse.screening.autoSelected, true)
      assert.equal(draft.warehouse.screening.acknowledged, true)

      const warningDraft = {
        ...createValidExpressDraft(),
        service: {
          ...createValidExpressDraft().service,
          transportMode: 'PACKAGE'
        }
      }
      const warningScreening = createExpressWarehouseScreening(warningDraft, {
        type: 2,
        reason: '请确认进仓提示',
        depotType: '2'
      })

      assert.equal(warningScreening.acknowledged, false)
      const screenedWarningDraft = applyExpressWarehouseScreening(
        warningDraft,
        warningScreening
      )
      assert.ok(
        validateExpressWarehouse(screenedWarningDraft, { requireScreening: true })
          .includes('请确认进仓提示')
      )
      const acknowledgedDraft = acknowledgeExpressWarehouseScreening(
        screenedWarningDraft
      )
      assert.deepEqual(
        validateExpressWarehouse(acknowledgedDraft, { requireScreening: true }),
        []
      )
      assert.equal(
        createExpressWarehouseScreening(acknowledgedDraft, {
          type: 2,
          reason: '进仓风险说明已更新',
          depotType: '2'
        }).acknowledged,
        false
      )

      const clearedWarning = clearExpressWarehouse(screenedWarningDraft)
      assert.equal(clearedWarning.warehouse.screening.acknowledged, false)

      const riskScreening = createExpressWarehouseScreening(warningDraft, {
        type: 4,
        reason: '高风险进仓提示'
      })
      const screenedRiskDraft = applyExpressWarehouseScreening(
        warningDraft,
        riskScreening
      )

      assert.equal(riskScreening.acknowledged, false)
      assert.ok(
        validateExpressWarehouse(screenedRiskDraft, { requireScreening: true })
          .includes('高风险进仓提示')
      )

      const repeatedScreening = createExpressWarehouseScreening(
        draft,
        response
      )

      assert.equal(repeatedScreening.autoSelected, false)
      assert.equal(repeatedScreening.acknowledged, true)

      draft = applyExpressWarehouseScreening(draft, repeatedScreening)
      assert.equal(draft.warehouse.enabled, false)
      assert.equal(draft.warehouse.screening.autoSelected, true)
      assert.equal(draft.warehouse.screening.acknowledged, true)

      const belowThreshold = {
        ...createValidExpressDraft(),
        goods: {
          ...createValidExpressDraft().goods,
          name: '家具',
          weight: 99
        },
        service: {
          ...createValidExpressDraft().service,
          transportMode: 'PACKAGE'
        }
      }

      assert.equal(
        createExpressWarehouseScreening(belowThreshold, response)
          .autoSelected,
        false
      )
    }
  },
  {
    name: 'warehouse screening proof expires after address goods or product changes',
    run() {
      const base = {
        ...createValidExpressDraft(),
        service: {
          ...createValidExpressDraft().service,
          transportMode: 'PACKAGE'
        }
      }
      const screened = applyExpressWarehouseScreening(
        base,
        createExpressWarehouseScreening(base, {
          type: 1,
          reason: '当前地址可能产生进仓费用',
          depotType: '2'
        })
      )

      assert.equal(isExpressWarehouseScreeningCurrent(screened), true)

      const addressChanged = setExpressContact(screened, 'consignee', {
        ...screened.consignee,
        address: '科技园科苑路201号'
      })
      const goodsChanged = updateExpressGoods(screened, { name: '家具' })
      const productChanged = selectExpressProduct(screened, {
        ...expressProduct,
        productName: '大件快递',
        omsProductCode: 'DEAP'
      })

      for (const changed of [
        addressChanged,
        goodsChanged,
        productChanged
      ]) {
        assert.equal(changed.warehouse.screening.inputKey, '')
        assert.equal(isExpressWarehouseScreeningCurrent(changed), false)
      }
    }
  },
  {
    name: 'warehouse service is mutually exclusive with delivery preference and self pickup',
    run() {
      const base = {
        ...createValidExpressDraft(),
        service: {
          ...createValidExpressDraft().service,
          transportMode: 'PACKAGE'
        }
      }
      const invalid = {
        ...base,
        service: { ...base.service, deliveryMode: 'PICKSELF' },
        deliveryPreference: {
          ...base.deliveryPreference,
          type: 'NOTIFY_SENDER'
        },
        warehouse: { ...base.warehouse, enabled: true }
      }
      const messages = validateExpressWarehouse(invalid)

      assert.ok(messages.includes('自提订单不能选择送货进仓'))
      assert.ok(messages.includes('送货进仓和派送偏好不能同时选择'))

      const withPreference = {
        ...base,
        deliveryPreference: {
          ...base.deliveryPreference,
          type: 'NOTIFY_SENDER'
        }
      }
      const enabled = updateExpressWarehouse(withPreference, {
        enabled: true
      })
      const selfPickup = updateExpressService(enabled, {
        deliveryMode: 'PICKSELF'
      })

      assert.equal(enabled.deliveryPreference.type, '')
      assert.equal(selfPickup.warehouse.enabled, false)
      assert.equal(selfPickup.warehouse.warehouseNo, '')
      assert.deepEqual(selfPickup.warehouse.fileList, [])
    }
  },
  {
    name: 'warehouse quote emits five fields only while service is enabled',
    run() {
      const base = createValidExpressDraft()
      const warehouse = {
        ...base.warehouse,
        enabled: true,
        warehouseType: '3',
        deliverWarehouseWay: 'AGXSF',
        warehouseProcess: '排队,卸货',
        warehouseCode: 'WH-CODE-001'
      }
      const draft = {
        ...base,
        service: { ...base.service, transportMode: 'PACKAGE' },
        warehouse
      }
      const request = buildFreightRequest(draft)

      assert.deepEqual(
        {
          isWarehousingService: request.isWarehousingService,
          deliverWarehouseWay: request.deliverWarehouseWay,
          warehouseCode: request.warehouseCode,
          warehouseProcess: request.warehouseProcess,
          jcType: request.jcType
        },
        {
          isWarehousingService: 'Y',
          deliverWarehouseWay: 'AGXSF',
          warehouseCode: 'WH-CODE-001',
          warehouseProcess: '排队,卸货',
          jcType: '3'
        }
      )

      const disabled = buildFreightRequest({
        ...draft,
        warehouse: { ...warehouse, enabled: false }
      })

      assert.equal(disabled.isWarehousingService, 'N')
      assert.equal(disabled.deliverWarehouseWay, undefined)
      assert.equal(disabled.warehouseCode, undefined)
      assert.equal(disabled.warehouseProcess, undefined)
      assert.equal(disabled.jcType, undefined)
    }
  },
  {
    name: 'express quote request key changes with warehouse and address inputs',
    run() {
      const base = createValidExpressDraft()
      const baseKey = createExpressQuoteRequestKey(base)
      const clonedKey = createExpressQuoteRequestKey({
        ...base,
        consignee: { ...base.consignee },
        warehouse: { ...base.warehouse }
      })
      const warehouseKey = createExpressQuoteRequestKey({
        ...base,
        warehouse: {
          ...base.warehouse,
          enabled: true,
          warehouseType: '3',
          warehouseCode: 'WH-CODE-002'
        }
      })
      const addressKey = createExpressQuoteRequestKey({
        ...base,
        consignee: {
          ...base.consignee,
          address: `${base.consignee.address}附楼`
        }
      })

      assert.equal(clonedKey, baseKey)
      assert.notEqual(warehouseKey, baseKey)
      assert.notEqual(addressKey, baseKey)
      assert.notEqual(addressKey, warehouseKey)
    }
  },
  {
    name: 'warehouse order maps appointment and extend fields without disabled leakage',
    run() {
      const base = createValidExpressDraft()
      const warehouse = {
        ...base.warehouse,
        enabled: true,
        warehouseNo: 'ENTRY-001',
        warehouseTime: '2026-07-20 10:00:00',
        fileList: [
          { previewPath: 'https://owstest.deppon.com/files/warehouse-a.jpg' },
          { previewPath: 'https://owstest.deppon.com/files/warehouse-b.jpg' }
        ],
        warehouseType: '3',
        deliverWarehouseWay: 'AGXSF',
        warehouseProcess: '排队,卸货',
        warehouseCode: 'WH-CODE-001',
        warehouseRemark: '工作日进仓'
      }
      const draft = {
        ...base,
        service: { ...base.service, transportMode: 'PACKAGE' },
        warehouse
      }
      const request = buildCreateOrderRequest(draft)
      const warehouseExtendFields = request.receive[0].orderExtendFields.filter(
        field =>
          field.key === 'deliverWarehouseWay' ||
          field.key === 'warehouseProcess' ||
          field.key === 'warehouseRemark'
      )

      assert.deepEqual(request.deliveryToWarehouse, {
        isWarehousingService: 'Y',
        appointmentEntryCode: 'ENTRY-001',
        appointmentTime: '2026-07-20 10:00:00',
        appointmentUrl: [
          'https://owstest.deppon.com/files/warehouse-a.jpg',
          'https://owstest.deppon.com/files/warehouse-b.jpg'
        ],
        warehouseType: '3',
        deliverWarehouseWay: 'AGXSF',
        warehouseProcess: '排队,卸货'
      })
      assert.deepEqual(warehouseExtendFields, [
        { key: 'deliverWarehouseWay', value: 'AGXSF' },
        { key: 'warehouseProcess', value: '排队,卸货' },
        { key: 'warehouseRemark', value: '工作日进仓' }
      ])

      const disabledRequest = buildCreateOrderRequest({
        ...draft,
        warehouse: { ...warehouse, enabled: false }
      })
      const disabledExtendFields =
        disabledRequest.receive[0].orderExtendFields ?? []

      assert.equal(disabledRequest.deliveryToWarehouse, undefined)
      assert.equal(
        disabledExtendFields.some(field => field.key.includes('warehouse')),
        false
      )
      assert.equal(
        disabledExtendFields.some(field => field.key === 'deliverWarehouseWay'),
        false
      )
    }
  },
  {
    name: 'warehouse draft and template bridges deep clone files and screening proof',
    run() {
      const base = createValidExpressDraft()
      const screening = createExpressWarehouseScreening(base, {
        type: 1,
        reason: '可能产生进仓费用',
        depotType: '2'
      })
      const source = {
        ...base,
        warehouse: {
          ...base.warehouse,
          enabled: true,
          warehouseNo: 'ENTRY-001',
          fileList: [
            {
              previewPath:
                'https://owstest.deppon.com/files/warehouse-original.jpg'
            }
          ],
          screening
        }
      }

      expressDraftBridge.carryFromCoupon(source)
      source.warehouse.fileList[0].previewPath =
        'https://owstest.deppon.com/files/warehouse-mutated.jpg'
      source.warehouse.screening.reason = '已修改'

      const carried = expressDraftBridge.consume().draft

      assert.equal(
        carried.warehouse.fileList[0].previewPath,
        'https://owstest.deppon.com/files/warehouse-original.jpg'
      )
      assert.equal(carried.warehouse.screening.reason, '可能产生进仓费用')
      assert.notEqual(carried.warehouse.fileList, source.warehouse.fileList)
      assert.notEqual(
        carried.warehouse.fileList[0],
        source.warehouse.fileList[0]
      )
      assert.notEqual(carried.warehouse.screening, source.warehouse.screening)

      templateDraftBridge.stage(carried)
      carried.warehouse.fileList[0].previewPath =
        'https://owstest.deppon.com/files/template-mutated.jpg'
      carried.warehouse.screening.reason = '模板已修改'

      const staged = templateDraftBridge.consume()

      assert.equal(
        staged.warehouse.fileList[0].previewPath,
        'https://owstest.deppon.com/files/warehouse-original.jpg'
      )
      assert.equal(staged.warehouse.screening.reason, '可能产生进仓费用')
      assert.notEqual(staged.warehouse.fileList, carried.warehouse.fileList)
      assert.notEqual(staged.warehouse.screening, carried.warehouse.screening)
      assert.equal(templateDraftBridge.consume(), null)
    }
  },
  {
    name: 'warehouse web messages enforce source event flags fields and one time consumption',
    run() {
      const payload = {
        fileList: [
          { previewPath: 'https://owstest.deppon.com/files/warehouse.jpg' }
        ],
        warehouseNo: ' ENTRY-001 ',
        warehouseTime: ' 2026-07-20 10:00:00 ',
        warehouseType: '3',
        deliverWarehouseWay: 'AGXSF',
        warehouseProcess: ' 排队,卸货 ',
        warehouseCode: ' WH-CODE-001 ',
        warehouseRemark: ' 工作日进仓 '
      }
      const createMessage = (event, args) =>
        JSON.stringify({ event, args })
      const enabledMessage = createMessage('SEND_WAREHOUSE', {
        isWarehousingService: 'Y',
        payload: JSON.stringify(payload)
      })
      const enabledContext = {
        inputKey: 'warehouse-input-enabled',
        stagingId: 'WAREHOUSE-STAGE-ENABLED'
      }

      assert.equal(
        getAppWebWarehouseStagingId(
          'https://owstest.deppon.com/depponmobile/mow/send/warehouse/index?warehouseId=WAREHOUSE-STAGE-ENABLED'
        ),
        enabledContext.stagingId
      )

      appWebMessageBridge.clear()

      assert.equal(
        appWebMessageBridge.stage(
          'CUSTOMER_CENTER',
          createMessage('SEND_WAREHOUSE', {
            isWarehousingService: 'Y',
            payload: JSON.stringify(payload)
          })
        ).handled,
        false
      )
      assert.deepEqual(
        appWebMessageBridge.stage('EXPRESS_WAREHOUSE', enabledMessage),
        { handled: false, closeAfterReceive: false }
      )
      assert.equal(appWebMessageBridge.consumeWarehouse(), null)
      assert.equal(
        appWebMessageBridge.expectWarehouse(enabledContext),
        true
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          enabledMessage,
          { stagingId: 'WAREHOUSE-STAGE-OTHER' }
        ).handled,
        false
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage('WAREHOUSE_CHANGE', {
            isWarehousingService: 'Y',
            payload: JSON.stringify(payload)
          }),
          enabledContext
        ).handled,
        false
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage('SEND_WAREHOUSE', {
            isWarehousingService: 'Y',
            payload: JSON.stringify(payload),
            unknown: true
          }),
          enabledContext
        ).handled,
        false
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage('SEND_WAREHOUSE', {
            isWarehousingService: 'Y',
            payload: JSON.stringify({ ...payload, unknown: true })
          }),
          enabledContext
        ).handled,
        false
      )
      assert.deepEqual(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          enabledMessage,
          enabledContext
        ),
        { handled: true, closeAfterReceive: true }
      )
      assert.deepEqual(appWebMessageBridge.consumeWarehouse(), {
        context: enabledContext,
        warehouse: {
          enabled: true,
          fileList: [
            { previewPath: 'https://owstest.deppon.com/files/warehouse.jpg' }
          ],
          warehouseNo: 'ENTRY-001',
          warehouseTime: '2026-07-20 10:00:00',
          warehouseType: '3',
          deliverWarehouseWay: 'AGXSF',
          warehouseProcess: '排队,卸货',
          warehouseCode: 'WH-CODE-001',
          warehouseRemark: '工作日进仓'
        }
      })
      assert.equal(appWebMessageBridge.consumeWarehouse(), null)

      const disabledContext = {
        inputKey: 'warehouse-input-disabled',
        stagingId: 'WAREHOUSE-STAGE-DISABLED'
      }

      assert.equal(
        appWebMessageBridge.expectWarehouse(disabledContext),
        true
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage('SEND_WAREHOUSE', {
            isWarehousingService: 'MAYBE',
            payload: JSON.stringify(payload)
          }),
          disabledContext
        ).handled,
        false
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage('SEND_WAREHOUSE', {
            isWarehousingService: 'N'
          }),
          disabledContext
        ).handled,
        true
      )
      assert.deepEqual(appWebMessageBridge.consumeWarehouse(), {
        context: disabledContext,
        warehouse: {
          enabled: false,
          fileList: [],
          warehouseNo: '',
          warehouseTime: '',
          warehouseType: '',
          deliverWarehouseWay: '',
          warehouseProcess: '',
          warehouseCode: '',
          warehouseRemark: ''
        }
      })
      assert.equal(appWebMessageBridge.consumeWarehouse(), null)
    }
  },
  {
    name: 'warehouse web messages accept nine safe files and reject unsafe or excessive urls',
    run() {
      const createMessage = fileList =>
        JSON.stringify({
          event: 'SEND_WAREHOUSE',
          args: {
            isWarehousingService: 'Y',
            payload: JSON.stringify({
              fileList,
              warehouseNo: '',
              warehouseTime: '',
              warehouseType: '',
              deliverWarehouseWay: '',
              warehouseProcess: '',
              warehouseCode: '',
              warehouseRemark: ''
            })
          }
        })
      const safeFiles = Array.from({ length: 9 }, (_, index) => ({
        previewPath: `https://owstest.deppon.com/files/${index + 1}.jpg`
      }))
      let expectationIndex = 0
      const expectWarehouse = () => {
        expectationIndex += 1
        const context = {
          inputKey: `warehouse-files-input-${expectationIndex}`,
          stagingId: `WAREHOUSE-FILES-STAGE-${expectationIndex}`
        }

        assert.equal(appWebMessageBridge.expectWarehouse(context), true)
        return context
      }

      appWebMessageBridge.clear()
      const safeContext = expectWarehouse()
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage(safeFiles),
          safeContext
        ).handled,
        true
      )
      const safeResult = appWebMessageBridge.consumeWarehouse()

      assert.deepEqual(safeResult.context, safeContext)
      assert.equal(safeResult.warehouse.fileList.length, 9)
      const excessiveContext = expectWarehouse()
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage([
            ...safeFiles,
            { previewPath: 'https://owstest.deppon.com/files/10.jpg' }
          ]),
          excessiveContext
        ).handled,
        false
      )
      const unsafeProtocolContext = expectWarehouse()
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage([{ previewPath: 'http://example.com/unsafe.jpg' }]),
          unsafeProtocolContext
        ).handled,
        false
      )
      const credentialContext = expectWarehouse()
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage([
            {
              previewPath: 'https://user:password@example.com/private.jpg'
            }
          ]),
          credentialContext
        ).handled,
        false
      )
      const unknownFieldContext = expectWarehouse()
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_WAREHOUSE',
          createMessage([
            {
              previewPath: 'https://owstest.deppon.com/files/extra.jpg',
              unknown: true
            }
          ]),
          unknownFieldContext
        ).handled,
        false
      )
      assert.equal(appWebMessageBridge.consumeWarehouse(), null)
      appWebMessageBridge.cancelWarehouse()
    }
  },
  {
    name: 'warehouse screening fails closed for missing or invalid result types',
    async run() {
      const originalFilterOrder = expressApi.filterOrder
      const draft = createValidExpressDraft()

      try {
        for (const result of [null, {}, { type: null }, { type: 5 }, { type: '03' }]) {
          expressApi.filterOrder = async () => ({ status: true, result })

          const response = await queryExpressWarehouseScreening(draft)

          assert.equal(response.status, false)
          assert.equal(response.message, '送货进仓筛单结果无效，请重试')
        }

        expressApi.filterOrder = async () => ({
          status: true,
          result: { type: '0', reason: '未命中进仓规则' }
        })

        const valid = await queryExpressWarehouseScreening(draft)

        assert.equal(valid.status, true)
        assert.equal(valid.result.type, 0)
      } finally {
        expressApi.filterOrder = originalFilterOrder
      }
    }
  },
  {
    name: 'warehouse query and staging reject stale transport mode without selected product',
    async run() {
      const originalCookie = getStorageValue(CACHE_KEYS.cookie)
      const base = createValidExpressDraft()
      const draft = {
        ...base,
        service: { ...base.service, transportMode: 'PACKAGE' },
        selectedProduct: null
      }

      await setStorageValue(
        CACHE_KEYS.cookie,
        'ECO_TOKEN=warehouse-stale-product-token;'
      )

      try {
        const queryResponse = await queryExpressWarehouseScreening(draft)
        const stageResponse = await stageExpressWarehouse(draft)

        assert.equal(queryResponse.status, false)
        assert.equal(queryResponse.message, '请先获取并选择产品价格')
        assert.equal(stageResponse.status, false)
        assert.equal(stageResponse.message, '请先获取并选择产品价格')
      } finally {
        await setStorageValue(CACHE_KEYS.cookie, originalCookie)
      }
    }
  },
  {
    name: 'warehouse staging posts context and builds controlled app uri',
    async run() {
      const originalStageWarehouse = expressApi.stageWarehouse
      const originalCookie = getStorageValue(CACHE_KEYS.cookie)
      let capturedRequest = null
      const base = createValidExpressDraft()
      const draft = {
        ...base,
        service: { ...base.service, transportMode: 'PACKAGE' },
        warehouse: {
          ...base.warehouse,
          enabled: true,
          warehouseNo: 'ENTRY-001',
          warehouseTime: '2026-07-20 10:00:00',
          fileList: [
            {
              previewPath: 'https://owstest.deppon.com/files/warehouse.jpg'
            }
          ],
          warehouseType: '3',
          deliverWarehouseWay: 'APSF',
          warehouseCode: 'WH-CODE-001',
          warehouseRemark: '工作日进仓'
        }
      }

      await setStorageValue(
        CACHE_KEYS.cookie,
        'ECO_TOKEN=warehouse-token+/=; Path=/'
      )
      expressApi.stageWarehouse = async request => {
        capturedRequest = request
        return {
          status: true,
          message: '',
          result: ' STAGE 001 '
        }
      }

      try {
        const response = await stageExpressWarehouse(draft)

        assert.equal(response.status, true)
        assert.equal(response.result.stagingId, 'STAGE 001')
        assert.equal(capturedRequest.code, 'PACKAGE')
        assert.equal(capturedRequest.warehouse.isWarehousingService, 'Y')
        assert.equal(capturedRequest.warehouse.payload.warehouseNo, 'ENTRY-001')
        assert.deepEqual(capturedRequest.warehouse.payload.fileList, [
          { previewPath: 'https://owstest.deppon.com/files/warehouse.jpg' }
        ])
        assert.equal(capturedRequest.params.isWarehousingService, 'Y')
        assert.equal(capturedRequest.params.deliverWarehouseWay, 'APSF')
        assert.equal(capturedRequest.params.warehouseCode, 'WH-CODE-001')
        assert.equal(capturedRequest.params.jcType, '3')

        const uri = new URL(
          response.result.uri,
          'https://owstest.deppon.com'
        )

        assert.equal(
          uri.pathname,
          '/depponmobile/mow/send/warehouse/index'
        )
        assert.equal(uri.searchParams.get('warehouseId'), 'STAGE 001')
        assert.equal(
          uri.searchParams.get('ecoToken'),
          'warehouse-token+/='
        )
        assert.equal(uri.searchParams.get('source'), 'APP')
      } finally {
        expressApi.stageWarehouse = originalStageWarehouse
        await setStorageValue(CACHE_KEYS.cookie, originalCookie)
      }
    }
  }
]

async function runTests() {
  let failed = 0

  for (const test of tests) {
    try {
      await test.run()
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
}

runTests().catch((error) => {
  console.error(error)
  process.exit(1)
})
