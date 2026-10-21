import { depponHttp } from '@/request/deppon'

/** 同体系 MP FetchGoodsCategoryList 的真实端点与 string[] 返回契约。 */
export function queryExpressPowerMachineCategoriesRaw() {
  return depponHttp.post<string[], { standardLevelGoodsNames: string }>(
    '/gwapi/orderService/eco/order/secure/queryGoodsNameList',
    { standardLevelGoodsNames: '通电验机' },
    { loading: false, login: false, timeout: 3000 }
  )
}
