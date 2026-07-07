import { depponHttp } from '../../request/deppon'

import type { SendSmsRequest } from '../auth'
import type { AccountCancelRequest } from './types'

export const accountApi = {
  sendCancelSms(data: SendSmsRequest) {
    return depponHttp.post(
      '/gwapi/messageService/eco/message/sendSmsMessage',
      data
    )
  },

  cancelAccount(data: AccountCancelRequest) {
    return depponHttp.post<boolean, AccountCancelRequest>(
      '/gwapi/userService/eco/user/secure/cancel',
      data
    )
  }
}
