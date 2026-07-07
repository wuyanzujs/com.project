import { depponHttp } from '../../request/deppon'

import type { InvoiceCommonRequest, InvoicePath } from './types'

export const invoiceApi = {
  request<TResult, TData = unknown>(
    path: InvoicePath,
    data?: TData,
    loading = true,
    timeout = 10000
  ) {
    return depponHttp.post<
      TResult,
      InvoiceCommonRequest<TData | Record<string, never>>
    >(
      '/gwapi/onlineService/eco/online/invoice/secure/invoiceCommonService',
      {
        path,
        data: data ?? {}
      },
      {
        loading,
        timeout
      }
    )
  }
}
