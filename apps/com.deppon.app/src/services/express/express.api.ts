import { depponHttp } from '../../request/deppon'

import type {
  CreateExpressOrderRequest,
  CreateExpressOrderResponse,
  ExpressCreateInterceptResponse,
  ExpressFilterRequest,
  ExpressFilterResponse,
  ExpressFreightRequest,
  ExpressGoodsLabel,
  ExpressGoodsLabelRequest,
  ExpressGoodsNameRequest,
  ExpressGoodsNameResponse,
  ExpressInsurancePriceRequest,
  ExpressInsurancePriceResponse,
  ExpressOrderCancelRequest,
  ExpressOrderDetail,
  ExpressOrderDetailRequest,
  ExpressPickupTimeRequest,
  ExpressPickupTimeResponse,
  ExpressProductQuote
} from './types'

export const expressApi = {
  queryFreight(data: ExpressFreightRequest, loading = true) {
    return depponHttp.post<ExpressProductQuote[], ExpressFreightRequest>(
      '/gwapi/pricetimeService/eco/pricetime/queryPriceTime',
      data,
      {
        loading,
        timeout: 5000
      }
    )
  },

  queryPickupTime(data: ExpressPickupTimeRequest, loading = true) {
    return depponHttp.post<ExpressPickupTimeResponse, ExpressPickupTimeRequest>(
      '/gwapi/orderService/eco/order/dispatchTime/pilotCityDispatchTime',
      data,
      {
        loading,
        timeout: 3000
      }
    )
  },

  queryGoodsName(data: ExpressGoodsNameRequest, timeout = 5000) {
    return depponHttp.post<ExpressGoodsNameResponse, ExpressGoodsNameRequest>(
      '/gwapi/onlineService/eco/online/cargo/queryCargoInfo',
      data,
      {
        loading: false,
        timeout
      }
    )
  },

  queryGoodsLabels(data: ExpressGoodsLabelRequest, loading = false) {
    return depponHttp.post<ExpressGoodsLabel[], ExpressGoodsLabelRequest>(
      '/gwapi/orderService/eco/order/queryGoodsRemark',
      data,
      {
        loading,
        timeout: 3000
      }
    )
  },

  queryInsurancePrice(data: ExpressInsurancePriceRequest) {
    return depponHttp.post<
      ExpressInsurancePriceResponse,
      ExpressInsurancePriceRequest
    >(
      '/gwapi/pricetimeService/eco/fixedProtection/queryFixedProtection',
      data,
      {
        loading: false,
        timeout: 3000
      }
    )
  },

  filterOrder(data: ExpressFilterRequest) {
    return depponHttp.post<ExpressFilterResponse, ExpressFilterRequest>(
      '/gwapi/orderService/eco/order/sieveOrder/tips',
      data,
      {
        loading: false,
        timeout: 3000
      }
    )
  },

  checkCanCreateOrder() {
    return depponHttp.post<ExpressCreateInterceptResponse>(
      '/gwapi/orderService/eco/order/secure/queryIsCanCreateOrder',
      undefined,
      {
        loading: false,
        timeout: 3000
      }
    )
  },

  createOrder(data: CreateExpressOrderRequest, loading = true) {
    return depponHttp.post<
      CreateExpressOrderResponse,
      CreateExpressOrderRequest
    >(
      '/gwapi/orderService/eco/order/mysql/createOrder',
      data,
      {
        loading
      }
    )
  },

  queryOrderDetail(data: ExpressOrderDetailRequest, loading = true) {
    return depponHttp.post<ExpressOrderDetail, ExpressOrderDetailRequest>(
      '/gwapi/orderService/eco/order/secure/orderDetail',
      data,
      {
        loading
      }
    )
  },

  cancelOrder(data: ExpressOrderCancelRequest) {
    return depponHttp.post<boolean, ExpressOrderCancelRequest>(
      '/gwapi/orderService/eco/order/secure/revokeOrder',
      data
    )
  }
}
