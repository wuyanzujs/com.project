import { depponHttp } from '../../request/deppon'

import type {
  AppUser,
  GenerateTmpTokenRequest,
  LoginRequest,
  SendSmsRequest
} from './types'

export const authApi = {
  login(data: LoginRequest, loading = true) {
    return depponHttp.post<AppUser, LoginRequest>(
      '/gwapi/userService/eco/user/login',
      data,
      { loading }
    )
  },

  queryUserInfo(login = true, loading = true, timeout = 10000) {
    return depponHttp.get<AppUser>(
      '/gwapi/userService/eco/user/secure/queryUserInfo',
      { login, loading, timeout }
    )
  },

  checkEcoToken(login = true, loading = false) {
    return depponHttp.get('/gwapi/userService/eco/user/secure/checkEcoToken', {
      login,
      loading
    })
  },

  logout(sysCode: string) {
    return depponHttp.post<AppUser, { sysCode: string }>(
      '/gwapi/userService/eco/user/secure/logout',
      { sysCode }
    )
  },

  sendSmsMessage(data: SendSmsRequest) {
    return depponHttp.post('/gwapi/messageService/eco/message/sendSmsMessage', data)
  },

  generateTmpToken(data: GenerateTmpTokenRequest, loading = false) {
    return depponHttp.get<string>(
      '/gwapi/userService/eco/user/token/secure/generateTmpToken',
      {
        data,
        loading,
        login: true
      }
    )
  }
}
