import { depponHttp } from '../../request/deppon'

import type { MemberLevelRaw, MemberSvipRaw } from './types'

export const memberApi = {
  querySvipInfo() {
    return depponHttp.get<MemberSvipRaw>(
      '/gwapi/memberService/eco/member/grade/secure/getSvipNewestInfo',
      {
        loading: false,
        login: false,
        timeout: 3000
      }
    )
  },

  queryLevel() {
    return depponHttp.get<MemberLevelRaw>(
      '/gwapi/memberService/eco/member/grade/secure/weChatMiniMemberGrade',
      {
        loading: false,
        login: false,
        timeout: 3000
      }
    )
  }
}
