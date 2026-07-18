import type { OrderModifyExtendField } from './order.edit.types'
import type { AppWebSource } from '../../shared/webview/appWeb'

export * from './order.edit.types'

export type OrderRole = 'sender' | 'receive'
export type OrderPaymentFilter = '' | 'MP' | 'FC' | 'CT'
export type OrderStatusFilter =
  '' | 'RECEIPTING' | 'IN_TRANSIT' | 'SIGN' | 'CANCEL' | 'INVALID'

export type OrderDetailActionKind =
  | 'service'
  | 'subscribe'
  | 'modifyOrder'
  | 'pickupSchedule'
  | 'urge'
  | 'notifyDeliver'
  | 'evaluate'
  | 'invalidWaybill'
  | 'deliveryPreference'
  | 'departmentPhone'
  | 'complaint'
  | 'claim'
  | 'invoice'
  | 'modifyWaybill'

export type OrderStubPartyRole = 'sender' | 'receiver'
export type OrderStubImageKind =
  | 'pickup'
  | 'reweigh'
  | 'delivered'
  | 'signed'
  | 'returnBill'
  | 'subsidy'
  | 'openPacking'
  | 'checkCodeGoods'
  | 'pastingService'
  | 'homeDecoration'
  | 'powerOn'
  | 'doubleDelivery'
  | 'woodenPackage'
  | 'homeExchange'
  | 'pickupService'

export type OrderServiceImageScene = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type OrderContractStatus =
  | 'SENT'
  | 'REJECT'
  | 'COMPLETE'
  | 'REVOKE_CANCEL'
  | 'OVERDUE'
  | 'IN_SEND_APPROVAL'
  | 'SEND_APPROVAL_NOT_PASSED'
  | 'INVALID'
  | string

export type OrderDetailActionTone = 'primary' | 'neutral' | 'warning' | 'danger'

export type OrderDetailActionTarget =
  | 'route'
  | 'web'
  | 'subscription'
  | 'pickupSchedule'
  | 'urge'
  | 'notifyDeliver'
  | 'invalidWaybill'
  | 'departmentPhone'

export type OrderUrgeType = 'URGE_ORDER_NO' | 'URGE_BILL_NO'

export type OrderUrgeVoucherType = '0' | '1'

export interface OrderUrgeButtonRaw {
  buttonName: string
  buttonCode: string
}

export interface OrderUrgeButtonRequest {
  waybillNo: string
  urgeType: OrderUrgeType
}

export interface OrderUrgeStatusResponse {
  buttonList?: OrderUrgeButtonRaw[] | null
}

export interface OrderUrgeMenusResponse {
  speech?: string
  buttonList?: OrderUrgeButtonRaw[] | null
}

export interface OrderUrgeSubmitRequest {
  caseNo: string
  reportScene: OrderUrgeType
}

export interface OrderUrgeSubmitResponse {
  errorMsg?: string
}

export interface OrderNotifyDeliverRequest {
  waybillNo: string
}

export interface OrderInvalidWaybillRequest {
  waybillNumber: string
}

export interface OrderInvalidWaybillResult {
  message: string
  shouldModifyIntercept: boolean
  modifyWebUri: string
}

export interface OrderDepartmentPhoneActionView {
  stationCode: string
  phoneNumber: string
}

export interface OrderDetailUrgeActionView {
  voucherNumber: string
  voucherType: OrderUrgeVoucherType
  urgeType: OrderUrgeType
  buttonCode: string
  contactPhone: string
}

export interface OrderDetailUrgePanelView {
  content: string
  menus: OrderUrgeButtonRaw[]
}

export interface OrderDetailActionView {
  kind: OrderDetailActionKind
  title: string
  summary: string
  target: OrderDetailActionTarget
  tone: OrderDetailActionTone
  badgeText?: string
  route?: string
  webSource?: AppWebSource
  webUri?: string
  urge?: OrderDetailUrgeActionView
  departmentPhone?: OrderDepartmentPhoneActionView
  loginRequired?: boolean
}

export interface OrderDetailActionOptions {
  publicTrackMode?: boolean
  role?: OrderRole
}

export interface OrderStubEntryView {
  available: boolean
  title: string
  summary: string
  route: string
  disabledReason?: string
}

export interface OrderStubPartyView {
  role: OrderStubPartyRole
  label: string
  name: string
  mobile: string
  address: string
  copyText: string
  encrypted: boolean
}

export interface OrderStubFieldView {
  label: string
  value: string
  copyValue?: string
  important?: boolean
}

export interface OrderStubSectionView {
  title: string
  fields: OrderStubFieldView[]
}

export interface OrderStubNoticeView {
  title: string
  content: string
  tone: 'info' | 'warning'
}

export interface OrderStubView {
  title: string
  subtitle: string
  statusText: string
  barcodeText: string
  copyNumber: string
  orderNumber: string
  waybillNumber: string
  sender: OrderStubPartyView
  receiver: OrderStubPartyView
  size: OrderStubSizeView
  sections: OrderStubSectionView[]
  notices: OrderStubNoticeView[]
}

export interface OrderStubSizeView {
  available: boolean
  rows: string[]
  notice: string
}

export interface OrderOpenBoxImagesRequest {
  wayBill: string
  operationType?: '10'
}

export interface OrderReceiptImagesRequest {
  wayBill: string
}

export interface OrderSignImagesRequest {
  wayBill: string
}

export interface OrderReturnBillImagesRequest {
  waybillNo: string
}

export interface OrderServiceImagesRequest {
  wayBill: string
  imageScene: string
}

export interface OrderHomeImagesRequest {
  wayBill: string
}

export interface OrderPowerOnImagesRequest {
  wayBill: string
}

export interface OrderPackageImagesRequest {
  wayBill: string
}

export interface OrderPackagingFeeRequest {
  waybillNumber: string
}

export interface OrderReceiptImagesResponse {
  signList?: string[] | null
  returnList?: string[] | null
}

export interface OrderPackageImagesResponse {
  list?: Array<{
    savePath?: string | null
  }> | null
}

export interface OrderPackagingFeeItemRaw {
  thirdClassName?: string | null
  packageTotal?: number | null
  calcAmount?: number | null
}

export interface OrderPackagingFeeResponse {
  standVolume?: number | null
  woodenFrameFee?: number | null
  boxVolume?: number | null
  woodenCaseFee?: number | null
  salverNum?: number | null
  swoodenPalletFee?: number | null
  nonSalverNum?: number | null
  nwoodenPalletFee?: number | null
  waybillPackageList?: OrderPackagingFeeItemRaw[] | null
}

export interface OrderContractDetailRequest {
  contractId: string
  waybillNumber: string
}

export interface OrderContractDetailResponse {
  status: OrderContractStatus
}

export interface OrderStubDocumentView {
  available: boolean
  title: string
  statusText: string
  summary: string
  actionText: string
  canPreview: boolean
  route: string
  fileCode: string
  waybillNumber: string
}

export interface OrderStubPackageFeeItemView {
  name: string
  count: string
  amount: string
}

export interface OrderStubPackageFeeGroupView {
  title: string
  nameTitle: string
  countTitle: string
  amountTitle: string
  items: OrderStubPackageFeeItemView[]
}

export interface OrderStubPackageFeeView {
  available: boolean
  message: string
  totalAmount: string
  groups: OrderStubPackageFeeGroupView[]
}

export interface OrderStubImageView {
  id: string
  url: string
}

export interface OrderStubImageGroupView {
  kind: OrderStubImageKind
  title: string
  summary: string
  images: OrderStubImageView[]
}

export interface OrderStubImagesView {
  available: boolean
  message: string
  groups: OrderStubImageGroupView[]
}

export interface OrderListOptions {
  role?: OrderRole
  pageIndex?: number
  pageSize?: number
  keyword?: string
  startTime?: string
  endTime?: string
  orderStatus?: OrderStatusFilter
  paymentType?: OrderPaymentFilter
}

export interface SenderOrderListRequest {
  pageSize: number
  pageIndex: number
  startTime: string
  endTime: string
  sysCode: string
  ordersort: 0
  owsOrderListKeyword?: string
  orderStatus: OrderStatusFilter
  paymentType: OrderPaymentFilter
}

export interface SenderOrderItem {
  contactCity: string
  contactName: string
  receiverCustCity: string
  receiveName: string
  dispatchFlag: 'Y' | 'N'
  tableType: 'EXPRESS' | 'LOGISTICS' | '2' | string
  goodsNumber: string
  totalWeight: string
  totalFee: number | null
  waybillNumber: string
  orderNumber: string
  orderStatus: string
  orderTime: string
  newOrderTime: string
  orderClassification: string
  isMasterSlave: null | '0' | '1'
  viewTextFlag: null | 'Y' | 'N'
  modifyFlag: boolean
  productCodeFlag: boolean
  dshk?: boolean
  channelType?: string
}

export interface SenderOrderListResponse {
  pageNum: number
  pageSize: number
  queryOrderList: SenderOrderItem[] | null
  totalPage: number
  totalRows: number
  weatherWarning: string | null
}

export interface ConsigneeOrderListRequest {
  type: 1
  status: 0
  pageSize: number
  pageIndex: number
  startTime: string
  endTime: string
  sysCode: string
  owsOrderListKeyword?: string
  orderStatus: OrderStatusFilter
  paymentType: OrderPaymentFilter
}

export interface ConsigneeOrderItem {
  sendcity: string
  sender: string
  consigncity: string
  consignee: string
  billno: string
  orderNo: string | null
  currentStatus: string
  statustype: string
  createtime: number
  statusTime: number
  newStatusTime: number
  isPayed: string | null
  isJdPay?: null | 'Y' | 'N'
  dshk?: boolean
  productCodeFlag: boolean
}

export interface ConsigneeOrderListResponse {
  total: number
  pageSize: number
  pageIndex: number
  row: ConsigneeOrderItem[] | null
}

export interface OrderListItem {
  role: OrderRole
  senderCity: string
  senderName: string
  consigneeCity: string
  consigneeName: string
  waybillNumber: string
  orderNumber: string
  orderStatus: string
  orderClass: number
  orderClassName: string
  orderTime: string
  orderPrice: number
  isExpress: boolean
  isDispatch: boolean
  isAllowCancel: boolean
}

export interface OrderListResult {
  list: OrderListItem[]
  pageIndex: number
  pageSize: number
  totalPage: number
  totalRows: number
}

export interface WaybillSubscriptionRaw {
  sender?: string | null
  sendCity?: string | null
  consignee?: string | null
  consignCity?: string | null
  wayBillNo?: string | null
  tableType?: string | null
  statusType?: string | null
  orderStatus?: string | number | null
  orderClassification?: string | number | null
  createWaybillTime?: string | number | null
  isSender?: 'Y' | 'N' | null
  isReceiver?: 'Y' | 'N' | null
}

export interface WaybillSubscriptionView {
  id: string
  role: OrderRole
  senderName: string
  senderCity: string
  consigneeName: string
  consigneeCity: string
  waybillNumber: string
  statusText: string
  createdAt: string
  isExpress: boolean
}

export interface WaybillSubscriptionRequest {
  wayBillNo: string
}

export interface OrderDetailRequest {
  orderNumber: string
  sysCode: string
}

export interface WaybillDetailRequest {
  waybillNumber: string
  sysCode: string
}

export interface OrderDetail {
  isSender?: 'Y' | 'N'
  isReceiver?: 'Y' | 'N'
  orderNumber: string
  waybillNumber: string | null
  orderClassification: string
  orderClassName?: string
  orderStatus: string
  orderTime: string
  signTime?: string | number | null
  signVoucherTime?: string | number | null
  paymentType?: string
  goodsName?: string | null
  goodsNumber?: number
  totalWeight?: number
  totalVolume?: number
  totalFee?: number | null
  insuredAmount?: number | string | null
  transportMode?: string
  deliveryType?: string
  contactName?: string | null
  contactMobile?: string | null
  contactProvince?: string | null
  contactCity?: string | null
  contactArea?: string | null
  contactTown?: string | null
  contactAddress?: string | null
  receiverName?: string | null
  receiverMobile?: string | null
  receiverProvince?: string | null
  receiverCity?: string | null
  receiverArea?: string | null
  receiverTown?: string | null
  receiverAddress?: string | null
  courierName?: string | null
  courierMobile?: string | null
  remark?: string | null
  modifyFlag?: boolean
  productCodeFlag?: boolean
  receiverLoanType?: string | null
  receiverMoneyAmount?: number | string | null
  reciveLoanType?: string | null
  reviceMoneyAmount?: number | string | null
  reciveLoanAccount?: string | null
  reciveLoanAccountName?: string | null
  beginAcceptTime?: string | null
  endAcceptTime?: string | null
  pickPeriodTime?: number | string | null
  channelType?: string | null
  orderChannelType?: string | null
  tableType?: string | number | null
  isPickupGoods?: boolean | 'Y' | 'N' | '1' | '0'
  orderExtendFields?: OrderModifyExtendField[] | null
  [key: string]: unknown
}

export interface WaybillDetailRaw {
  isSender?: 'Y' | 'N'
  isReceiver?: 'Y' | 'N'
  waybillNumber: string
  orderNumber: string
  orderClassification: string
  orderStatus: string
  orderTime: string
  signTime?: string | number | null
  signVoucherTime?: string | number | null
  payment?: string
  paymentVisible?: boolean
  goodsName?: string
  pieces?: number
  totalWeight?: number
  cubage?: number
  transportMode?: string
  tranProperty?: string
  deliveryType?: string
  contactName?: string
  contactMobile?: string
  senderProvinceName?: string
  contactCity?: string
  senderDistrictName?: string
  senderTownName?: string
  contactAddressWechat?: string
  receiverCustName?: string
  receiveMobile?: string
  consigneeProvinceName?: string
  receiveCity?: string
  consigneeDistrictName?: string
  receiverTownName?: string
  receiveAddressWechat?: string
  exDepartureCourierName?: string | null
  exDepartureCourierPhone?: string | null
  remark?: string | null
  productCodeFlag?: boolean
  [key: string]: unknown
}

export interface WaybillDetailResponse {
  orderDetails?: WaybillDetailRaw
}

export interface OrderCancelRequest {
  orderNumber: string
  cancelReason?: string
  sysCode?: string
}

export interface OrderDeleteRequest {
  orderSource: '1' | '2'
  orderListType: OrderRole
  waybillNumber?: string | null
  orderNumber?: string | null
  sysCode: string
}

export interface WaybillTrackItem {
  trackIndex: number
  trackFirst: boolean
  trackLast: boolean
  content: string
  contentNoLinkLabel: string
  contentOrig: string
  operateName: string | null
  operatePhone: string | null
  operateTime: number
  date: string
  time: string
  opreateType: string
}

export interface WaybillTrackListResponse {
  billNo: string
  billNoState: string
  weatherWarning: string | null
  tracks: WaybillTrackItem[] | null
}
