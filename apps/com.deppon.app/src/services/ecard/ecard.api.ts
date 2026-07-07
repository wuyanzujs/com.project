import { depponHttp } from '../../request/deppon'

import type {
  ECardBalanceRaw,
  ECardLinkRequest,
  ECardLinkResponse,
  ECardPromotionRaw
} from './types'

export const ecardApi = {
  createECardLink(data: ECardLinkRequest, loading = false) {
    return depponHttp.post<ECardLinkResponse, ECardLinkRequest>(
      '/gwapi/onlineService/eco/online/prestore/secure/getPmcPrestorePage',
      data,
      {
        loading
      }
    )
  },

  createECardPreviewLink(data: Pick<ECardLinkRequest, 'sysCode'>) {
    return depponHttp.post<ECardLinkResponse, Pick<ECardLinkRequest, 'sysCode'>>(
      '/gwapi/onlineService/eco/online/prestore/getPmcPreStoreVisitorPage',
      data,
      {
        loading: false,
        login: false
      }
    )
  },

  queryBalance(version = '2', loading = false) {
    return depponHttp.get<ECardBalanceRaw>(
      '/gwapi/memberService/eco/member/secure/getEcardBalance',
      {
        data: {
          version
        },
        loading,
        login: false
      }
    )
  },

  queryPromotions() {
    return depponHttp.post<ECardPromotionRaw>(
      '/gwapi/onlineService/eco/online/prestore/secure/queryRechargePromotions',
      undefined,
      {
        loading: false,
        login: false
      }
    )
  },

  queryRegisterStatus() {
    return depponHttp.post<boolean>(
      '/gwapi/memberService/eco/member/secure/openCard'
    )
  }
}
