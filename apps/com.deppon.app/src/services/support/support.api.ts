import { depponHttp } from '../../request/deppon'

export const supportApi = {
  fetchSwitchConfig<TResult>(switchKey: string, loading = false) {
    return depponHttp.post<TResult, { switchKey: string }>(
      '/gwapi/queryService/eco/query/switch/graySwitch',
      {
        switchKey
      },
      {
        loading,
        login: false
      }
    )
  }
}
