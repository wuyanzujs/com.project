import { depponHttp } from '../../request/deppon'

import type {
  SaveRealNameRequest,
  UserSignCodeRaw,
  UserSignCodeRequest
} from './types'

export const signApi = {
  existsUserRealName() {
    return depponHttp.get<boolean>(
      '/gwapi/userService/eco/user/info/secure/hasRealName'
    )
  },

  saveUserRealName(realName: string) {
    return depponHttp.post<boolean, SaveRealNameRequest>(
      '/gwapi/userService/eco/user/info/secure/updateRealName',
      {
        realName
      }
    )
  },

  queryUserSignCode(data: UserSignCodeRequest = {}) {
    return depponHttp.post<UserSignCodeRaw, UserSignCodeRequest>(
      '/gwapi/onlineService/eco/online/courier/secure/queryCustomerSignCodeInfo',
      data
    )
  }
}
