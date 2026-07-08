export type InvoicePath =
  | 'queryTaxpayerInfo'
  | 'addTaxpayerInfo'
  | 'alterTaxpayerInfo'
  | 'deleteTaxpayerInfo'
  | 'queryCustomerTaxName'
  | 'tradeQueryByCustomerCode'
  | 'tradeQueryBySourceBillNo'
  | 'checkSourcePaymentNumber'
  | 'sendCheckCode'
  | 'checkVerificationCode'
  | 'addTaskInfoByEle'
  | 'queryInvoiceHistory'
  | 'queryApplyByWayBillNo'
  | 'lookInvoice'
  | 'sendEmail'
  | 'queryContainWaybill'

export type InvoiceTab = 'orders' | 'history' | 'taxpayers'
export type InvoiceStatusClass = 'Process' | 'Cancel' | 'Error' | 'Success'
export type InvoiceBillCategory = '01' | '02' | '06' | '07' | '13' | '14' | string
export type InvoiceApplyBillCategory = '06' | '13'
export type InvoiceTaxpayerType = '0' | '1'

export interface InvoiceCommonRequest<TData = unknown> {
  path: InvoicePath
  data?: TData
}

export interface InvoiceTaxpayerRaw {
  id: number
  acceptTinCode?: string
  acceptTinName?: string
  address?: string
  bankNo?: string
  phone?: string
  customerType?: InvoiceTaxpayerType
  isDefault?: '0' | '1'
  openBank?: string
  remark?: string
}

export interface InvoiceTaxpayerView {
  id: number
  name: string
  taxNumber: string
  typeText: string
  phone: string
  address: string
  bank: string
  bankAccount: string
  isDefault: boolean
  customerType: InvoiceTaxpayerType
  remark: string
}

export interface InvoiceTaxpayerForm {
  id?: number
  customerType: InvoiceTaxpayerType
  name: string
  taxNumber: string
  phone: string
  address: string
  bank: string
  bankAccount: string
  remark: string
  isDefault: boolean
}

export interface InvoiceTaxpayerSaveRequest {
  id?: number
  isDefault: '0' | '1'
  customerType: InvoiceTaxpayerType
  acceptTinName: string
  acceptTinCode: string
  address: string
  phone: string
  openBank: string
  bankNo: string
  remark: string
}

export interface InvoiceTaxpayerDeleteRequest {
  id: number[]
}

export interface InvoiceTaxpayerMatchRequest {
  taxName: string
  customerType: InvoiceTaxpayerType
}

export interface InvoiceTaxpayerMatch {
  taxName: string
  taxNo: string
  taxAddress: string
  taxTelephone: string
  taxBankName: string
  taxBankNumber: string
  customerType: number
}

export interface InvoiceOrderListRequest {
  pageSize: number
  currentPage: number
  startDate: string
  endDate: string
}

export interface InvoiceOrderQueryRequest {
  sourceBillNo: string
}

export interface InvoiceOrderAuthPhoneRequest {
  sourceBillNo: string
  inspectPhone: string
}

export interface InvoiceOrderAuthCodeRequest {
  sourceBillNo: string
}

export interface InvoiceOrderAuthCodeCheckRequest {
  sourceBillNo: string
  checkTestCode: string
}

export type InvoiceOrderAuthType = '01' | '02' | '03' | '04'
export type InvoiceOrderAuthInputType = 'number' | 'text'

export interface InvoiceOrderRaw {
  orderNo: string
  sourceBillNo: string
  businessDate: number
  departurecity?: string
  consignorContacts?: string
  arrivalcity?: string
  consignee?: string
  unverifyAmount?: '0' | '1'
  unPayAmount?: number
  unbilledAmount?: number
  unbillAmount?: number
  unverAmount?: number
  paymentType?: string
  orderSubType?: string
  crossBorder?: 'Y' | 'N'
  ifCanOpenInvoiceMark?: '0' | '1' | '2'
  electricSpecialTicketAuth?: boolean
  option?: InvoiceOrderAuthType
  paymentPhone?: string
}

export interface InvoiceOrderListResponse {
  total: number
  pageSize: number
  pageIndex: number
  list: InvoiceOrderRaw[]
}

export interface InvoiceOrderView {
  id: string
  waybillNumber: string
  businessTime: string
  senderText: string
  consigneeText: string
  amount: number
  unverAmount: number
  unpaidAmount: number
  paymentType: string
  statusText: string
  statusClass: InvoiceStatusClass
  canApply: boolean
  pendingPayment: boolean
  electronSupported: boolean
}

export interface InvoiceOrderAuthChallenge {
  waybillNumber: string
  phone: string
  paymentType: string
  authType: Exclude<InvoiceOrderAuthType, '01'>
  summary: string
  placeholder: string
  maxLength: number
  inputType: InvoiceOrderAuthInputType
}

export interface InvoiceOrderSearchView {
  list: InvoiceOrderView[]
  auth: InvoiceOrderAuthChallenge | null
}

export interface InvoiceHistoryListRequest {
  currentPage: number
  pageSize: number
  openBillStartDate: string
  openBillEndDate: string
}

export interface InvoiceHistoryQueryRequest {
  sourceBillNo: string
}

export interface InvoiceHistoryRaw {
  id: number
  acceptTinName?: string
  acceptTinCode?: string
  applyNo?: string
  applyTime?: number
  billAmount?: number
  billCategory?: InvoiceBillCategory
  email?: string
  elecLinkAdress?: string
  remark?: string
  status?: string
}

export interface InvoiceHistoryListResponse {
  pageIndex: number
  pageSize: number
  total: number
  list: InvoiceHistoryRaw[]
}

export type InvoiceHistoryQueryResponse = InvoiceHistoryRaw[]

export interface InvoiceHistoryView {
  id: string
  title: string
  taxNumber: string
  amount: number
  typeText: string
  statusText: string
  statusClass: InvoiceStatusClass
  applyTime: string
  email: string
  remark: string
  previewUrl: string
  canPreview: boolean
}

export interface InvoiceHistoryWaybillRequest {
  applyNo: string
}

export type InvoiceHistoryWaybillRaw = Record<string, number | string | null>

export interface InvoiceHistoryWaybillView {
  waybillNumber: string
  amount: number
}

export interface InvoiceListResult<TItem> {
  list: TItem[]
  pageIndex: number
  pageSize: number
  totalRows: number
  totalPage: number
}

export interface InvoiceApplyDraft {
  order: InvoiceOrderView
  taxpayer: InvoiceTaxpayerView | null
  billCategory: InvoiceApplyBillCategory
  email: string
  unit: string
  remark: string
}

export interface InvoiceApplyPreview {
  waybillNumber: string
  amount: number
  billCategoryText: string
  taxpayerName: string
  taxpayerTypeText: string
  email: string
  remark: string
  canSubmit: boolean
  message: string
}

export interface InvoiceApplyTaskDetail {
  payNo: string
  payFlag: boolean
  orderNo: string
  sourceBillNo: string
  amount: number
  unverAmount: number
  paymentType: string
  electricSpecialTicketAuth: boolean
}

export interface InvoiceApplyTaskInfo {
  payNo: string
  status: '0'
  isAllOpen: '1'
  isDomestic: ''
  sendCustomer: 11
  phoneNo: string
  acceptPhone: string
  acceptArea: string
  acceptAddress: string
  acceptCustomer: string
  applyType: '241'
  sourceType: '24'
  SourceSystem: 'XCX'
  taxNo: string
  taxName: string
  customerType: InvoiceTaxpayerType
  taxTelephone: string
  taxAddress: string
  taxBankName: string
  taxBankNumber: string
  openAmount: number
  totalAmount: number
  open_amount: number
  unit: string
  email: string
  taxEmail: string
  billCategory: InvoiceApplyBillCategory
  isPrintSaleList: 'N'
  remark: string
  invoiceContent: ''
}

export interface InvoiceApplySubmitRequest {
  TaskDetailList: InvoiceApplyTaskDetail[]
  TaskInfo: InvoiceApplyTaskInfo
}

export interface InvoiceApplySubmitResult {
  applyNo?: string
  taskNo?: string
  [key: string]: unknown
}

export interface InvoicePreviewRequest {
  applyNo: string
}

export interface InvoiceSendEmailRequest {
  applyNo: string
  email: string
}

export interface InvoicePreviewRaw {
  billCategory?: InvoiceBillCategory
  elecLinkAdress?: string
  elecLinkAdressPicture?: string
  redElecLinkAdress?: string
  redElecLinkAdressPicture?: string
}

export interface InvoicePreviewFile {
  title: string
  pdfUrl: string
  imageUrl: string
  displayUrl: string
  hasPdf: boolean
  hasImage: boolean
}

export interface InvoicePreviewView {
  applyNo: string
  title: string
  billCategoryText: string
  invoice: InvoicePreviewFile
  reversal: InvoicePreviewFile
  hasPreview: boolean
  message: string
}
