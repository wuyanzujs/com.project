import { depponHttp } from '../../request/deppon'

import type {
  NetworkIdAuthRequest,
  PoliceRealNameRequest,
  RealNameAuthRaw,
  RealNameAuthRequest
} from './types'

export const realNameApi = {
  queryRealNameAuth(loading = false) {
    return depponHttp.post<RealNameAuthRaw>(
      '/gwapi/userService/eco/user/secure/queryRealNameAuth',
      undefined,
      {
        loading,
        timeout: 3000
      }
    )
  },

  submitRealNameAuth(data: RealNameAuthRequest) {
    return depponHttp.post<boolean, RealNameAuthRequest>(
      '/gwapi/userService/eco/user/secure/realNameAuth',
      data
    )
  },

  submitPoliceRealName(data: PoliceRealNameRequest) {
    return depponHttp.post<boolean, PoliceRealNameRequest>(
      '/gwapi/userService/eco/user/idVerification/authByRealName',
      data
    )
  },

  submitNetworkIdAuth(data: NetworkIdAuthRequest) {
    return depponHttp.post<boolean, NetworkIdAuthRequest>(
      '/gwapi/userService/eco/user/idVerification/authByNetworkId',
      data,
      {
        timeout: 5000
      }
    )
  },

  fetchBizSeq() {
    return depponHttp.post<string>(
      '/gwapi/userService/eco/user/idVerification/bizSeq'
    )
  }
}
