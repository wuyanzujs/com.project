import { depponHttp } from '../../request/deppon'

import type {
  PrivacyBehaviorRequest,
  PrivacyVersionResponse
} from './types'

export const privacyApi = {
  queryPrivacyVersion(loading = false) {
    return depponHttp.post<PrivacyVersionResponse>(
      '/gwapi/userService/eco/user/secure/queryUserPrivacyBehavior',
      undefined,
      {
        loading
      }
    )
  },

  savePrivacyVersion(data: PrivacyBehaviorRequest, loading = true) {
    return depponHttp.post<boolean, PrivacyBehaviorRequest>(
      '/gwapi/userService/eco/user/secure/userPrivacyBehavior',
      data,
      {
        loading
      }
    )
  },

  cancelPrivacyVersion(data: PrivacyBehaviorRequest, loading = true) {
    return depponHttp.post<unknown, PrivacyBehaviorRequest>(
      '/gwapi/userService/eco/user/secure/cancelPrivacyBehavior',
      data,
      {
        loading
      }
    )
  }
}
