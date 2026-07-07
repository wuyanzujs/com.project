import { depponHttp } from '../../request/deppon'

import type { CustomerInfoRaw } from './types'

export const customerApi = {
  queryCustomerInfo(loading = false) {
    return depponHttp.post<CustomerInfoRaw>(
      '/gwapi/userService/eco/user/secure/selectCustName',
      undefined,
      {
        loading
      }
    )
  }
}
