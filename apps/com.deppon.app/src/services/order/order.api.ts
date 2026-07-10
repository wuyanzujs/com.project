import { depponHttp } from '../../request/deppon'

import type {
  OrderDispatchRequest,
  OrderPickupTimeRequest,
  OrderPickupTimeResponse
} from './order.dispatch.types'
import type {
  ConsigneeOrderListRequest,
  ConsigneeOrderListResponse,
  OrderContractDetailRequest,
  OrderContractDetailResponse,
  OrderCancelRequest,
  OrderDeleteRequest,
  OrderDetail,
  OrderDetailRequest,
  OrderInvalidWaybillRequest,
  OrderModifyRequest,
  OrderNotifyDeliverRequest,
  OrderHomeImagesRequest,
  OrderOpenBoxImagesRequest,
  OrderPackageImagesRequest,
  OrderPackageImagesResponse,
  OrderPackagingFeeRequest,
  OrderPackagingFeeResponse,
  OrderPowerOnImagesRequest,
  OrderReceiptImagesRequest,
  OrderReceiptImagesResponse,
  OrderReturnBillImagesRequest,
  OrderSignImagesRequest,
  OrderServiceImagesRequest,
  OrderUrgeButtonRequest,
  OrderUrgeMenusResponse,
  OrderUrgeStatusResponse,
  OrderUrgeSubmitRequest,
  OrderUrgeSubmitResponse,
  SenderOrderListRequest,
  SenderOrderListResponse,
  WaybillDetailRequest,
  WaybillDetailResponse,
  WaybillSubscriptionRaw,
  WaybillSubscriptionRequest,
  WaybillTrackListResponse
} from './types'

interface QueryTrackListOptions {
  loading?: boolean
  login?: boolean
}

export const orderApi = {
  querySenderList(data: SenderOrderListRequest, loading = false) {
    return depponHttp.post<SenderOrderListResponse, SenderOrderListRequest>(
      '/gwapi/orderService/eco/order/secure/orderList',
      data,
      {
        loading
      }
    )
  },

  queryConsigneeList(data: ConsigneeOrderListRequest, loading = false) {
    return depponHttp.post<
      ConsigneeOrderListResponse,
      ConsigneeOrderListRequest
    >('/gwapi/waybillService/eco/wayBill/secure/receiveOrderList', data, {
      loading
    })
  },

  queryOrderDetail(data: OrderDetailRequest, loading = true) {
    return depponHttp.post<OrderDetail, OrderDetailRequest>(
      '/gwapi/orderService/eco/order/secure/orderDetail',
      data,
      {
        loading
      }
    )
  },

  queryWaybillDetail(data: WaybillDetailRequest, loading = true) {
    return depponHttp.post<WaybillDetailResponse, WaybillDetailRequest>(
      '/gwapi/waybillService/eco/wayBill/secure/queryNewWaybillDetail',
      data,
      {
        loading
      }
    )
  },

  queryTrackList(waybillNumber: string, options: QueryTrackListOptions = {}) {
    return depponHttp.post<WaybillTrackListResponse, { waybillNumber: string }>(
      '/gwapi/trackService/eco/track/queryNewTrack',
      {
        waybillNumber
      },
      {
        loading: options.loading ?? false,
        login: options.login
      }
    )
  },

  cancelOrder(data: OrderCancelRequest) {
    return depponHttp.post<boolean, OrderCancelRequest>(
      '/gwapi/orderService/eco/order/secure/revokeOrder',
      data
    )
  },

  deleteOrder(data: OrderDeleteRequest) {
    return depponHttp.post<boolean, OrderDeleteRequest>(
      '/gwapi/orderService/eco/order/secure/removeOrder',
      data
    )
  },

  modifyOrder(data: OrderModifyRequest) {
    return depponHttp.post<boolean, OrderModifyRequest>(
      '/gwapi/orderService/eco/order/secure/modifyOrder',
      data
    )
  },

  queryPickupTimes(data: OrderPickupTimeRequest, loading = true) {
    return depponHttp.post<OrderPickupTimeResponse, OrderPickupTimeRequest>(
      '/gwapi/orderService/eco/order/dispatchTime/dispatchTimeNew',
      data,
      {
        loading,
        timeout: 3000
      }
    )
  },

  dispatchOrder(data: OrderDispatchRequest) {
    return depponHttp.post<boolean, OrderDispatchRequest>(
      '/gwapi/orderService/eco/order/secure/orderDispatchFlag',
      data
    )
  },

  querySubscriptions(loading = false) {
    return depponHttp.get<Array<WaybillSubscriptionRaw | null>>(
      '/gwapi/waybillService/eco/wayBill/subscribe/list/records',
      {
        loading
      }
    )
  },

  querySubscriptionStatus(wayBillNo: string, loading = false) {
    return depponHttp.get<boolean>(
      `/gwapi/waybillService/eco/wayBill/subscribe/exist?wayBillNo=${encodeURIComponent(
        wayBillNo
      )}`,
      {
        loading
      }
    )
  },

  subscribeWaybill(data: WaybillSubscriptionRequest) {
    return depponHttp.post<boolean, WaybillSubscriptionRequest>(
      '/gwapi/waybillService/eco/wayBill/subscribe/submit',
      data
    )
  },

  cancelWaybillSubscription(data: WaybillSubscriptionRequest) {
    return depponHttp.post<boolean, WaybillSubscriptionRequest>(
      '/gwapi/waybillService/eco/wayBill/subscribe/cancel',
      data
    )
  },

  queryUrgeButtons(data: OrderUrgeButtonRequest, loading = false) {
    return depponHttp.post<OrderUrgeStatusResponse, OrderUrgeButtonRequest>(
      '/gwapi/onlineService/eco/online/complaint/secure/getUrgeButtons',
      data,
      {
        loading
      }
    )
  },

  queryUrgeMenus(data: OrderUrgeButtonRequest, loading = true) {
    return depponHttp.post<OrderUrgeMenusResponse, OrderUrgeButtonRequest>(
      '/gwapi/onlineService/eco/online/complaint/secure/urgeOrder',
      data,
      {
        loading
      }
    )
  },

  submitUrge(data: OrderUrgeSubmitRequest) {
    return depponHttp.post<OrderUrgeSubmitResponse, OrderUrgeSubmitRequest>(
      '/gwapi/orderService/eco/order/urgent/secure/v2/orderUrgent',
      data
    )
  },

  notifyDeliver(data: OrderNotifyDeliverRequest) {
    return depponHttp.post<boolean, OrderNotifyDeliverRequest>(
      '/gwapi/waybillService/eco/waybill/modify/secure/modifyNotifyDeliver',
      data
    )
  },

  invalidWaybill(data: OrderInvalidWaybillRequest) {
    return depponHttp.post<boolean, OrderInvalidWaybillRequest>(
      '/gwapi/waybillService/eco/wayBill/secure/invalidWaybill',
      data
    )
  },

  queryDepartmentPhone(stationCode: string, loading = false) {
    return depponHttp.get<string>(
      `/gwapi/queryService/eco/query/organizetion/deptTelephone?code=${encodeURIComponent(
        stationCode
      )}`,
      {
        loading,
        login: false
      }
    )
  },

  queryOpenBoxImages(data: OrderOpenBoxImagesRequest, loading = false) {
    return depponHttp.post<string[], OrderOpenBoxImagesRequest>(
      '/gwapi/waybillService/eco/wayBill/secure/queryOpenBoxImages',
      data,
      {
        loading
      }
    )
  },

  queryReceiptImages(data: OrderReceiptImagesRequest, loading = false) {
    return depponHttp.post<
      OrderReceiptImagesResponse,
      OrderReceiptImagesRequest
    >('/gwapi/waybillService/eco/wayBill/secure/signCounterfoil', data, {
      loading
    })
  },

  querySignImages(data: OrderSignImagesRequest, loading = false) {
    return depponHttp.post<string[], OrderSignImagesRequest>(
      '/gwapi/waybillService/eco/wayBill/secure/querySignImages',
      data,
      {
        loading
      }
    )
  },

  queryReturnBillImages(data: OrderReturnBillImagesRequest, loading = false) {
    return depponHttp.post<string[], OrderReturnBillImagesRequest>(
      '/gwapi/waybillService/eco/wayBill/secure/queryNewSignImages',
      data,
      {
        loading
      }
    )
  },

  queryServiceImages(
    data: OrderServiceImagesRequest,
    isLogistics: boolean,
    loading = false
  ) {
    return depponHttp.post<string[], OrderServiceImagesRequest>(
      isLogistics
        ? '/gwapi/waybillService/eco/wayBill/secure/queryLtlWayBillImages'
        : '/gwapi/waybillService/eco/wayBill/secure/queryWayBillImages',
      data,
      {
        loading
      }
    )
  },

  queryHomeImages(data: OrderHomeImagesRequest, loading = false) {
    return depponHttp.post<string[], OrderHomeImagesRequest>(
      '/gwapi/waybillService/eco/wayBill/secure/queryHomeImages',
      data,
      {
        loading
      }
    )
  },

  queryDecorationImages(data: OrderHomeImagesRequest, loading = false) {
    return depponHttp.post<string[], OrderHomeImagesRequest>(
      '/gwapi/waybillService/eco/wayBill/secure/powerOnTesting/signedImgs',
      data,
      {
        loading
      }
    )
  },

  queryPowerOnImages(
    data: OrderPowerOnImagesRequest,
    isLogistics: boolean,
    loading = false
  ) {
    return depponHttp.post<string[], OrderPowerOnImagesRequest>(
      isLogistics
        ? '/gwapi/waybillService/eco/wayBill/secure/powerOnTesting/ltl/signedImgs'
        : '/gwapi/waybillService/eco/wayBill/secure/powerOnTesting/exp/signedImgs',
      data,
      {
        loading
      }
    )
  },

  queryPackageImages(data: OrderPackageImagesRequest, loading = false) {
    return depponHttp.post<
      OrderPackageImagesResponse,
      OrderPackageImagesRequest
    >('/gwapi/waybillService/eco/wayBill/secure/getWoodPackagInfo', data, {
      loading
    })
  },

  queryPackagingFee(data: OrderPackagingFeeRequest, loading = false) {
    return depponHttp.post<OrderPackagingFeeResponse, OrderPackagingFeeRequest>(
      '/gwapi/waybillService/eco/wayBill/secure/packagingFee',
      data,
      {
        loading
      }
    )
  },

  queryContractDetail(data: OrderContractDetailRequest, loading = false) {
    return depponHttp.post<
      OrderContractDetailResponse,
      OrderContractDetailRequest
    >('/gwapi/onlineService/eco/online/secure/queryContractDetail', data, {
      loading
    })
  }
}
