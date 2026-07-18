import { depponHttp } from '../../request/deppon'

import type { CustomerCapabilityRaw, CustomerInfoRaw } from './types'

export const customerApi = {
  queryCustomerInfo(loading = false) {
    return depponHttp.post<CustomerInfoRaw>(
      '/gwapi/userService/eco/user/secure/selectCustName',
      undefined,
      {
        loading
      }
    )
  },

  queryCustomerCapability(loading = false) {
    return depponHttp.post<CustomerCapabilityRaw>(
      '/gwapi/userService/eco/user/secure/customerLabel',
      undefined,
      { loading }
    )
  }
}
