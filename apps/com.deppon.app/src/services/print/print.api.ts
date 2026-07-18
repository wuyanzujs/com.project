import { depponHttp } from '../../request/deppon'

import type { PrintListRequest, PrintListResponse } from './types'

export const PRINT_LIST_ENDPOINT =
  '/gwapi/onlineService/eco/online/print/order/secure/queryNewOrderPrintList'

export const printApi = {
  queryList(data: PrintListRequest, loading = false) {
    return depponHttp.post<PrintListResponse, PrintListRequest>(
      PRINT_LIST_ENDPOINT,
      data,
      { loading }
    )
  }
}
