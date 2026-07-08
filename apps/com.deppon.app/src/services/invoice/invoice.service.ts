import { invoiceApi } from './invoice.api'
import { normalizeInvoiceOrder } from './order.mapper'

import type {
  InvoiceHistoryListRequest,
  InvoiceHistoryListResponse,
  InvoiceHistoryQueryRequest,
  InvoiceHistoryQueryResponse,
  InvoiceHistoryRaw,
  InvoiceHistoryView,
  InvoiceHistoryWaybillRaw,
  InvoiceHistoryWaybillRequest,
  InvoiceHistoryWaybillView,
  InvoiceApplyDraft,
  InvoiceApplyPreview,
  InvoiceApplySubmitRequest,
  InvoiceApplySubmitResult,
  InvoiceListResult,
  InvoiceOrderListRequest,
  InvoiceOrderListResponse,
  InvoiceOrderView,
  InvoicePreviewRaw,
  InvoicePreviewRequest,
  InvoicePreviewView,
  InvoiceSendEmailRequest,
  InvoiceStatusClass,
  InvoiceTaxpayerDeleteRequest,
  InvoiceTaxpayerForm,
  InvoiceTaxpayerMatch,
  InvoiceTaxpayerMatchRequest,
  InvoiceTaxpayerRaw,
  InvoiceTaxpayerSaveRequest,
  InvoiceTaxpayerType,
  InvoiceTaxpayerView
} from './types'
import type { DepponResponse } from '../../request/deppon'

const DEFAULT_ORDER_RANGE_MONTHS = 3
const DEFAULT_HISTORY_RANGE_MONTHS = 12
const DEFAULT_PAGE_SIZE = 10
const EXPRESS_APPLY_SYSTEM = {
  applyType: '241',
  sourceType: '24',
  SourceSystem: 'XCX'
} as const

function createFailure<TResult>(message: string): DepponResponse<TResult> {
  return {
    status: false,
    message,
    result: null
  }
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatDateTime(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`
}

function getDateRange(months: number) {
  const endDate = new Date()
  const startDate = new Date()

  startDate.setMonth(startDate.getMonth() - months)
  startDate.setDate(1)
  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(23, 59, 59, 0)

  return {
    startDate: formatDateTime(startDate),
    endDate: formatDateTime(endDate)
  }
}

function normalizeText(value?: string | number | null) {
  return String(value ?? '').trim()
}

function toFiniteNumber(value: unknown) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : 0
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}

function getFieldLength(value: string) {
  return value.split('').reduce(
    (total, char) => total + (char.charCodeAt(0) > 255 ? 2 : 1),
    0
  )
}

function normalizeTimestamp(value?: number | null) {
  if (!value) {
    return null
  }

  return value < 10000000000 ? value * 1000 : value
}

function formatTimestamp(value?: number | null) {
  const timestamp = normalizeTimestamp(value)

  if (!timestamp) {
    return '--'
  }

  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  return formatDateTime(date)
}

function getHistoryStatusName(status: number) {
  switch (status) {
    case 0:
      return '待受理'
    case 1:
      return '待审核'
    case 2:
      return '不通过'
    case 3:
      return '待开具'
    case 4:
      return '已开具'
    case 5:
      return '已寄送'
    case 6:
    case 7:
      return '已作废'
    case 14:
      return '开具中'
    case 15:
      return '寄送中'
    case 16:
    case 17:
      return '作废中'
    case 24:
      return '开具失败'
    case 25:
      return '寄送失败'
    case 31:
      return '已撤销'
    default:
      return '待受理'
  }
}

function getHistoryStatusClass(status: number): InvoiceStatusClass {
  if (status === 6 || status === 31) {
    return 'Cancel'
  }

  if (status === 4 || status === 5 || status === 15 || status === 21) {
    return 'Success'
  }

  if (status === 2 || status === 7 || (status >= 23 && status <= 28)) {
    return 'Error'
  }

  return 'Process'
}

function getBillCategoryName(category?: string) {
  switch (category) {
    case '01':
      return '纸质专票'
    case '06':
    case '14':
      return '电子普票'
    case '13':
      return '电子专票'
    default:
      return '增值税专用发票'
  }
}

function normalizeHistory(item: InvoiceHistoryRaw): InvoiceHistoryView {
  const status = Number.parseInt(normalizeText(item.status), 10)
  const normalizedStatus = Number.isFinite(status) ? status : 0
  const title = normalizeText(item.acceptTinName)

  return {
    id: normalizeText(item.applyNo || item.id),
    title: truncateText(title || '发票抬头', 18),
    taxNumber: normalizeText(item.acceptTinCode),
    amount: toFiniteNumber(item.billAmount),
    typeText: getBillCategoryName(item.billCategory),
    statusText: getHistoryStatusName(normalizedStatus),
    statusClass: getHistoryStatusClass(normalizedStatus),
    applyTime: formatTimestamp(item.applyTime),
    email: normalizeText(item.email),
    remark: normalizeText(item.remark),
    previewUrl: normalizeText(item.elecLinkAdress),
    canPreview: Boolean(item.elecLinkAdress)
  }
}

function normalizeHistoryWaybills(
  raw: InvoiceHistoryWaybillRaw
): InvoiceHistoryWaybillView[] {
  return Object.entries(raw)
    .map(([waybillNumber, amount]) => ({
      waybillNumber: normalizeText(waybillNumber),
      amount: toFiniteNumber(amount)
    }))
    .filter((item) => item.waybillNumber && item.amount > 0)
}

function normalizeTaxpayer(item: InvoiceTaxpayerRaw): InvoiceTaxpayerView {
  return {
    id: item.id,
    name: normalizeText(item.acceptTinName),
    taxNumber: normalizeText(item.acceptTinCode),
    typeText: item.customerType === '1' ? '单位' : '个人/事业单位',
    phone: normalizeText(item.phone),
    address: normalizeText(item.address),
    bank: normalizeText(item.openBank),
    bankAccount: normalizeText(item.bankNo),
    isDefault: item.isDefault === '1',
    customerType: item.customerType === '1' ? '1' : '0',
    remark: normalizeText(item.remark)
  }
}

function createTaxpayerPayload(
  form: InvoiceTaxpayerForm
): InvoiceTaxpayerSaveRequest {
  return {
    id: form.id || undefined,
    customerType: form.customerType,
    acceptTinName: form.name.trim(),
    acceptTinCode: form.taxNumber.trim(),
    address: form.address.trim(),
    phone: form.phone.trim(),
    openBank: form.bank.trim(),
    bankNo: form.bankAccount.trim(),
    remark: form.remark.trim(),
    isDefault: form.isDefault ? '1' : '0'
  }
}

function createFormFromTaxpayer(
  taxpayer?: InvoiceTaxpayerView | null
): InvoiceTaxpayerForm {
  return {
    id: taxpayer?.id,
    customerType: taxpayer?.customerType ?? '0',
    name: taxpayer?.name ?? '',
    taxNumber: taxpayer?.taxNumber ?? '',
    phone: taxpayer?.phone ?? '',
    address: taxpayer?.address ?? '',
    bank: taxpayer?.bank ?? '',
    bankAccount: taxpayer?.bankAccount ?? '',
    remark: taxpayer?.remark ?? '',
    isDefault: taxpayer?.isDefault ?? false
  }
}

function validateTaxpayer(form: InvoiceTaxpayerForm) {
  const name = form.name.trim()
  const taxNumber = form.taxNumber.trim()
  const sensitiveWords = ['代开', '专票', '发票', '贷开', '發票', '微信']

  if (!name) {
    return '请输入发票抬头'
  }

  if (name.length < 6 && form.customerType === '1') {
    return '单位抬头不能少于6个字'
  }

  if (getFieldLength(name) > 100) {
    return '发票抬头过长，请删减信息'
  }

  if (sensitiveWords.some((item) => name.includes(item))) {
    return '抬头信息可能无法通过审核，请确认填写信息真实有效'
  }

  if (!taxNumber && form.customerType === '1') {
    return '请输入企业税号'
  }

  if (
    taxNumber &&
    form.customerType === '1' &&
    !/^([0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}|[1-9]\d{14})$/.test(
      taxNumber
    )
  ) {
    return '税号格式错误，请输入正确的企业纳税人识别号'
  }

  if (getFieldLength(`${form.phone}${form.address}`) > 100) {
    return '地址/电话过长，请删减信息'
  }

  if (getFieldLength(`${form.bank}${form.bankAccount}`) > 70) {
    return '银行信息过长，请删减信息'
  }

  return ''
}

function validateEmail(email: string) {
  if (!email.trim()) {
    return '请输入接收邮箱'
  }

  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
    return '邮箱格式不正确'
  }

  return ''
}

function getApplyBillCategoryText(category: InvoiceApplyDraft['billCategory']) {
  return category === '13' ? '电子专票' : '电子普票'
}

function createApplyPreview(draft: InvoiceApplyDraft): InvoiceApplyPreview {
  const emailMessage = validateEmail(draft.email)
  let message = ''

  if (!draft.order.canApply) {
    message = draft.order.statusText || '当前运单暂不可开票'
  } else if (!draft.order.id || !draft.order.waybillNumber) {
    message = '缺少开票运单号'
  } else if (!draft.taxpayer) {
    message = '请选择发票抬头'
  } else if (draft.billCategory === '13' && draft.taxpayer.customerType !== '1') {
    message = '电子专票需要选择单位抬头'
  } else if (draft.billCategory === '13' && !draft.order.electronSupported) {
    message = '当前运单暂未开通电子专票'
  } else if (draft.order.amount <= 0) {
    message = '当前运单暂无可开票金额'
  } else if (emailMessage) {
    message = emailMessage
  }

  return {
    waybillNumber: draft.order.waybillNumber,
    amount: draft.order.amount,
    billCategoryText: getApplyBillCategoryText(draft.billCategory),
    taxpayerName: draft.taxpayer?.name || '',
    taxpayerTypeText: draft.taxpayer?.typeText || '',
    email: draft.email.trim(),
    remark: draft.remark.trim(),
    canSubmit: !message,
    message
  }
}

function createApplySubmitPayload(
  draft: InvoiceApplyDraft
): InvoiceApplySubmitRequest {
  const taxpayer = draft.taxpayer
  const amount = toFiniteNumber(draft.order.amount)
  const openAmount = draft.billCategory === '06' ? 0 : amount
  const includeCompanyInfo = taxpayer?.customerType === '1'

  return {
    TaskDetailList: [
      {
        payNo: '',
        payFlag: true,
        orderNo: draft.order.id,
        sourceBillNo: draft.order.waybillNumber,
        amount,
        unverAmount: toFiniteNumber(draft.order.unverAmount),
        paymentType: draft.order.paymentType,
        electricSpecialTicketAuth: draft.order.electronSupported
      }
    ],
    TaskInfo: {
      payNo: '',
      status: '0',
      isAllOpen: '1',
      isDomestic: '',
      sendCustomer: 11,
      phoneNo: '',
      acceptPhone: '',
      acceptArea: '',
      acceptAddress: '',
      acceptCustomer: '',
      ...EXPRESS_APPLY_SYSTEM,
      taxNo: taxpayer?.taxNumber ?? '',
      taxName: taxpayer?.name ?? '',
      customerType: taxpayer?.customerType ?? '0',
      taxTelephone: includeCompanyInfo ? taxpayer?.phone ?? '' : '',
      taxAddress: includeCompanyInfo ? taxpayer?.address ?? '' : '',
      taxBankName: includeCompanyInfo ? taxpayer?.bank ?? '' : '',
      taxBankNumber: includeCompanyInfo ? taxpayer?.bankAccount ?? '' : '',
      openAmount,
      totalAmount: openAmount,
      open_amount: openAmount,
      unit: draft.unit.trim(),
      email: draft.email.trim(),
      taxEmail: draft.email.trim(),
      billCategory: draft.billCategory,
      isPrintSaleList: 'N',
      remark: draft.remark.trim(),
      invoiceContent: ''
    }
  }
}

function createPreviewFile(
  title: string,
  pdfUrl?: string,
  imageUrl?: string
) {
  const normalizedPdfUrl = normalizeText(pdfUrl)
  const normalizedImageUrl = normalizeText(imageUrl)

  return {
    title,
    pdfUrl: normalizedPdfUrl,
    imageUrl: normalizedImageUrl,
    displayUrl: normalizedImageUrl || normalizedPdfUrl,
    hasPdf: !!normalizedPdfUrl,
    hasImage: !!normalizedImageUrl
  }
}

function normalizePreview(
  raw: InvoicePreviewRaw,
  applyNo: string,
  title: string
): InvoicePreviewView {
  const invoice = createPreviewFile(
    '发票文件',
    raw.elecLinkAdress,
    raw.elecLinkAdressPicture
  )
  const reversal = createPreviewFile(
    '已作废发票',
    raw.redElecLinkAdress,
    raw.redElecLinkAdressPicture
  )
  const hasPreview = !!(invoice.displayUrl || reversal.displayUrl)

  return {
    applyNo,
    title,
    billCategoryText: getBillCategoryName(raw.billCategory),
    invoice,
    reversal,
    hasPreview,
    message: hasPreview ? '' : '暂无发票预览信息'
  }
}

function createListResult<TItem>(
  list: TItem[],
  pageIndex: number,
  pageSize: number,
  totalRows?: number
): InvoiceListResult<TItem> {
  const total = totalRows ?? list.length

  return {
    list,
    pageIndex,
    pageSize,
    totalRows: total,
    totalPage: Math.max(1, Math.ceil(total / pageSize))
  }
}

export const invoiceService = {
  createTaxpayerForm: createFormFromTaxpayer,

  validateTaxpayer,

  validateEmail,

  createApplyPreview,

  async submitApplyDraft(
    draft: InvoiceApplyDraft
  ): Promise<DepponResponse<InvoiceApplySubmitResult | null>> {
    const preview = createApplyPreview(draft)

    if (!preview.canSubmit) {
      return createFailure(preview.message || '缺少开票信息')
    }

    const response = await invoiceApi.request<
      InvoiceApplySubmitResult | null,
      InvoiceApplySubmitRequest
    >('addTaskInfoByEle', createApplySubmitPayload(draft), true, 30000)

    if (!response.status) {
      return createFailure(response.message || '提交失败，请稍后再试')
    }

    return {
      ...response,
      result: response.result ?? null
    }
  },

  async queryPreview(
    applyNo: string,
    title = '电子发票'
  ): Promise<DepponResponse<InvoicePreviewView>> {
    const normalizedApplyNo = normalizeText(applyNo)

    if (!normalizedApplyNo) {
      return createFailure('缺少发票申请号')
    }

    const response = await invoiceApi.request<
      InvoicePreviewRaw,
      InvoicePreviewRequest
    >(
      'lookInvoice',
      {
        applyNo: normalizedApplyNo
      },
      false
    )

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未获取到发票预览')
    }

    const preview = normalizePreview(response.result, normalizedApplyNo, title)

    if (!preview.hasPreview) {
      return createFailure(preview.message)
    }

    return {
      ...response,
      result: preview
    }
  },

  async sendInvoiceEmail(
    applyNo: string,
    email: string
  ): Promise<DepponResponse<null>> {
    const normalizedApplyNo = normalizeText(applyNo)
    const normalizedEmail = normalizeText(email)
    const emailMessage = validateEmail(normalizedEmail)

    if (!normalizedApplyNo) {
      return createFailure('缺少发票申请号')
    }

    if (emailMessage) {
      return createFailure(emailMessage)
    }

    const response = await invoiceApi.request<null, InvoiceSendEmailRequest>(
      'sendEmail',
      {
        applyNo: normalizedApplyNo,
        email: normalizedEmail
      }
    )

    if (!response.status) {
      return createFailure(response.message || '发送失败，请稍后再试')
    }

    return {
      ...response,
      result: null
    }
  },

  async queryHistoryWaybills(
    applyNo: string
  ): Promise<DepponResponse<InvoiceHistoryWaybillView[]>> {
    const normalizedApplyNo = normalizeText(applyNo)

    if (!normalizedApplyNo) {
      return createFailure('缺少发票申请号')
    }

    const response = await invoiceApi.request<
      InvoiceHistoryWaybillRaw,
      InvoiceHistoryWaybillRequest
    >(
      'queryContainWaybill',
      {
        applyNo: normalizedApplyNo
      },
      false
    )

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未获取到开票运单信息')
    }

    return {
      ...response,
      result: normalizeHistoryWaybills(response.result)
    }
  },

  async queryOrders(
    pageIndex = 1,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<DepponResponse<InvoiceListResult<InvoiceOrderView>>> {
    const range = getDateRange(DEFAULT_ORDER_RANGE_MONTHS)
    const response = await invoiceApi.request<
      InvoiceOrderListResponse,
      InvoiceOrderListRequest
    >(
      'tradeQueryByCustomerCode',
      {
        currentPage: pageIndex,
        pageSize,
        startDate: range.startDate,
        endDate: range.endDate
      },
      false,
      30000
    )

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未获取到可开票运单')
    }

    const list = (response.result.list ?? []).map(normalizeInvoiceOrder)

    return {
      ...response,
      result: createListResult(
        list,
        response.result.pageIndex ?? pageIndex,
        response.result.pageSize ?? pageSize,
        response.result.total
      )
    }
  },

  async queryHistory(
    pageIndex = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    waybillNumber = ''
  ): Promise<DepponResponse<InvoiceListResult<InvoiceHistoryView>>> {
    const keyword = waybillNumber.trim()

    if (keyword) {
      const response = await invoiceApi.request<
        InvoiceHistoryQueryResponse,
        InvoiceHistoryQueryRequest
      >(
        'queryApplyByWayBillNo',
        {
          sourceBillNo: keyword
        },
        false
      )

      if (!response.status || !response.result) {
        return createFailure(response.message || '暂未查询到开票历史')
      }

      const list = response.result.map(normalizeHistory)

      return {
        ...response,
        result: createListResult(list, 1, list.length || pageSize, list.length)
      }
    }

    const range = getDateRange(DEFAULT_HISTORY_RANGE_MONTHS)
    const response = await invoiceApi.request<
      InvoiceHistoryListResponse,
      InvoiceHistoryListRequest
    >(
      'queryInvoiceHistory',
      {
        currentPage: pageIndex,
        pageSize,
        openBillStartDate: range.startDate,
        openBillEndDate: range.endDate
      },
      false
    )

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未获取到开票历史')
    }

    const list = (response.result.list ?? []).map(normalizeHistory)

    return {
      ...response,
      result: createListResult(
        list,
        response.result.pageIndex ?? pageIndex,
        response.result.pageSize ?? pageSize,
        response.result.total
      )
    }
  },

  async queryTaxpayers(): Promise<DepponResponse<InvoiceTaxpayerView[]>> {
    const response = await invoiceApi.request<InvoiceTaxpayerRaw[]>(
      'queryTaxpayerInfo',
      undefined,
      false
    )

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未获取到发票抬头')
    }

    return {
      ...response,
      result: response.result.map(normalizeTaxpayer)
    }
  },

  async queryTaxpayerMatches(
    taxName: string,
    customerType: InvoiceTaxpayerType
  ): Promise<DepponResponse<InvoiceTaxpayerMatch[]>> {
    const keyword = taxName.trim()

    if (!keyword || keyword.length <= 3 || customerType !== '1') {
      return {
        status: true,
        message: '',
        result: []
      }
    }

    const response = await invoiceApi.request<
      InvoiceTaxpayerMatch[],
      InvoiceTaxpayerMatchRequest
    >(
      'queryCustomerTaxName',
      {
        taxName: keyword,
        customerType
      },
      false,
      3000
    )

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未匹配到企业抬头')
    }

    return response
  },

  async saveTaxpayer(
    form: InvoiceTaxpayerForm
  ): Promise<DepponResponse<unknown>> {
    const message = validateTaxpayer(form)

    if (message) {
      return createFailure(message)
    }

    const path = form.id ? 'alterTaxpayerInfo' : 'addTaxpayerInfo'
    const response = await invoiceApi.request<
      unknown,
      InvoiceTaxpayerSaveRequest
    >(path, createTaxpayerPayload(form))

    if (!response.status) {
      return createFailure(response.message || '保存失败，请稍后再试')
    }

    return response
  },

  async deleteTaxpayer(id: number): Promise<DepponResponse<unknown>> {
    const response = await invoiceApi.request<
      unknown,
      InvoiceTaxpayerDeleteRequest
    >('deleteTaxpayerInfo', { id: [id] })

    if (!response.status) {
      return createFailure(response.message || '删除失败，请稍后再试')
    }

    return response
  }
}
