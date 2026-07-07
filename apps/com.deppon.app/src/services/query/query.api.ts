import { depponHttp } from '../../request/deppon'

import type {
  AddressStationRequest,
  AddressStationResponse,
  CityStationRequest,
  CityStationResponse,
  DispatchStreetRequest,
  ExpressDispatchRequest,
  ExpressDispatchResponse,
  LogisticsDispatchResponse,
  StationDetailRaw,
  StationDetailRequest
} from './types'

export const queryApi = {
  queryDispatchStreet(data: DispatchStreetRequest) {
    return depponHttp.post<string, DispatchStreetRequest>(
      '/gwapi/queryService/eco/query/addressImagineTown',
      data,
      {
        loading: false,
        login: false
      }
    )
  },

  queryExpressDispatch(data: ExpressDispatchRequest) {
    return depponHttp.post<ExpressDispatchResponse, ExpressDispatchRequest>(
      '/gwapi/queryService/eco/query/range/queryAddressImagine',
      data,
      {
        login: false
      }
    )
  },

  queryLogisticsDispatch(countyCode: string) {
    return depponHttp.request<LogisticsDispatchResponse, { code: string }>({
      url: '/gwapi/queryService/eco/query/logisticsRange/queryAreaRange',
      method: 'GET',
      data: {
        code: countyCode
      },
      login: false
    })
  },

  queryAddressStations(data: AddressStationRequest) {
    return depponHttp.post<AddressStationResponse, AddressStationRequest>(
      '/gwapi/queryService/eco/query/branch/stationSearch',
      data,
      {
        login: false
      }
    )
  },

  queryCityStations(data: CityStationRequest) {
    return depponHttp.post<CityStationResponse, CityStationRequest>(
      '/gwapi/queryService/eco/query/branch/queryDeptNet',
      data,
      {
        login: false
      }
    )
  },

  queryStationDetail(data: StationDetailRequest) {
    return depponHttp.post<StationDetailRaw, StationDetailRequest>(
      '/gwapi/queryService/eco/query/branch/queryDeptInfoByCode',
      data,
      {
        loading: false,
        login: false
      }
    )
  }
}
