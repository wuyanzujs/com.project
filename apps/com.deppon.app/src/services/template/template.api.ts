import { depponHttp } from '../../request/deppon'

import type {
  ExpressTemplateDeleteRequest,
  ExpressTemplateQueryRequest,
  ExpressTemplateRaw,
  ExpressTemplateSaveRequest
} from './types'

const TEMPLATE_API_ROOT = '/gwapi/orderService/eco/orderTemplate/secure'

export const templateApi = {
  query(data: ExpressTemplateQueryRequest) {
    return depponHttp.post<ExpressTemplateRaw[], ExpressTemplateQueryRequest>(
      `${TEMPLATE_API_ROOT}/queryOrderTemplate`,
      data,
      {
        loading: false,
        login: true,
        timeout: 3000
      }
    )
  },

  save(data: ExpressTemplateSaveRequest) {
    return depponHttp.post<boolean, ExpressTemplateSaveRequest>(
      `${TEMPLATE_API_ROOT}/addModifyOrderTemplate`,
      data
    )
  },

  delete(data: ExpressTemplateDeleteRequest) {
    return depponHttp.post<boolean, ExpressTemplateDeleteRequest>(
      `${TEMPLATE_API_ROOT}/deleteOrderTemplate`,
      data
    )
  }
}
